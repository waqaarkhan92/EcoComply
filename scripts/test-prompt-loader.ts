#!/usr/bin/env npx tsx
/**
 * Test that all 23 jurisdiction-specific prompts load via the prompt-loader
 * This is an integration test that uses the actual loading functions
 */

import { loadPromptFromDocs, clearPromptCache } from '../lib/ai/prompt-loader';
import {
  ENVIRONMENTAL_PERMIT_PROMPTS,
  MCPD_PROMPTS,
  HAZARDOUS_WASTE_PROMPTS,
  TRADE_EFFLUENT_PROMPTS,
  PROMPT_VERSIONS,
  getPromptFilePath,
} from '../lib/ai/prompt-registry';

interface TestResult {
  promptId: string;
  version: string;
  filePath: string;
  passed: boolean;
  hasSystemMessage: boolean;
  hasUserTemplate: boolean;
  systemMessageLength: number;
  userTemplateLength: number;
  error?: string;
}

async function testAllPrompts(): Promise<void> {
  console.log('=== PROMPT LOADER INTEGRATION TEST ===\n');

  // Clear cache to ensure fresh loads
  clearPromptCache();

  const results: TestResult[] = [];

  // Test Environmental Permit prompts (4)
  console.log('--- Environmental Permit Prompts ---');
  for (const [regulator, promptId] of Object.entries(ENVIRONMENTAL_PERMIT_PROMPTS)) {
    // Skip EPA fallback (it maps to EA)
    if (regulator === 'EPA') continue;

    const version = PROMPT_VERSIONS.ENVIRONMENTAL_PERMIT;
    const result = await testPrompt(promptId, version);
    results.push(result);
  }

  // Test MCPD prompts (4)
  console.log('\n--- MCPD Prompts ---');
  for (const [regulator, promptId] of Object.entries(MCPD_PROMPTS)) {
    if (regulator === 'EPA') continue;

    const version =
      (PROMPT_VERSIONS as Record<string, string>)[promptId] || PROMPT_VERSIONS.MCPD;
    const result = await testPrompt(promptId, version);
    results.push(result);
  }

  // Test Hazardous Waste prompts (4)
  console.log('\n--- Hazardous Waste Prompts ---');
  for (const [regulator, promptId] of Object.entries(HAZARDOUS_WASTE_PROMPTS)) {
    if (regulator === 'EPA') continue;

    const version = PROMPT_VERSIONS.HAZARDOUS_WASTE;
    const result = await testPrompt(promptId, version);
    results.push(result);
  }

  // Test Trade Effluent prompts (11)
  console.log('\n--- Trade Effluent Prompts ---');
  for (const [waterCompany, promptId] of Object.entries(TRADE_EFFLUENT_PROMPTS)) {
    const version =
      (PROMPT_VERSIONS as Record<string, string>)[promptId] || PROMPT_VERSIONS.TRADE_EFFLUENT;
    const result = await testPrompt(promptId, version);
    results.push(result);
  }

  // Summary
  console.log('\n=== SUMMARY ===');
  const passed = results.filter((r) => r.passed);
  const failed = results.filter((r) => !r.passed);

  console.log(`Total: ${results.length}`);
  console.log(`Passed: ${passed.length}`);
  console.log(`Failed: ${failed.length}`);

  if (failed.length > 0) {
    console.log('\n❌ Failed prompts:');
    for (const f of failed) {
      console.log(`  - ${f.promptId} v${f.version}`);
      console.log(`    File: ${f.filePath}`);
      console.log(`    Error: ${f.error}`);
      console.log(`    Has System Message: ${f.hasSystemMessage}`);
      console.log(`    Has User Template: ${f.hasUserTemplate}`);
    }
    process.exit(1);
  }

  console.log('\n✅ All prompts load successfully via prompt-loader!');

  // Show content stats
  console.log('\n=== CONTENT STATS ===');
  console.log('Prompt ID                      | System Msg | User Template');
  console.log('-'.repeat(70));
  for (const r of results) {
    const id = r.promptId.padEnd(28);
    const sys = `${r.systemMessageLength}`.padStart(10);
    const usr = `${r.userTemplateLength}`.padStart(13);
    console.log(`${id} | ${sys} | ${usr}`);
  }
}

async function testPrompt(promptId: string, version: string): Promise<TestResult> {
  const filePath = getPromptFilePath(promptId, version);

  const result: TestResult = {
    promptId,
    version,
    filePath,
    passed: false,
    hasSystemMessage: false,
    hasUserTemplate: false,
    systemMessageLength: 0,
    userTemplateLength: 0,
  };

  try {
    const loaded = await loadPromptFromDocs(promptId, version);

    if (!loaded) {
      result.error = 'loadPromptFromDocs returned null';
      console.log(`❌ ${promptId} v${version} - Failed to load`);
      return result;
    }

    result.hasSystemMessage = loaded.systemMessage.length > 50;
    result.hasUserTemplate = loaded.userMessageTemplate.length > 50;
    result.systemMessageLength = loaded.systemMessage.length;
    result.userTemplateLength = loaded.userMessageTemplate.length;

    if (!result.hasSystemMessage) {
      result.error = `System message too short (${loaded.systemMessage.length} chars)`;
      console.log(`❌ ${promptId} v${version} - ${result.error}`);
      return result;
    }

    if (!result.hasUserTemplate) {
      result.error = `User template too short (${loaded.userMessageTemplate.length} chars)`;
      console.log(`❌ ${promptId} v${version} - ${result.error}`);
      return result;
    }

    if (loaded.loadedFrom !== 'docs') {
      result.error = `Loaded from ${loaded.loadedFrom} instead of docs`;
      console.log(`❌ ${promptId} v${version} - ${result.error}`);
      return result;
    }

    result.passed = true;
    console.log(`✅ ${promptId} v${version} (sys: ${result.systemMessageLength}, usr: ${result.userTemplateLength})`);
    return result;
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    console.log(`❌ ${promptId} v${version} - Exception: ${result.error}`);
    return result;
  }
}

testAllPrompts();
