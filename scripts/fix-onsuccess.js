const fs = require('fs');
const path = require('path');

// List of files with onSuccess in useQuery
const files = [
  'app/dashboard/sites/[siteId]/documents/[documentId]/workflows/[workflowId]/variation/page.tsx',
  'app/dashboard/sites/[siteId]/documents/[documentId]/workflows/[workflowId]/surrender/page.tsx',
];

let fixedCount = 0;

files.forEach(filePath => {
  const fullPath = path.join('/Users/waqaar/Documents/EcoComply', filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');

  // Check if already fixed
  if (content.includes('// Handle data loading side effects') || !content.includes('onSuccess:')) {
    console.log(`Already fixed or no onSuccess: ${filePath}`);
    return;
  }

  console.log(`Processing: ${filePath}`);
  fixedCount++;
});

console.log(`\nFound ${fixedCount} files that need fixing`);
