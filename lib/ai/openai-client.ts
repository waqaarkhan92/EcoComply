/**
 * OpenAI Client
 * Handles OpenAI API interactions with retry logic, timeout, and error handling
 */

import OpenAI from 'openai';
import { getAPIKeyManager } from './api-key-manager';
import { getPromptTemplate, substitutePromptPlaceholders } from './prompts';

export interface RetryConfig {
  maxRetries: number; // Number of retry attempts AFTER initial attempt
  retryDelayMs: number[]; // Array of delays for each retry (exponential backoff)
  totalAttempts: number; // Total attempts (1 initial + maxRetries)
}

export interface TimeoutConfig {
  standard: number; // Timeout for standard documents (≤49 pages): 30s
  medium: number; // Timeout for medium documents (20-49 pages or 5-10MB): 120s
  large: number; // Timeout for large documents (≥50 pages AND ≥10MB): 5min
}

export const RETRY_CONFIG: RetryConfig = {
  maxRetries: 2, // 2 retry attempts AFTER initial attempt
  retryDelayMs: [2000, 4000], // Exponential backoff: 2s, 4s
  totalAttempts: 3, // 3 total attempts: 1 initial + 2 retries
};

export const TIMEOUT_CONFIG: TimeoutConfig = {
  standard: 30000, // 30 seconds for standard documents (≤49 pages)
  medium: 120000, // 120 seconds for medium documents (20-49 pages or 5-10MB)
  large: 300000, // 5 minutes for large documents (≥50 pages AND ≥10MB)
};

export interface OpenAIRequestConfig {
  model: 'gpt-4o' | 'gpt-4o-mini';
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  response_format?: { type: 'json_object' };
  temperature?: number;
  max_tokens?: number;
  timeout?: number;
}

export interface OpenAIResponse {
  content: string;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  finish_reason: string;
}

export class OpenAIClient {
  private client: OpenAI | null = null;
  private apiKeyManager = getAPIKeyManager();

  /**
   * Initialize OpenAI client with current API key
   */
  private async getClient(): Promise<OpenAI> {
    if (!this.client) {
      const apiKey = await this.apiKeyManager.getValidKey();
      this.client = new OpenAI({
        apiKey,
        timeout: TIMEOUT_CONFIG.standard,
        maxRetries: 0, // We handle retries manually
      });
    }
    return this.client;
  }

  /**
   * Get timeout based on document size
   */
  getDocumentTimeout(pageCount?: number, fileSizeBytes?: number): number {
    if (pageCount === undefined && fileSizeBytes === undefined) {
      return TIMEOUT_CONFIG.standard;
    }

    const isLarge = (pageCount !== undefined && pageCount >= 50) &&
                    (fileSizeBytes !== undefined && fileSizeBytes >= 10_000_000);
    
    const isMedium = ((pageCount !== undefined && pageCount >= 20 && pageCount < 50) ||
                      (fileSizeBytes !== undefined && fileSizeBytes >= 5_000_000 && fileSizeBytes < 10_000_000));

    if (isLarge) {
      return TIMEOUT_CONFIG.large;
    } else if (isMedium) {
      return TIMEOUT_CONFIG.medium;
    } else {
      return TIMEOUT_CONFIG.standard;
    }
  }

  /**
   * Make OpenAI API call with retry logic
   */
  async callWithRetry(
    config: OpenAIRequestConfig,
    retryConfig: RetryConfig = RETRY_CONFIG
  ): Promise<OpenAIResponse> {
    const client = await this.getClient();
    let lastError: Error | null = null;

    // Determine timeout
    const timeout = config.timeout || TIMEOUT_CONFIG.standard;

    // Try initial attempt + retries
    for (let attempt = 0; attempt < retryConfig.totalAttempts; attempt++) {
      try {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        // Create a promise that rejects on timeout
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), timeout);
        });

        const response = await Promise.race([
          client.chat.completions.create({
            model: config.model,
            messages: config.messages,
            response_format: config.response_format || { type: 'json_object' },
            temperature: config.temperature ?? 0.2,
            max_tokens: config.max_tokens || 4000,
          }),
          timeoutPromise,
        ]) as OpenAI.Chat.Completions.ChatCompletion;

        const message = response.choices[0]?.message?.content;
        if (!message) {
          throw new Error('Empty response from OpenAI');
        }

        return {
          content: message,
          model: response.model,
          usage: {
            prompt_tokens: response.usage?.prompt_tokens || 0,
            completion_tokens: response.usage?.completion_tokens || 0,
            total_tokens: response.usage?.total_tokens || 0,
          },
          finish_reason: response.choices[0]?.finish_reason || 'stop',
        };
      } catch (error: any) {
        lastError = error;

        // Don't retry on certain errors
        if (
          error?.code === 'invalid_api_key' ||
          error?.code === 'insufficient_quota' ||
          error?.code === 'rate_limit_exceeded' ||
          error?.message?.includes('aborted')
        ) {
          // For rate limits, try fallback key
          if (error?.code === 'rate_limit_exceeded') {
            try {
              const fallbackKey = await this.apiKeyManager.getFallbackKey();
              if (fallbackKey) {
                this.client = new OpenAI({
                  apiKey: fallbackKey,
                  timeout: TIMEOUT_CONFIG.standard,
                  maxRetries: 0,
                });
                // Retry with fallback key
                continue;
              }
            } catch (fallbackError) {
              // Fallback failed, continue with original error
            }
          }

          // Don't retry on these errors
          throw error;
        }

        // If this was the last attempt, throw the error
        if (attempt === retryConfig.totalAttempts - 1) {
          throw error;
        }

        // Wait before retry (exponential backoff)
        const delay = retryConfig.retryDelayMs[attempt] || retryConfig.retryDelayMs[retryConfig.retryDelayMs.length - 1];
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // Should never reach here, but TypeScript requires it
    throw lastError || new Error('Unknown error in OpenAI call');
  }

  /**
   * Extract obligations from document using OpenAI
   */
  async extractObligations(
    documentText: string,
    documentType: 'ENVIRONMENTAL_PERMIT' | 'TRADE_EFFLUENT_CONSENT' | 'MCPD_REGISTRATION',
    options?: {
      pageCount?: number;
      fileSizeBytes?: number;
      regulator?: string;
      permitReference?: string;
    }
  ): Promise<OpenAIResponse> {
    // Get prompt template based on document type
    let promptId: string;
    if (documentType === 'ENVIRONMENTAL_PERMIT') {
      promptId = 'PROMPT_M1_EXTRACT_001';
    } else {
      // TODO: Add prompts for Module 2 and Module 3
      throw new Error(`Prompt not yet implemented for document type: ${documentType}`);
    }

    const template = getPromptTemplate(promptId);
    if (!template) {
      throw new Error(`Prompt template not found: ${promptId}`);
    }

    // Substitute placeholders in user message
    const userMessage = substitutePromptPlaceholders(template.userMessageTemplate, {
      document_text: documentText,
      document_type: documentType,
      regulator: options?.regulator || '',
      permit_reference: options?.permitReference || '',
      page_count: options?.pageCount || 0,
    });

    const timeout = this.getDocumentTimeout(options?.pageCount, options?.fileSizeBytes);

    return this.callWithRetry({
      model: template.model,
      messages: [
        { role: 'system', content: template.systemMessage },
        { role: 'user', content: userMessage },
      ],
      response_format: { type: 'json_object' },
      temperature: template.temperature,
      max_tokens: template.maxTokens,
      timeout,
    });
  }

  /**
   * Classify document type
   */
  async classifyDocument(
    documentExcerpt: string,
    pageCount: number,
    originalFilename: string
  ): Promise<OpenAIResponse> {
    const template = getPromptTemplate('PROMPT_DOC_TYPE_001');
    if (!template) {
      throw new Error('Document classification prompt template not found');
    }

    const userMessage = substitutePromptPlaceholders(template.userMessageTemplate, {
      document_excerpt: documentExcerpt,
      page_count: pageCount,
      original_filename: originalFilename,
    });

    return this.callWithRetry({
      model: template.model,
      messages: [
        { role: 'system', content: template.systemMessage },
        { role: 'user', content: userMessage },
      ],
      response_format: { type: 'json_object' },
      temperature: template.temperature,
      max_tokens: template.maxTokens,
      timeout: TIMEOUT_CONFIG.standard,
    });
  }
}

// Singleton instance
let openAIClient: OpenAIClient | null = null;

export function getOpenAIClient(): OpenAIClient {
  if (!openAIClient) {
    openAIClient = new OpenAIClient();
  }
  return openAIClient;
}

