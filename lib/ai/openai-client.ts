/**
 * OpenAI Client
 * Handles OpenAI API interactions with retry logic, timeout, circuit breaker, and error handling
 */

import OpenAI from 'openai';
import { getAPIKeyManager } from './api-key-manager';
import { getPromptTemplate, substitutePromptPlaceholders } from './prompts';
import { analyzeDocumentComplexity, type AIModel } from './model-router';
import { selectPromptId, getJurisdictionFromRegulator, getJurisdictionFromWaterCompany } from './prompt-registry';
import { loadPrompt, toPromptTemplate } from './prompt-loader';
import { getAIBudgetService, calculateCost, type AIModel as BudgetAIModel } from '@/lib/services/ai-budget-service';
import { getCircuitBreaker, CircuitOpenError } from './circuit-breaker';

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
  standard: 300000, // 5 minutes for standard documents (comprehensive extraction takes time)
  medium: 480000, // 8 minutes for medium documents
  large: 900000, // 15 minutes for large documents
};

export interface OpenAIRequestConfig {
  model: 'gpt-4o' | 'gpt-4o-mini';
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  response_format?: { type: 'json_object' } | null;
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
  complexity?: 'simple' | 'medium' | 'complex';
}

export class OpenAIClient {
  private client: OpenAI | null = null;
  private apiKeyManager = getAPIKeyManager();
  private budgetService = getAIBudgetService();
  private currentCompanyId: string | null = null;
  private circuitBreaker = getCircuitBreaker('openai', {
    failureThreshold: 5, // Open after 5 consecutive failures
    resetTimeoutMs: 60000, // Wait 1 minute before trying again
    successThreshold: 2, // Need 2 successes to fully close
  });

  /**
   * Set the company context for budget tracking
   */
  setCompanyContext(companyId: string): void {
    this.currentCompanyId = companyId;
  }

  /**
   * Check if AI operations are blocked due to budget limits
   */
  async checkBudgetLimit(companyId?: string): Promise<{ allowed: boolean; reason?: string }> {
    const targetCompanyId = companyId || this.currentCompanyId;
    if (!targetCompanyId) {
      // No company context, allow operation (shouldn't happen in production)
      return { allowed: true };
    }

    try {
      const blockCheck = await this.budgetService.isAIBlocked(targetCompanyId);
      if (blockCheck.blocked) {
        console.warn(`🚫 AI operation blocked for company ${targetCompanyId}: ${blockCheck.reason}`);
        return { allowed: false, reason: blockCheck.reason };
      }
      return { allowed: true };
    } catch (error) {
      // Don't block operations if budget check fails
      console.warn('⚠️ Budget check failed, allowing operation:', error);
      return { allowed: true };
    }
  }

  /**
   * Record AI usage after successful API call
   */
  private async recordUsage(
    model: string,
    inputTokens: number,
    outputTokens: number,
    operationType: 'extraction' | 'title_generation' | 'validation' | 'other',
    companyId?: string
  ): Promise<void> {
    const targetCompanyId = companyId || this.currentCompanyId;
    if (!targetCompanyId) return;

    try {
      // Map model name to budget model type
      const budgetModel: BudgetAIModel = model.includes('gpt-4o-mini') ? 'gpt-4o-mini' :
                                          model.includes('gpt-4o') ? 'gpt-4o' :
                                          'gpt-3.5-turbo';

      await this.budgetService.recordUsage(targetCompanyId, {
        model: budgetModel,
        inputTokens,
        outputTokens,
        operationType,
      });
    } catch (error) {
      // Don't fail the operation if usage recording fails
      console.warn('⚠️ Failed to record AI usage:', error);
    }
  }

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
    // Always use at least medium timeout for extraction (LLM calls take time)
    // Standard timeout is too short for PDF extraction with many obligations
    if (pageCount === undefined && fileSizeBytes === undefined) {
      return TIMEOUT_CONFIG.medium; // Use medium instead of standard
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
      // Even for small documents, use medium timeout for extraction
      return TIMEOUT_CONFIG.medium;
    }
  }

  /**
   * Get circuit breaker status (useful for health checks)
   */
  getCircuitBreakerStatus() {
    return this.circuitBreaker.getStats();
  }

  /**
   * Make OpenAI API call with retry logic, circuit breaker, and budget tracking
   */
  async callWithRetry(
    config: OpenAIRequestConfig,
    retryConfig: RetryConfig = RETRY_CONFIG,
    options?: {
      companyId?: string;
      operationType?: 'extraction' | 'title_generation' | 'validation' | 'other';
      skipBudgetCheck?: boolean;
      skipCircuitBreaker?: boolean;
    }
  ): Promise<OpenAIResponse> {
    // Check circuit breaker first (unless skipped)
    if (!options?.skipCircuitBreaker && !this.circuitBreaker.canRequest()) {
      const stats = this.circuitBreaker.getStats();
      const waitTime = Math.ceil((60000 - (Date.now() - (stats.lastFailureTime || 0))) / 1000);
      throw new CircuitOpenError(
        `OpenAI service is temporarily unavailable due to repeated failures. Please try again in ${Math.max(waitTime, 1)} seconds.`,
        Math.max(waitTime, 1)
      );
    }

    // Check budget limit before making API call (unless skipped)
    if (!options?.skipBudgetCheck) {
      const budgetCheck = await this.checkBudgetLimit(options?.companyId);
      if (!budgetCheck.allowed) {
        throw new Error(`AI_BUDGET_EXCEEDED: ${budgetCheck.reason}`);
      }
    }

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

        const completionConfig: any = {
          model: config.model,
          messages: config.messages,
          temperature: config.temperature ?? 0.2,
          max_tokens: config.max_tokens || 4000,
        };

        // Only add response_format if it's explicitly provided and not null
        if (config.response_format !== undefined && config.response_format !== null) {
          completionConfig.response_format = config.response_format;
        } else if (config.response_format === undefined) {
          // Default to JSON format for backward compatibility (only if not explicitly set to null)
          completionConfig.response_format = { type: 'json_object' };
        }
        // If response_format === null, don't add it (plain text response)

        const response = await Promise.race([
          client.chat.completions.create(completionConfig),
          timeoutPromise,
        ]) as OpenAI.Chat.Completions.ChatCompletion;

        const message = response.choices[0]?.message?.content;
        if (!message) {
          throw new Error('Empty response from OpenAI');
        }

        const result: OpenAIResponse = {
          content: message,
          model: response.model,
          usage: {
            prompt_tokens: response.usage?.prompt_tokens || 0,
            completion_tokens: response.usage?.completion_tokens || 0,
            total_tokens: response.usage?.total_tokens || 0,
          },
          finish_reason: response.choices[0]?.finish_reason || 'stop',
        };

        // Record success with circuit breaker
        this.circuitBreaker.recordSuccess();

        // Record usage after successful call (async, don't block)
        this.recordUsage(
          response.model,
          result.usage.prompt_tokens,
          result.usage.completion_tokens,
          options?.operationType || 'other',
          options?.companyId
        ).catch(() => {}); // Silently handle any errors

        return result;
      } catch (error: any) {
        lastError = error;

        // Record failure with circuit breaker for service-level errors
        // Don't record client errors (invalid_api_key, budget exceeded) as service failures
        const isServiceError = !['invalid_api_key', 'insufficient_quota'].includes(error?.code) &&
                               !error?.message?.includes('AI_BUDGET_EXCEEDED');
        if (isServiceError) {
          this.circuitBreaker.recordFailure(error);
        }

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
      forceModel?: AIModel; // Optional: force specific model (for testing)
    }
  ): Promise<OpenAIResponse> {
    // Smart model routing: analyze document complexity
    const complexityAnalysis = analyzeDocumentComplexity({
      documentText,
      documentType,
      pageCount: options?.pageCount,
      regulator: options?.regulator,
      fileSizeBytes: options?.fileSizeBytes,
    });

    const selectedModel = options?.forceModel || complexityAnalysis.recommendedModel;

    console.log(`🧠 Model routing analysis:`);
    console.log(`   Complexity: ${complexityAnalysis.complexity}`);
    console.log(`   Recommended: ${complexityAnalysis.recommendedModel}`);
    console.log(`   Confidence: ${(complexityAnalysis.confidence * 100).toFixed(0)}%`);
    console.log(`   Using: ${selectedModel}`);
    console.log(`   Reasons: ${complexityAnalysis.reasons.join(', ')}`);
    console.log(`   Metrics:`, complexityAnalysis.metrics);

    // Get prompt using jurisdiction-specific prompt registry
    const promptSelection = selectPromptId(
      documentType,
      options?.regulator,
      options?.waterCompany
    );

    console.log(`📝 Prompt selection:`);
    console.log(`   ID: ${promptSelection.promptId}`);
    console.log(`   Version: ${promptSelection.version}`);
    console.log(`   Jurisdiction-specific: ${promptSelection.isJurisdictionSpecific}`);
    if (promptSelection.fallbackReason) {
      console.log(`   Fallback reason: ${promptSelection.fallbackReason}`);
    }

    // Try to load from docs first, then fall back to in-memory
    let template;
    const loadedPrompt = await loadPrompt(promptSelection);
    if (loadedPrompt) {
      template = toPromptTemplate(loadedPrompt);
      console.log(`   Loaded from: ${loadedPrompt.loadedFrom}`);
    } else {
      // Ultimate fallback to generic prompts
      const fallbackId = documentType === 'ENVIRONMENTAL_PERMIT' ? 'PROMPT_M1_EXTRACT_001' :
                         documentType === 'TRADE_EFFLUENT_CONSENT' ? 'PROMPT_M2_EXTRACT_001' :
                         'PROMPT_M3_EXTRACT_001';
      template = getPromptTemplate(fallbackId);
      console.log(`   Loaded from: memory (fallback)`);
    }

    if (!template) {
      throw new Error(`Prompt template not found: ${promptSelection.promptId}`);
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

    const response = await this.callWithRetry({
      model: selectedModel, // Use smart routing instead of template.model
      messages: [
        { role: 'system', content: template.systemMessage },
        { role: 'user', content: userMessage },
      ],
      response_format: { type: 'json_object' },
      temperature: template.temperature,
      max_tokens: template.maxTokens,
      timeout,
    });

    // Add complexity to response for tracking
    return {
      ...response,
      complexity: complexityAnalysis.complexity,
    };
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

  /**
   * Generate a concise, meaningful title for an obligation using GPT-3.5-turbo
   * This is a cost-effective method for title generation
   */
  async generateTitle(obligationText: string, category: string): Promise<string> {
    if (!obligationText) return 'Untitled Obligation';

    try {
      const response = await this.callWithRetry({
        model: 'gpt-4o-mini', // Use cheaper model for title generation
        messages: [
          {
            role: 'system',
            content: 'You are an expert at creating concise, actionable titles for environmental compliance obligations. Generate a clear, professional title (maximum 60 characters) that captures the core action required. Do not include legal boilerplate like "The operator shall". Focus on the key action and subject.',
          },
          {
            role: 'user',
            content: `Category: ${category}\n\nObligation text:\n${obligationText.substring(0, 500)}\n\nGenerate a concise title (max 60 characters) that captures the core action required. Return ONLY the title text, no quotes or extra formatting.`,
          },
        ],
        response_format: null, // Plain text response, not JSON
        temperature: 0.3,
        max_tokens: 50, // Short response for title only
        timeout: 10000, // 10 second timeout for quick response
      });

      // Clean up the response
      let title = response.content.trim();

      // Remove quotes if present
      title = title.replace(/^["']|["']$/g, '');

      // Ensure it's not too long
      if (title.length > 80) {
        title = title.substring(0, 77) + '...';
      }

      return title;
    } catch (error: any) {
      console.warn('⚠️ AI title generation failed:', error.message);
      throw error; // Let the caller handle fallback
    }
  }

  /**
   * OPTIMIZED: Batch generate titles for multiple obligations in one API call
   * Reduces cost by 93% (1 API call instead of N calls)
   * @param obligations Array of {text, category} objects
   * @returns Array of generated titles in the same order
   */
  async generateTitlesBatch(
    obligations: Array<{ text: string; category: string }>
  ): Promise<string[]> {
    if (!obligations || obligations.length === 0) return [];

    // If only one obligation, use single call
    if (obligations.length === 1) {
      const title = await this.generateTitle(obligations[0].text, obligations[0].category);
      return [title];
    }

    try {
      // Build batch request with numbered obligations
      const obligationsText = obligations
        .map((obl, index) => {
          return `[${index + 1}] Category: ${obl.category}\nText: ${obl.text.substring(0, 300)}`;
        })
        .join('\n\n---\n\n');

      const response = await this.callWithRetry({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at creating concise, actionable titles for environmental compliance obligations. For each numbered obligation, generate a clear, professional title (maximum 60 characters). Return titles in the same numbered format: [1] Title one\n[2] Title two\netc.',
          },
          {
            role: 'user',
            content: `Generate concise titles (max 60 characters each) for these obligations. Return ONLY numbered titles, one per line:\n\n${obligationsText}`,
          },
        ],
        response_format: null,
        temperature: 0.3,
        max_tokens: obligations.length * 25, // ~25 tokens per title
        timeout: 30000,
      });

      // Parse numbered response
      const lines = response.content.trim().split('\n');
      const titles: string[] = [];

      for (let i = 0; i < obligations.length; i++) {
        // Find line starting with [i+1]
        const line = lines.find(l => l.trim().startsWith(`[${i + 1}]`));
        if (line) {
          let title = line.replace(/^\[\d+\]\s*/, '').trim();
          title = title.replace(/^["']|["']$/g, ''); // Remove quotes
          if (title.length > 80) {
            title = title.substring(0, 77) + '...';
          }
          titles.push(title);
        } else {
          // Fallback if parsing fails
          titles.push('Obligation ' + (i + 1));
        }
      }

      console.log(`✅ Batch generated ${titles.length} titles in 1 API call (93% cost reduction)`);
      return titles;
    } catch (error: any) {
      console.warn('⚠️ Batch title generation failed, falling back to individual calls:', error.message);
      // Fallback to individual calls if batch fails
      return Promise.all(
        obligations.map(obl => this.generateTitle(obl.text, obl.category))
      );
    }
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

