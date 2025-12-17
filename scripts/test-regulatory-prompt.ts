#!/usr/bin/env npx tsx
/**
 * Test extraction with the comprehensive regulatory prompt
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { PDFParse } from 'pdf-parse';
import OpenAI from 'openai';
import * as fs from 'fs';
import { selectPromptId } from '../lib/ai/prompt-registry';
import { loadPrompt } from '../lib/ai/prompt-loader';

async function testWithRegulatoryPrompt() {
  // Parse full PDF
  const buffer = fs.readFileSync('docs/examples/permits/EPR_GP3334CX - Environmental Permit - Original.pdf');
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();

  console.log('Permit: EPR/GP3334CX (' + result.text.length + ' chars, 36 pages)');

  // Load the PROPER regulatory prompt
  const selection = selectPromptId('ENVIRONMENTAL_PERMIT', 'EA');
  const prompt = await loadPrompt(selection);

  if (!prompt) {
    console.log('Failed to load prompt');
    return;
  }

  console.log('Using prompt: ' + prompt.promptId + ' v' + prompt.version);
  console.log('Calling GPT-4o with comprehensive regulatory prompt...');

  // Build the messages
  const userMessage = prompt.userMessageTemplate
    .replace('{document_type}', 'BESPOKE_PERMIT')
    .replace('{page_count}', '36')
    .replace('{document_text}', result.text);

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const startTime = Date.now();

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: prompt.systemMessage },
      { role: 'user', content: userMessage }
    ],
    max_tokens: 16000,
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const content = response.choices[0].message.content;

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(content || '{}');
  } catch (e) {
    console.log('Failed to parse JSON:', (e as Error).message);
    console.log('Raw response:', content?.substring(0, 1000));
    return;
  }

  // Count results
  const conditions = data.conditions as Array<Record<string, unknown>> | undefined;
  const obligations = data.obligations as Array<Record<string, unknown>> | undefined;
  const conditionCount = conditions?.length || 0;
  const obligationCount = obligations?.length || 0;

  console.log('');
  console.log('✅ EXTRACTION RESULTS (Regulatory Prompt):');
  console.log('   Conditions found: ' + conditionCount);
  console.log('   Obligations derived: ' + obligationCount);
  console.log('   Time: ' + elapsed + 's');
  console.log('   Tokens: ' + response.usage?.total_tokens);
  console.log('   Cost: $' + ((response.usage?.total_tokens || 0) * 0.00001).toFixed(4));

  const confidenceMetadata = data.confidence_metadata as { overall_score?: number } | undefined;
  if (confidenceMetadata?.overall_score) {
    console.log('   Confidence: ' + (confidenceMetadata.overall_score * 100).toFixed(0) + '%');
  }

  // Condition type breakdown
  if (conditions && conditions.length > 0) {
    console.log('');
    console.log('📊 Condition Types:');
    const types: Record<string, number> = {};
    conditions.forEach((c: Record<string, unknown>) => {
      const conditionType = c.condition_type;
      const typeArray = Array.isArray(conditionType) ? conditionType : [conditionType];
      typeArray.forEach((t: unknown) => {
        if (typeof t === 'string') {
          types[t] = (types[t] || 0) + 1;
        }
      });
    });
    Object.entries(types).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
      console.log('   ' + type + ': ' + count);
    });
  }

  // Sample obligations
  if (obligations && obligations.length > 0) {
    console.log('');
    console.log('📝 Sample obligations (first 5):');
    obligations.slice(0, 5).forEach((o: Record<string, unknown>, i: number) => {
      const desc = (o.description || o.action_required || 'No description') as string;
      const ref = (o.source_condition_id || o.condition_ref || 'N/A') as string;
      console.log((i + 1) + '. [' + ref + '] ' + desc.substring(0, 80) + '...');
    });
  }

  // Save full output for analysis
  fs.writeFileSync('extraction-output.json', JSON.stringify(data, null, 2));
  console.log('\n📄 Full output saved to extraction-output.json');
}

testWithRegulatoryPrompt().catch(err => console.error('Error:', err));
