/**
 * Document Processing Pipeline
 * Handles OCR, text extraction, and document processing
 * Reference: docs/specs/41_Backend_Background_Jobs.md Section 3.1
 */

// Import pdf-parse v2 API
const { PDFParse } = require('pdf-parse');
import { createWorker } from 'tesseract.js';
import { getOpenAIClient } from './openai-client';
import { getRuleLibraryMatcher, RuleMatch } from './rule-library-matcher';
import { recordPatternSuccess } from './correction-tracking';
import { checkForPatternDiscovery } from './pattern-discovery';

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
}

export class DocumentProcessor {
  private openAIClient = getOpenAIClient();
  private ruleLibraryMatcher = getRuleLibraryMatcher();

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
      const result = await parser.getText();
      extractedText = result.text;
      const pageCount = result.numpages || 1;
      const fileSizeBytes = fileBuffer.length;

      // Check if text extraction was successful (has meaningful content)
      if (extractedText.trim().length < 100) {
        // Likely scanned document, needs OCR
        needsOCR = true;
        ocrText = await this.performOCR(fileBuffer);
        extractedText = ocrText;
      }

      const isLargeDocument = pageCount >= 50 && fileSizeBytes >= 10_000_000;

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
      moduleTypes: string[];
      regulator?: string;
      documentType?: string;
      pageCount?: number;
      fileSizeBytes?: number;
      permitReference?: string;
    }
  ): Promise<ExtractionResult> {
    const startTime = Date.now();

    // Step 1: Try rule library matching first (cost optimization)
    const ruleLibraryMatches = await this.ruleLibraryMatcher.findMatches(
      documentText,
      options.moduleTypes,
      options.regulator,
      options.documentType
    );

    console.log(`📋 Rule library matches: ${ruleLibraryMatches.length} (top score: ${ruleLibraryMatches[0]?.match_score || 0})`);
    
    // If we have high-confidence matches (≥90%), use them
    if (ruleLibraryMatches.length > 0 && ruleLibraryMatches[0].match_score >= 0.9) {
      console.log(`✅ Using rule library matches (${ruleLibraryMatches.length} obligations)`);
      // Convert rule library matches to obligations
      const obligations = ruleLibraryMatches.map((match) => ({
        condition_reference: match.pattern_id,
        title: match.extracted_obligation.category,
        description: match.matched_text,
        category: match.extracted_obligation.category,
        frequency: match.extracted_obligation.frequency,
        deadline_relative: match.extracted_obligation.deadline_relative,
        is_subjective: match.extracted_obligation.is_subjective,
        confidence_score: Math.min(0.85 + match.confidence_boost, 1.0), // Base 85% + 15% boost
        evidence_suggestions: match.extracted_obligation.evidence_types || [],
        condition_type: match.extracted_obligation.condition_type,
        source_pattern_id: match.pattern_id, // Track which pattern was used
      }));

      // Track pattern usage (non-blocking - don't await)
      ruleLibraryMatches.forEach((match) => {
        recordPatternSuccess(match.pattern_id).catch((err) =>
          console.error('Error recording pattern success:', err)
        );
      });

      return {
        obligations,
        metadata: {
          regulator: options.regulator,
          extraction_confidence: 0.9, // High confidence for rule library matches
        },
        ruleLibraryMatches,
        usedLLM: false,
        extractionTimeMs: Date.now() - startTime,
      };
    }

    // Step 2: Use LLM extraction (fallback when rule library doesn't match)
    // Support all three document types: ENVIRONMENTAL_PERMIT, TRADE_EFFLUENT_CONSENT, MCPD_REGISTRATION
    const documentType = (options.documentType as any) || 'ENVIRONMENTAL_PERMIT';
    console.log(`🤖 Rule library insufficient, falling back to LLM extraction for ${documentType}...`);
    console.log(`🤖 Calling LLM for ${documentType} extraction (text length: ${documentText.length} chars)...`);
    let llmResponse;
    try {
      llmResponse = await this.openAIClient.extractObligations(
      documentText,
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
              extraction_confidence: 0.8, // Lower confidence for partial extraction
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
    
    if (parsedResponse.obligations) {
      // Module 1 & 3: obligations array
      obligations = parsedResponse.obligations.map((obl: any) => ({
      condition_reference: obl.condition_reference || null,
      title: obl.summary || obl.text?.substring(0, 100) || 'Untitled Obligation',
      description: obl.text || obl.description || '',
      category: obl.category || 'OPERATIONAL',
      frequency: obl.frequency || null,
      deadline_date: obl.deadline_date || null,
      deadline_relative: obl.deadline_relative || null,
      is_subjective: obl.is_subjective || false,
      is_improvement: obl.is_improvement || false,
      confidence_score: obl.confidence_score || obl.confidence || 0.7,
      evidence_suggestions: obl.evidence_suggestions || obl.suggested_evidence_types || [],
      condition_type: obl.condition_type || 'STANDARD',
      page_reference: obl.page_reference || obl.page_number || null,
    }));
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
        confidence_score: param.confidence_score || 0.7,
        evidence_suggestions: ['Lab results', 'Sample certificate', 'COC form'],
        condition_type: 'PARAMETER_LIMIT',
        page_reference: param.page_reference || null,
        parameter_data: param, // Store full parameter data
      }));
      
      // Also add obligations from Module 2 response if present
      if (parsedResponse.obligations) {
        const module2Obligations = parsedResponse.obligations.map((obl: any) => ({
          condition_reference: obl.condition_reference || null,
          title: obl.summary || obl.text?.substring(0, 100) || 'Untitled Obligation',
          description: obl.text || obl.description || '',
          category: obl.category || 'OPERATIONAL',
          frequency: obl.frequency || null,
          deadline_date: obl.deadline_date || null,
          deadline_relative: obl.deadline_relative || null,
          is_subjective: obl.is_subjective || false,
          is_improvement: false,
          confidence_score: obl.confidence_score || 0.7,
          evidence_suggestions: obl.evidence_suggestions || [],
          condition_type: obl.condition_type || 'STANDARD',
          page_reference: obl.page_reference || null,
        }));
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
        confidence_score: gen.confidence_score || 0.7,
        evidence_suggestions: ['Run-hour log', 'Meter readings', 'Maintenance records'],
        condition_type: 'RUN_HOUR_LIMIT',
        page_reference: gen.page_reference || null,
        generator_data: gen, // Store full generator data
      }));
      
      // Also add obligations from Module 3 response if present
      if (parsedResponse.obligations) {
        const module3Obligations = parsedResponse.obligations.map((obl: any) => ({
          condition_reference: obl.condition_reference || null,
          title: obl.summary || obl.text?.substring(0, 100) || 'Untitled Obligation',
          description: obl.text || obl.description || '',
          category: obl.category || 'OPERATIONAL',
          frequency: obl.frequency || null,
          deadline_date: obl.deadline_date || null,
          deadline_relative: obl.deadline_relative || null,
          is_subjective: obl.is_subjective || false,
          is_improvement: false,
          confidence_score: obl.confidence_score || 0.7,
          evidence_suggestions: obl.evidence_suggestions || [],
          condition_type: obl.condition_type || 'STANDARD',
          page_reference: obl.page_reference || null,
          applies_to_generators: obl.applies_to_generators || [],
        }));
        obligations = [...obligations, ...module3Obligations];
      }
    }

    // Extract metadata based on document type
    // Reuse documentType declared earlier at line 183
    let metadata: any = {
      regulator: options.regulator,
      extraction_confidence: 0.7,
    };

    if (documentType === 'ENVIRONMENTAL_PERMIT') {
      metadata.permit_reference = parsedResponse.document_metadata?.permit_reference || options.permitReference;
      metadata.extraction_confidence = parsedResponse.extraction_metadata?.extraction_confidence || 0.7;
    } else if (documentType === 'TRADE_EFFLUENT_CONSENT') {
      metadata.consent_reference = parsedResponse.consent_metadata?.consent_reference;
      metadata.water_company = parsedResponse.consent_metadata?.water_company;
      metadata.extraction_confidence = parsedResponse.extraction_metadata?.extraction_confidence || 0.7;
    } else if (documentType === 'MCPD_REGISTRATION') {
      metadata.registration_reference = parsedResponse.registration_metadata?.registration_reference;
      metadata.registration_type = parsedResponse.registration_metadata?.registration_type;
      metadata.aer_due_date = parsedResponse.registration_metadata?.aer_due_date;
      metadata.extraction_confidence = parsedResponse.extraction_metadata?.extraction_confidence || 0.7;
    }

    console.log(`✅ LLM extraction complete: ${obligations.length} obligations transformed`);

    return {
      obligations,
      metadata,
      ruleLibraryMatches: [],
      usedLLM: true,
      extractionTimeMs: Date.now() - startTime,
    };
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

