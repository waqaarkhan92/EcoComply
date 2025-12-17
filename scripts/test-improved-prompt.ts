import OpenAI from 'openai';
import * as fs from 'fs';
import { getPromptTemplate } from '../lib/ai/prompts';
import { getDocumentProcessor } from '../lib/ai/document-processor';

async function test() {
  console.log('Loading PDF...');
  const buffer = fs.readFileSync('docs/examples/permits/EPR_GP3334CX - Environmental Permit - Original.pdf');

  // Use document processor to extract text
  const processor = getDocumentProcessor();
  const docResult = await processor.processDocument(buffer, 'EPR_GP3334CX.pdf', {
    documentType: 'ENVIRONMENTAL_PERMIT',
    regulator: 'Environment Agency'
  });

  const text = docResult.extractedText;
  console.log('Text length:', text.length);
  console.log('Pages:', docResult.pageCount);

  // Get the prompt template
  const template = getPromptTemplate('PROMPT_M1_EXTRACT_001');
  if (!template) {
    throw new Error('Could not find prompt template');
  }
  console.log('');
  console.log('Using prompt:', template.id);
  console.log('Model:', template.model);

  console.log('');
  console.log('Calling OpenAI...');
  const openai = new OpenAI();

  const startTime = Date.now();

  // Build user message from template
  const userMessage = template.userMessageTemplate
    .replace('{document_text}', text)
    .replace('{regulator}', 'Environment Agency')
    .replace('{permit_reference}', 'EPR_GP3334CX');

  const response = await openai.chat.completions.create({
    model: template.model,
    messages: [
      { role: 'system', content: template.systemMessage },
      { role: 'user', content: userMessage }
    ],
    max_tokens: template.maxTokens,
    temperature: template.temperature,
    response_format: { type: 'json_object' }
  });

  const endTime = Date.now();
  console.log('Time:', ((endTime - startTime) / 1000).toFixed(1), 'seconds');
  console.log('Tokens used:', response.usage?.total_tokens);

  const content = response.choices[0].message.content || '';

  try {
    const result = JSON.parse(content);
    const obligations = result.obligations || result;
    console.log('');
    console.log('==========================================');
    console.log('EXTRACTION RESULTS');
    console.log('==========================================');
    console.log('Obligations extracted:', Array.isArray(obligations) ? obligations.length : 'not array');

    if (result.metadata) {
      console.log('');
      console.log('Metadata:', JSON.stringify(result.metadata, null, 2));
    }

    if (Array.isArray(obligations)) {
      // Count by category
      const byCat: Record<string, number> = {};
      const byType: Record<string, number> = {};
      const elvCount = obligations.filter((o: any) => o.condition_type === 'ELV' || o.elv_limit).length;
      const icCount = obligations.filter((o: any) => o.is_improvement || o.condition_type === 'IMPROVEMENT').length;

      obligations.forEach((o: any) => {
        byCat[o.category] = (byCat[o.category] || 0) + 1;
        byType[o.condition_type || 'UNKNOWN'] = (byType[o.condition_type || 'UNKNOWN'] || 0) + 1;
      });

      console.log('');
      console.log('By Category:', JSON.stringify(byCat, null, 2));
      console.log('');
      console.log('By Type:', JSON.stringify(byType, null, 2));
      console.log('');
      console.log('ELV obligations:', elvCount);
      console.log('Improvement conditions:', icCount);

      // Show IC conditions
      console.log('');
      console.log('Improvement Conditions:');
      obligations.filter((o: any) => o.is_improvement || o.condition_type === 'IMPROVEMENT' || o.condition_reference?.startsWith('IC'))
        .forEach((o: any) => console.log('  -', o.condition_reference, ':', o.title));

      // Show ELV parameters
      console.log('');
      console.log('ELV Parameters (first 20):');
      obligations.filter((o: any) => o.condition_type === 'ELV' || o.elv_limit)
        .slice(0, 20)
        .forEach((o: any) => console.log('  -', o.condition_reference, ':', o.title, o.elv_limit ? '[' + o.elv_limit + ']' : ''));

      // Show sample of all
      console.log('');
      console.log('Sample (first 25):');
      obligations.slice(0, 25).forEach((o: any, i: number) => {
        console.log(`${i+1}. [${o.condition_reference}] ${(o.title || 'No title').substring(0, 55)}...`);
      });
    }
  } catch (e: any) {
    console.log('Parse error:', e.message);
    console.log('Raw (first 1000):', content.substring(0, 1000));
  }
}

test().catch((e: any) => console.error('Error:', e.message));
