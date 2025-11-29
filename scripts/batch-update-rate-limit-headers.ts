/**
 * Script to batch update all remaining endpoints with rate limit headers
 * This script identifies files that need updating and provides a checklist
 */

import fs from 'fs';
import path from 'path';

const API_DIR = path.join(process.cwd(), 'app/api/v1');

interface FileUpdate {
  file: string;
  needsImport: boolean;
  needsUserExtraction: boolean;
  responseCount: number;
}

function findFilesNeedingUpdates(): FileUpdate[] {
  const files: FileUpdate[] = [];
  
  function walkDir(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else if (entry.name === 'route.ts') {
        const content = fs.readFileSync(fullPath, 'utf-8');
        
        // Check if file needs updates
        const hasAuth = /requireAuth|requireRole/.test(content);
        const hasResponse = /successResponse|paginatedResponse/.test(content);
        const hasRateLimit = /addRateLimitHeaders/.test(content);
        
        if (hasAuth && hasResponse && !hasRateLimit) {
          const needsImport = !/from ['"]@\/lib\/api\/rate-limit['"]/.test(content);
          const needsUserExtraction = /const.*authResult.*=.*await.*requireAuth/.test(content) && 
                                      !/const.*\{.*user.*\}.*=.*authResult/.test(content);
          const responseCount = (content.match(/return\s+(successResponse|paginatedResponse)/g) || []).length;
          
          files.push({
            file: fullPath,
            needsImport,
            needsUserExtraction,
            responseCount,
          });
        }
      }
    }
  }
  
  walkDir(API_DIR);
  return files;
}

const files = findFilesNeedingUpdates();

console.log(`Found ${files.length} files needing rate limit headers:\n`);
files.forEach((f, i) => {
  console.log(`${i + 1}. ${f.file.replace(process.cwd(), '.')}`);
  console.log(`   - Import needed: ${f.needsImport}`);
  console.log(`   - User extraction needed: ${f.needsUserExtraction}`);
  console.log(`   - Responses to update: ${f.responseCount}`);
  console.log('');
});

console.log(`\nTotal: ${files.length} files`);

