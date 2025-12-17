/**
 * Document Processing Pipeline
 * Handles OCR, text extraction, and document processing
 * Reference: docs/specs/41_Backend_Background_Jobs.md Section 3.1
 */

// Import pdf-parse v2 API
import { PDFParse } from 'pdf-parse';
import { createWorker } from 'tesseract.js';
import { getOpenAIClient } from './openai-client';
import { getRuleLibraryMatcher, RuleMatch } from './rule-library-matcher';
import { recordPatternSuccess } from './correction-tracking';
import { checkForPatternDiscovery } from './pattern-discovery';
import { getExtractionCache } from './extraction-cache';
import { filterDocumentText, extractDocumentMetadata } from './document-filter';
import { estimateCost, type AIModel, analyzeDocumentComplexity } from './model-router';
import { getMultiPassExtractor } from './extraction-strategies/multi-pass-extractor';
import { expandConsolidatedELVs, documentMayHaveConsolidatedELVs } from './post-processors/elv-expander';
import { EXTRACTION_CONFIDENCE_DEFAULTS } from '@/lib/utils/status';
import { InferenceBarrier, formatValidationResult, type ExtractionContext } from './inference-barriers';
import { getJurisdictionFromRegulator, getJurisdictionFromWaterCompany, selectPromptId } from './prompt-registry';
import { loadPrompt, type LoadedPrompt } from './prompt-loader';
import type { LoadedPrompt as ExtractorLoadedPrompt } from './extraction-strategies/types';

export interface DocumentProcessingResult {
  extractedText: string;
  ocrText?: string;
  pageCount: number;
  fileSizeBytes: number;
  isLargeDocument: boolean;
  needsOCR: boolean;
  processingTimeMs: number;
}

export interface ExtractionResult {
  obligations: any[];
  metadata: {
    permit_reference?: string;
    regulator?: string;
    extraction_confidence: number;
  };
  ruleLibraryMatches: RuleMatch[];
  usedLLM: boolean;
  extractionTimeMs: number;
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    model: string;
    estimatedCost: number;
  };
  complexity?: 'simple' | 'medium' | 'complex';
  warnings?: Array<{
    code: string;
    message: string;
    details?: Record<string, unknown>;
  }>;
}

export class DocumentProcessor {
  private openAIClient = getOpenAIClient();
  private ruleLibraryMatcher = getRuleLibraryMatcher();
  private extractionCache = getExtractionCache();

  /**
   * Process document: Extract text, determine if OCR needed, process
   */
  async processDocument(
    fileBuffer: Buffer,
    filename: string,
    options?: {
      moduleTypes?: string[];
      regulator?: string;
      documentType?: string;
    }
  ): Promise<DocumentProcessingResult> {
    const startTime = Date.now();

    // Determine file type
    const isPDF = filename.toLowerCase().endsWith('.pdf');
    if (!isPDF) {
      throw new Error('Only PDF files are supported');
    }

    // Extract text from PDF
    let extractedText: string;
    let needsOCR = false;
    let ocrText: string | undefined;

    try {
      // Use pdf-parse v2 API
      const parser = new PDFParse({ data: fileBuffer });
      const textResult = await parser.getText();

      // Insert page markers for accurate page_reference tracking
      // Format: [PAGE:N] at the start of each page
      if (textResult.pages && Array.isArray(textResult.pages)) {
        extractedText = textResult.pages
          .map((pageText: any, index: number) => `[PAGE:${index + 1}]\n${typeof pageText === 'string' ? pageText : pageText?.text || ''}`)
          .join('\n\n');
      } else {
        extractedText = textResult.text;
      }

      const pageCount = textResult.pages?.length || textResult.total || 1;
      const fileSizeBytes = fileBuffer.length;

      // Check if text extraction was successful (has meaningful content)
      if (extractedText.trim().length < 100) {
        // Likely scanned document, needs OCR
        needsOCR = true;
        ocrText = await this.performOCR(fileBuffer);
        extractedText = ocrText;
      }

      const isLargeDocument = pageCount >= EXTRACTION_CONFIDENCE_DEFAULTS.LARGE_DOC_PAGE_COUNT &&
                              fileSizeBytes >= EXTRACTION_CONFIDENCE_DEFAULTS.LARGE_DOC_SIZE_BYTES;

      return {
        extractedText,
        ocrText: needsOCR ? ocrText : undefined,
        pageCount,
        fileSizeBytes,
        isLargeDocument,
        needsOCR,
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error: any) {
      throw new Error(`Failed to process document: ${error.message}`);
    }
  }

  /**
   * Perform OCR on scanned document
   */
  private async performOCR(fileBuffer: Buffer): Promise<string> {
    const worker = await createWorker('eng');
    
    try {
      // Set timeout: 60 seconds
      const timeoutPromise = new Promise<string>((_, reject) => {
        setTimeout(() => reject(new Error('OCR timeout after 60 seconds')), 60000);
      });

      const ocrPromise = (async () => {
        const { data } = await worker.recognize(fileBuffer);
        return data.text;
      })();

      const ocrText = await Promise.race([ocrPromise, timeoutPromise]);
      return ocrText;
    } finally {
      await worker.terminate();
    }
  }

  /**
   * Extract obligations from document text
   * Uses rule library first, then LLM if needed
   */
  async extractObligations(
    documentText: string,
    options: {
      documentId?: string; // For real-time progress tracking
      moduleTypes: string[];
      regulator?: string;
      documentType?: string;
      pageCount?: number;
      fileSizeBytes?: number;
      permitReference?: string;
      waterCompany?: string; // For trade effluent consents
    }
  ): Promise<ExtractionResult> {
    const startTime = Date.now();

    // Step 0: Filter document to remove irrelevant sections (40-60% cost savings)
    console.log(`📄 Original document length: ${documentText.length} characters`);

    const filterResult = filterDocumentText(documentText, {
      documentType: options.documentType as any,
      pageCount: options.pageCount,
      preserveHeaders: true,
    });

    console.log(`✂️  Filtered document: ${filterResult.filteredLength} characters (${filterResult.reductionPercentage}% reduction)`);
    console.log(`   Removed sections: ${filterResult.removedSections.join(', ')}`);

    // Use filtered text for extraction
    const processedText = filterResult.filteredText;

    // Extract metadata if not provided
    if (!options.permitReference || !options.regulator) {
      const metadata = extractDocumentMetadata(documentText);
      options.permitReference = options.permitReference || metadata.permitReference;
      options.regulator = options.regulator || metadata.regulator;
      console.log(`📋 Auto-extracted metadata:`, metadata);
    }

    // Step 1: Check cache for document extraction result
    const documentHash = this.extractionCache.generateDocumentHash(processedText);
    const cachedResult = await this.extractionCache.getDocumentCache(documentHash);

    if (cachedResult) {
      console.log('✅ Cache hit: Using cached extraction result');
      return {
        ...cachedResult,
        extractionTimeMs: Date.now() - startTime,
      };
    }

    // Step 2: Try rule library matching first (cost optimization)
    const ruleLibraryMatches = await this.ruleLibraryMatcher.findMatches(
      processedText,
      options.moduleTypes,
      options.regulator,
      options.documentType
    );

    console.log(`📋 Rule library matches: ${ruleLibraryMatches.length} (top score: ${ruleLibraryMatches[0]?.match_score || 0})`);
    
    // Check cache for rule library match result
    if (ruleLibraryMatches.length > 0 && ruleLibraryMatches[0].match_score >= EXTRACTION_CONFIDENCE_DEFAULTS.RULE_LIBRARY_THRESHOLD) {
      const patternHash = this.extractionCache.generatePatternHash(ruleLibraryMatches[0].pattern_id || '');
      const cachedRuleMatch = await this.extractionCache.getRuleMatchCache(documentHash, patternHash);
      
      if (cachedRuleMatch) {
        console.log('✅ Cache hit: Using cached rule library match result');
        // Cache the full document result too
        await this.extractionCache.setDocumentCache(documentHash, cachedRuleMatch);
        return {
          ...cachedRuleMatch,
          extractionTimeMs: Date.now() - startTime,
        };
      }
    }
    
    // If we have high-confidence matches (≥90%), use them
    if (ruleLibraryMatches.length > 0 && ruleLibraryMatches[0].match_score >= EXTRACTION_CONFIDENCE_DEFAULTS.RULE_LIBRARY_THRESHOLD) {
      console.log(`✅ Using rule library matches (${ruleLibraryMatches.length} obligations)`);
      // Convert rule library matches to obligations
      const obligations = ruleLibraryMatches.map((match) => {
        const conditionType = match.extracted_obligation.condition_type || 'STANDARD';
        return {
          condition_reference: match.pattern_id,
          title: match.extracted_obligation.category,
          description: match.matched_text,
          category: match.extracted_obligation.category,
          frequency: match.extracted_obligation.frequency,
          deadline_relative: match.extracted_obligation.deadline_relative,
          is_subjective: match.extracted_obligation.is_subjective,
          confidence_score: Math.min(EXTRACTION_CONFIDENCE_DEFAULTS.RULE_LIBRARY_BASE + match.confidence_boost, 1.0), // Base + boost
          evidence_suggestions: match.extracted_obligation.evidence_types || [],
          condition_type: conditionType, // Legacy support
          condition_types: [conditionType], // Per ingestion schema (array)
          source_pattern_id: match.pattern_id, // Track which pattern was used
        };
      });

      // Track pattern usage (non-blocking - don't await)
      ruleLibraryMatches.forEach((match) => {
        recordPatternSuccess(match.pattern_id).catch((err) =>
          console.error('Error recording pattern success:', err)
        );
      });

      const result: ExtractionResult = {
        obligations,
        metadata: {
          regulator: options.regulator,
          extraction_confidence: EXTRACTION_CONFIDENCE_DEFAULTS.RULE_LIBRARY_EXTRACTION,
        },
        ruleLibraryMatches,
        usedLLM: false,
        extractionTimeMs: Date.now() - startTime,
      };

      // Cache the result (using filtered text hash)
      if (ruleLibraryMatches.length > 0) {
        const patternHash = this.extractionCache.generatePatternHash(ruleLibraryMatches[0].pattern_id || '');
        await this.extractionCache.setRuleMatchCache(documentHash, patternHash, result);
      }
      await this.extractionCache.setDocumentCache(documentHash, result);

      return result;
    }

    // Step 2: Use LLM extraction (fallback when rule library doesn't match)
    // Support all three document types: ENVIRONMENTAL_PERMIT, TRADE_EFFLUENT_CONSENT, MCPD_REGISTRATION
    const documentType = (options.documentType as any) || 'ENVIRONMENTAL_PERMIT';
    console.log(`🤖 Rule library insufficient, falling back to LLM extraction for ${documentType}...`);

    // Step 2a: Check if this is a complex environmental permit that should use multi-pass extraction
    if (documentType === 'ENVIRONMENTAL_PERMIT') {
      // Analyze document complexity
      const complexity = analyzeDocumentComplexity({
        documentText: processedText,
        pageCount: options.pageCount,
        fileSizeBytes: options.fileSizeBytes,
        documentType,
      });

      console.log(`📊 Document complexity: ${complexity.complexity} (confidence: ${complexity.confidence})`);
      console.log(`   Reasons: ${complexity.reasons.join(', ')}`);

      // Use multi-pass extraction for complex environmental permits
      if (complexity.complexity === 'complex' || processedText.length > EXTRACTION_CONFIDENCE_DEFAULTS.COMPLEX_DOC_CHAR_COUNT) {
        console.log('🔄 Using multi-pass extraction strategy for complex permit...');

        try {
          // Load jurisdiction-specific prompt based on regulator
          let loadedPrompt: ExtractorLoadedPrompt | undefined;
          if (options.regulator) {
            const promptSelection = selectPromptId(documentType, options.regulator, options.waterCompany);
            console.log(`📋 Prompt selection: ${promptSelection.promptId} v${promptSelection.version} (jurisdiction-specific: ${promptSelection.isJurisdictionSpecific})`);

            if (promptSelection.isJurisdictionSpecific) {
              const prompt = await loadPrompt(promptSelection);
              if (prompt) {
                loadedPrompt = {
                  promptId: prompt.promptId,
                  version: prompt.version,
                  systemMessage: prompt.systemMessage,
                  userMessageTemplate: prompt.userMessageTemplate,
                  isJurisdictionSpecific: true,
                  loadedFrom: prompt.loadedFrom,
                };
                console.log(`✅ Loaded jurisdiction prompt from: ${prompt.loadedFrom}`);
              } else {
                console.warn(`⚠️  Failed to load jurisdiction prompt, using fallback`);
              }
            }
          }

          const multiPassExtractor = getMultiPassExtractor();
          const multiPassResult = await multiPassExtractor.extract(processedText, {
            documentId: options.documentId, // Pass documentId for real-time progress tracking
            documentType,
            regulator: options.regulator,
            permitReference: options.permitReference,
            pageCount: options.pageCount,
            fileSizeBytes: options.fileSizeBytes,
            waterCompany: options.waterCompany,
            loadedPrompt,
          });

          // Post-process: Expand any consolidated ELVs that slipped through
          let finalObligations = multiPassResult.obligations;
          if (documentMayHaveConsolidatedELVs(documentText)) {
            console.log('🔍 Checking for consolidated ELVs to expand...');
            const expandResult = await expandConsolidatedELVs(
              multiPassResult.obligations as any,
              documentText
            );
            if (expandResult.expandedCount > 0) {
              console.log(`   ✅ Expanded ${expandResult.expandedCount} additional ELV obligations`);
              finalObligations = expandResult.obligations as any;
            }
          }

          const result: ExtractionResult = {
            obligations: finalObligations,
            metadata: {
              permit_reference: options.permitReference,
              regulator: options.regulator,
              extraction_confidence: multiPassResult.coverageScore,
            },
            ruleLibraryMatches: [],
            usedLLM: true,
            extractionTimeMs: multiPassResult.extractionTimeMs,
            tokenUsage: multiPassResult.tokenUsage,
            complexity: 'complex',
          };

          // Cache the multi-pass extraction result
          await this.extractionCache.setDocumentCache(documentHash, result);

          console.log(`✅ Multi-pass extraction complete: ${finalObligations.length} obligations`);
          return result;
        } catch (error: any) {
          console.error(`❌ Multi-pass extraction failed, falling back to single-pass: ${error.message}`);
          // Fall through to single-pass extraction
        }
      }
    }

    // Step 2b: Single-pass LLM extraction (default for non-complex documents)
    console.log(`🤖 Calling LLM for ${documentType} extraction (filtered text length: ${processedText.length} chars)...`);
    let llmResponse;
    try {
      llmResponse = await this.openAIClient.extractObligations(
      processedText,
      documentType,
      {
        pageCount: options.pageCount,
        fileSizeBytes: options.fileSizeBytes,
        regulator: options.regulator,
        permitReference: options.permitReference,
        waterCompany: (options as any).waterCompany,
        registrationType: (options as any).registrationType,
      }
    );
      console.log(`🤖 LLM response received: ${llmResponse.content.length} chars`);
    } catch (error: any) {
      console.error(`❌ LLM extraction failed:`, error.message);
      console.error(`Error stack:`, error.stack);
      throw new Error(`LLM extraction failed: ${error.message}`);
    }

    // Parse JSON response - handle malformed JSON
    let parsedResponse: any;
    try {
      // Clean the response - remove markdown code blocks if present
      let cleanedContent = llmResponse.content.trim();
      
      // Remove markdown code blocks (```json ... ```)
      if (cleanedContent.startsWith('```')) {
        cleanedContent = cleanedContent.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '');
      }
      
      // Try to fix common JSON issues
      // If JSON is truncated, try to find the last complete object/array
      let jsonContent = cleanedContent;
      
      // If parsing fails, try to extract JSON from the response
      try {
        parsedResponse = JSON.parse(jsonContent);
      } catch (parseError: any) {
        console.warn('⚠️ LLM JSON parsing failed, attempting recovery:', parseError.message);
        console.warn('Response length:', jsonContent.length);
        
        // Try to extract partial obligations from truncated JSON
        // Find the obligations array start
        const obligationsStart = jsonContent.indexOf('"obligations"');
        if (obligationsStart === -1) {
          throw new Error(`Failed to parse LLM response: ${parseError.message}. No obligations array found.`);
        }
        
        // Find the opening bracket of the obligations array
        const arrayStart = jsonContent.indexOf('[', obligationsStart);
        if (arrayStart === -1) {
          throw new Error(`Failed to parse LLM response: ${parseError.message}. No obligations array bracket found.`);
        }
        
        // Extract obligations by finding complete objects
        const obligations: any[] = [];
        let depth = 0;
        let inString = false;
        let escapeNext = false;
        let currentObj = '';
        let braceDepth = 0;
        
        for (let i = arrayStart + 1; i < jsonContent.length; i++) {
          const char = jsonContent[i];
          
          if (escapeNext) {
            currentObj += char;
            escapeNext = false;
            continue;
          }
          
          if (char === '\\') {
            currentObj += char;
            escapeNext = true;
            continue;
          }
          
          if (char === '"' && !escapeNext) {
            inString = !inString;
            currentObj += char;
            continue;
          }
          
          if (inString) {
            currentObj += char;
            continue;
          }
          
          if (char === '{') {
            braceDepth++;
            currentObj += char;
            continue;
          }
          
          if (char === '}') {
            braceDepth--;
            currentObj += char;
            if (braceDepth === 0) {
              // Complete object found
              try {
                const obj = JSON.parse(currentObj);
                obligations.push(obj);
                currentObj = '';
              } catch (e) {
                // Skip malformed object
                console.warn('Skipping malformed obligation object');
                currentObj = '';
              }
            }
            continue;
          }
          
          if (char === ']' && braceDepth === 0) {
            // End of array
            break;
          }
          
          if (char === ',' && braceDepth === 0 && currentObj.trim()) {
            // End of object (comma separator)
            try {
              const obj = JSON.parse(currentObj.trim());
              obligations.push(obj);
              currentObj = '';
            } catch (e) {
              // Skip malformed object
              currentObj = '';
            }
            continue;
          }
          
          if (braceDepth > 0) {
            currentObj += char;
          } else if (char !== ' ' && char !== '\n' && char !== '\t' && char !== ',') {
            currentObj += char;
          }
        }
        
        // Try to parse any remaining object
        if (currentObj.trim() && braceDepth === 0) {
          try {
            const obj = JSON.parse(currentObj.trim());
            obligations.push(obj);
          } catch (e) {
            // Skip if malformed
          }
        }
        
        if (obligations.length > 0) {
          console.log(`✅ Recovered ${obligations.length} obligations from truncated JSON`);
          parsedResponse = {
            obligations: obligations,
            metadata: {
              extraction_confidence: EXTRACTION_CONFIDENCE_DEFAULTS.LLM_PARTIAL, // Lower confidence for partial extraction
              permit_reference: null,
              regulator: null,
            }
          };
        } else {
          throw new Error(`Failed to parse LLM response: ${parseError.message}. Could not extract any obligations.`);
        }
      }
    } catch (error: any) {
      console.error('LLM response parsing error:', error);
      console.error('Response content length:', llmResponse.content.length);
      console.error('Response preview:', llmResponse.content.substring(0, 1000));
      throw new Error(`Failed to parse LLM response: ${error.message}`);
    }

    // Validate response structure (different structures for different modules)
    const hasObligations = parsedResponse.obligations && Array.isArray(parsedResponse.obligations);
    const hasParameters = parsedResponse.parameters && Array.isArray(parsedResponse.parameters);
    const hasGenerators = parsedResponse.generators && Array.isArray(parsedResponse.generators);
    
    console.log(`📋 Parsed response: obligations=${hasObligations ? parsedResponse.obligations.length : 0}, parameters=${hasParameters ? parsedResponse.parameters.length : 0}, generators=${hasGenerators ? parsedResponse.generators.length : 0}`);
    
    if (!hasObligations && !hasParameters && !hasGenerators) {
      console.error('❌ Invalid LLM response structure:', Object.keys(parsedResponse));
      throw new Error('Invalid LLM response: missing obligations, parameters, or generators array');
    }

    // Transform LLM obligations to our format
    // Handle different response structures for Module 1, 2, and 3
    let obligations: any[] = [];
    
    // Fallback title generation (rule-based)
    const generateTitleFallback = (text: string, category: string, conditionRef: string | null): string => {
      if (!text) return 'Untitled Obligation';

      // Remove common legal prefixes to get to the action
      let cleanText = text
        .replace(/^The operator shall\s+/i, '')
        .replace(/^The site operator shall\s+/i, '')
        .replace(/^The permit holder shall\s+/i, '')
        .replace(/^The licensee shall\s+/i, '')
        .replace(/^The operator is only authorised to\s+/i, '')
        .replace(/^The activities shall\s+/i, '')
        .replace(/^Activities shall\s+/i, '')
        .replace(/^Waste shall\s+/i, '')
        .replace(/^Emissions shall\s+/i, '')
        .replace(/^Records shall\s+/i, '')
        .replace(/^Monitoring shall\s+/i, '')
        .replace(/^For the following activities.*?\.\s*/i, '')
        .trim();

      // Extract key action verb and object (max 50 chars for readability)
      let title = cleanText;

      // Take up to first period, semicolon, or 50 characters
      const sentences = cleanText.split(/[.;,]/);
      if (sentences[0] && sentences[0].length > 0) {
        title = sentences[0].trim();
      }

      // If still too long, intelligently truncate
      if (title.length > 50) {
        // Try to truncate at a word boundary
        const words = title.substring(0, 47).split(' ');
        words.pop(); // Remove last potentially partial word
        title = words.join(' ') + '...';
      }

      // Capitalize first letter
      title = title.charAt(0).toUpperCase() + title.slice(1);

      return title;
    };

    // Helper function to generate a concise, meaningful title from obligation text using AI
    const generateTitle = async (text: string, category: string, conditionRef: string | null): Promise<string> => {
      if (!text) return 'Untitled Obligation';

      try {
        // Use GPT-3.5-turbo for cost-effective title generation
        const response = await this.openAIClient.generateTitle(text, category);

        // Validate the response
        if (response && response.length > 0 && response.length <= 80) {
          return response;
        }

        // Fallback to rule-based if AI fails
        return generateTitleFallback(text, category, conditionRef);
      } catch (error) {
        console.warn('⚠️ AI title generation failed, using fallback:', error);
        return generateTitleFallback(text, category, conditionRef);
      }
    };

    if (parsedResponse.obligations) {
      // Module 1 & 3: obligations array
      obligations = await Promise.all(
        parsedResponse.obligations.map(async (obl: any) => {
          const obligationText = obl.text || obl.description || '';
          const conditionRef = obl.condition_reference || null;
          const category = obl.category || 'OPERATIONAL';

          // Generate title using AI or fallback
          const title = obl.summary || (await generateTitle(obligationText, category, conditionRef));

          // Normalize condition_type to condition_types array (per ingestion schema)
          const conditionType = obl.condition_type || 'STANDARD';
          const conditionTypes = obl.condition_types || [conditionType];

          return {
            condition_reference: conditionRef,
            title,
            description: obligationText,
            // Grounding fields (prevent AI hallucination)
            original_text: obl.original_text || obl.text || obligationText, // Verbatim text from permit
            page_reference: obl.page_reference || obl.page_number || null, // Page number for verification
            section_reference: obl.section_reference || obl.schedule_reference || null, // Schedule/section reference
            category,
            frequency: obl.frequency || null,
            deadline_date: obl.deadline_date || null,
            deadline_relative: obl.deadline_relative || null,
            is_subjective: obl.is_subjective || false,
            is_improvement: obl.is_improvement || false,
            confidence_score: obl.confidence_score || obl.confidence || EXTRACTION_CONFIDENCE_DEFAULTS.LLM_DEFAULT,
            evidence_suggestions: obl.evidence_suggestions || obl.suggested_evidence_types || [],
            condition_type: conditionType, // Legacy support
            condition_types: conditionTypes, // Per ingestion schema (array)
            // ELV-specific grounding
            elv_limit: obl.elv_limit || null,
            elv_verbatim_text: obl.elv_verbatim_text || null, // For regulatory pack engine safeguard 3
          };
        })
      );
    } else if (parsedResponse.parameters) {
      // Module 2: parameters array (convert to obligations format)
      obligations = parsedResponse.parameters.map((param: any) => ({
        condition_reference: param.section_reference || null,
        title: `${param.parameter_name} - ${param.limit_value} ${param.unit}`,
        description: `Parameter limit: ${param.parameter_name} ${param.limit_type} ${param.limit_value} ${param.unit}`,
        category: 'MONITORING',
        frequency: param.sampling_frequency || null,
        deadline_date: null,
        deadline_relative: null,
        is_subjective: false,
        is_improvement: false,
        confidence_score: param.confidence_score || EXTRACTION_CONFIDENCE_DEFAULTS.LLM_DEFAULT,
        evidence_suggestions: ['Lab results', 'Sample certificate', 'COC form'],
        condition_type: 'PARAMETER_LIMIT', // Legacy support
        condition_types: ['PARAMETER_LIMIT'], // Per ingestion schema (array)
        page_reference: param.page_reference || null,
        parameter_data: param, // Store full parameter data
      }));
      
      // Also add obligations from Module 2 response if present
      if (parsedResponse.obligations) {
        const module2Obligations = parsedResponse.obligations.map((obl: any) => {
          const conditionType = obl.condition_type || 'STANDARD';
          return {
            condition_reference: obl.condition_reference || null,
            title: obl.summary || obl.text?.substring(0, 100) || 'Untitled Obligation',
            description: obl.text || obl.description || '',
            // Grounding fields (prevent AI hallucination)
            original_text: obl.original_text || obl.text || obl.description || '',
            page_reference: obl.page_reference || null,
            section_reference: obl.section_reference || null,
            category: obl.category || 'OPERATIONAL',
            frequency: obl.frequency || null,
            deadline_date: obl.deadline_date || null,
            deadline_relative: obl.deadline_relative || null,
            is_subjective: obl.is_subjective || false,
            is_improvement: false,
            confidence_score: obl.confidence_score || EXTRACTION_CONFIDENCE_DEFAULTS.LLM_DEFAULT,
            evidence_suggestions: obl.evidence_suggestions || [],
            condition_type: conditionType, // Legacy support
            condition_types: obl.condition_types || [conditionType], // Per ingestion schema (array)
          };
        });
        obligations = [...obligations, ...module2Obligations];
      }
    } else if (parsedResponse.generators) {
      // Module 3: generators array (convert to obligations format)
      obligations = parsedResponse.generators.map((gen: any) => ({
        condition_reference: gen.generator_id || null,
        title: `${gen.generator_name} - ${gen.generator_type}`,
        description: `Generator: ${gen.generator_name}, Type: ${gen.generator_type}, Run-hour limit: ${gen.annual_run_hour_limit} hours`,
        category: 'MONITORING',
        frequency: 'ANNUAL',
        deadline_date: null,
        deadline_relative: null,
        is_subjective: false,
        is_improvement: false,
        confidence_score: gen.confidence_score || EXTRACTION_CONFIDENCE_DEFAULTS.LLM_DEFAULT,
        evidence_suggestions: ['Run-hour log', 'Meter readings', 'Maintenance records'],
        condition_type: 'RUN_HOUR_LIMIT', // Legacy support
        condition_types: ['RUN_HOUR_LIMIT'], // Per ingestion schema (array)
        page_reference: gen.page_reference || null,
        generator_data: gen, // Store full generator data
      }));

      // Also add obligations from Module 3 response if present
      if (parsedResponse.obligations) {
        const module3Obligations = parsedResponse.obligations.map((obl: any) => {
          const conditionType = obl.condition_type || 'STANDARD';
          return {
            condition_reference: obl.condition_reference || null,
            title: obl.summary || obl.text?.substring(0, 100) || 'Untitled Obligation',
            description: obl.text || obl.description || '',
            // Grounding fields (prevent AI hallucination)
            original_text: obl.original_text || obl.text || obl.description || '',
            page_reference: obl.page_reference || null,
            section_reference: obl.section_reference || null,
            category: obl.category || 'OPERATIONAL',
            frequency: obl.frequency || null,
            deadline_date: obl.deadline_date || null,
            deadline_relative: obl.deadline_relative || null,
            is_subjective: obl.is_subjective || false,
            is_improvement: false,
            confidence_score: obl.confidence_score || EXTRACTION_CONFIDENCE_DEFAULTS.LLM_DEFAULT,
            evidence_suggestions: obl.evidence_suggestions || [],
            condition_type: conditionType, // Legacy support
            condition_types: obl.condition_types || [conditionType], // Per ingestion schema (array)
            applies_to_generators: obl.applies_to_generators || [],
          };
        });
        obligations = [...obligations, ...module3Obligations];
      }
    }

    // Extract metadata based on document type
    // Reuse documentType declared earlier at line 183
    let metadata: any = {
      regulator: options.regulator,
      extraction_confidence: EXTRACTION_CONFIDENCE_DEFAULTS.LLM_DEFAULT,
    };

    if (documentType === 'ENVIRONMENTAL_PERMIT') {
      metadata.permit_reference = parsedResponse.document_metadata?.permit_reference || options.permitReference;
      metadata.extraction_confidence = parsedResponse.extraction_metadata?.extraction_confidence || EXTRACTION_CONFIDENCE_DEFAULTS.LLM_DEFAULT;
    } else if (documentType === 'TRADE_EFFLUENT_CONSENT') {
      metadata.consent_reference = parsedResponse.consent_metadata?.consent_reference;
      metadata.water_company = parsedResponse.consent_metadata?.water_company;
      metadata.extraction_confidence = parsedResponse.extraction_metadata?.extraction_confidence || EXTRACTION_CONFIDENCE_DEFAULTS.LLM_DEFAULT;
    } else if (documentType === 'MCPD_REGISTRATION') {
      metadata.registration_reference = parsedResponse.registration_metadata?.registration_reference;
      metadata.registration_type = parsedResponse.registration_metadata?.registration_type;
      metadata.aer_due_date = parsedResponse.registration_metadata?.aer_due_date;
      metadata.extraction_confidence = parsedResponse.extraction_metadata?.extraction_confidence || EXTRACTION_CONFIDENCE_DEFAULTS.LLM_DEFAULT;
    }

    console.log(`✅ LLM extraction complete: ${obligations.length} obligations transformed`);

    // Step: Validate extraction with InferenceBarrier
    const extractionContext: ExtractionContext = {
      regulator: options.regulator,
      jurisdiction: getJurisdictionFromRegulator(options.regulator) ||
                    getJurisdictionFromWaterCompany(options.waterCompany),
      waterCompany: options.waterCompany,
      documentType: documentType,
    };

    const validationResult = InferenceBarrier.validateExtractionScope(
      { obligations, metadata: parsedResponse.metadata || {} },
      extractionContext
    );

    console.log(formatValidationResult(validationResult));

    // Add validation warnings to extraction warnings (but don't fail on warnings)
    const extractionWarnings: Array<{ code: string; message: string; details?: Record<string, unknown> }> = [];
    if (validationResult.warnings.length > 0) {
      extractionWarnings.push(...validationResult.warnings.map(w => ({
        code: w.code,
        message: w.message,
        details: { field: w.field, suggestion: w.suggestion },
      })));
    }

    // Log errors but don't fail extraction (allow manual review)
    if (!validationResult.valid) {
      console.warn('⚠️ InferenceBarrier detected potential cross-jurisdiction issues');
      extractionWarnings.push(...validationResult.errors.map(e => ({
        code: e.code,
        message: e.message,
        details: { field: e.field, severity: 'error', suggestion: e.suggestion },
      })));
    }

    // Step: Validate grounding references (anti-hallucination check)
    const groundingResult = InferenceBarrier.validateGroundingReferences(
      obligations,
      extractionContext
    );

    if (groundingResult.warnings.length > 0) {
      console.log(`⚠️ Grounding validation: ${groundingResult.warnings.length} warnings`);
      extractionWarnings.push(...groundingResult.warnings.map(w => ({
        code: w.code,
        message: w.message,
        details: { field: w.field, suggestion: w.suggestion },
      })));
    }

    // Calculate token usage and cost
    const tokenUsage = llmResponse.usage
      ? {
          inputTokens: llmResponse.usage.prompt_tokens,
          outputTokens: llmResponse.usage.completion_tokens,
          totalTokens: llmResponse.usage.total_tokens,
          model: llmResponse.model,
          estimatedCost: estimateCost(
            llmResponse.model as AIModel,
            llmResponse.usage.prompt_tokens,
            llmResponse.usage.completion_tokens
          ),
        }
      : undefined;

    if (tokenUsage) {
      console.log(`💰 Token usage: ${tokenUsage.inputTokens} input + ${tokenUsage.outputTokens} output = ${tokenUsage.totalTokens} total`);
      console.log(`💰 Estimated cost: $${tokenUsage.estimatedCost.toFixed(4)} (${tokenUsage.model})`);
    }

    const result: ExtractionResult = {
      obligations,
      metadata,
      ruleLibraryMatches: [],
      usedLLM: true,
      extractionTimeMs: Date.now() - startTime,
      tokenUsage,
      complexity: llmResponse.complexity, // Set from smart model routing
      warnings: extractionWarnings.length > 0 ? extractionWarnings : undefined,
    };

    // Cache the LLM extraction result (reuse documentHash declared at line 142)
    await this.extractionCache.setDocumentCache(documentHash, result);

    return result;
  }

  /**
   * Segment large documents (>800k tokens) for processing
   */
  segmentDocument(text: string, maxTokens: number = 800000): string[] {
    // Approximate: 1 token ≈ 4 characters
    const maxChars = maxTokens * 4;

    if (text.length <= maxChars) {
      return [text];
    }

    // Segment by paragraphs, then by sentences
    const paragraphs = text.split(/\n\s*\n/);
    const segments: string[] = [];
    let currentSegment = '';

    for (const paragraph of paragraphs) {
      if (currentSegment.length + paragraph.length > maxChars && currentSegment.length > 0) {
        segments.push(currentSegment);
        currentSegment = paragraph;
      } else {
        currentSegment += (currentSegment ? '\n\n' : '') + paragraph;
      }
    }

    if (currentSegment.length > 0) {
      segments.push(currentSegment);
    }

    return segments.length > 0 ? segments : [text];
  }
}

// Singleton instance
let documentProcessor: DocumentProcessor | null = null;

export function getDocumentProcessor(): DocumentProcessor {
  if (!documentProcessor) {
    documentProcessor = new DocumentProcessor();
  }
  return documentProcessor;
}

