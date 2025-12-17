#!/usr/bin/env npx tsx
/**
 * Verify all prompts have the required System Message and User Message Template sections
 */

import * as fs from 'fs';
import * as path from 'path';

const promptsDir = path.join(process.cwd(), 'docs/09-regulatory/prompts');
const categories = ['environmental-permits', 'mcpd', 'hazardous-waste', 'trade-effluent'];

let total = 0;
let passed = 0;
const failed: string[] = [];

for (const category of categories) {
  const dir = path.join(promptsDir, category);
  if (!fs.existsSync(dir)) {
    console.log(`Directory not found: ${dir}`);
    continue;
  }

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));

  for (const file of files) {
    total++;
    const content = fs.readFileSync(path.join(dir, file), 'utf-8');

    const systemMatch = content.match(
      /##\s*System\s*Message[\s\S]*?```(?:text|markdown)?\n([\s\S]*?)```/i
    );
    const userMatch = content.match(
      /##\s*User\s*Message\s*Template[\s\S]*?```(?:text|markdown)?\n([\s\S]*?)```/i
    );

    const issues: string[] = [];
    if (!systemMatch) issues.push('missing System Message');
    if (!userMatch) issues.push('missing User Message Template');

    if (issues.length === 0) {
      passed++;
      console.log(`✅ ${category}/${file}`);
    } else {
      failed.push(`${category}/${file}`);
      console.log(`❌ ${category}/${file} (${issues.join(', ')})`);
    }
  }
}

console.log('\n=== SUMMARY ===');
console.log(`Total: ${total}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed.length}`);

if (failed.length > 0) {
  console.log('\nFailed files:');
  failed.forEach((f) => console.log(`  - ${f}`));
  process.exit(1);
}

console.log('\n✅ All prompts verified successfully!');
