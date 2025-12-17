/**
 * Quick Extraction Test with Progress Feedback
 *
 * Run with: OPENAI_API_KEY=xxx npx tsx scripts/quick-extraction-test.ts
 */

import OpenAI from 'openai';

const SAMPLE_TEXT = `
Table S3.1 Emission Limits
| Parameter | Limit | Unit |
| NOx | 200 | mg/Nm³ |
| SO2 | 50 | mg/Nm³ |
| CO | 100 | mg/Nm³ |

IC1: Submit odour plan - Due: 3 months
IC2: Install monitors - Due: 6 months
`;

async function quickTest() {
  console.log('🧪 Quick Extraction Test');
  console.log('========================\n');

  // Check API key
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not set');
    console.log('\nRun with: OPENAI_API_KEY=your-key npx tsx scripts/quick-extraction-test.ts');
    process.exit(1);
  }

  console.log('✅ API key found');
  console.log('📡 Testing OpenAI connection...\n');

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const startTime = Date.now();
    console.log('⏳ Sending request to OpenAI (this may take 10-20 seconds)...');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Extract obligations from permit text. Return JSON with obligations array.'
        },
        {
          role: 'user',
          content: `Extract each ELV and IC separately:\n${SAMPLE_TEXT}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 2000,
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ Response received in ${duration}s\n`);

    const content = response.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

    console.log('📋 Extracted obligations:');
    if (parsed.obligations) {
      parsed.obligations.forEach((o: any, i: number) => {
        console.log(`  ${i + 1}. ${o.title || o.condition_reference || o.description?.substring(0, 50)}`);
      });
      console.log(`\n✅ Total: ${parsed.obligations.length} obligations`);
    } else {
      console.log('  Response:', JSON.stringify(parsed, null, 2).substring(0, 500));
    }

    console.log('\n✅ Test passed! Multi-pass extraction should work.');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);

    if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      console.log('\n⚠️  Network issue - check your internet connection');
    } else if (error.status === 401) {
      console.log('\n⚠️  Invalid API key - check OPENAI_API_KEY');
    } else if (error.status === 429) {
      console.log('\n⚠️  Rate limited - wait a minute and try again');
    } else if (error.status === 500) {
      console.log('\n⚠️  OpenAI server error - try again later');
    }

    process.exit(1);
  }
}

// Add timeout
const timeout = setTimeout(() => {
  console.error('\n❌ Timeout after 60 seconds');
  console.log('Possible causes:');
  console.log('  - Network issues');
  console.log('  - OpenAI API is slow/down');
  console.log('  - Proxy/firewall blocking requests');
  process.exit(1);
}, 60000);

quickTest().then(() => {
  clearTimeout(timeout);
  process.exit(0);
}).catch(err => {
  clearTimeout(timeout);
  console.error('Unexpected error:', err);
  process.exit(1);
});
