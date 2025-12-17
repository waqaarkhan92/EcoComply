/**
 * Prompt Loader
 * Loads jurisdiction-specific prompts from docs/09-regulatory/prompts/ markdown files
 * Provides caching and fallback to in-memory prompts
 */

import fs from 'fs';
import path from 'path';
import { getPromptFilePath, type PromptSelectionResult } from './prompt-registry';
import { getPromptTemplate, type PromptTemplate } from './prompts';

// =============================================================================
// TYPES
// =============================================================================

export interface LoadedPrompt {
  promptId: string;
  version: string;
  metadata: PromptMetadata;
  systemMessage: string;
  userMessageTemplate: string;
  outputSchema?: Record<string, unknown>;
  loadedFrom: 'docs' | 'memory' | 'cache';
}

export interface PromptMetadata {
  prompt_id: string;
  version: string;
  status: 'DRAFT' | 'REVIEW' | 'FROZEN';
  module: string;
  regulator?: string;
  jurisdiction?: string;
  water_company?: string;
  document_types?: string[];
  authority_sources?: string[];
  last_updated?: string;
}

// =============================================================================
// CACHE
// =============================================================================

const promptCache = new Map<string, LoadedPrompt>();
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour
const cacheTimestamps = new Map<string, number>();

function getCacheKey(promptId: string, version: string): string {
  return `${promptId}@${version}`;
}

function isCacheValid(key: string): boolean {
  const timestamp = cacheTimestamps.get(key);
  if (!timestamp) return false;
  return Date.now() - timestamp < CACHE_TTL_MS;
}

// =============================================================================
// MARKDOWN PARSING
// =============================================================================

/**
 * Parse a prompt markdown file into structured components
 */
function parsePromptMarkdown(content: string): {
  metadata: PromptMetadata;
  systemMessage: string;
  userMessageTemplate: string;
  outputSchema?: Record<string, unknown>;
} | null {
  try {
    // Extract YAML frontmatter (between --- markers)
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    let metadata: PromptMetadata = {
      prompt_id: '',
      version: '',
      status: 'DRAFT',
      module: '',
    };

    if (frontmatterMatch) {
      // Parse YAML-like frontmatter
      const yamlContent = frontmatterMatch[1];
      const lines = yamlContent.split('\n');
      for (const line of lines) {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length > 0) {
          const value = valueParts.join(':').trim();
          // Remove quotes if present
          const cleanValue = value.replace(/^["']|["']$/g, '');
          (metadata as unknown as Record<string, unknown>)[key.trim()] = cleanValue;
        }
      }
    }

    // Extract system message (typically in a code block after "## System Message")
    const systemMessageMatch = content.match(
      /##\s*System\s*Message[\s\S]*?```(?:text|markdown)?\n([\s\S]*?)```/i
    );
    let systemMessage = '';
    if (systemMessageMatch) {
      systemMessage = systemMessageMatch[1].trim();
    } else {
      // Try alternative format - look for SYSTEM_PROMPT section
      const altMatch = content.match(/SYSTEM_PROMPT[:\s]*\n```\n([\s\S]*?)```/i);
      if (altMatch) {
        systemMessage = altMatch[1].trim();
      }
    }

    // Extract user message template (typically after "## User Message Template")
    const userTemplateMatch = content.match(
      /##\s*User\s*Message\s*Template[\s\S]*?```(?:text|markdown)?\n([\s\S]*?)```/i
    );
    let userMessageTemplate = '';
    if (userTemplateMatch) {
      userMessageTemplate = userTemplateMatch[1].trim();
    } else {
      // Try alternative format
      const altMatch = content.match(/USER_PROMPT[:\s]*\n```\n([\s\S]*?)```/i);
      if (altMatch) {
        userMessageTemplate = altMatch[1].trim();
      }
    }

    // Extract output schema if present
    let outputSchema: Record<string, unknown> | undefined;
    const schemaMatch = content.match(
      /##\s*(?:Output\s*Schema|Expected\s*Output)[\s\S]*?```json\n([\s\S]*?)```/i
    );
    if (schemaMatch) {
      try {
        outputSchema = JSON.parse(schemaMatch[1]);
      } catch {
        // Schema parsing failed, continue without it
      }
    }

    // Validate we have the minimum required content
    if (!systemMessage && !userMessageTemplate) {
      console.warn('Prompt file missing both system message and user template');
      return null;
    }

    return {
      metadata,
      systemMessage: systemMessage || 'You are an expert environmental compliance analyst.',
      userMessageTemplate: userMessageTemplate || '{document_text}',
      outputSchema,
    };
  } catch (error) {
    console.error('Failed to parse prompt markdown:', error);
    return null;
  }
}

// =============================================================================
// LOADING FUNCTIONS
// =============================================================================

/**
 * Load a prompt from the docs/ingestion_prompts/ directory
 */
export async function loadPromptFromDocs(
  promptId: string,
  version: string
): Promise<LoadedPrompt | null> {
  const cacheKey = getCacheKey(promptId, version);

  // Check cache first
  if (promptCache.has(cacheKey) && isCacheValid(cacheKey)) {
    const cached = promptCache.get(cacheKey)!;
    return { ...cached, loadedFrom: 'cache' };
  }

  // Determine file path
  const relativePath = getPromptFilePath(promptId, version);
  if (!relativePath) {
    console.warn(`No file path mapping for prompt: ${promptId}`);
    return null;
  }

  const absolutePath = path.join(process.cwd(), relativePath);

  // Check if file exists
  if (!fs.existsSync(absolutePath)) {
    console.warn(`Prompt file not found: ${absolutePath}`);
    return null;
  }

  try {
    // Read and parse the file
    const content = fs.readFileSync(absolutePath, 'utf-8');
    const parsed = parsePromptMarkdown(content);

    if (!parsed) {
      console.warn(`Failed to parse prompt file: ${absolutePath}`);
      return null;
    }

    const loadedPrompt: LoadedPrompt = {
      promptId,
      version,
      metadata: parsed.metadata,
      systemMessage: parsed.systemMessage,
      userMessageTemplate: parsed.userMessageTemplate,
      outputSchema: parsed.outputSchema,
      loadedFrom: 'docs',
    };

    // Cache the result
    promptCache.set(cacheKey, loadedPrompt);
    cacheTimestamps.set(cacheKey, Date.now());

    console.log(`✅ Loaded prompt from docs: ${promptId} v${version}`);
    return loadedPrompt;
  } catch (error) {
    console.error(`Failed to load prompt from ${absolutePath}:`, error);
    return null;
  }
}

/**
 * Load a prompt with automatic fallback to in-memory prompts
 */
export async function loadPrompt(
  selection: PromptSelectionResult
): Promise<LoadedPrompt | null> {
  const { promptId, version, isJurisdictionSpecific, fallbackReason } = selection;

  // Try loading from docs first for jurisdiction-specific prompts
  if (isJurisdictionSpecific) {
    const docsPrompt = await loadPromptFromDocs(promptId, version);
    if (docsPrompt) {
      return docsPrompt;
    }
    console.warn(`Falling back to in-memory prompt for: ${promptId}`);
  }

  // Fall back to in-memory prompt
  const memoryPrompt = getPromptTemplate(promptId);
  if (memoryPrompt) {
    return {
      promptId,
      version: '1.0',
      metadata: {
        prompt_id: promptId,
        version: '1.0',
        status: 'FROZEN',
        module: 'GENERIC',
      },
      systemMessage: memoryPrompt.systemMessage,
      userMessageTemplate: memoryPrompt.userMessageTemplate,
      loadedFrom: 'memory',
    };
  }

  // Log the fallback reason if we couldn't load anything
  if (fallbackReason) {
    console.warn(`Prompt loading failed: ${fallbackReason}`);
  }

  return null;
}

/**
 * Convert LoadedPrompt to the PromptTemplate format used by OpenAI client
 */
export function toPromptTemplate(loaded: LoadedPrompt): PromptTemplate {
  return {
    id: loaded.promptId,
    systemMessage: loaded.systemMessage,
    userMessageTemplate: loaded.userMessageTemplate,
    model: 'gpt-4o',
    maxTokens: 4096,
    temperature: 0.1,
  };
}

// =============================================================================
// CACHE MANAGEMENT
// =============================================================================

/**
 * Clear the prompt cache
 */
export function clearPromptCache(): void {
  promptCache.clear();
  cacheTimestamps.clear();
  console.log('Prompt cache cleared');
}

/**
 * Preload all prompts for a document type
 */
export async function preloadPromptsForDocumentType(
  documentType: string,
  regulators: string[] = ['EA', 'SEPA', 'NRW', 'NIEA']
): Promise<number> {
  const { selectPromptId } = await import('./prompt-registry');
  let loaded = 0;

  for (const regulator of regulators) {
    const selection = selectPromptId(documentType, regulator);
    const prompt = await loadPrompt(selection);
    if (prompt && prompt.loadedFrom === 'docs') {
      loaded++;
    }
  }

  console.log(`Preloaded ${loaded} prompts for ${documentType}`);
  return loaded;
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  size: number;
  entries: string[];
  validEntries: number;
} {
  const entries = Array.from(promptCache.keys());
  const validEntries = entries.filter((key) => isCacheValid(key)).length;

  return {
    size: promptCache.size,
    entries,
    validEntries,
  };
}
