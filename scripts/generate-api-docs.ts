#!/usr/bin/env tsx

/**
 * Generate OpenAPI 3.0 Documentation
 * Introspects API routes and generates comprehensive API documentation
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

async function main() {
  console.log('Generating OpenAPI Documentation...\n');

  // Find all API route files
  const routeFiles = await glob('app/api/**/route.ts', {
    cwd: process.cwd(),
    absolute: false,
  });

  console.log(`Found ${routeFiles.length} API route files\n`);

  // Build comprehensive OpenAPI spec
  const spec = buildOpenAPISpec(routeFiles);

  // Ensure output directory exists
  const outputDir = path.join(process.cwd(), 'docs/api');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write OpenAPI JSON
  const outputPath = path.join(outputDir, 'openapi.json');
  fs.writeFileSync(outputPath, JSON.stringify(spec, null, 2));

  console.log(`\n✅ OpenAPI documentation generated at: ${outputPath}`);
  console.log(`Total endpoints: ${Object.keys(spec.paths).length}`);
  console.log(`\nTo view the documentation:`);
  console.log(`1. Use Swagger UI: https://editor.swagger.io/`);
  console.log(`2. Or run: npx swagger-ui-watcher docs/api/openapi.json`);
  console.log(`3. Or use VS Code extension: "Swagger Viewer"`);
}

function buildOpenAPISpec(routeFiles: string[]): any {
  const spec: any = {
    openapi: '3.0.0',
    info: {
      title: 'EcoComply API',
      version: '1.0.0',
      description: `
# EcoComply API

Comprehensive API for environmental compliance management.

## Authentication
All endpoints require Bearer token authentication.

## Rate Limiting
- Default: 100 req/min
- Auth: 3-5 req/min
- Upload: 10-20 req/min

## Pagination
Cursor-based pagination with \`limit\` and \`cursor\` parameters.
      `.trim(),
      contact: {
        name: 'EcoComply Support',
        email: 'support@ecocomply.com',
      },
    },
    servers: [
      { url: 'https://app.ecocomply.com', description: 'Production' },
      { url: 'http://localhost:3000', description: 'Development' },
    ],
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Obligations', description: 'Obligation management' },
      { name: 'Documents', description: 'Document management' },
      { name: 'Evidence', description: 'Evidence tracking' },
      { name: 'Notifications', description: 'Notification system' },
      { name: 'Comments', description: 'Comment threads' },
      { name: 'Calendar', description: 'Calendar integration' },
      { name: 'Analytics', description: 'Analytics and reporting' },
    ],
    paths: {},
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: getCommonSchemas(),
    },
  };

  // Process each route file
  for (const routeFile of routeFiles) {
    const apiPath = routeFileToPath(routeFile);
    spec.paths[apiPath] = buildPathOperations(apiPath);
  }

  return spec;
}

function routeFileToPath(routeFile: string): string {
  let path = routeFile
    .replace('app/api', '')
    .replace('/route.ts', '')
    .replace(/\[([^\]]+)\]/g, '{$1}');

  return path || '/';
}

function buildPathOperations(path: string): any {
  const ops: any = {};
  const tag = getTag(path);

  if (path.includes('{')) {
    // Detail endpoint
    ops.get = buildDetailOp(path, tag);
    if (!path.includes('/read') && !path.includes('/unread-count')) {
      ops.patch = buildUpdateOp(path, tag);
      ops.delete = buildDeleteOp(path, tag);
    }
  } else {
    // List endpoint
    ops.get = buildListOp(path, tag);
    if (!path.includes('/unread-count')) {
      ops.post = buildCreateOp(path, tag);
    }
  }

  return ops;
}

function getTag(path: string): string {
  if (path.includes('auth')) return 'Auth';
  if (path.includes('obligations')) return 'Obligations';
  if (path.includes('documents')) return 'Documents';
  if (path.includes('evidence')) return 'Evidence';
  if (path.includes('notifications')) return 'Notifications';
  if (path.includes('comments')) return 'Comments';
  if (path.includes('calendar')) return 'Calendar';
  return 'Other';
}

function buildListOp(path: string, tag: string): any {
  return {
    summary: `List ${tag.toLowerCase()}`,
    tags: [tag],
    parameters: [
      { name: 'limit', in: 'query', schema: { type: 'integer' } },
      { name: 'cursor', in: 'query', schema: { type: 'string' } },
    ],
    responses: {
      '200': { $ref: '#/components/responses/PaginatedSuccess' },
      '401': { $ref: '#/components/responses/Unauthorized' },
    },
    security: [{ BearerAuth: [] }],
  };
}

function buildDetailOp(path: string, tag: string): any {
  return {
    summary: `Get ${tag.toLowerCase()} details`,
    tags: [tag],
    responses: {
      '200': { $ref: '#/components/responses/Success' },
      '404': { $ref: '#/components/responses/NotFound' },
    },
    security: [{ BearerAuth: [] }],
  };
}

function buildCreateOp(path: string, tag: string): any {
  return {
    summary: `Create ${tag.toLowerCase()}`,
    tags: [tag],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: { type: 'object' },
        },
      },
    },
    responses: {
      '201': { $ref: '#/components/responses/Created' },
      '422': { $ref: '#/components/responses/ValidationError' },
    },
    security: [{ BearerAuth: [] }],
  };
}

function buildUpdateOp(path: string, tag: string): any {
  return {
    summary: `Update ${tag.toLowerCase()}`,
    tags: [tag],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: { type: 'object' },
        },
      },
    },
    responses: {
      '200': { $ref: '#/components/responses/Success' },
      '404': { $ref: '#/components/responses/NotFound' },
    },
    security: [{ BearerAuth: [] }],
  };
}

function buildDeleteOp(path: string, tag: string): any {
  return {
    summary: `Delete ${tag.toLowerCase()}`,
    tags: [tag],
    responses: {
      '200': { $ref: '#/components/responses/Success' },
      '404': { $ref: '#/components/responses/NotFound' },
    },
    security: [{ BearerAuth: [] }],
  };
}

function getCommonSchemas(): any {
  return {
    Error: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  };
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});

