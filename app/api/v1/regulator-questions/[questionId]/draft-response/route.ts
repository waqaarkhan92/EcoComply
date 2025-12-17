/**
 * AI Auto-Draft Response API
 * POST /api/v1/regulator-questions/[questionId]/draft-response - Generate AI draft
 * Reference: docs/specs/90_Enhanced_Features_V2.md Section 10
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireRole, getRequestId } from '@/lib/api/middleware';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';
import OpenAI from 'openai';
import { env } from '@/lib/env';

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ questionId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const params = await props.params;
    const { questionId } = params;

    // Get the question with related context
    const { data: question, error: questionError } = await supabaseAdmin
      .from('regulator_questions')
      .select(`
        id,
        question_text,
        question_type,
        regulator_name,
        received_date,
        due_date,
        permit_id,
        permits(
          permit_number,
          permit_type,
          issue_date,
          expiry_date,
          sites(
            name,
            address
          )
        )
      `)
      .eq('id', questionId)
      .single();

    if (questionError || !question) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Regulator question not found',
        404,
        {},
        { request_id: requestId }
      );
    }

    // Get related obligations and evidence for context
    const { data: obligations } = await supabaseAdmin
      .from('obligations')
      .select(`
        id,
        title,
        description,
        frequency,
        status
      `)
      .eq('permit_id', question.permit_id)
      .limit(10);

    // Get recent evidence items for context
    const { data: evidence } = await supabaseAdmin
      .from('evidence_items')
      .select(`
        id,
        file_name,
        evidence_type,
        description,
        created_at
      `)
      .eq('permit_id', question.permit_id)
      .order('created_at', { ascending: false })
      .limit(5);

    // Build context for AI
    const permit = question.permits as any;
    const site = permit?.sites;

    const context = `
Site Information:
- Site Name: ${site?.name || 'N/A'}
- Site Address: ${site?.address || 'N/A'}

Permit Information:
- Permit Number: ${permit?.permit_number || 'N/A'}
- Permit Type: ${permit?.permit_type || 'N/A'}
- Issue Date: ${permit?.issue_date || 'N/A'}
- Expiry Date: ${permit?.expiry_date || 'N/A'}

Related Obligations:
${obligations?.map(o => `- ${o.title}: ${o.description || 'No description'} (${o.status})`).join('\n') || 'No obligations found'}

Recent Evidence:
${evidence?.map(e => `- ${e.file_name} (${e.evidence_type}): ${e.description || 'No description'}`).join('\n') || 'No recent evidence'}

Regulator Question:
- From: ${question.regulator_name}
- Type: ${question.question_type}
- Received: ${question.received_date}
- Due: ${question.due_date}
- Question: ${question.question_text}
`;

    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an environmental compliance expert helping draft professional responses to regulator questions. Your responses should be:
1. Professional and formal in tone
2. Factual and based on the provided context
3. Complete but concise
4. Compliant with UK environmental regulations
5. Include specific references to permits, evidence, or obligations where relevant

Do not make claims that cannot be supported by the provided context. If information is missing, acknowledge it professionally and suggest what additional information may be needed.`,
        },
        {
          role: 'user',
          content: `Please draft a professional response to the following regulator question. Use the context provided to inform your response.

${context}

Draft a response that addresses the regulator's question directly and professionally.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    const draftResponse = completion.choices[0]?.message?.content || '';

    // Generate suggestions for evidence to attach
    const evidenceSuggestions = evidence?.map(e => ({
      id: e.id,
      file_name: e.file_name,
      evidence_type: e.evidence_type,
      relevance: 'May be relevant to support the response',
    })) || [];

    const response = successResponse(
      {
        data: {
          question_id: questionId,
          draft_response: draftResponse,
          evidence_suggestions: evidenceSuggestions,
          context_used: {
            obligations_count: obligations?.length || 0,
            evidence_count: evidence?.length || 0,
          },
          generated_at: new Date().toISOString(),
          disclaimer: 'This is an AI-generated draft. Please review and edit before submitting to the regulator.',
        },
      },
      200,
      { request_id: requestId }
    );

    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error generating draft response:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}
