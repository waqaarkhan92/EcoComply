# Oblicore AI Integration Layer

**Oblicore v1.0 — Launch-Ready / Last updated: 2024-12-27**

**Document Version:** 1.0  
**Status:** Complete  
**Created by:** Cursor  
**Depends on:**
- ✅ AI Microservice Prompts (1.7) - Complete
- ✅ AI Layer Design & Cost Optimization (1.5a) - Complete
- ✅ AI Extraction Rules Library (1.6) - Complete
- ✅ Backend API Specification (2.5) - Complete
- ✅ Background Jobs Specification (2.3) - Complete

**Purpose:** Defines the complete AI integration layer implementation for the Oblicore platform, including OpenAI API integration, cost optimization, confidence scoring, rule library integration, error handling, and background job integration.

> [v1 UPDATE – Version Header – 2024-12-27]

---

# Table of Contents

1. [Document Overview](#1-document-overview)
2. [API Key Management](#2-api-key-management)
3. [Request Formatting](#3-request-formatting)
4. [Cost Optimization Implementation](#4-cost-optimization-implementation)
5. [Prompt Template Integration](#5-prompt-template-integration)
6. [Confidence Scoring](#6-confidence-scoring)
7. [Rules Library Integration](#7-rules-library-integration)
8. [Low-Confidence Item Flagging](#8-low-confidence-item-flagging)
9. [Data Transformation](#9-data-transformation)
10. [Error Handling](#10-error-handling)
11. [Rate Limiting](#11-rate-limiting)
12. [Cost Tracking](#12-cost-tracking)
13. [Background Job Integration](#13-background-job-integration)
14. [Testing Requirements](#14-testing-requirements)
15. [Performance Monitoring](#15-performance-monitoring)
16. [TypeScript Interfaces](#16-typescript-interfaces)

---

# 1. Document Overview

## 1.1 Architecture Overview

The AI Integration Layer serves as the bridge between the Oblicore platform and OpenAI's API. It handles all aspects of AI-powered document extraction, including:

- **Document Processing:** Extracting obligations, parameters, and run-hour records from permits and regulatory documents
- **Cost Optimization:** Minimizing API costs through batching, caching, and token optimization
- **Quality Assurance:** Ensuring extraction accuracy through confidence scoring and rule library validation
- **Error Resilience:** Handling API failures, rate limits, and timeouts gracefully
- **Integration:** Seamless integration with background jobs and the notification system

## 1.2 Key Principles

1. **Cost Efficiency:** Optimize token usage and leverage caching to minimize costs
2. **Reliability:** Implement robust error handling and retry logic
3. **Accuracy:** Use rule library validation and confidence scoring to ensure high-quality extractions
4. **Performance:** Minimize API response times through batching and optimization
5. **Observability:** Track costs, performance, and errors for continuous improvement

## 1.3 Integration Points

- **Background Jobs:** Document Processing Job calls the AI integration layer
- **Database:** Stores extraction results in `obligations`, `parameters`, `run_hour_records`, and `extraction_logs` tables
- **Rule Library:** Validates extractions against known patterns before using LLM
- **Notification System:** Notifies users of flagged items requiring review
- **Review Queue:** Creates review queue items for low-confidence extractions

---

# 2. API Key Management

## 2.1 API Key Storage

### Environment Variables

The AI Integration Layer uses environment variables for API key storage:

- **Primary Key:** `OPENAI_API_KEY` (required)
- **Fallback Keys:** `OPENAI_API_KEY_FALLBACK_1`, `OPENAI_API_KEY_FALLBACK_2` (optional)
- **Key Validation:** Test key validity on application startup
- **Key Rotation:** Support multiple keys for seamless rotation

### API Key Storage Implementation

```typescript
interface APIKeyConfig {
  primary: string;
  fallbacks: string[];
  currentKey: string;
  rotationEnabled: boolean;
}

class APIKeyManager {
  private config: APIKeyConfig;
  
  constructor() {
    this.config = {
      primary: process.env.OPENAI_API_KEY!,
      fallbacks: [
        process.env.OPENAI_API_KEY_FALLBACK_1,
        process.env.OPENAI_API_KEY_FALLBACK_2
      ].filter(Boolean) as string[],
      currentKey: process.env.OPENAI_API_KEY!,
      rotationEnabled: true
    };
  }
  
  async validateKey(key: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { 
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        }
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
  
  async rotateKey(): Promise<void> {
    if (this.config.fallbacks.length === 0) {
      throw new Error('No fallback keys available for rotation');
    }
    
    // Rotate to next fallback key
    const nextKey = this.config.fallbacks[0];
    const isValid = await this.validateKey(nextKey);
    
    if (!isValid) {
      throw new Error('Fallback key validation failed');
    }
    
    // Update current key
    this.config.currentKey = nextKey;
    this.config.fallbacks = this.config.fallbacks.slice(1);
  }
  
  getCurrentKey(): string {
    return this.config.currentKey;
  }
  
  async getFallbackKey(): Promise<string | null> {
    for (const key of this.config.fallbacks) {
      const isValid = await this.validateKey(key);
      if (isValid) {
        return key;
      }
    }
    return null;
  }
}
```

## 2.2 API Key Usage

### Primary Key Strategy

- **Default Key:** Use primary key for all requests
- **Failover Logic:** Automatically switch to fallback keys if primary fails
- **Key Rotation:** Rotate keys periodically (every 90 days)
- **Key Validation:** Validate keys on startup and periodically

### Key Rotation Implementation

```typescript
async function rotateAPIKey(): Promise<void> {
  const manager = new APIKeyManager();
  
  // 1. Generate new key in OpenAI dashboard
  // 2. Update environment variable (fallback key)
  // 3. Test new key validity
  const newKey = process.env.OPENAI_API_KEY_NEW;
  const isValid = await manager.validateKey(newKey!);
  
  if (!isValid) {
    throw new Error('New key validation failed');
  }
  
  // 4. Switch to new key
  await manager.rotateKey();
  
  // 5. Keep old key as fallback for 7 days
  // 6. Remove old key after 7 days
}
```

## 2.3 Key Validation

### Validation Strategy

- **Startup Validation:** Test all keys on application startup
- **Periodic Validation:** Validate keys every 24 hours
- **Failure Handling:** Alert admins if all keys invalid
- **Validation Endpoint:** Test key with minimal API call

### Validation Implementation

```typescript
async function validateAPIKey(key: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { 
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      }
    });
    return response.ok;
  } catch (error) {
    console.error('API key validation failed:', error);
    return false;
  }
}

async function validateAllKeys(): Promise<{ primary: boolean; fallbacks: boolean[] }> {
  const manager = new APIKeyManager();
  const primary = await validateAPIKey(manager.getCurrentKey());
  const fallbacks = await Promise.all(
    manager.config.fallbacks.map(key => validateAPIKey(key))
  );
  
  return { primary, fallbacks };
}

// Validate on startup
async function initializeAPIKeys(): Promise<void> {
  const validation = await validateAllKeys();
  
  if (!validation.primary && !validation.fallbacks.some(v => v)) {
    // Alert admins
    await notifyAdmins({
      type: 'CRITICAL',
      message: 'All OpenAI API keys are invalid',
      timestamp: new Date()
    });
    throw new Error('No valid API keys available');
  }
}
```

---

# 3. Request Formatting

## 3.1 OpenAI API Request Structure

### Model Selection

- **Primary Model:** GPT-4.1 (for high-accuracy extractions)
- **Fallback Model:** GPT-4.1 Mini (for cost optimization, fallback scenarios)
- **Model Selection Logic:** Use GPT-4.1 for complex documents, GPT-4.1 Mini for simple documents
- **Model Fallback:** Automatically fallback to GPT-4.1 Mini if GPT-4.1 fails

### Request Format

- **System Message:** Load from prompt template (see Section 5)
- **User Message:** Load from prompt template, substitute variables
- **JSON Schema:** Enforce structured JSON output
- **Temperature:** 0.2 (low temperature for consistent outputs)
- **Max Tokens:** 4000 (for obligation extraction), 2000 (for parameter extraction)

### Request Formatting Code

```typescript
interface OpenAIRequest {
  model: 'gpt-4o' | 'gpt-4o-mini';
  messages: Array<{
    role: 'system' | 'user';
    content: string;
  }>;
  response_format: { type: 'json_object' };
  temperature: number;
  max_tokens: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

interface RequestConfig {
  model: 'gpt-4o' | 'gpt-4o-mini';
  temperature: number;
  maxTokens: number;
  systemMessage: string;
  userMessage: string;
  jsonSchema?: object;
}

async function formatOpenAIRequest(
  config: RequestConfig,
  documentContent: string
): Promise<OpenAIRequest> {
  // Substitute variables in user message
  const userMessage = config.userMessage.replace('{{document}}', documentContent);
  
  return {
    model: config.model,
    messages: [
      { role: 'system', content: config.systemMessage },
      { role: 'user', content: userMessage }
    ],
    response_format: { type: 'json_object' },
    temperature: config.temperature,
    max_tokens: config.maxTokens,
    top_p: 1.0,
    frequency_penalty: 0.0,
    presence_penalty: 0.0
  };
}

// Example usage
const requestConfig: RequestConfig = {
  model: 'gpt-4o',
  temperature: 0.2,
  maxTokens: 4000,
  systemMessage: 'You are an expert at extracting compliance obligations from environmental permits.',
  userMessage: 'Extract all obligations from the following permit:\n\n{{document}}'
};

const request = await formatOpenAIRequest(requestConfig, documentContent);
```

## 3.2 Token Optimization

### Prompt Compression

- **Remove Unnecessary Whitespace:** Compress prompts before sending
- **Minimize Context:** Only include relevant document sections
- **Optimize JSON Schema:** Use concise schema definitions
- **Token Counting:** Count tokens before sending (enforce limits)

### Token Optimization Implementation

```typescript
function compressPrompt(prompt: string): string {
  // Remove extra whitespace
  // Remove comments
  // Optimize structure
  return prompt
    .replace(/\s+/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
    .replace(/\/\/.*$/gm, '') // Remove line comments
    .trim();
}

function countTokens(text: string): number {
  // Use tiktoken or similar library
  // Approximate: 1 token ≈ 4 characters
  // For accurate counting, use tiktoken library
  return Math.ceil(text.length / 4);
}

function optimizePrompt(prompt: string, maxTokens: number): string {
  const compressed = compressPrompt(prompt);
  const tokenCount = countTokens(compressed);
  
  if (tokenCount <= maxTokens) {
    return compressed;
  }
  
  // Truncate if necessary (should rarely happen)
  const ratio = maxTokens / tokenCount;
  const truncatedLength = Math.floor(prompt.length * ratio);
  return prompt.substring(0, truncatedLength);
}
```

## 3.3 Request Batching

### Batching Strategy

- **Batch Size:** Up to 5 documents per batch (respect token limits)
- **Batch Processing:** Process multiple documents in single API call
- **Batch Error Handling:** Handle partial batch failures gracefully
- **Batch Optimization:** Group similar documents together

### Batching Implementation

```typescript
interface BatchRequest {
  documents: Array<{ id: string; content: string }>;
  maxBatchSize: number;
  maxTokensPerBatch: number;
}

interface BatchResult {
  documentId: string;
  result: any;
  error?: Error;
}

async function batchProcessDocuments(
  batch: BatchRequest
): Promise<BatchResult[]> {
  const results: BatchResult[] = [];
  
  // Group documents into batches
  const batches: Array<Array<{ id: string; content: string }>> = [];
  let currentBatch: Array<{ id: string; content: string }> = [];
  let currentTokens = 0;
  
  for (const doc of batch.documents) {
    const docTokens = countTokens(doc.content);
    
    if (currentBatch.length >= batch.maxBatchSize || 
        currentTokens + docTokens > batch.maxTokensPerBatch) {
      if (currentBatch.length > 0) {
        batches.push([...currentBatch]);
        currentBatch = [];
        currentTokens = 0;
      }
    }
    
    currentBatch.push(doc);
    currentTokens += docTokens;
  }
  
  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }
  
  // Process each batch
  for (const batchGroup of batches) {
    try {
      const batchResult = await processBatch(batchGroup);
      results.push(...batchResult);
    } catch (error) {
      // Handle batch failure - process individually
      for (const doc of batchGroup) {
        try {
          const result = await processDocument(doc);
          results.push({ documentId: doc.id, result });
        } catch (err) {
          results.push({ documentId: doc.id, error: err as Error });
        }
      }
    }
  }
  
  return results;
}

async function processBatch(
  documents: Array<{ id: string; content: string }>
): Promise<BatchResult[]> {
  // Combine documents into single request
  const combinedContent = documents.map(d => d.content).join('\n\n---\n\n');
  const request = await formatOpenAIRequest({
    model: 'gpt-4o',
    temperature: 0.2,
    maxTokens: 4000,
    systemMessage: 'Extract obligations from multiple permits.',
    userMessage: combinedContent
  }, '');
  
  const response = await callOpenAI(request);
  // Parse response and map back to documents
  return parseBatchResponse(response, documents);
}
```

---

# 4. Cost Optimization Implementation

## 4.1 Token Management

### Token Counting

- **Input Tokens:** Count tokens in system message + user message
- **Output Tokens:** Count tokens in LLM response
- **Token Limits:** Enforce 1M token context limit (GPT-4.1), 128K (GPT-4.1 Mini)
- **Token Tracking:** Track token usage per request, per document, per module

### Token Counting Implementation

```typescript
import { encoding_for_model } from 'tiktoken';

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  model: string;
  estimatedCost: number;
}

class TokenCounter {
  private encoders: Map<string, any> = new Map();
  
  async countTokens(text: string, model: string): Promise<number> {
    if (!this.encoders.has(model)) {
      try {
        this.encoders.set(model, encoding_for_model(model));
      } catch (error) {
        // Fallback to approximation if model not found
        return Math.ceil(text.length / 4);
      }
    }
    
    const encoder = this.encoders.get(model);
    return encoder.encode(text).length;
  }
  
  async countRequestTokens(
    request: OpenAIRequest,
    response: OpenAIResponse
  ): Promise<TokenUsage> {
    const inputTokens = await this.countInputTokens(request);
    const outputTokens = await this.countOutputTokens(response);
    const totalTokens = inputTokens + outputTokens;
    const estimatedCost = calculateCost(inputTokens, outputTokens, request.model);
    
    return {
      inputTokens,
      outputTokens,
      totalTokens,
      model: request.model,
      estimatedCost
    };
  }
  
  private async countInputTokens(request: OpenAIRequest): Promise<number> {
    let total = 0;
    for (const message of request.messages) {
      total += await this.countTokens(message.content, request.model);
    }
    // Add overhead for message structure (approximately 4 tokens per message)
    total += request.messages.length * 4;
    return total;
  }
  
  private async countOutputTokens(response: OpenAIResponse): Promise<number> {
    if (response.usage) {
      return response.usage.completion_tokens;
    }
    return await this.countTokens(
      response.choices[0].message.content,
      response.model
    );
  }
  
  calculateCost(usage: TokenUsage): number {
    return calculateCost(usage.inputTokens, usage.outputTokens, usage.model);
  }
}
```

### Token Limits Enforcement

- **Pre-request Validation:** Check token count before API call
- **Truncation Strategy:** Truncate document content if exceeds limit
- **Error Handling:** Return error if document too large
- **Optimization:** Compress prompts to fit within limits

```typescript
function enforceTokenLimit(
  content: string,
  model: string,
  maxTokens: number
): { content: string; truncated: boolean } {
  const counter = new TokenCounter();
  const tokenCount = counter.countTokens(content, model);
  
  if (tokenCount <= maxTokens) {
    return { content, truncated: false };
  }
  
  // Truncate content
  const ratio = maxTokens / tokenCount;
  const truncatedLength = Math.floor(content.length * ratio * 0.9); // 90% to leave margin
  return {
    content: content.substring(0, truncatedLength),
    truncated: true
  };
}
```

## 4.2 Batching Strategy

### Batch Size Limits

- **Maximum Batch Size:** 5 documents per batch
- **Token Limit per Batch:** 800K tokens (leave margin for 1M limit)
- **Batch Optimization:** Group documents by size/complexity
- **Batch Error Handling:** Handle partial batch failures

### Batching Implementation

```typescript
interface BatchConfig {
  maxDocuments: number;
  maxTokensPerBatch: number;
  batchTimeout: number; // milliseconds
}

class DocumentBatcher {
  private config: BatchConfig;
  private tokenCounter: TokenCounter;
  
  constructor(config: BatchConfig) {
    this.config = config;
    this.tokenCounter = new TokenCounter();
  }
  
  async createBatches(
    documents: Document[],
    model: string
  ): Promise<Document[][]> {
    const batches: Document[][] = [];
    let currentBatch: Document[] = [];
    let currentTokens = 0;
    
    for (const doc of documents) {
      const docTokens = await this.tokenCounter.countTokens(doc.content, model);
      
      if (currentBatch.length >= this.config.maxDocuments ||
          currentTokens + docTokens > this.config.maxTokensPerBatch) {
        if (currentBatch.length > 0) {
          batches.push([...currentBatch]);
          currentBatch = [];
          currentTokens = 0;
        }
      }
      
      currentBatch.push(doc);
      currentTokens += docTokens;
    }
    
    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }
    
    return batches;
  }
  
  async processBatch(batch: Document[]): Promise<BatchResult> {
    // Process batch with timeout
    return Promise.race([
      this.executeBatch(batch),
      new Promise<BatchResult>((_, reject) =>
        setTimeout(() => reject(new Error('Batch timeout')), this.config.batchTimeout)
      )
    ]);
  }
  
  private async executeBatch(batch: Document[]): Promise<BatchResult> {
    // Implementation for batch processing
    // ...
  }
}
```

### Batch Error Handling

- **Partial Failures:** Continue processing successful documents
- **Retry Logic:** Retry failed documents individually
- **Error Reporting:** Report which documents failed and why
- **Recovery:** Allow manual retry of failed documents

## 4.3 Caching Strategy

### Cache Rule Library Matches

- **Cache Key:** Document hash + rule pattern hash
- **Cache Threshold:** ≥90% match = cache result
- **Cache TTL:** 30 days (or until rule library updated)
- **Cache Invalidation:** Invalidate on rule library updates

### Cache Identical Segments

- **Segment Identification:** Identify identical document segments
- **Cache Key:** Segment hash
- **Cache Result:** LLM extraction result for segment
- **Cache Reuse:** Reuse cached results for identical segments

### Cache Implementation

```typescript
import crypto from 'crypto';

interface CacheEntry {
  key: string;
  value: any;
  ttl: number;
  createdAt: Date;
}

class ExtractionCache {
  private cache: Map<string, CacheEntry> = new Map();
  
  private generateKey(documentHash: string, patternHash?: string): string {
    if (patternHash) {
      return `${documentHash}:${patternHash}`;
    }
    return documentHash;
  }
  
  async get(key: string): Promise<any | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check TTL
    const age = Date.now() - entry.createdAt.getTime();
    if (age > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.value;
  }
  
  async set(key: string, value: any, ttl: number = 30 * 24 * 60 * 60 * 1000): Promise<void> {
    this.cache.set(key, {
      key,
      value,
      ttl,
      createdAt: new Date()
    });
  }
  
  async invalidate(pattern: string): Promise<void> {
    for (const [key, entry] of this.cache.entries()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
  
  async getCacheHitRate(): Promise<number> {
    // Calculate cache hit rate
    // This would require tracking hits/misses
    return 0; // Placeholder
  }
}

// Usage
const cache = new ExtractionCache();
const documentHash = crypto.createHash('sha256').update(documentContent).digest('hex');
const cachedResult = await cache.get(documentHash);

if (cachedResult) {
  return cachedResult;
}

// Process document and cache result
const result = await processDocument(documentContent);
await cache.set(documentHash, result);
```

### Cache Invalidation

- **Rule Library Updates:** Invalidate all rule-related caches
- **Manual Invalidation:** Allow admins to invalidate cache
- **TTL Expiration:** Automatic expiration based on TTL
- **Cache Monitoring:** Monitor cache hit rates

---

# 5. Prompt Template Integration

## 5.1 Prompt Template Loading

### Template Source

- **Load from:** AI Microservice Prompts (Document 1.7)
- **Template Storage:** Store templates in database or file system
- **Template Versioning:** Track prompt versions, support A/B testing
- **Template Validation:** Validate template syntax on load

### Template Loading Implementation

```typescript
interface PromptTemplate {
  id: string;
  name: string;
  version: string;
  systemMessage: string;
  userMessage: string;
  jsonSchema: object;
  variables: string[];
}

class PromptTemplateLoader {
  private templates: Map<string, PromptTemplate> = new Map();
  
  async loadTemplate(templateId: string, version?: string): Promise<PromptTemplate> {
    const cacheKey = version ? `${templateId}:${version}` : templateId;
    
    if (this.templates.has(cacheKey)) {
      return this.templates.get(cacheKey)!;
    }
    
    // Load from database or file system
    const template = await this.fetchTemplate(templateId, version);
    
    // Validate template
    this.validateTemplate(template);
    
    // Cache template
    this.templates.set(cacheKey, template);
    
    return template;
  }
  
  async getLatestVersion(templateId: string): Promise<PromptTemplate> {
    // Query database for latest version
    const versions = await db.query(`
      SELECT version FROM prompt_templates
      WHERE id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `, [templateId]);
    
    if (versions.length === 0) {
      throw new Error(`Template not found: ${templateId}`);
    }
    
    return await this.loadTemplate(templateId, versions[0].version);
  }
  
  private validateTemplate(template: PromptTemplate): void {
    if (!template.systemMessage || !template.userMessage) {
      throw new Error('Template must have system and user messages');
    }
    
    // Validate JSON schema
    if (!template.jsonSchema || typeof template.jsonSchema !== 'object') {
      throw new Error('Template must have valid JSON schema');
    }
  }
  
  private async fetchTemplate(templateId: string, version?: string): Promise<PromptTemplate> {
    // Implementation to fetch from database
    // This would query the prompt_templates table
    // ...
  }
}
```

## 5.2 Template Variable Substitution

### Variable Substitution

- **Variable Format:** `{{variable_name}}`
- **Required Variables:** `{{document}}`, `{{site_id}}`, `{{document_type}}`
- **Optional Variables:** `{{context}}`, `{{previous_extractions}}`
- **Variable Validation:** Validate all required variables present

### Variable Substitution Implementation

```typescript
interface TemplateVariables {
  document?: string;
  siteId?: string;
  documentType?: string;
  context?: string;
  [key: string]: any;
}

function substituteVariables(
  template: string,
  variables: TemplateVariables
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (variables[key] === undefined) {
      throw new Error(`Missing required variable: ${key}`);
    }
    return String(variables[key]);
  });
}

// Example usage
const template = 'Extract obligations from {{document_type}} for site {{site_id}}:\n\n{{document}}';
const variables: TemplateVariables = {
  document: documentContent,
  siteId: 'site-123',
  documentType: 'Environmental Permit'
};

const substituted = substituteVariables(template, variables);
```

## 5.3 Template Versioning

### Version Management

- **Version Format:** Semantic versioning (e.g., "1.0.0")
- **Version Tracking:** Track which version used for each extraction
- **A/B Testing:** Support multiple versions for testing
- **Version Rollback:** Rollback to previous version if issues

### Version Tracking Implementation

```typescript
interface TemplateVersion {
  templateId: string;
  version: string;
  createdAt: Date;
  isActive: boolean;
  usageCount: number;
}

async function trackTemplateUsage(
  templateId: string,
  version: string,
  extractionId: string
): Promise<void> {
  await db.query(`
    INSERT INTO template_usage_logs (
      template_id, version, extraction_id, used_at
    ) VALUES ($1, $2, $3, NOW())
  `, [templateId, version, extractionId]);
  
  // Update usage count
  await db.query(`
    UPDATE template_versions
    SET usage_count = usage_count + 1
    WHERE template_id = $1 AND version = $2
  `, [templateId, version]);
}
```

## 5.4 Prompt Template Usage

### System Message

- **Load from Template:** Load system message from prompt template
- **Variable Substitution:** Substitute variables in system message
- **Validation:** Validate system message before use

### User Message

- **Load from Template:** Load user message from prompt template
- **Variable Substitution:** Substitute document content and other variables
- **Context Addition:** Add relevant context (previous extractions, site info)

### JSON Schema

- **Load from Template:** Load JSON schema from prompt template
- **Schema Validation:** Validate schema structure
- **Schema Enforcement:** Enforce schema in API request

```typescript
async function buildPrompt(
  templateId: string,
  variables: TemplateVariables
): Promise<{ systemMessage: string; userMessage: string; jsonSchema: object }> {
  const loader = new PromptTemplateLoader();
  const template = await loader.getLatestVersion(templateId);
  
  const systemMessage = substituteVariables(template.systemMessage, variables);
  const userMessage = substituteVariables(template.userMessage, variables);
  
  return {
    systemMessage,
    userMessage,
    jsonSchema: template.jsonSchema
  };
}
```

---

# 6. Confidence Scoring

## 6.1 Confidence Score Interpretation

### LLM Confidence Scores

- **Extract from Response:** LLM provides confidence scores in JSON response
- **Score Range:** 0-100 (percentage)
- **Score Interpretation:** Higher score = more confident extraction
- **Score Validation:** Validate confidence scores are within range

### Confidence Score Structure

```typescript
interface ConfidenceScore {
  score: number; // 0-100
  source: 'llm' | 'rule_library' | 'combined';
  factors: {
    llmConfidence?: number;
    ruleMatch?: boolean;
    patternMatch?: number;
  };
}

interface ExtractionResult {
  obligation: Obligation;
  confidence: ConfidenceScore;
  flagged: boolean;
  reviewRequired: boolean;
}

function extractConfidenceScore(llmResponse: any): ConfidenceScore {
  const llmConfidence = llmResponse.confidence || 0;
  
  return {
    score: llmConfidence,
    source: 'llm',
    factors: {
      llmConfidence
    }
  };
}
```

## 6.2 Confidence Thresholds

### Threshold Configuration

- **Auto-extract Threshold:** >85% = auto-extract, no review needed
- **Review Threshold:** <85% = flag for human review
- **Critical Threshold:** <70% = high priority review
- **Subjective Threshold:** Always flag subjective obligations (see PLS Section A.6)

### Threshold Application

```typescript
function applyConfidenceThreshold(
  confidence: ConfidenceScore,
  isSubjective: boolean
): { autoExtract: boolean; reviewRequired: boolean } {
  // Always flag subjective obligations
  if (isSubjective) {
    return { autoExtract: false, reviewRequired: true };
  }
  
  // Auto-extract high confidence items
  if (confidence.score > 85) {
    return { autoExtract: true, reviewRequired: false };
  }
  
  // Flag for review
  return { autoExtract: false, reviewRequired: true };
}

function getPriority(confidence: number): 'low' | 'medium' | 'high' {
  if (confidence < 70) {
    return 'high';
  }
  if (confidence < 85) {
    return 'medium';
  }
  return 'low';
}
```

## 6.3 Confidence Boost

### Rule Library Boost

- **Library Match Boost:** +15% confidence boost for rule library matches
- **Pattern Match Boost:** +10% confidence boost for pattern matches (≥90% match)
- **Combined Scoring:** Combine LLM confidence + rule library boost
- **Boost Calculation:** `final_confidence = min(100, llm_confidence + boost)`

### Confidence Boost Implementation

```typescript
function applyConfidenceBoost(
  llmConfidence: number,
  hasRuleMatch: boolean,
  patternMatchScore?: number
): ConfidenceScore {
  let boosted = llmConfidence;
  
  if (hasRuleMatch) {
    boosted += 15; // Rule library match boost
  }
  
  if (patternMatchScore && patternMatchScore >= 0.9) {
    boosted += 10; // Pattern match boost
  }
  
  const finalScore = Math.min(100, boosted);
  
  return {
    score: finalScore,
    source: hasRuleMatch ? 'combined' : 'llm',
    factors: {
      llmConfidence,
      ruleMatch: hasRuleMatch,
      patternMatch: patternMatchScore
    }
  };
}
```

## 6.4 Confidence Score Application

### Threshold Comparison

- **Compare Scores:** Compare confidence scores to thresholds
- **Auto-extract:** Automatically extract high-confidence items
- **Flag for Review:** Flag low-confidence items for human review
- **Log Scores:** Store confidence scores in extraction_logs table `metadata` JSONB field

### Confidence Logging

```typescript
async function logConfidenceScore(
  extractionLogId: string,
  confidence: ConfidenceScore,
  decision: 'auto_extract' | 'flagged_for_review'
): Promise<void> {
  // Store confidence score in metadata JSONB field
  await db.query(`
    UPDATE extraction_logs
    SET 
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
        'confidence_score', $1,
        'confidence_source', $2,
        'extraction_decision', $3
      ),
      updated_at = NOW()
    WHERE id = $4
  `, [
    confidence.score,
    confidence.source,
    decision,
    extractionLogId
  ]);
}
```

---

# 7. Rules Library Integration

## 7.1 Rule Library Lookup

### Pattern Matching Strategy

- **Step 1:** Try regex patterns first (fastest, most accurate)
- **Step 2:** If no regex match, try semantic matching (slower, more flexible)
- **Step 3:** If no match, proceed with LLM extraction
- **Match Threshold:** ≥90% match = use library rule

### Pattern Matching Implementation

```typescript
interface RuleMatch {
  ruleId: string;
  patternId: string;
  matchScore: number;
  matchType: 'regex' | 'semantic';
  extractedData: any;
}

class RuleLibraryMatcher {
  async findMatches(
    documentContent: string,
    documentType: string
  ): Promise<RuleMatch[]> {
    // 1. Try regex patterns
    const regexMatches = await this.tryRegexPatterns(documentContent, documentType);
    if (regexMatches.length > 0 && regexMatches[0].matchScore >= 0.9) {
      return regexMatches;
    }
    
    // 2. Try semantic matching
    const semanticMatches = await this.trySemanticMatching(documentContent, documentType);
    return semanticMatches.filter(m => m.matchScore >= 0.9);
  }
  
  private async tryRegexPatterns(
    content: string,
    type: string
  ): Promise<RuleMatch[]> {
    // Load regex patterns for document type from rule library
    const patterns = await this.loadRegexPatterns(type);
    const matches: RuleMatch[] = [];
    
    for (const pattern of patterns) {
      const regex = new RegExp(pattern.pattern, pattern.flags || 'gi');
      const match = content.match(regex);
      
      if (match) {
        matches.push({
          ruleId: pattern.ruleId,
          patternId: pattern.id,
          matchScore: 0.95, // High confidence for regex matches
          matchType: 'regex',
          extractedData: this.extractDataFromMatch(match, pattern)
        });
      }
    }
    
    return matches.sort((a, b) => b.matchScore - a.matchScore);
  }
  
  private async trySemanticMatching(
    content: string,
    type: string
  ): Promise<RuleMatch[]> {
    // Use embedding similarity for semantic matching
    // This would use OpenAI embeddings or similar
    const embeddings = await this.getEmbeddings(content);
    const patterns = await this.loadSemanticPatterns(type);
    
    const matches: RuleMatch[] = [];
    
    for (const pattern of patterns) {
      const similarity = await this.calculateSimilarity(embeddings, pattern.embedding);
      
      if (similarity >= 0.9) {
        matches.push({
          ruleId: pattern.ruleId,
          patternId: pattern.id,
          matchScore: similarity,
          matchType: 'semantic',
          extractedData: pattern.extractedData
        });
      }
    }
    
    return matches.sort((a, b) => b.matchScore - a.matchScore);
  }
  
  private extractDataFromMatch(match: RegExpMatchArray, pattern: any): any {
    // Extract structured data from regex match
    // This would parse the match groups according to pattern schema
    return {};
  }
  
  private async loadRegexPatterns(type: string): Promise<any[]> {
    // Load from rule library database
    return [];
  }
  
  private async loadSemanticPatterns(type: string): Promise<any[]> {
    // Load from rule library database
    return [];
  }
  
  private async getEmbeddings(text: string): Promise<number[]> {
    // Get embeddings for text
    // This would call OpenAI embeddings API
    return [];
  }
  
  private async calculateSimilarity(
    embedding1: number[],
    embedding2: number[]
  ): Promise<number> {
    // Calculate cosine similarity
    // Implementation would use vector similarity calculation
    return 0;
  }
}
```

## 7.2 Match Threshold

### Threshold Application

- **High Confidence:** ≥90% match = use library rule, skip LLM
- **Medium Confidence:** 70-89% match = use library rule + LLM validation
- **Low Confidence:** <70% match = use LLM extraction only
- **Threshold Configuration:** Configurable per rule pattern

## 7.3 Rule Library Application

### Validate Extractions

- **Compare Output:** Compare LLM output to library patterns
- **Validation Logic:** Check if LLM output matches known patterns
- **Apply Rules:** Use library rules when match found
- **Fallback:** Use LLM extraction if no library match

### Rule Application Implementation

```typescript
async function applyRuleLibrary(
  documentContent: string,
  documentType: string,
  llmOutput: any
): Promise<{ useLibrary: boolean; ruleMatch?: RuleMatch; llmOutput?: any }> {
  const matcher = new RuleLibraryMatcher();
  
  // 1. Try rule library first
  const matches = await matcher.findMatches(documentContent, documentType);
  
  if (matches.length > 0 && matches[0].matchScore >= 0.9) {
    return {
      useLibrary: true,
      ruleMatch: matches[0]
    };
  }
  
  // 2. Validate LLM output against library patterns
  const llmValidation = await validateLLMOutput(llmOutput, documentType);
  
  if (llmValidation.matchScore >= 0.9) {
    return {
      useLibrary: true,
      ruleMatch: llmValidation
    };
  }
  
  // 3. Use LLM output
  return {
    useLibrary: false,
    llmOutput
  };
}

async function validateLLMOutput(
  llmOutput: any,
  documentType: string
): Promise<RuleMatch> {
  // Compare LLM output to known patterns
  // Calculate match score
  // Return best match if score >= 0.9
  const matcher = new RuleLibraryMatcher();
  const matches = await matcher.findMatches(JSON.stringify(llmOutput), documentType);
  
  if (matches.length > 0 && matches[0].matchScore >= 0.9) {
    return matches[0];
  }
  
  return {
    ruleId: '',
    patternId: '',
    matchScore: 0,
    matchType: 'semantic',
    extractedData: {}
  };
}

function transformRuleMatchToObligations(
  ruleMatch: RuleMatch,
  documentId: string,
  siteId: string,
  companyId: string,
  moduleId: string
): Obligation[] {
  // Transform rule match extracted data to obligations
  const extractedData = ruleMatch.extractedData;
  
  if (!extractedData.obligations || !Array.isArray(extractedData.obligations)) {
    return [];
  }
  
  return extractedData.obligations.map((obligation: any) => ({
    id: crypto.randomUUID(),
    document_id: documentId,
    company_id: companyId,
    site_id: siteId,
    module_id: moduleId,
    summary: obligation.title || obligation.summary,
    original_text: obligation.description || obligation.title || '',
    category: obligation.category || 'RECORD_KEEPING',
    frequency: mapFrequency(obligation.frequency || 'ANNUAL'),
    deadline_date: obligation.deadline_date ? new Date(obligation.deadline_date) : null,
    is_subjective: obligation.is_subjective || false,
    confidence_score: ruleMatch.matchScore, // Use match score as confidence (0-1)
    review_status: 'PENDING',
    status: 'PENDING',
    created_at: new Date(),
    updated_at: new Date()
  }));
}
```

## 7.4 Rule Usage Logging

### Usage Tracking

- **Track Patterns:** Log which patterns matched
- **Track Frequency:** Track how often each pattern used
- **Track Accuracy:** Track accuracy of rule-based extractions
- **Analytics:** Generate analytics on rule library effectiveness

### Usage Logging Implementation

```typescript
async function logRuleUsage(
  ruleId: string,
  patternId: string,
  matchScore: number,
  extractionId: string
): Promise<void> {
  await db.query(`
    INSERT INTO rule_usage_logs (
      rule_id, pattern_id, match_score, extraction_id, used_at
    ) VALUES ($1, $2, $3, $4, NOW())
  `, [ruleId, patternId, matchScore, extractionId]);
}
```

---

# 8. Low-Confidence Item Flagging

## 8.1 Flagging Logic

### Confidence-Based Flagging

- **Low Confidence:** Confidence <85% = flag for human review
- **Critical Flagging:** Confidence <70% = high priority review
- **Subjective Obligations:** Always flag (see PLS Section A.6)
- **Novel Patterns:** Flag if no library match and confidence <90%

### Flagging Criteria

```typescript
interface FlaggingCriteria {
  confidenceThreshold: number;
  isSubjective: boolean;
  hasRuleMatch: boolean;
  isNovelPattern: boolean;
}

function shouldFlagItem(
  confidence: number,
  criteria: FlaggingCriteria
): boolean {
  // Always flag subjective obligations
  if (criteria.isSubjective) {
    return true;
  }
  
  // Flag low confidence
  if (confidence < criteria.confidenceThreshold) {
    return true;
  }
  
  // Flag novel patterns without rule match
  if (criteria.isNovelPattern && !criteria.hasRuleMatch && confidence < 90) {
    return true;
  }
  
  return false;
}
```

## 8.2 Flagging Implementation

### Review Queue Creation

- **Create Review Items:** Insert flagged items into `review_queue_items` table
- **Priority Assignment:** Assign priority based on confidence score
- **Metadata Storage:** Store extraction metadata for review
- **Status Tracking:** Track review status (pending, reviewed, approved, rejected)

### Review Queue Implementation

```typescript
interface ReviewQueueItem {
  id: string;
  extractionId: string;
  documentId: string;
  obligationId?: string;
  confidenceScore: number;
  flagReason: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'reviewed' | 'approved' | 'rejected';
  createdAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
}

async function createReviewQueueItem(
  extraction: ExtractionResult,
  flagReason: string
): Promise<ReviewQueueItem> {
  const priority = extraction.confidence.score < 70 ? 'high' : 
                   extraction.confidence.score < 85 ? 'medium' : 'low';
  
  const result = await db.query(`
    INSERT INTO review_queue_items (
      extraction_id, document_id, confidence_score, flag_reason, priority, status
    ) VALUES ($1, $2, $3, $4, $5, 'pending')
    RETURNING *
  `, [
    extraction.id,
    extraction.documentId,
    extraction.confidence.score,
    flagReason,
    priority
  ]);
  
  return result.rows[0];
}
```

## 8.3 Notification System

### User Notifications

- **Notification Creation:** Create notification for flagged items
- **Notification Type:** "Review Required" notification
- **Notification Delivery:** Email + in-app notification
- **Notification Content:** Include obligation details, confidence score, flag reason

### Notification Implementation

```typescript
async function notifyReviewRequired(
  userId: string,
  reviewItem: ReviewQueueItem
): Promise<void> {
  await db.query(`
    INSERT INTO notifications (
      user_id, type, title, message, action_url, priority, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
  `, [
    userId,
    'REVIEW_REQUIRED',
    'Obligation Review Required',
    `An obligation requires review (Confidence: ${reviewItem.confidenceScore}%)`,
    `/review/${reviewItem.id}`,
    reviewItem.priority,
    JSON.stringify({
      reviewItemId: reviewItem.id,
      confidenceScore: reviewItem.confidenceScore,
      flagReason: reviewItem.flagReason
    })
  ]);
}
```

## 8.4 Review Workflow

### Review Process

- **User Review:** Users review flagged items in review queue
- **Actions:** Approve, reject, or edit extraction
- **Status Update:** Update review queue item status
- **Obligation Creation:** Create obligation if approved
- **Feedback Loop:** Use review feedback to improve extraction accuracy

---

# 9. Data Transformation

## 9.1 LLM Output to Database Format

### Transformation Strategy

- **Map Obligations:** Transform LLM output to obligations table schema
- **Map Parameters:** Transform LLM output to parameters table schema (Module 2)
- **Map Run-Hours:** Transform LLM output to run_hour_records table schema (Module 3)
- **Validate Data:** Validate transformed data before insertion
- **Apply Business Rules:** Apply business logic during transformation

### Transformation Interfaces

```typescript
interface LLMObligationOutput {
  obligations: Array<{
    title: string;
    frequency: string;
    deadline_date?: string;
    description?: string;
    is_subjective?: boolean;
    confidence?: number;
  }>;
}

interface LLMParameterOutput {
  parameters: Array<{
    name: string;
    current_value: number;
    limit: number;
    unit: string;
  }>;
}

interface LLMRunHourOutput {
  generators: Array<{
    generator_name: string;
    run_hours: number;
    date: string;
  }>;
}
```

## 9.2 Obligation Transformation

### Obligation Mapping

- **Title Mapping:** Map `title` to `obligation_title`
- **Frequency Mapping:** Map `frequency` to `frequency` enum
- **Deadline Mapping:** Parse `deadline_date` to Date object
- **Description Mapping:** Map `description` to `description`
- **Subjective Flag:** Map `is_subjective` to `is_subjective`
- **Confidence:** Store confidence score

### Obligation Transformation Implementation

```typescript
type Frequency = 'ANNUAL' | 'MONTHLY' | 'QUARTERLY' | 'WEEKLY' | 'DAILY' | 'ONE_TIME';

function transformLLMOutputToObligations(
  llmOutput: LLMObligationOutput,
  documentId: string,
  siteId: string,
  importSource: 'PDF_EXTRACTION' | 'EXCEL_IMPORT' | 'MANUAL'
): Obligation[] {
  return llmOutput.obligations.map((obligation, index) => {
    // Validate required fields
    if (!obligation.title || !obligation.frequency) {
      throw new Error(`Missing required fields in obligation ${index}`);
    }
    
    // Parse deadline date
    let deadlineDate: Date | null = null;
    if (obligation.deadline_date) {
      deadlineDate = new Date(obligation.deadline_date);
      if (isNaN(deadlineDate.getTime())) {
        throw new Error(`Invalid deadline date: ${obligation.deadline_date}`);
      }
    }
    
    // Map to database schema
    // Note: The obligations table uses 'summary' for obligation title and 'original_text' for full text
    return {
      id: crypto.randomUUID(),
      document_id: documentId,
      company_id: companyId,
      site_id: siteId,
      module_id: moduleId,
      summary: obligation.title, // obligation_title maps to summary field
      original_text: obligation.description || obligation.title, // Use description or title as original_text
      category: 'RECORD_KEEPING', // Default category, can be extracted from LLM if available
      frequency: mapFrequency(obligation.frequency),
      deadline_date: deadlineDate,
      is_subjective: obligation.is_subjective || false,
      confidence_score: (obligation.confidence || 0) / 100, // Convert percentage to decimal (0-1)
      review_status: 'PENDING', // Default review status
      status: 'PENDING', // Default status
      import_source: importSource,
      created_at: new Date(),
      updated_at: new Date()
    };
  });
}

function mapFrequency(frequency: string): Frequency {
  // Map frequency string to enum
  const frequencyMap: Record<string, Frequency> = {
    'annual': 'ANNUAL',
    'monthly': 'MONTHLY',
    'quarterly': 'QUARTERLY',
    'weekly': 'WEEKLY',
    'daily': 'DAILY',
    'one_time': 'ONE_TIME',
    'one-time': 'ONE_TIME'
  };
  
  const normalized = frequency.toLowerCase().trim();
  return frequencyMap[normalized] || 'ANNUAL';
}
```

## 9.3 Parameter Transformation (Module 2)

### Parameter Mapping

- **Name Mapping:** Map `name` to `parameter_name`
- **Value Mapping:** Map `current_value` to `current_value` (numeric)
- **Limit Mapping:** Map `limit` to `limit_value` (numeric)
- **Unit Mapping:** Map `unit` to `unit`

### Parameter Transformation Implementation

```typescript
function transformLLMOutputToParameters(
  llmOutput: LLMParameterOutput,
  documentId: string,
  siteId: string,
  companyId: string,
  moduleId: string
): Parameter[] {
  return llmOutput.parameters.map((param) => {
    // Validate numeric values
    if (isNaN(param.current_value) || isNaN(param.limit)) {
      throw new Error(`Invalid numeric values for parameter: ${param.name}`);
    }
    
    // Map parameter name to parameter_type enum
    const parameterType = mapParameterType(param.name);
    
    return {
      id: crypto.randomUUID(),
      document_id: documentId,
      company_id: companyId,
      site_id: siteId,
      module_id: moduleId,
      parameter_type: parameterType,
      limit_value: param.limit,
      unit: param.unit,
      limit_type: 'MAXIMUM', // Default, can be extracted from LLM if available
      sampling_frequency: 'WEEKLY', // Default, can be extracted from LLM if available
      confidence_score: 0.85, // Default confidence
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    };
  });
}

function mapParameterType(name: string): string {
  // Map parameter name to parameter_type enum
  const typeMap: Record<string, string> = {
    'bod': 'BOD',
    'cod': 'COD',
    'ss': 'SS',
    'ph': 'PH',
    'temperature': 'TEMPERATURE',
    'fog': 'FOG',
    'ammonia': 'AMMONIA',
    'phosphorus': 'PHOSPHORUS'
  };
  
  const normalized = name.toLowerCase().trim();
  return typeMap[normalized] || 'BOD'; // Default to BOD if not found
}
```

## 9.4 Run Hour Transformation (Module 3)

### Run Hour Mapping

- **Generator Mapping:** Map `generator_name` to `generator_id` (lookup)
- **Hours Mapping:** Map `run_hours` to `hours` (numeric)
- **Date Mapping:** Parse `date` to Date object

### Run Hour Transformation Implementation

```typescript
async function transformLLMOutputToRunHours(
  llmOutput: LLMRunHourOutput,
  siteId: string
): Promise<RunHourRecord[]> {
  const records: RunHourRecord[] = [];
  
  for (const generatorData of llmOutput.generators) {
    // Lookup generator by name
    const generator = await findGeneratorByName(siteId, generatorData.generator_name);
    if (!generator) {
      throw new Error(`Generator not found: ${generatorData.generator_name}`);
    }
    
    // Validate hours
    if (isNaN(generatorData.run_hours)) {
      throw new Error(`Invalid run hours for generator: ${generatorData.generator_name}`);
    }
    
    // Parse date
    const recordDate = new Date(generatorData.date);
    if (isNaN(recordDate.getTime())) {
      throw new Error(`Invalid date: ${generatorData.date}`);
    }
    
    records.push({
      id: crypto.randomUUID(),
      generator_id: generator.id,
      site_id: siteId,
      hours: generatorData.run_hours,
      record_date: recordDate,
      created_at: new Date(),
      updated_at: new Date()
    });
  }
  
  return records;
}

async function findGeneratorByName(siteId: string, name: string): Promise<any> {
  const result = await db.query(`
    SELECT * FROM generators
    WHERE site_id = $1 AND generator_name = $2
    LIMIT 1
  `, [siteId, name]);
  
  return result.rows[0] || null;
}
```

## 9.5 Data Validation

### Validation Rules

- **Required Fields:** Validate all required fields present
- **Data Types:** Validate data types (dates, numbers, enums)
- **Business Rules:** Apply business logic validation
- **Constraints:** Validate against database constraints

### Validation Implementation

```typescript
interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

function validateObligation(obligation: Obligation): ValidationResult {
  const errors: string[] = [];
  
  // Required fields
  if (!obligation.obligation_title) {
    errors.push('obligation_title is required');
  }
  if (!obligation.frequency) {
    errors.push('frequency is required');
  }
  
  // Date validation
  if (obligation.deadline_date && isNaN(obligation.deadline_date.getTime())) {
    errors.push('deadline_date must be a valid date');
  }
  
  // Frequency enum validation
  const validFrequencies = ['ANNUAL', 'MONTHLY', 'QUARTERLY', 'WEEKLY', 'DAILY', 'ONE_TIME'];
  if (!validFrequencies.includes(obligation.frequency)) {
    errors.push(`frequency must be one of: ${validFrequencies.join(', ')}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
```

---

# 10. Error Handling

## 10.1 Error Types

### API Errors

- **Rate Limit Errors:** 429 status code (rate limit exceeded)
- **Invalid Key Errors:** 401 status code (invalid API key)
- **Quota Exceeded:** 429 status code (quota exceeded)
- **Model Unavailable:** 503 status code (model temporarily unavailable)
- **Server Errors:** 500+ status codes (OpenAI server errors)

### Timeout Errors

- **Request Timeout:** Request exceeds 30 seconds
- **Connection Timeout:** Connection cannot be established
- **Read Timeout:** Response reading timeout

### Parsing Errors

- **Invalid JSON:** LLM returns invalid JSON
- **Schema Mismatch:** JSON doesn't match expected schema
- **Missing Fields:** Required fields missing from JSON

### Validation Errors

- **Data Type Errors:** Invalid data types (dates, numbers)
- **Business Rule Violations:** Data violates business rules
- **Constraint Violations:** Data violates database constraints

### Error Type Interfaces

```typescript
interface APIError {
  type: 'rate_limit' | 'invalid_key' | 'quota_exceeded' | 'server_error';
  statusCode: number;
  message: string;
  retryAfter?: number; // seconds
}

interface TimeoutError {
  type: 'request_timeout' | 'connection_timeout' | 'read_timeout';
  timeout: number; // milliseconds
  message: string;
}

interface ParsingError {
  type: 'invalid_json' | 'schema_mismatch' | 'missing_fields';
  message: string;
  details?: any;
}

interface ValidationError {
  type: 'data_type_error' | 'business_rule_violation' | 'constraint_violation';
  field: string;
  message: string;
  value?: any;
}
```

## 10.2 Error Handling Implementation

### Retry Logic

- **Retry Strategy:** Exponential backoff (2 retries, 2s, 4s delays)
- **Retry Conditions:** Retry on transient errors (rate limit, timeout, server errors)
- **No Retry:** Don't retry on permanent errors (invalid key, validation errors)
- **Max Retries:** Maximum 2 retries per request

### Retry Implementation

```typescript
interface RetryConfig {
  maxRetries: number;
  initialDelay: number; // milliseconds
  backoffMultiplier: number;
  retryableErrors: string[];
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Check if error is retryable
      if (!isRetryableError(error, config.retryableErrors)) {
        throw error;
      }
      
      // Don't retry on last attempt
      if (attempt === config.maxRetries) {
        throw error;
      }
      
      // Calculate delay
      const delay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt);
      await sleep(delay);
    }
  }
  
  throw lastError!;
}

function isRetryableError(error: any, retryableErrors: string[]): boolean {
  if (error instanceof APIError) {
    return retryableErrors.includes(error.type);
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

## 10.3 Fallback Strategy

### Model Fallback

- **Primary Model:** Use GPT-4.1 for all requests
- **Fallback Model:** Use GPT-4.1 Mini if GPT-4.1 fails
- **Fallback Conditions:** Fallback on rate limit, quota exceeded, model unavailable
- **Fallback Logging:** Log fallback usage for cost tracking

### Fallback Implementation

```typescript
async function callOpenAIWithFallback(
  request: OpenAIRequest
): Promise<OpenAIResponse> {
  try {
    // Try primary model
    return await callOpenAI(request);
  } catch (error) {
    if (shouldFallback(error)) {
      // Fallback to GPT-4.1 Mini
      const fallbackRequest = {
        ...request,
        model: 'gpt-4o-mini' as const
      };
      
      await logFallbackUsage(request.model, 'gpt-4o-mini', error);
      return await callOpenAI(fallbackRequest);
    }
    throw error;
  }
}

function shouldFallback(error: any): boolean {
  if (error instanceof APIError) {
    return ['rate_limit', 'quota_exceeded', 'server_error'].includes(error.type);
  }
  return false;
}

async function logFallbackUsage(
  originalModel: string,
  fallbackModel: string,
  error: Error
): Promise<void> {
  await db.query(`
    INSERT INTO fallback_logs (
      original_model, fallback_model, error_message, occurred_at
    ) VALUES ($1, $2, $3, NOW())
  `, [originalModel, fallbackModel, error.message]);
}
```

## 10.4 Error Logging

### Error Logging

- **Log to extraction_logs:** Log all errors to extraction_logs table
- **Error Details:** Store error type, message, stack trace in `errors` JSONB array
- **Context:** Store request context (document ID, model, tokens) in `metadata` JSONB field
- **Error Aggregation:** Aggregate errors for analytics using JSONB queries

### Error Logging Implementation

```typescript
async function logExtractionError(
  extractionLogId: string,
  error: Error,
  context: {
    documentId: string;
    model: string;
    requestTokens: number;
  }
): Promise<void> {
  // Store error details in errors JSONB array and metadata
  await db.query(`
    UPDATE extraction_logs
    SET 
      errors = COALESCE(errors, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
        'message', $1,
        'type', $2,
        'stack', $3,
        'timestamp', NOW()
      )),
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
        'error_context', $4
      ),
      updated_at = NOW()
    WHERE id = $5
  `, [
    error.message,
    error.constructor.name,
    error.stack,
    JSON.stringify(context),
    extractionLogId
  ]);
}
```

## 10.5 Error Notifications

### Admin Notifications

- **Critical Errors:** Notify admins of critical errors (invalid key, quota exceeded)
- **Error Threshold:** Notify if error rate exceeds threshold
- **Error Summary:** Send daily error summary to admins
- **Alert Escalation:** Escalate if errors persist

### Error Notification Implementation

```typescript
async function notifyAdminOfError(
  error: Error,
  context: any
): Promise<void> {
  if (isCriticalError(error)) {
    await db.query(`
      INSERT INTO notifications (
        user_id, type, title, message, priority, metadata
      ) VALUES (
        (SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1),
        'CRITICAL_ERROR',
        'Critical AI Integration Error',
        $1,
        'high',
        $2
      )
    `, [
      `Error: ${error.message}`,
      JSON.stringify(context)
    ]);
  }
}

function isCriticalError(error: any): boolean {
  if (error instanceof APIError) {
    return ['invalid_key', 'quota_exceeded'].includes(error.type);
  }
  return false;
}
```

---

# 11. Rate Limiting

## 11.1 Rate Limit Detection

### Rate Limit Detection

- **Status Code:** Detect 429 status code (rate limit exceeded)
- **Response Headers:** Parse rate limit headers (`x-ratelimit-*`)
- **Error Message:** Parse rate limit error messages
- **Retry-After Header:** Extract retry delay from `Retry-After` header

### Rate Limit Detection Implementation

```typescript
interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: Date;
  retryAfter?: number; // seconds
}

function detectRateLimit(response: Response): RateLimitInfo | null {
  if (response.status !== 429) {
    return null;
  }
  
  const headers = response.headers;
  const limit = parseInt(headers.get('x-ratelimit-limit') || '0');
  const remaining = parseInt(headers.get('x-ratelimit-remaining') || '0');
  const resetTime = new Date(parseInt(headers.get('x-ratelimit-reset') || '0') * 1000);
  const retryAfter = parseInt(headers.get('retry-after') || '0');
  
  return {
    limit,
    remaining,
    resetTime,
    retryAfter: retryAfter > 0 ? retryAfter : undefined
  };
}
```

## 11.2 Rate Limit Handling

### Request Queuing

- **Queue Requests:** Queue requests when rate limited
- **Queue Priority:** Maintain priority queue (critical requests first)
- **Queue Processing:** Process queue when rate limit resets
- **Queue Monitoring:** Monitor queue size and wait times

### Request Queue Implementation

```typescript
interface QueuedRequest {
  id: string;
  request: OpenAIRequest;
  priority: number;
  queuedAt: Date;
  retryAfter?: Date;
}

class RateLimitQueue {
  private queue: QueuedRequest[] = [];
  
  async enqueue(request: OpenAIRequest, priority: number = 0): Promise<string> {
    const queuedRequest: QueuedRequest = {
      id: crypto.randomUUID(),
      request,
      priority,
      queuedAt: new Date()
    };
    
    this.queue.push(queuedRequest);
    this.queue.sort((a, b) => b.priority - a.priority);
    
    return queuedRequest.id;
  }
  
  async processQueue(): Promise<void> {
    while (this.queue.length > 0) {
      const request = this.queue.shift()!;
      
      // Check if we can process (rate limit reset)
      if (await this.canProcessRequest()) {
        await this.executeRequest(request);
      } else {
        // Re-queue if still rate limited
        this.queue.unshift(request);
        await sleep(1000); // Wait 1 second
      }
    }
  }
  
  private async canProcessRequest(): Promise<boolean> {
    // Check rate limit status
    // This would query rate limit monitor
    return true;
  }
  
  private async executeRequest(request: QueuedRequest): Promise<void> {
    // Execute the request
    // ...
  }
}
```

## 11.3 Exponential Backoff

### Backoff Strategy

- **Initial Delay:** Start with 2 seconds delay
- **Backoff Multiplier:** Multiply delay by 2 for each retry
- **Max Delay:** Cap delay at 60 seconds
- **Jitter:** Add random jitter to prevent thundering herd

### Backoff Implementation

```typescript
function calculateBackoffDelay(attempt: number, retryAfter?: number): number {
  if (retryAfter) {
    return retryAfter * 1000; // Use Retry-After header value
  }
  
  const baseDelay = 2000; // 2 seconds
  const maxDelay = 60000; // 60 seconds
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  
  // Add jitter (±20%)
  const jitter = delay * 0.2 * (Math.random() * 2 - 1);
  return Math.floor(delay + jitter);
}
```

## 11.4 Rate Limit Monitoring

### Usage Tracking

- **Track Limits:** Track rate limit usage from response headers
- **Track Remaining:** Monitor remaining requests
- **Track Reset Time:** Track when rate limit resets
- **Alerting:** Alert when approaching rate limit

### Rate Limit Monitoring Implementation

```typescript
class RateLimitMonitor {
  private currentLimit: RateLimitInfo | null = null;
  
  async updateLimitInfo(info: RateLimitInfo): Promise<void> {
    this.currentLimit = info;
    
    // Alert if approaching limit
    if (info.remaining < info.limit * 0.1) {
      await this.alertRateLimitApproaching(info);
    }
  }
  
  async canMakeRequest(): Promise<boolean> {
    if (!this.currentLimit) {
      return true;
    }
    
    return this.currentLimit.remaining > 0 && 
           new Date() >= this.currentLimit.resetTime;
  }
  
  private async alertRateLimitApproaching(info: RateLimitInfo): Promise<void> {
    // Send alert to admins
    // ...
  }
}
```

---

# 12. Cost Tracking

## 12.1 Token Counting

### Token Counting

- **Input Tokens:** Count tokens in system message + user message
- **Output Tokens:** Count tokens in LLM response
- **Accurate Counting:** Use tiktoken library for accurate token counting
- **Model-Specific:** Use model-specific tokenizers

### Token Counting Implementation

```typescript
import { encoding_for_model } from 'tiktoken';

interface TokenCount {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

class TokenCounter {
  private encoders: Map<string, any> = new Map();
  
  async countTokens(text: string, model: string): Promise<number> {
    if (!this.encoders.has(model)) {
      try {
        this.encoders.set(model, encoding_for_model(model));
      } catch (error) {
        // Fallback to approximation if model not found
        return Math.ceil(text.length / 4);
      }
    }
    
    const encoder = this.encoders.get(model);
    return encoder.encode(text).length;
  }
  
  async countRequestTokens(
    request: OpenAIRequest,
    response: OpenAIResponse
  ): Promise<TokenCount> {
    const inputTokens = await this.countInputTokens(request);
    const outputTokens = await this.countOutputTokens(response);
    
    return {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens
    };
  }
  
  private async countInputTokens(request: OpenAIRequest): Promise<number> {
    let total = 0;
    for (const message of request.messages) {
      total += await this.countTokens(message.content, request.model);
    }
    // Add overhead for message structure (approximately 4 tokens per message)
    total += request.messages.length * 4;
    return total;
  }
  
  private async countOutputTokens(response: OpenAIResponse): Promise<number> {
    if (response.usage) {
      return response.usage.completion_tokens;
    }
    return await this.countTokens(
      response.choices[0].message.content,
      response.model
    );
  }
}
```

## 12.2 Cost Calculation

### Pricing Model

- **GPT-4.1 Pricing:** $0.03 per 1K input tokens, $0.06 per 1K output tokens
- **GPT-4.1 Mini Pricing:** $0.001 per 1K input tokens, $0.002 per 1K output tokens
- **Cost Calculation:** `cost = (inputTokens / 1000 * inputPrice) + (outputTokens / 1000 * outputPrice)`
- **Cost Rounding:** Round to 4 decimal places

### Cost Calculation Implementation

```typescript
interface ModelPricing {
  inputPricePer1K: number;
  outputPricePer1K: number;
}

const PRICING: Record<string, ModelPricing> = {
  'gpt-4o': {
    inputPricePer1K: 0.03,
    outputPricePer1K: 0.06
  },
  'gpt-4o-mini': {
    inputPricePer1K: 0.001,
    outputPricePer1K: 0.002
  }
};

function calculateCost(
  inputTokens: number,
  outputTokens: number,
  model: string
): number {
  const pricing = PRICING[model];
  if (!pricing) {
    throw new Error(`Unknown model pricing: ${model}`);
  }
  
  const inputCost = (inputTokens / 1000) * pricing.inputPricePer1K;
  const outputCost = (outputTokens / 1000) * pricing.outputPricePer1K;
  const totalCost = inputCost + outputCost;
  
  return Math.round(totalCost * 10000) / 10000; // Round to 4 decimal places
}
```

## 12.3 Cost Logging

### Logging to Database

- **Log to extraction_logs:** Log token counts and costs to extraction_logs table
- **Fields:** Store in `metadata` JSONB field: `input_tokens`, `output_tokens`, `estimated_cost`; `model_identifier` stored in main table field
- **Timestamp:** Log timestamp for cost analytics (uses `extraction_timestamp`)
- **Aggregation:** Enable cost aggregation queries using JSONB extraction

### Cost Logging Implementation

```typescript
async function trackCost(
  extractionLogId: string,
  tokenCount: TokenCount,
  model: string
): Promise<void> {
  const cost = calculateCost(tokenCount.inputTokens, tokenCount.outputTokens, model);
  
  // Store token counts and cost in metadata JSONB field
  // Note: model_identifier is stored in the main table field
  await db.query(`
    UPDATE extraction_logs
    SET 
      model_identifier = $1,
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
        'input_tokens', $2,
        'output_tokens', $3,
        'total_tokens', $4,
        'estimated_cost', $5
      ),
      updated_at = NOW()
    WHERE id = $6
  `, [
    model,
    tokenCount.inputTokens,
    tokenCount.outputTokens,
    tokenCount.totalTokens,
    cost,
    extractionLogId
  ]);
}
```

## 12.4 Cost Analytics

### Cost Aggregation

- **Per Document:** Aggregate costs per document
- **Per Module:** Aggregate costs per module (Module 1, 2, 3)
- **Per Time Period:** Aggregate costs per day/week/month
- **Per User/Company:** Aggregate costs per user/company

### Cost Analytics Implementation

```typescript
interface CostAnalytics {
  totalCost: number;
  totalTokens: number;
  averageCostPerDocument: number;
  costByModule: Record<string, number>;
  costByTimePeriod: Array<{ period: string; cost: number }>;
}

async function getCostAnalytics(
  filters: {
    startDate?: Date;
    endDate?: Date;
    companyId?: string;
    moduleId?: string;
  }
): Promise<CostAnalytics> {
  // Extract cost and token data from metadata JSONB field
  const query = `
    SELECT 
      SUM((metadata->>'estimated_cost')::numeric) as total_cost,
      SUM((metadata->>'total_tokens')::integer) as total_tokens,
      COUNT(*) as document_count,
      AVG((metadata->>'estimated_cost')::numeric) as avg_cost_per_document
    FROM extraction_logs el
    JOIN documents d ON d.id = el.document_id
    WHERE 1=1
      ${filters.startDate ? `AND el.extraction_timestamp >= $1` : ''}
      ${filters.endDate ? `AND el.extraction_timestamp <= $2` : ''}
      ${filters.companyId ? `AND d.company_id = $3` : ''}
      AND metadata->>'estimated_cost' IS NOT NULL
  `;
  
  const result = await db.query(query, [
    filters.startDate,
    filters.endDate,
    filters.companyId
  ].filter(Boolean));
  
  return {
    totalCost: parseFloat(result.rows[0].total_cost || '0'),
    totalTokens: parseInt(result.rows[0].total_tokens || '0'),
    averageCostPerDocument: parseFloat(result.rows[0].avg_cost_per_document || '0'),
    costByModule: {},
    costByTimePeriod: []
  };
}
```

---

# 13. Background Job Integration

## 13.1 Document Processing Job Integration

### Job Triggers

- **Background Job:** Document Processing Job (from Background Jobs Spec 2.3) calls AI integration layer
- **Job Input:** Document ID, site ID, user ID, extraction options
- **Job Status:** Update job status (PENDING → RUNNING → COMPLETED/FAILED)
- **Job Progress:** Update job progress during processing

### Job Integration Implementation

```typescript
interface DocumentProcessingJobInput {
  documentId: string;
  siteId: string;
  userId: string;
  extractionOptions: {
    useRuleLibrary: boolean;
    confidenceThreshold: number;
    autoExtract: boolean;
  };
}

async function processDocument(jobInput: DocumentProcessingJobInput): Promise<void> {
  const { documentId, siteId, userId, extractionOptions } = jobInput;
  
  try {
    // Update job status to RUNNING
    await updateJobStatus(jobInput.jobId, 'RUNNING');
    
    // 1. Load document from database and storage
    const document = await loadDocument(documentId);
    
    // Get company_id and module_id from document
    const companyId = document.company_id;
    const moduleId = document.module_id;
    
    // 2. Check rule library first (if enabled)
    let extractionResult: ExtractionResult | null = null;
    if (extractionOptions.useRuleLibrary) {
      const matcher = new RuleLibraryMatcher();
      const ruleMatches = await matcher.findMatches(document.extracted_text, document.document_type);
      if (ruleMatches.length > 0 && ruleMatches[0].matchScore >= 0.9) {
        // Transform rule match data to obligations
        const ruleObligations = transformRuleMatchToObligations(
          ruleMatches[0],
          documentId,
          siteId,
          companyId,
          moduleId
        );
        
        extractionResult = {
          id: crypto.randomUUID(),
          documentId,
          siteId,
          obligations: ruleObligations,
          confidence: {
            score: 95, // High confidence for rule matches
            source: 'rule_library',
            factors: { ruleMatch: true, patternMatch: ruleMatches[0].matchScore }
          },
          flaggedItems: [],
          cost: 0, // No cost for rule library matches
          tokens: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
          createdAt: new Date()
        };
      }
    }
    
    // 3. Call OpenAI API if no rule library match
    if (!extractionResult) {
      // Create OpenAI request
      const request = await createOpenAIRequest(document);
      
      // Call OpenAI API with fallback
      const llmResponse = await callOpenAIWithFallback(request);
      
      // Transform LLM output to extraction result
      extractionResult = await transformLLMOutput(
        llmResponse,
        documentId,
        siteId,
        companyId,
        moduleId
      );
    }
    
    // 4. Apply confidence thresholds
    const flaggedItems = await applyConfidenceThresholds(extractionResult, extractionOptions);
    
    // 5. Store results in database
    await storeExtractionResults(extractionResult, flaggedItems);
    
    // 6. Update job status to COMPLETED
    await updateJobStatus(jobInput.jobId, 'COMPLETED', {
      obligationsCreated: extractionResult.obligations.length,
      flaggedForReview: flaggedItems.length
    });
    
  } catch (error) {
    // Update job status to FAILED
    await updateJobStatus(jobInput.jobId, 'FAILED', {
      error: (error as Error).message
    });
    
    // Log error
    await logExtractionError(documentId, error as Error, {
      documentId,
      model: 'gpt-4o',
      requestTokens: 0
    });
    
    throw error;
  }
}

async function loadDocument(documentId: string): Promise<any> {
  // Load document from database and storage
  const docResult = await db.query(`
    SELECT * FROM documents WHERE id = $1
  `, [documentId]);
  
  if (docResult.rows.length === 0) {
    throw new Error(`Document not found: ${documentId}`);
  }
  
  const document = docResult.rows[0];
  
  // Load document content from Supabase Storage if needed
  if (!document.extracted_text) {
    // Load from storage and extract text
    // ...
  }
  
  return document;
}

async function createOpenAIRequest(document: any): Promise<OpenAIRequest> {
  const loader = new PromptTemplateLoader();
  const template = await loader.getLatestVersion('obligation-extraction');
  
  const variables: TemplateVariables = {
    document: document.extracted_text,
    siteId: document.site_id,
    documentType: document.document_type
  };
  
  const systemMessage = substituteVariables(template.systemMessage, variables);
  const userMessage = substituteVariables(template.userMessage, variables);
  
  return {
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userMessage }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
    max_tokens: 4000
  };
}

async function callOpenAI(request: OpenAIRequest): Promise<OpenAIResponse> {
  const manager = new APIKeyManager();
  const apiKey = manager.getCurrentKey();
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new APIError(error.error?.type || 'api_error', response.status, error.error?.message || 'API error');
  }
  
  return await response.json();
}

async function transformLLMOutput(
  llmResponse: OpenAIResponse,
  documentId: string,
  siteId: string,
  companyId: string,
  moduleId: string
): Promise<ExtractionResult> {
  const content = JSON.parse(llmResponse.choices[0].message.content);
  
  const obligations = transformLLMOutputToObligations(
    content,
    documentId,
    siteId,
    companyId,
    moduleId,
    'PDF_EXTRACTION'
  );
  
  return {
    id: crypto.randomUUID(),
    documentId,
    siteId,
    obligations,
    confidence: extractConfidenceScore(content),
    flaggedItems: [],
    cost: 0, // Will be calculated after token counting
    tokens: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    createdAt: new Date()
  };
}

async function applyConfidenceThresholds(
  result: ExtractionResult,
  options: any
): Promise<FlaggedItem[]> {
  const flaggedItems: FlaggedItem[] = [];
  
  for (const obligation of result.obligations) {
    const shouldFlag = shouldFlagItem(
      result.confidence.score,
      {
        confidenceThreshold: options.confidenceThreshold || 85,
        isSubjective: obligation.is_subjective,
        hasRuleMatch: false,
        isNovelPattern: false
      }
    );
    
    if (shouldFlag) {
      flaggedItems.push({
        obligation,
        confidence: result.confidence,
        flagReason: 'Low confidence',
        priority: getPriority(result.confidence.score)
      });
    }
  }
  
  return flaggedItems;
}
```

## 13.2 Job Status Updates

### Status Management

- **Status Transitions:** PENDING → RUNNING → COMPLETED/FAILED
- **Progress Updates:** Update progress percentage during processing
- **Result Storage:** Store extraction results in job metadata
- **Error Storage:** Store error details in job metadata

### Status Update Implementation

```typescript
async function updateJobStatus(
  jobId: string,
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED',
  metadata?: any
): Promise<void> {
  await db.query(`
    UPDATE background_jobs
    SET 
      status = $1,
      metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb,
      updated_at = NOW()
    WHERE id = $3
  `, [status, JSON.stringify(metadata || {}), jobId]);
}

async function updateJobProgress(
  jobId: string,
  progress: number // 0-100
): Promise<void> {
  await db.query(`
    UPDATE background_jobs
    SET 
      progress = $1,
      updated_at = NOW()
    WHERE id = $2
  `, [progress, jobId]);
}
```

## 13.3 Job Results Storage

### Results Storage

- **Store Obligations:** Store extracted obligations in obligations table
- **Store Parameters:** Store extracted parameters in parameters table (Module 2)
- **Store Run Hours:** Store extracted run hours in run_hour_records table (Module 3)
- **Link to Document:** Link extractions to source document

### Results Storage Implementation

```typescript
async function storeExtractionResults(
  result: ExtractionResult,
  flaggedItems: FlaggedItem[]
): Promise<void> {
  // Store obligations
  for (const obligation of result.obligations) {
    await db.query(`
      INSERT INTO obligations (
        id, document_id, company_id, site_id, module_id,
        summary, original_text, category, frequency,
        deadline_date, is_subjective, confidence_score,
        review_status, status, import_source,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
    `, [
      obligation.id,
      obligation.document_id,
      obligation.company_id,
      obligation.site_id,
      obligation.module_id,
      obligation.summary,
      obligation.original_text,
      obligation.category || 'RECORD_KEEPING',
      obligation.frequency,
      obligation.deadline_date,
      obligation.is_subjective,
      obligation.confidence_score,
      obligation.review_status || 'PENDING',
      obligation.status || 'PENDING',
      obligation.import_source || 'PDF_EXTRACTION'
    ]);
  }
  
  // Store parameters (Module 2)
  if (result.parameters) {
    for (const parameter of result.parameters) {
      await db.query(`
        INSERT INTO parameters (
          id, document_id, company_id, site_id, module_id,
          parameter_type, limit_value, unit, limit_type,
          sampling_frequency, confidence_score, is_active,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      `, [
        parameter.id,
        parameter.document_id,
        parameter.company_id,
        parameter.site_id,
        parameter.module_id,
        parameter.parameter_type,
        parameter.limit_value,
        parameter.unit,
        parameter.limit_type || 'MAXIMUM',
        parameter.sampling_frequency || 'WEEKLY',
        parameter.confidence_score || 0.85,
        parameter.is_active !== false
      ]);
    }
  }
  
  // Store run hours (Module 3)
  if (result.runHours) {
    for (const runHour of result.runHours) {
      await db.query(`
        INSERT INTO run_hour_records (
          id, generator_id, company_id, recording_date,
          hours_recorded, running_total_year, running_total_month,
          percentage_of_annual_limit, percentage_of_monthly_limit,
          entry_method, entered_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      `, [
        runHour.id,
        runHour.generator_id,
        runHour.company_id,
        runHour.recording_date,
        runHour.hours_recorded,
        runHour.running_total_year,
        runHour.running_total_month,
        runHour.percentage_of_annual_limit,
        runHour.percentage_of_monthly_limit,
        runHour.entry_method || 'CSV',
        runHour.entered_by || null
      ]);
    }
  }
  
  // Create review queue items for flagged items
  for (const item of flaggedItems) {
    await createReviewQueueItem(item, 'Low confidence');
  }
}
```

## 13.4 Job Error Handling

### Error Handling

- **Retry Logic:** Job retries handled by BullMQ (see Background Jobs Spec 2.3)
- **DLQ Handling:** Failed jobs sent to Dead-Letter Queue after max retries
- **Error Logging:** Log errors to extraction_logs table
- **Error Notifications:** Notify users/admins of job failures

### Error Handling Implementation

```typescript
async function handleJobError(
  jobId: string,
  error: Error,
  jobInput: DocumentProcessingJobInput
): Promise<void> {
  // Log error
  await logExtractionError(jobInput.documentId, error, {
    jobId,
    model: 'gpt-4o',
    requestTokens: 0
  });
  
  // Update job status
  await updateJobStatus(jobId, 'FAILED', {
    error: error.message,
    errorStack: error.stack
  });
  
  // Notify user
  await db.query(`
    INSERT INTO notifications (
      user_id, type, title, message, priority, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6)
  `, [
    jobInput.userId,
    'EXTRACTION_FAILED',
    'Document Processing Failed',
    `Document processing failed: ${error.message}`,
    'high',
    JSON.stringify({
      documentId: jobInput.documentId,
      jobId
    })
  ]);
}
```

---

# 14. Testing Requirements

## 14.1 API Key Management Tests

### Test Scenarios

- **Valid Key Test:** Test with valid API key
- **Invalid Key Test:** Test with invalid API key (should fail gracefully)
- **Key Rotation Test:** Test key rotation process
- **Fallback Key Test:** Test fallback to secondary key
- **Key Validation Test:** Test key validation on startup

### Test Implementation

```typescript
describe('API Key Management', () => {
  it('should use primary key by default', async () => {
    const manager = new APIKeyManager({ primary: 'valid-key' });
    expect(manager.getCurrentKey()).toBe('valid-key');
  });
  
  it('should fallback to secondary key on failure', async () => {
    const manager = new APIKeyManager({
      primary: 'invalid-key',
      fallbacks: ['valid-key']
    });
    // Mock API call failure
    // Verify fallback
  });
  
  it('should validate keys on startup', async () => {
    const manager = new APIKeyManager({ primary: 'valid-key' });
    const isValid = await manager.validateKey('valid-key');
    expect(isValid).toBe(true);
  });
});
```

## 14.2 Request Formatting Tests

### Test Scenarios

- **Correct Format Test:** Test request formatting with correct inputs
- **Token Limit Test:** Test request respects token limits
- **Variable Substitution Test:** Test template variable substitution
- **JSON Schema Test:** Test JSON schema enforcement

## 14.3 Cost Optimization Tests

### Test Scenarios

- **Batching Test:** Test document batching (up to 5 documents)
- **Caching Test:** Test rule library match caching
- **Token Optimization Test:** Test prompt compression
- **Cost Calculation Test:** Test accurate cost calculation

## 14.4 Error Handling Tests

### Test Scenarios

- **Retry Test:** Test exponential backoff retry logic
- **Fallback Test:** Test model fallback (GPT-4.1 → GPT-4.1 Mini)
- **Timeout Test:** Test request timeout handling
- **Rate Limit Test:** Test rate limit detection and handling

## 14.5 Cost Tracking Tests

### Test Scenarios

- **Token Counting Test:** Test accurate token counting
- **Cost Calculation Test:** Test cost calculation accuracy
- **Cost Logging Test:** Test cost logging to database
- **Cost Analytics Test:** Test cost aggregation queries

---

# 15. Performance Monitoring

## 15.1 Performance Metrics

### Metrics to Track

- **API Response Times:** Track OpenAI API response times
- **Token Usage:** Track token usage per request
- **Cost per Extraction:** Track cost per document extraction
- **Cache Hit Rate:** Track rule library cache hit rate
- **Error Rate:** Track error rate (success vs. failure)

### Performance Monitoring Implementation

```typescript
interface PerformanceMetrics {
  apiResponseTime: number; // milliseconds
  tokenUsage: TokenCount;
  cost: number;
  cacheHit: boolean;
  errorOccurred: boolean;
}

class PerformanceMonitor {
  async trackMetrics(metrics: PerformanceMetrics): Promise<void> {
    await db.query(`
      INSERT INTO performance_metrics (
        api_response_time, input_tokens, output_tokens,
        cost, cache_hit, error_occurred, recorded_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `, [
      metrics.apiResponseTime,
      metrics.tokenUsage.inputTokens,
      metrics.tokenUsage.outputTokens,
      metrics.cost,
      metrics.cacheHit,
      metrics.errorOccurred
    ]);
  }
  
  async getAverageResponseTime(timePeriod: string): Promise<number> {
    const result = await db.query(`
      SELECT AVG(api_response_time) as avg_time
      FROM performance_metrics
      WHERE recorded_at >= NOW() - INTERVAL '1 ${timePeriod}'
    `);
    
    return parseFloat(result.rows[0].avg_time || '0');
  }
}
```

## 15.2 Health Checks

### Health Check Endpoints

- **API Health:** Check OpenAI API availability
- **Key Validity:** Check API key validity
- **Rate Limit Status:** Check current rate limit status
- **Cache Status:** Check cache health

### Health Check Implementation

```typescript
interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    api: boolean;
    keys: boolean;
    rateLimit: boolean;
    cache: boolean;
  };
}

async function performHealthCheck(): Promise<HealthCheckResult> {
  const checks = {
    api: await checkAPIAvailability(),
    keys: await checkKeyValidity(),
    rateLimit: await checkRateLimitStatus(),
    cache: await checkCacheHealth()
  };
  
  const allHealthy = Object.values(checks).every(c => c === true);
  const someHealthy = Object.values(checks).some(c => c === true);
  
  return {
    status: allHealthy ? 'healthy' : someHealthy ? 'degraded' : 'unhealthy',
    checks
  };
}

async function checkAPIAvailability(): Promise<boolean> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function checkKeyValidity(): Promise<boolean> {
  const manager = new APIKeyManager();
  return await manager.validateKey(manager.getCurrentKey());
}

async function checkRateLimitStatus(): Promise<boolean> {
  const monitor = new RateLimitMonitor();
  return await monitor.canMakeRequest();
}

async function checkCacheHealth(): Promise<boolean> {
  // Check cache health
  return true;
}
```

---

# 16. TypeScript Interfaces

## 16.1 Core Interfaces

### Request/Response Interfaces

```typescript
interface OpenAIRequest {
  model: 'gpt-4o' | 'gpt-4o-mini';
  messages: Array<{
    role: 'system' | 'user';
    content: string;
  }>;
  response_format: { type: 'json_object' };
  temperature: number;
  max_tokens: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

interface OpenAIResponse {
  id: string;
  model: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
```

## 16.2 Extraction Interfaces

### Extraction Result Interfaces

```typescript
interface ExtractionResult {
  id: string;
  documentId: string;
  siteId: string;
  obligations: Obligation[];
  parameters?: Parameter[];
  runHours?: RunHourRecord[];
  confidence: ConfidenceScore;
  flaggedItems: FlaggedItem[];
  cost: number;
  tokens: TokenCount;
  createdAt: Date;
}

interface ConfidenceScore {
  score: number; // 0-100
  source: 'llm' | 'rule_library' | 'combined';
  factors: {
    llmConfidence?: number;
    ruleMatch?: boolean;
    patternMatch?: number;
  };
}

interface FlaggedItem {
  obligation: Obligation;
  confidence: ConfidenceScore;
  flagReason: string;
  priority: 'low' | 'medium' | 'high';
}
```

## 16.3 Configuration Interfaces

### Configuration Interfaces

```typescript
interface AIIntegrationConfig {
  apiKeys: APIKeyConfig;
  models: {
    primary: string;
    fallback: string;
  };
  thresholds: {
    confidence: number;
    ruleMatch: number;
  };
  retry: RetryConfig;
  rateLimit: RateLimitConfig;
  caching: CacheConfig;
}

interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

interface RateLimitConfig {
  maxRequestsPerMinute: number;
  maxTokensPerMinute: number;
  queueEnabled: boolean;
}

interface CacheConfig {
  enabled: boolean;
  ttl: number;
  maxSize: number;
}
```

---

**END OF DOCUMENT**


