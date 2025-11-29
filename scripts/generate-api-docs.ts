/**
 * Phase 7.5: Generate OpenAPI/Swagger API Documentation
 * Generates interactive API documentation from OpenAPI spec
 */

import fs from 'fs';
import path from 'path';

const openApiSpecPath = path.join(process.cwd(), 'docs', 'openapi.yaml');
const outputPath = path.join(process.cwd(), 'docs', 'api-docs.html');

function generateSwaggerUI(openApiSpec: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Oblicore API Documentation</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css" />
  <style>
    html {
      box-sizing: border-box;
      overflow: -moz-scrollbars-vertical;
      overflow-y: scroll;
    }
    *, *:before, *:after {
      box-sizing: inherit;
    }
    body {
      margin:0;
      background: #fafafa;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      const spec = ${JSON.stringify(openApiSpec)};
      const ui = SwaggerUIBundle({
        spec: spec,
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout"
      });
    };
  </script>
</body>
</html>`;
}

async function main() {
  try {
    // Read OpenAPI spec
    const openApiSpec = fs.readFileSync(openApiSpecPath, 'utf-8');
    
    // Parse YAML (simplified - in production, use a YAML parser)
    // For now, we'll generate a basic HTML file that loads the YAML
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Oblicore API Documentation</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css" />
  <style>
    html {
      box-sizing: border-box;
      overflow: -moz-scrollbars-vertical;
      overflow-y: scroll;
    }
    *, *:before, *:after {
      box-sizing: inherit;
    }
    body {
      margin:0;
      background: #fafafa;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: '/docs/openapi.yaml',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout"
      });
    };
  </script>
</body>
</html>`;
    
    // Ensure docs directory exists
    const docsDir = path.dirname(outputPath);
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }
    
    // Write HTML file
    fs.writeFileSync(outputPath, html);
    
    console.log('✅ API documentation generated successfully!');
    console.log(`📄 OpenAPI spec: ${openApiSpecPath}`);
    console.log(`📄 HTML docs: ${outputPath}`);
    console.log('\nTo view the documentation:');
    console.log('1. Start the dev server: npm run dev');
    console.log('2. Navigate to: http://localhost:3000/docs/api-docs.html');
  } catch (error) {
    console.error('❌ Error generating API documentation:', error);
    process.exit(1);
  }
}

main();

