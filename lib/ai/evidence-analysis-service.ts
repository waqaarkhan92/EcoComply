/**
 * AI Evidence Analysis Service
 * Uses AI to analyze obligations and suggest evidence requirements
 * Reference: docs/specs/90_Enhanced_Features_V2.md Section 9
 */

import OpenAI from 'openai';
import { supabaseAdmin } from '@/lib/supabase/server';

const EVIDENCE_ANALYSIS_PROMPT = `You are an expert in UK environmental compliance, specifically in Environmental Permits, Trade Effluent, MCPD/Generators, and Hazardous Waste regulations.

Analyze this environmental compliance obligation and determine what evidence would be required to demonstrate compliance.

Obligation Details:
- Title: {title}
- Description: {description}
- Original Text: {originalText}
- Category: {category}
- Frequency: {frequency}

Please provide:
1. Required Evidence: Minimum evidence types that MUST be provided to prove compliance
2. Recommended Evidence: Additional evidence that would strengthen compliance defense
3. Specific Requirements: Any specific formatting, dating, certification, or signature requirements

Return your analysis as JSON in this exact format:
{
  "required_evidence": [
    {
      "type": "string (e.g., 'Lab Report', 'Calibration Certificate', 'Maintenance Log')",
      "description": "string explaining what this evidence should contain",
      "format": "string (e.g., 'PDF', 'Signed document', 'Photo with timestamp')"
    }
  ],
  "recommended_evidence": [
    {
      "type": "string",
      "description": "string",
      "rationale": "string explaining why this strengthens compliance"
    }
  ],
  "specific_requirements": [
    "string describing specific requirements"
  ],
  "evidence_frequency": "string (e.g., 'Per occurrence', 'Monthly', 'Annually')",
  "minimum_retention_period": "string (e.g., '4 years', '6 years')",
  "confidence": 0.0-1.0
}`;

const EVIDENCE_VALIDATION_PROMPT = `You are an expert in UK environmental compliance evidence review.

Determine if the provided evidence adequately satisfies the obligation requirement.

Obligation:
- Title: {obligationTitle}
- Description: {obligationDescription}
- Category: {obligationCategory}

Evidence:
- File Name: {evidenceFileName}
- Evidence Type: {evidenceType}
- Description: {evidenceDescription}
- Compliance Period: {compliancePeriod}

Analyze whether this evidence:
1. Matches the obligation's requirements
2. Is appropriate for the compliance period
3. Has any gaps or deficiencies

Return as JSON:
{
  "is_valid": boolean,
  "confidence": 0.0-1.0,
  "gaps": ["string array of any gaps identified"],
  "recommendations": ["string array of recommendations"],
  "match_score": 0-100
}`;

export class EvidenceAnalysisService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Analyze an obligation and suggest evidence requirements
   */
  async analyzeObligation(obligationId: string): Promise<{
    suggestions: any;
    confidence: number;
  }> {
    // Fetch obligation details
    const { data: obligation, error } = await supabaseAdmin
      .from('obligations')
      .select(`
        id,
        company_id,
        obligation_title,
        obligation_description,
        original_text,
        category,
        frequency
      `)
      .eq('id', obligationId)
      .single();

    if (error || !obligation) {
      throw new Error(`Obligation not found: ${error?.message}`);
    }

    // Check cache first
    const { data: cached } = await supabaseAdmin
      .from('evidence_suggestions')
      .select('*')
      .eq('obligation_id', obligationId)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (cached) {
      return {
        suggestions: cached.suggestions,
        confidence: cached.confidence,
      };
    }

    // Generate prompt
    const prompt = EVIDENCE_ANALYSIS_PROMPT
      .replace('{title}', obligation.obligation_title || 'N/A')
      .replace('{description}', obligation.obligation_description || 'N/A')
      .replace('{originalText}', obligation.original_text || 'N/A')
      .replace('{category}', obligation.category || 'N/A')
      .replace('{frequency}', obligation.frequency || 'N/A');

    // Call OpenAI
    const response = await this.client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are an environmental compliance expert. Always respond with valid JSON.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    const analysis = JSON.parse(content);
    const confidence = analysis.confidence || 0.8;

    // Cache the result
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // Cache for 30 days

    await supabaseAdmin.from('evidence_suggestions').upsert(
      {
        company_id: obligation.company_id,
        obligation_id: obligationId,
        suggestions: analysis,
        required_evidence: analysis.required_evidence || [],
        recommended_evidence: analysis.recommended_evidence || [],
        specific_requirements: analysis.specific_requirements || [],
        confidence,
        model_used: 'gpt-4o',
        generated_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      },
      {
        onConflict: 'obligation_id',
      }
    );

    return { suggestions: analysis, confidence };
  }

  /**
   * Get cached suggestions for an obligation
   */
  async getSuggestions(obligationId: string): Promise<any | null> {
    const { data } = await supabaseAdmin
      .from('evidence_suggestions')
      .select('*')
      .eq('obligation_id', obligationId)
      .single();

    return data;
  }

  /**
   * Validate if evidence satisfies an obligation
   */
  async validateEvidence(
    obligationId: string,
    evidenceId: string
  ): Promise<{
    is_valid: boolean;
    confidence: number;
    gaps: string[];
    recommendations: string[];
    match_score: number;
  }> {
    // Fetch obligation and evidence
    const [obligationResult, evidenceResult] = await Promise.all([
      supabaseAdmin
        .from('obligations')
        .select('obligation_title, obligation_description, category')
        .eq('id', obligationId)
        .single(),
      supabaseAdmin
        .from('evidence_items')
        .select('file_name, evidence_type, notes, compliance_period_start, compliance_period_end')
        .eq('id', evidenceId)
        .single(),
    ]);

    if (!obligationResult.data || !evidenceResult.data) {
      throw new Error('Obligation or evidence not found');
    }

    const obligation = obligationResult.data;
    const evidence = evidenceResult.data;

    const compliancePeriod = evidence.compliance_period_start && evidence.compliance_period_end
      ? `${evidence.compliance_period_start} to ${evidence.compliance_period_end}`
      : 'Not specified';

    const prompt = EVIDENCE_VALIDATION_PROMPT
      .replace('{obligationTitle}', obligation.obligation_title || 'N/A')
      .replace('{obligationDescription}', obligation.obligation_description || 'N/A')
      .replace('{obligationCategory}', obligation.category || 'N/A')
      .replace('{evidenceFileName}', evidence.file_name || 'N/A')
      .replace('{evidenceType}', evidence.evidence_type || 'N/A')
      .replace('{evidenceDescription}', evidence.notes || 'N/A')
      .replace('{compliancePeriod}', compliancePeriod);

    const response = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an environmental compliance expert. Always respond with valid JSON.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    return JSON.parse(content);
  }
}

export const evidenceAnalysisService = new EvidenceAnalysisService();
