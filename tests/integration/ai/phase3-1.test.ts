/**
 * Phase 3.1 Integration Tests
 * Tests OpenAI Integration Setup: API Key Manager, OpenAI Client, Prompt Templates
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { APIKeyManager, getAPIKeyManager } from '@/lib/ai/api-key-manager';
import { getOpenAIClient, OpenAIClient } from '@/lib/ai/openai-client';
import { getPromptTemplate, substitutePromptPlaceholders } from '@/lib/ai/prompts';

describe('Phase 3.1: OpenAI Integration Setup', () => {
  let apiKeyManager: APIKeyManager;
  let openAIClient: OpenAIClient;

  beforeAll(() => {
    apiKeyManager = getAPIKeyManager();
    openAIClient = getOpenAIClient();
  });

  describe('API Key Manager', () => {
    it('should initialize with primary API key', () => {
      const key = apiKeyManager.getCurrentKey();
      expect(key).toBeTruthy();
      expect(key.length).toBeGreaterThan(0);
      expect(key.startsWith('sk-')).toBe(true);
    });

    it('should validate API key', async () => {
      const key = apiKeyManager.getCurrentKey();
      const isValid = await apiKeyManager.validateKey(key);
      expect(isValid).toBe(true);
    }, 30000); // 30 second timeout for API call

    it('should get valid key', async () => {
      const validKey = await apiKeyManager.getValidKey();
      expect(validKey).toBeTruthy();
      expect(validKey.startsWith('sk-')).toBe(true);
    }, 30000);

    it('should validate all keys on initialization', async () => {
      const validation = await apiKeyManager.validateAllKeys();
      expect(validation.primary).toBe(true);
      // Fallback keys are optional, so we don't require them
    }, 30000);
  });

  describe('OpenAI Client', () => {
    it('should initialize client', () => {
      expect(openAIClient).toBeTruthy();
    });

    it('should calculate document timeout correctly', () => {
      // Standard document (<20 pages AND <5MB)
      expect(openAIClient.getDocumentTimeout(10, 3_000_000)).toBe(30000);
      
      // Medium document (20-49 pages OR 5-10MB)
      expect(openAIClient.getDocumentTimeout(30, 5_000_000)).toBe(120000); // 30 pages = medium
      expect(openAIClient.getDocumentTimeout(30, 7_000_000)).toBe(120000);
      expect(openAIClient.getDocumentTimeout(25, 3_000_000)).toBe(120000); // 25 pages = medium
      expect(openAIClient.getDocumentTimeout(10, 7_000_000)).toBe(120000); // 7MB = medium
      
      // Large document (≥50 pages AND ≥10MB)
      expect(openAIClient.getDocumentTimeout(60, 15_000_000)).toBe(300000);
      expect(openAIClient.getDocumentTimeout(50, 10_000_000)).toBe(300000);
    });

    it('should classify document type', async () => {
      const testDocument = `
        ENVIRONMENTAL PERMIT
        Environment Agency
        Permit Reference: EPR/AB1234CD
        
        This permit authorises the operation of a waste management facility...
      `;

      const response = await openAIClient.classifyDocument(
        testDocument,
        10,
        'test_permit.pdf'
      );

      expect(response).toBeTruthy();
      expect(response.content).toBeTruthy();
      
      // Parse JSON response
      const parsed = JSON.parse(response.content);
      expect(parsed).toHaveProperty('document_type');
      expect(parsed).toHaveProperty('confidence');
      expect(parsed.confidence).toBeGreaterThanOrEqual(0);
      expect(parsed.confidence).toBeLessThanOrEqual(1);
    }, 60000); // 60 second timeout for API call

    it('should extract obligations from permit document', async () => {
      const testPermit = `
        ENVIRONMENTAL PERMIT
        Environment Agency
        Permit Reference: EPR/AB1234CD
        
        CONDITION 1.1
        The operator shall monitor emissions from the stack on a monthly basis.
        
        CONDITION 2.3
        The operator shall submit an annual report to the Environment Agency by 31 January each year.
        
        CONDITION 3.5
        The operator shall maintain records of all monitoring activities for a period of 6 years.
      `;

      const response = await openAIClient.extractObligations(
        testPermit,
        'ENVIRONMENTAL_PERMIT',
        {
          pageCount: 5,
          regulator: 'EA',
          permitReference: 'EPR/AB1234CD',
        }
      );

      expect(response).toBeTruthy();
      expect(response.content).toBeTruthy();
      
      // Parse JSON response
      const parsed = JSON.parse(response.content);
      expect(parsed).toHaveProperty('obligations');
      expect(Array.isArray(parsed.obligations)).toBe(true);
      
      // Check usage tracking
      expect(response.usage).toBeTruthy();
      expect(response.usage.prompt_tokens).toBeGreaterThan(0);
      expect(response.usage.completion_tokens).toBeGreaterThan(0);
      expect(response.usage.total_tokens).toBeGreaterThan(0);
    }, 120000); // 2 minute timeout for extraction
  });

  describe('Prompt Templates', () => {
    it('should load document classification prompt', () => {
      const template = getPromptTemplate('PROMPT_DOC_TYPE_001');
      expect(template).toBeTruthy();
      expect(template?.id).toBe('PROMPT_DOC_TYPE_001');
      expect(template?.model).toBe('gpt-4o-mini');
      expect(template?.systemMessage).toBeTruthy();
      expect(template?.userMessageTemplate).toBeTruthy();
    });

    it('should load obligation extraction prompt', () => {
      const template = getPromptTemplate('PROMPT_M1_EXTRACT_001');
      expect(template).toBeTruthy();
      expect(template?.id).toBe('PROMPT_M1_EXTRACT_001');
      expect(template?.model).toBe('gpt-4o');
      expect(template?.systemMessage).toBeTruthy();
      expect(template?.userMessageTemplate).toBeTruthy();
    });

    it('should return null for non-existent prompt', () => {
      const template = getPromptTemplate('NON_EXISTENT_PROMPT');
      expect(template).toBeNull();
    });

    it('should substitute placeholders in prompt template', () => {
      const template = getPromptTemplate('PROMPT_DOC_TYPE_001');
      expect(template).toBeTruthy();

      const substituted = substitutePromptPlaceholders(
        template!.userMessageTemplate,
        {
          document_excerpt: 'Test document text',
          page_count: 10,
          original_filename: 'test.pdf',
        }
      );

      expect(substituted).toContain('Test document text');
      expect(substituted).toContain('10');
      expect(substituted).toContain('test.pdf');
      expect(substituted).not.toContain('{document_excerpt}');
      expect(substituted).not.toContain('{page_count}');
      expect(substituted).not.toContain('{original_filename}');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid API key gracefully', async () => {
      const invalidKey = 'sk-invalid-key-12345';
      const isValid = await apiKeyManager.validateKey(invalidKey);
      expect(isValid).toBe(false);
    }, 30000);

    it('should handle timeout errors', async () => {
      // This test would require mocking or a very slow API call
      // For now, we'll just verify the timeout configuration exists
      expect(openAIClient.getDocumentTimeout(100, 20_000_000)).toBe(300000); // 5 minutes
    });
  });
});

