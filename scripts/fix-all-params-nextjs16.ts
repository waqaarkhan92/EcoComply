/**
 * Fix Next.js 16 API route params pattern
 *
 * This script finds all API route files that use the pattern:
 *   const { someId } = params;
 *
 * And inserts the required await:
 *   const params = await props.params;
 *   const { someId } = params;
 */

import * as fs from 'fs';
import * as path from 'path';

const API_DIR = path.join(process.cwd(), 'app/api');

function getAllTsFiles(dir: string): string[] {
  const files: string[] = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllTsFiles(fullPath));
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.bak')) {
      files.push(fullPath);
    }
  }

  return files;
}

function fixFile(filePath: string): boolean {
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;

  // Skip if no Promise params pattern
  if (!content.includes('props: { params: Promise<')) {
    return false;
  }

  // Pattern: Find functions with Promise params that use params directly
  // We need to add "const params = await props.params;" before the first use of params

  const lines = content.split('\n');
  const result: string[] = [];

  let inFunction = false;
  let functionHasPromiseParams = false;
  let awaitAdded = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect function with Promise params
    if (line.includes('export async function') && line.includes('props:')) {
      inFunction = true;
      functionHasPromiseParams = line.includes('Promise<');
      awaitAdded = false;
      result.push(line);
      continue;
    }

    // Check if next line continues the function signature
    if (inFunction && line.includes('Promise<')) {
      functionHasPromiseParams = true;
    }

    // Inside function body
    if (inFunction && functionHasPromiseParams && !awaitAdded) {
      // Check if this line already has "await props.params"
      if (line.includes('await props.params')) {
        awaitAdded = true;
        result.push(line);
        continue;
      }

      // Check if this line uses params directly (the problematic pattern)
      const paramsMatch = line.match(/const \{ (\w+(?:, \w+)*) \} = params;/);
      if (paramsMatch) {
        // Insert await before this line
        const indent = line.match(/^(\s*)/)?.[1] || '    ';
        result.push(indent + 'const params = await props.params;');
        awaitAdded = true;
      }
    }

    // Reset on new function (but not the first line of a new function)
    if (i > 0 && line.includes('export async function')) {
      if (line.includes('props:')) {
        inFunction = true;
        functionHasPromiseParams = line.includes('Promise<');
        awaitAdded = false;
      } else {
        inFunction = false;
        functionHasPromiseParams = false;
        awaitAdded = false;
      }
    }

    result.push(line);
  }

  const newContent = result.join('\n');

  if (newContent !== originalContent) {
    fs.writeFileSync(filePath, newContent);
    return true;
  }

  return false;
}

async function main() {
  const files = getAllTsFiles(API_DIR);
  let fixedCount = 0;

  for (const file of files) {
    try {
      if (fixFile(file)) {
        console.log('Fixed: ' + path.relative(process.cwd(), file));
        fixedCount++;
      }
    } catch (err) {
      console.error('Error processing ' + file + ':', err);
    }
  }

  console.log('\nTotal files fixed: ' + fixedCount);
}

main();
