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
   * Supports all three modules: Environmental Permits, Trade Effluent, MCPD
   */
  async extractObligations(
    documentText: string,
    documentType: 'ENVIRONMENTAL_PERMIT' | 'TRADE_EFFLUENT_CONSENT' | 'MCPD_REGISTRATION',
    options?: {
      pageCount?: number;
      fileSizeBytes?: number;
      regulator?: string;
      permitReference?: string;
      waterCompany?: string;
      registrationType?: string;
    }
  ): Promise<OpenAIResponse> {
    // Get prompt template based on document type
    let promptId: string;
    if (documentType === 'ENVIRONMENTAL_PERMIT') {
      promptId = 'PROMPT_M1_EXTRACT_001';
    } else if (documentType === 'TRADE_EFFLUENT_CONSENT') {
      promptId = 'PROMPT_M2_EXTRACT_001';
    } else if (documentType === 'MCPD_REGISTRATION') {
      promptId = 'PROMPT_M3_EXTRACT_001';
    } else {
      throw new Error(`Unknown document type: ${documentType}`);
    }

    const template = getPromptTemplate(promptId);
    if (!template) {
      throw new Error(`Prompt template not found: ${promptId}`);
    }

    // Substitute placeholders in user message
    const placeholders: Record<string, string | number | null> = {
      document_text: documentText,
      document_type: documentType,
      regulator: options?.regulator || '',
      permit_reference: options?.permitReference || '',
      page_count: options?.pageCount || 0,
    };

    // Add module-specific placeholders
    if (documentType === 'TRADE_EFFLUENT_CONSENT') {
      placeholders.water_company = options?.waterCompany || '';
    } else if (documentType === 'MCPD_REGISTRATION') {
      placeholders.registration_type = options?.registrationType || 'MCPD';
    }

    const userMessage = substitutePromptPlaceholders(template.userMessageTemplate, placeholders);

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
   * Extract parameters from trade effluent consent (Module 2)
   */
  async extractParameters(
    consentText: string,
    waterCompany?: string
  ): Promise<OpenAIResponse> {
    const template = getPromptTemplate('PROMPT_M2_PARAM_001');
    if (!template) {
      throw new Error('Parameter extraction prompt template not found');
    }

    const userMessage = substitutePromptPlaceholders(template.userMessageTemplate, {
      consent_text: consentText,
      water_company: waterCompany || '',
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

  /**
   * Extract run-hour limits from MCPD registration (Module 3)
   */
  async extractRunHourLimits(
    registrationText: string,
    registrationReference?: string,
    registrationDate?: string
  ): Promise<OpenAIResponse> {
    const template = getPromptTemplate('PROMPT_M3_RUNHOUR_001');
    if (!template) {
      throw new Error('Run-hour extraction prompt template not found');
    }

    const userMessage = substitutePromptPlaceholders(template.userMessageTemplate, {
      registration_text: registrationText,
      registration_reference: registrationReference || '',
      registration_date: registrationDate || '',
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

  /**
   * Extract ELVs from permit or registration (Module 1 & 3)
   */
  async extractELVs(
    documentText: string,
    documentType: 'ENVIRONMENTAL_PERMIT' | 'MCPD_REGISTRATION',
    moduleType: string,
    regulator?: string
  ): Promise<OpenAIResponse> {
    const template = getPromptTemplate('PROMPT_M1_M3_ELV_001');
    if (!template) {
      throw new Error('ELV extraction prompt template not found');
    }

    const userMessage = substitutePromptPlaceholders(template.userMessageTemplate, {
      elv_sections_text: documentText,
      document_type: documentType,
      module_type: moduleType,
      regulator: regulator || '',
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

  /**
   * Validate extraction results
   */
  async validateExtraction(
    extractionResults: any,
    documentType: string,
    pageCount: number,
    expectedSections?: string[]
  ): Promise<OpenAIResponse> {
    const template = getPromptTemplate('PROMPT_VALIDATE_001');
    if (!template) {
      throw new Error('Validation prompt template not found');
    }

    const userMessage = substitutePromptPlaceholders(template.userMessageTemplate, {
      extraction_results_json: JSON.stringify(extractionResults),
      document_type: documentType,
      page_count: pageCount,
      expected_sections: expectedSections ? JSON.stringify(expectedSections) : '',
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

  /**
   * Detect duplicate obligations
   */
  async detectDuplicates(obligations: any[]): Promise<OpenAIResponse> {
    const template = getPromptTemplate('PROMPT_DEDUP_001');
    if (!template) {
      throw new Error('Deduplication prompt template not found');
    }

    const userMessage = substitutePromptPlaceholders(template.userMessageTemplate, {
      obligations_json: JSON.stringify(obligations),
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

  /**
   * Suggest evidence types for obligation
   */
  async suggestEvidenceTypes(
    category: string,
    frequency: string | null,
    obligationText: string,
    isSubjective: boolean
  ): Promise<OpenAIResponse> {
    const template = getPromptTemplate('PROMPT_EVID_SUGGEST_001');
    if (!template) {
      throw new Error('Evidence suggestion prompt template not found');
    }

    const userMessage = substitutePromptPlaceholders(template.userMessageTemplate, {
      category,
      frequency: frequency || 'null',
      obligation_text: obligationText,
      is_subjective: isSubjective.toString(),
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

  /**
   * Detect subjective language
   */
  async detectSubjectiveLanguage(
    obligationText: string,
    category: string,
    frequency: string | null
  ): Promise<OpenAIResponse> {
    const template = getPromptTemplate('PROMPT_SUBJ_DETECT_001');
    if (!template) {
      throw new Error('Subjective detection prompt template not found');
    }

    const userMessage = substitutePromptPlaceholders(template.userMessageTemplate, {
      obligation_text: obligationText,
      category,
      frequency: frequency || 'null',
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

  /**
   * Handle OCR failure recovery
   */
  async recoverFromOCRFailure(
    documentText: string,
    ocrConfidence: number
  ): Promise<OpenAIResponse> {
    const template = getPromptTemplate('PROMPT_ERROR_OCR_001');
    if (!template) {
      throw new Error('OCR recovery prompt template not found');
    }

    const userMessage = substitutePromptPlaceholders(template.userMessageTemplate, {
      document_text: documentText,
      ocr_confidence: ocrConfidence.toString(),
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

  /**
   * Recover from invalid JSON response
   */
  async recoverFromInvalidJSON(previousResponse: string): Promise<OpenAIResponse> {
    const template = getPromptTemplate('PROMPT_ERROR_JSON_001');
    if (!template) {
      throw new Error('JSON recovery prompt template not found');
    }

    const userMessage = substitutePromptPlaceholders(template.userMessageTemplate, {
      previous_response: previousResponse,
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

  /**
   * Recover from low confidence extractions
   */
  async recoverFromLowConfidence(
    documentContext: string,
    lowConfidenceItems: any[]
  ): Promise<OpenAIResponse> {
    const template = getPromptTemplate('PROMPT_ERROR_LOWCONF_001');
    if (!template) {
      throw new Error('Low confidence recovery prompt template not found');
    }

    const userMessage = substitutePromptPlaceholders(template.userMessageTemplate, {
      document_context: documentContext,
      low_confidence_items_json: JSON.stringify(lowConfidenceItems),
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

