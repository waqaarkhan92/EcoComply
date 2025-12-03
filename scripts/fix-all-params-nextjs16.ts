#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

/**
 * Fix Next.js 16 params async breaking change
 * Converts all API routes from synchronous params to async params
 */

async function fixParamsInFile(filePath: string): Promise<boolean> {
  const content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;
  let newContent = content;

  // Pattern 1: Fix function signature with single param
  // From: { params }: { params: { paramName: string } }
  // To: props: { params: Promise<{ paramName: string }> }
  const singleParamPattern = /(\s+)(request: NextRequest,)\s*\{ params \}(\s*:\s*\{ params: \{[^}]+\} \})/g;
  if (singleParamPattern.test(content)) {
    newContent = newContent.replace(
      singleParamPattern,
      '$1$2 props$3'
    );
    // Replace params: { with params: Promise<{
    newContent = newContent.replace(
      /props\s*:\s*\{ params: \{/g,
      'props: { params: Promise<{'
    );
    modified = true;
  }

  // Pattern 2: Add await for params after auth check
  // Look for patterns like: const { paramName } = params;
  // And add: const params = await props.params; before it
  const paramUsagePattern = /(\n\s+const \{ user \} = authResult;[\s\S]*?\n\s+)(const \{ [^}]+ \} = params;)/g;

  if (paramUsagePattern.test(newContent)) {
    newContent = newContent.replace(
      paramUsagePattern,
      (match, prefix, paramLine) => {
        // Check if we already added the await line
        if (prefix.includes('const params = await props.params;')) {
          return match;
        }
        return prefix + 'const params = await props.params;\n    ' + paramLine;
      }
    );
    modified = true;
  }

  // Pattern 3: Handle cases where params is used directly (not destructured immediately)
  // Look for: const variableName = params.paramName;
  const directParamsPattern = /(\n\s+const \{ user \} = authResult;[\s\S]*?\n\s+)(const [a-zA-Z0-9_]+ = params\.[a-zA-Z0-9_]+;)/g;

  if (directParamsPattern.test(newContent)) {
    newContent = newContent.replace(
      directParamsPattern,
      (match, prefix, paramLine) => {
        if (prefix.includes('const params = await props.params;')) {
          return match;
        }
        return prefix + 'const params = await props.params;\n    ' + paramLine;
      }
    );
    modified = true;
  }

  // Pattern 4: Handle GET/POST/PUT/DELETE/PATCH methods
  // Some routes might not have auth checks, so add await right after requestId
  const noAuthPattern = /(\n\s+const requestId = getRequestId\(request\);[\s]*\n[\s]*\n\s+try \{[\s]*\n\s+)(const \{ [^}]+ \} = params;)/g;

  if (noAuthPattern.test(newContent)) {
    newContent = newContent.replace(
      noAuthPattern,
      (match, prefix, paramLine) => {
        if (prefix.includes('const params = await props.params;')) {
          return match;
        }
        return prefix + 'const params = await props.params;\n    ' + paramLine;
      }
    );
    modified = true;
  }

  if (modified) {
    // Create backup
    fs.writeFileSync(filePath + '.bak', content);
    // Write fixed content
    fs.writeFileSync(filePath, newContent);
    return true;
  }

  return false;
}

async function main() {
  console.log('🔧 Fixing Next.js 16 params async issue in all API routes...\n');

  // Find all route.ts files in app/api directories with dynamic params
  const routeFiles = await glob('app/api/**/\\[*\\]/**/route.ts', {
    cwd: process.cwd(),
    absolute: true
  });

  console.log(`Found ${routeFiles.length} route files with dynamic params\n`);

  let fixedCount = 0;
  let skippedCount = 0;

  for (const file of routeFiles) {
    const relativePath = path.relative(process.cwd(), file);
    try {
      const wasFixed = await fixParamsInFile(file);
      if (wasFixed) {
        console.log(`✅ Fixed: ${relativePath}`);
        fixedCount++;
      } else {
        console.log(`⏭️  Skipped: ${relativePath} (already fixed or no params usage)`);
        skippedCount++;
      }
    } catch (error) {
      console.error(`❌ Error fixing ${relativePath}:`, error);
    }
  }

  console.log(`\n✨ Done!`);
  console.log(`   Fixed: ${fixedCount} files`);
  console.log(`   Skipped: ${skippedCount} files`);
  console.log(`   Total: ${routeFiles.length} files`);
  console.log(`\n💾 Backup files created with .bak extension`);
}

main().catch(console.error);
