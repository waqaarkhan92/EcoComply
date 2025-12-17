/**
 * Script to fix API route files that use params directly without awaiting props.params
 *
 * Pattern to fix:
 *
 * BEFORE:
 * export async function GET(
 *   request: NextRequest, props: { params: Promise<{ someId: string }> }
 * ) {
 *   const requestId = getRequestId(request);
 *   const { someId } = params;  // ERROR: params is not defined
 *
 * AFTER:
 * export async function GET(
 *   request: NextRequest, props: { params: Promise<{ someId: string }> }
 * ) {
 *   const requestId = getRequestId(request);
 *   const params = await props.params;
 *   const { someId } = params;
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

async function findApiRoutes(): Promise<string[]> {
  return glob('app/api/**/*.ts', { cwd: process.cwd() });
}

function needsFix(content: string): boolean {
  // Check if file has the Promise params pattern
  if (!content.includes('Promise<{') || !content.includes('props:')) {
    return false;
  }

  // Check if file uses params directly without awaiting
  const hasDirectParamsUsage = /const \{ \w+ \} = params;/.test(content);

  // Check if each function that uses params has the await
  if (hasDirectParamsUsage) {
    // Check if there's an "await props.params" before the params usage
    const lines = content.split('\n');
    let inFunction = false;
    let hasPropsParams = false;
    let hasAwait = false;

    for (const line of lines) {
      if (line.includes('export async function')) {
        inFunction = true;
        hasPropsParams = line.includes('props:');
        hasAwait = false;
      }

      if (inFunction && hasPropsParams) {
        if (line.includes('await props.params')) {
          hasAwait = true;
        }

        // If we see direct params usage before await, needs fix
        if (/const \{ \w+ \} = params/.test(line) && !hasAwait) {
          return true;
        }
      }
    }
  }

  return false;
}

function fixContent(content: string): string {
  const lines = content.split('\n');
  const result: string[] = [];

  let inFunctionSignature = false;
  let signatureLines: string[] = [];
  let paramName = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect function signature start
    if (line.includes('export async function')) {
      inFunctionSignature = true;
      signatureLines = [line];

      // Extract param name if on same line
      const match = line.match(/Promise<\{ (\w+):/);
      if (match) {
        paramName = match[1];
      }

      result.push(line);
      continue;
    }

    // Continue collecting signature lines
    if (inFunctionSignature) {
      result.push(line);
      signatureLines.push(line);

      // Extract param name from signature
      const match = line.match(/Promise<\{ (\w+):/);
      if (match) {
        paramName = match[1];
      }

      // End of function signature
      if (line.includes(') {')) {
        inFunctionSignature = false;
        signatureLines = [];
      }
      continue;
    }

    // Check if this line uses params directly without prior await
    if (paramName && /const \{ \w+ \} = params;/.test(line)) {
      // Look back to see if we already have "await props.params"
      let hasAwait = false;
      for (let j = result.length - 1; j >= 0 && j >= result.length - 10; j--) {
        if (result[j].includes('await props.params')) {
          hasAwait = true;
          break;
        }
        if (result[j].includes('export async function')) {
          break;
        }
      }

      if (!hasAwait) {
        // Insert the await line before this line, with same indentation
        const indent = line.match(/^(\s*)/)?.[1] || '  ';
        result.push(`${indent}const params = await props.params;`);
      }
    }

    result.push(line);
  }

  return result.join('\n');
}

async function main() {
  const files = await findApiRoutes();
  let fixedCount = 0;

  for (const file of files) {
    const fullPath = path.join(process.cwd(), file);
    const content = fs.readFileSync(fullPath, 'utf-8');

    if (needsFix(content)) {
      console.log(`Fixing: ${file}`);
      const fixed = fixContent(content);
      fs.writeFileSync(fullPath, fixed);
      fixedCount++;
    }
  }

  console.log(`\nFixed ${fixedCount} files`);
}

main().catch(console.error);
