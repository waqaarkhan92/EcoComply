/**
 * Document Processor Unit Tests
 * Tests PDF processing and obligation extraction pipeline
 * Target: 100% coverage
 */

import { getDocumentProcessor, DocumentProcessor } from '@/lib/ai/document-processor';
import { filterDocumentText, extractDocumentMetadata } from '@/lib/ai/document-filter';
import { analyzeDocumentComplexity } from '@/lib/ai/model-router';
import { mockPDFBuffer, mockOpenAIResponse } from '@/tests/helpers/mock-data';

// Mock OpenAI client
const mockExtractObligations = jest.fn();
const mockGenerateTitle = jest.fn();
const mockGetDocumentTimeout = jest.fn().mockReturnValue(300000);

jest.mock('@/lib/ai/openai-client', () => ({
  getOpenAIClient: jest.fn(() => ({
    extractObligations: mockExtractObligations,
    generateTitle: mockGenerateTitle,
    getDocumentTimeout: mockGetDocumentTimeout,
  })),
}));

// Mock document filter
jest.mock('@/lib/ai/document-filter', () => ({
  filterDocumentText: jest.fn(),
  extractDocumentMetadata: jest.fn(),
}));

// Mock model router
jest.mock('@/lib/ai/model-router', () => ({
  analyzeDocumentComplexity: jest.fn(),
  estimateCost: jest.fn().mockReturnValue(0.015),
}));

// Mock rule library matcher
jest.mock('@/lib/ai/rule-library-matcher', () => ({
  getRuleLibraryMatcher: jest.fn(() => ({
    findMatches: jest.fn().mockResolvedValue([]),
  })),
}));

// Mock correction tracking
jest.mock('@/lib/ai/correction-tracking', () => ({
  recordPatternSuccess: jest.fn().mockResolvedValue(undefined),
}));

// Mock pattern discovery
jest.mock('@/lib/ai/pattern-discovery', () => ({
  checkForPatternDiscovery: jest.fn().mockResolvedValue(undefined),
}));

// Mock extraction cache
jest.mock('@/lib/ai/extraction-cache', () => ({
  getExtractionCache: jest.fn(() => ({
    generateDocumentHash: jest.fn().mockReturnValue('test-hash'),
    generatePatternHash: jest.fn().mockReturnValue('pattern-hash'),
    getDocumentCache: jest.fn().mockResolvedValue(null),
    getRuleMatchCache: jest.fn().mockResolvedValue(null),
    setDocumentCache: jest.fn().mockResolvedValue(undefined),
    setRuleMatchCache: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Mock pdf-parse
jest.mock('pdf-parse', () => ({
  PDFParse: jest.fn().mockImplementation(() => ({
    getText: jest.fn().mockResolvedValue({
      text: 'ENVIRONMENTAL PERMIT\nCONDITION 1: Monitor emissions quarterly\nCONDITION 2: Submit annual report',
      pages: [1, 2, 3],
      total: 3,
    }),
  })),
}));

// Mock tesseract.js
jest.mock('tesseract.js', () => ({
  createWorker: jest.fn().mockResolvedValue({
    recognize: jest.fn().mockResolvedValue({ data: { text: 'OCR extracted text' } }),
    terminate: jest.fn().mockResolvedValue(undefined),
  }),
}));

describe('Document Processor', () => {
  let processor: DocumentProcessor;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset module to get fresh singleton
    jest.resetModules();

    // Get fresh processor instance
    processor = getDocumentProcessor();

    // Default mock implementations
    (filterDocumentText as jest.Mock).mockReturnValue({
      filteredText: 'ENVIRONMENTAL PERMIT\nCONDITION 1: Monitor emissions quarterly',
      filteredLength: 60,
      reductionPercentage: 40,
      removedSections: ['table_of_contents'],
    });

    (extractDocumentMetadata as jest.Mock).mockReturnValue({
      permitReference: 'EPR/TEST/001',
      regulator: 'Environment Agency',
    });

    (analyzeDocumentComplexity as jest.Mock).mockReturnValue({
      complexity: 'simple',
      recommendedModel: 'gpt-4o-mini',
      confidence: 0.9,
      estimatedTokens: 10000,
      reasons: ['Standard EA permit format'],
      metrics: { pageCount: 3 },
    });

    // Mock OpenAI response
    mockExtractObligations.mockResolvedValue(mockOpenAIResponse(5));
    mockGenerateTitle.mockResolvedValue('Monitor quarterly emissions');
  });

  describe('processDocument', () => {
    it('should process PDF and extract text successfully', async () => {
      const pdfBuffer = mockPDFBuffer();

      const result = await processor.processDocument(pdfBuffer, 'test-permit.pdf', {
        regulator: 'Environment Agency',
        documentType: 'ENVIRONMENTAL_PERMIT',
      });

      expect(result.extractedText).toBeDefined();
      expect(result.extractedText.length).toBeGreaterThan(0);
      expect(result.pageCount).toBeGreaterThan(0);
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should reject non-PDF files', async () => {
      const textBuffer = Buffer.from('Not a PDF');

      await expect(
        processor.processDocument(textBuffer, 'test.txt')
      ).rejects.toThrow('Only PDF files are supported');
    });

    it('should correctly calculate isLargeDocument flag', async () => {
      // isLargeDocument is calculated based on pageCount >= 50 AND fileSizeBytes >= 10MB
      const pdfBuffer = mockPDFBuffer();

      const result = await processor.processDocument(pdfBuffer, 'test.pdf');

      // With mock returning 3 pages and small buffer, isLargeDocument should be false
      expect(result.isLargeDocument).toBe(false);
      expect(result.pageCount).toBeDefined();
      expect(result.fileSizeBytes).toBeDefined();
    });
  });

  describe('extractObligations', () => {
    it('should extract obligations using LLM when rule library has no matches', async () => {
      const documentText = 'ENVIRONMENTAL PERMIT\nCONDITION 1: Monitor emissions quarterly';

      const result = await processor.extractObligations(documentText, {
        moduleTypes: ['ENVIRONMENTAL_PERMIT'],
        regulator: 'Environment Agency',
        documentType: 'ENVIRONMENTAL_PERMIT',
        pageCount: 10,
      });

      expect(result.obligations).toHaveLength(5);
      expect(result.usedLLM).toBe(true);
      expect(mockExtractObligations).toHaveBeenCalled();
    });

    it('should filter document text before extraction', async () => {
      const documentText = 'Long document with table of contents...';

      await processor.extractObligations(documentText, {
        moduleTypes: ['ENVIRONMENTAL_PERMIT'],
      });

      expect(filterDocumentText).toHaveBeenCalledWith(
        documentText,
        expect.any(Object)
      );
    });

    it('should auto-extract metadata when not provided', async () => {
      const documentText = 'EPR/AB1234CD Environmental Permit';

      await processor.extractObligations(documentText, {
        moduleTypes: ['ENVIRONMENTAL_PERMIT'],
      });

      expect(extractDocumentMetadata).toHaveBeenCalled();
    });

    it('should track token usage from LLM response', async () => {
      const documentText = 'Test document';

      const result = await processor.extractObligations(documentText, {
        moduleTypes: ['ENVIRONMENTAL_PERMIT'],
      });

      expect(result.tokenUsage).toBeDefined();
      expect(result.tokenUsage?.totalTokens).toBeGreaterThan(0);
      expect(result.tokenUsage?.estimatedCost).toBeGreaterThan(0);
    });

    it('should handle LLM extraction failures gracefully', async () => {
      mockExtractObligations.mockRejectedValue(new Error('OpenAI API error'));

      const documentText = 'Test document';

      await expect(
        processor.extractObligations(documentText, {
          moduleTypes: ['ENVIRONMENTAL_PERMIT'],
        })
      ).rejects.toThrow('LLM extraction failed: OpenAI API error');
    });

    it('should include complexity in result from smart routing', async () => {
      const documentText = 'Test document';

      const result = await processor.extractObligations(documentText, {
        moduleTypes: ['ENVIRONMENTAL_PERMIT'],
      });

      expect(result.complexity).toBe('simple');
    });
  });

  describe('segmentDocument', () => {
    it('should not segment small documents', () => {
      const shortText = 'Short document text';

      const segments = processor.segmentDocument(shortText);

      expect(segments).toHaveLength(1);
      expect(segments[0]).toBe(shortText);
    });

    it('should segment very large documents', () => {
      // Create text larger than max tokens (800k tokens * 4 chars = 3.2M chars)
      const largeText = 'PARAGRAPH 1\n\n' + 'x'.repeat(4_000_000) + '\n\nPARAGRAPH 2';

      const segments = processor.segmentDocument(largeText);

      expect(segments.length).toBeGreaterThan(1);
    });

    it('should segment by paragraphs when possible', () => {
      const paragraphText = Array(100)
        .fill('This is a paragraph with some text.')
        .join('\n\n');

      const segments = processor.segmentDocument(paragraphText, 100); // Low token limit for testing

      expect(segments.length).toBeGreaterThan(1);
      // Each segment should start with paragraph content
      segments.forEach(segment => {
        expect(segment.trim().length).toBeGreaterThan(0);
      });
    });
  });

  describe('getDocumentProcessor', () => {
    it('should return singleton instance', () => {
      const processor1 = getDocumentProcessor();
      const processor2 = getDocumentProcessor();

      expect(processor1).toBe(processor2);
    });
  });
});
