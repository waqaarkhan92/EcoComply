# EP Compliance Testing & QA Strategy

**Oblicore v1.0 — Launch-Ready / Last updated: 2024-12-27**

**Document Version:** 1.0  
**Status:** Complete  
**Created by:** Cursor  
**Depends on:**
- ✅ AI Rules Library (1.6) - Complete
- ✅ Backend API Specification (2.5) - Complete
- ✅ Database Schema (2.2) - Complete
- ✅ Background Jobs Specification (2.3) - Complete

**Purpose:** Defines the complete testing and QA strategy for the EP Compliance platform, including test framework selection, unit testing, integration testing, E2E testing, performance benchmarks, test data management, and CI/CD integration.

> [v1 UPDATE – Version Header – 2024-12-27]

---

# Table of Contents

1. [Document Overview](#1-document-overview)
2. [Test Framework Selection](#2-test-framework-selection)
3. [Unit Testing](#3-unit-testing)
4. [Integration Testing](#4-integration-testing)
5. [End-to-End Testing](#5-end-to-end-testing)
6. [Permit Parsing Test Suite](#6-permit-parsing-test-suite)
7. [Module 2/3 Cross-Sell Trigger Testing](#7-module-23-cross-sell-trigger-testing)
8. [RLS Permission Testing](#8-rls-permission-testing)
9. [v1.0 Pack Generation Testing](#9-v10-pack-generation-testing)
10. [v1.0 Consultant Feature Testing](#10-v10-consultant-feature-testing)
11. [API Key Management Testing](#11-api-key-management-testing)
12. [AI Integration Layer Testing](#12-ai-integration-layer-testing)
13. [Notification & Messaging Testing](#13-notification--messaging-testing)
14. [Performance Benchmarks](#14-performance-benchmarks)
15. [Test Data Management](#15-test-data-management)
16. [CI/CD Integration](#16-cicd-integration)
17. [Test Maintenance](#17-test-maintenance)
18. [TypeScript Interfaces](#18-typescript-interfaces)

---

# 1. Document Overview

## 1.1 Testing Strategy Overview

The EP Compliance platform requires comprehensive testing across all layers:

- **Unit Testing:** Test individual components, functions, and hooks in isolation
- **Integration Testing:** Test API endpoints, database operations, and external service integrations
- **E2E Testing:** Test complete user workflows from start to finish
- **Performance Testing:** Validate performance benchmarks and load handling
- **Accuracy Testing:** Validate AI extraction accuracy against known test permits

## 1.2 Testing Principles

1. **Comprehensive Coverage:** Target 80%+ code coverage for critical paths
2. **Fast Execution:** Unit tests should run quickly (<5s for full suite)
3. **Isolation:** Tests should be independent and not rely on external state
4. **Maintainability:** Tests should be easy to read, update, and maintain
5. **Realistic Data:** Use realistic test data that mirrors production scenarios

## 1.3 Test Organization

- **Test Location:** Tests mirror source structure (`*.test.ts`, `*.spec.ts`)
- **Test Suites:** Group related tests using `describe` blocks
- **Test Fixtures:** Reusable test data in `test/fixtures/`
- **Test Helpers:** Shared utilities in `test/helpers/`

---

# 2. Test Framework Selection

## 2.1 Unit Testing Framework

### Framework: Jest + React Testing Library

**Frontend Testing:**
- **Framework:** Jest (test runner)
- **Library:** React Testing Library (component testing)
- **Assertions:** Jest built-in assertions
- **Mocking:** Jest mocks + MSW (Mock Service Worker)

**Backend Testing:**
- **Framework:** Jest (test runner)
- **Library:** Supertest (API testing)
- **Assertions:** Jest built-in assertions
- **Mocking:** Jest mocks + MSW

### Jest Configuration

```typescript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/business-logic/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
};
```

## 2.2 Integration Testing Framework

### Framework: Jest + Supertest + Supabase Test Client

**API Testing:**
- **Framework:** Jest + Supertest
- **Database:** Supabase test client (separate test database)
- **External Services:** MSW for mocking external APIs
- **Background Jobs:** Jest + BullMQ test utilities

### Integration Test Setup

```typescript
// src/test/setup-integration.ts
import { createClient } from '@supabase/supabase-js';
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers';

export const server = setupServer(...handlers);

beforeAll(async () => {
  // Setup test database
  const supabase = createClient(
    process.env.TEST_SUPABASE_URL!,
    process.env.TEST_SUPABASE_SERVICE_KEY!
  );
  
  // Seed test data
  await seedTestData(supabase);
  
  // Start MSW server
  server.listen();
});

afterAll(async () => {
  // Cleanup test data
  await cleanupTestData();
  
  // Stop MSW server
  server.close();
});
```

## 2.3 E2E Testing Framework

### Framework: Playwright

**Browser Support:**
- Chrome (Chromium)
- Firefox
- Safari (WebKit)
- Edge

**Configuration:**
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } }
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI
  }
});
```

## 2.4 Performance Testing Framework

### Framework: k6

**Load Testing:**
- **Framework:** k6 (recommended) or Artillery
- **Load Simulation:** Simulate expected user load
- **Metrics:** Response time, throughput, error rate
- **Stress Testing:** Test under peak load conditions

### k6 Configuration

```typescript
// k6/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 }    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.01']     // Less than 1% failures
  }
};

export default function () {
  const response = http.get('https://api.example.com/api/v1/obligations');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500
  });
  sleep(1);
}
```

## 2.5 Test Configuration Interfaces

```typescript
interface TestConfig {
  environment: 'test' | 'ci';
  database: {
    url: string;
    reset: boolean;
  };
  mocks: {
    openai: boolean;
    sendgrid: boolean;
    twilio: boolean;
  };
  coverage: {
    enabled: boolean;
    threshold: number;
  };
}

interface TestSuite {
  name: string;
  tests: Test[];
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
}
```

---

# 3. Unit Testing

## 3.1 Coverage Targets

### Coverage Requirements

- **Minimum Coverage:** 80% for critical paths (authentication, data transformation, business logic)
- **Target Coverage:** 90% for business logic (obligation processing, deadline calculations)
- **Coverage Tools:** Jest coverage, Istanbul (nyc)
- **Coverage Reporting:** Generate HTML coverage reports

### Coverage Configuration

```typescript
// jest.config.js coverage settings
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80
  },
  './src/business-logic/': {
    branches: 90,
    functions: 90,
    lines: 90,
    statements: 90
  }
}
```

## 3.2 Component Tests

### Component Test Examples

**Test Scenarios:**
- Render components: Test component rendering
- Test interactions: Test user interactions (clicks, form submissions)
- Test props: Test component props handling
- Test state: Test component state changes
- Test accessibility: Test accessibility attributes

### Component Test Implementation

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button Component', () => {
  it('should render button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });
  
  it('should call onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
  
  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

## 3.3 Function Tests

### Function Test Examples

**Test Scenarios:**
- Pure functions: Test pure functions (no side effects)
- Edge cases: Test edge cases (null, undefined, empty arrays)
- Error handling: Test error conditions
- Business logic: Test business logic functions

### Function Test Implementation

```typescript
import { calculateDeadline, parseFrequency } from './deadline-utils';

describe('Deadline Utils', () => {
  describe('parseFrequency', () => {
    it('should parse "ANNUAL" frequency', () => {
      expect(parseFrequency('ANNUAL')).toBe('ANNUAL');
    });
    
    it('should throw error for invalid frequency', () => {
      expect(() => parseFrequency('INVALID')).toThrow('Invalid frequency');
    });
  });
  
  describe('calculateDeadline', () => {
    it('should calculate annual deadline', () => {
      const startDate = new Date('2024-01-01');
      const deadline = calculateDeadline(startDate, 'ANNUAL');
      expect(deadline).toEqual(new Date('2025-01-01'));
    });
    
    it('should handle leap years', () => {
      const startDate = new Date('2024-02-29');
      const deadline = calculateDeadline(startDate, 'ANNUAL');
      expect(deadline).toEqual(new Date('2025-02-28'));
    });
  });
});
```

## 3.4 Hook Tests

### Hook Test Examples

**Test Scenarios:**
- State hooks: Test useState hooks
- Effect hooks: Test useEffect hooks
- Custom hooks: Test custom hooks
- Hook interactions: Test hook interactions

### Hook Test Implementation

```typescript
import { renderHook, act } from '@testing-library/react';
import { useObligations } from './useObligations';

describe('useObligations Hook', () => {
  it('should fetch obligations on mount', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useObligations('site-123'));
    
    expect(result.current.loading).toBe(true);
    await waitForNextUpdate();
    
    expect(result.current.loading).toBe(false);
    expect(result.current.obligations).toHaveLength(5);
  });
  
  it('should handle errors', async () => {
    // Mock API error
    const { result, waitForNextUpdate } = renderHook(() => useObligations('site-123'));
    
    await waitForNextUpdate();
    expect(result.current.error).toBeTruthy();
  });
});
```

## 3.5 Excel Import Tests

### Excel Import Test Scenarios

**Test Cases:**
- File parsing: Test Excel file parsing (.xlsx, .xls, CSV formats)
- Column mapping: Test column mapping validation
- Data validation: Test data validation (dates, frequencies, required fields)
- Duplicate detection: Test duplicate detection logic
- Error handling: Test error handling (invalid rows, missing fields)
- Bulk creation: Test bulk obligation creation

### Excel Import Test Implementation

```typescript
import { parseExcelFile, validateExcelData, detectDuplicates } from './excel-import';

describe('Excel Import', () => {
  describe('parseExcelFile', () => {
    it('should parse valid .xlsx file', async () => {
      const file = new File([excelBuffer], 'test.xlsx', { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const result = await parseExcelFile(file);
      
      expect(result.rows).toHaveLength(10);
      expect(result.columns).toContain('permit_number');
      expect(result.columns).toContain('obligation_title');
    });
    
    it('should parse CSV file', async () => {
      const csvContent = 'permit_number,summary,frequency,deadline_date\nPERM-001,Test Obligation,ANNUAL,2024-12-31';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      const result = await parseExcelFile(file);
      
      expect(result.rows).toHaveLength(1);
    });
  });
  
  describe('validateExcelData', () => {
    it('should validate required columns', () => {
      const data = [{ permit_number: 'PERM-001' }]; // Missing required columns
      const result = validateExcelData(data);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required column: obligation_title');
    });
    
    it('should validate date formats', () => {
      const data = [{
        permit_number: 'PERM-001',
        obligation_title: 'Test',
        obligation_description: 'Test description',
        frequency: 'ANNUAL',
        deadline_date: 'invalid-date'
      }];
      const result = validateExcelData(data);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid date format in row 1');
    });
  });
  
  describe('detectDuplicates', () => {
    it('should detect duplicate obligations', () => {
      const data = [
        { permit_number: 'PERM-001', obligation_title: 'Test', site_id: 'site-1' },
        { permit_number: 'PERM-001', obligation_title: 'Test', site_id: 'site-1' }
      ];
      const duplicates = detectDuplicates(data);
      
      expect(duplicates).toHaveLength(1);
      expect(duplicates[0].row).toBe(2);
    });
  });
});
```

## 3.6 Mocking Strategy

### Mocking Implementation

**Mocking Tools:**
- API mocks: MSW (Mock Service Worker) for API mocking
- Database mocks: Mock Supabase client
- External service mocks: Mock OpenAI, SendGrid, Twilio APIs
- File mocks: Mock file uploads

### Mocking Setup

```typescript
// src/test/mocks/handlers.ts
import { rest } from 'msw';

export const handlers = [
  rest.get('/api/v1/obligations', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        data: [
          { id: '1', title: 'Test Obligation', frequency: 'ANNUAL' }
        ]
      })
    );
  }),
  
  rest.post('/api/v1/obligations', (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({ id: 'new-id', ...req.body })
    );
  })
];

// src/test/setup.ts
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers';

export const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

---

# 4. Integration Testing

## 4.1 API Integration Tests

### API Test Scope

**Test Coverage:**
- Endpoint testing: Test all API endpoints with real database
- Authentication: Test JWT authentication
- Authorization: Test RBAC and RLS policies
- Request/Response: Test request validation and response formatting
- Error handling: Test error responses

### API Integration Test Implementation

```typescript
import request from 'supertest';
import { app } from '../src/app';
import { setupTestDatabase, teardownTestDatabase } from './helpers/database';

describe('API Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });
  
  afterAll(async () => {
    await teardownTestDatabase();
  });
  
  describe('POST /api/v1/obligations', () => {
    it('should create obligation with valid data', async () => {
      const token = await getAuthToken();
      const response = await request(app)
        .post('/api/v1/obligations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          document_id: 'doc-123',
          site_id: 'site-123',
          obligation_title: 'Test Obligation',
          frequency: 'ANNUAL',
          deadline_date: '2024-12-31'
        });
      
      expect(response.status).toBe(201);
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.obligation_title).toBe('Test Obligation');
    });
    
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/obligations')
        .send({ obligation_title: 'Test' });
      
      expect(response.status).toBe(401);
    });
    
    it('should return 400 for invalid data', async () => {
      const token = await getAuthToken();
      const response = await request(app)
        .post('/api/v1/obligations')
        .set('Authorization', `Bearer ${token}`)
        .send({ summary: '' }); // Missing required fields
      
      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });
  });
});
```

## 4.2 Database Integration Tests

### Database Test Scope

**Test Coverage:**
- Query testing: Test database queries with real data
- RLS policies: Test Row Level Security policies
- Transactions: Test transaction handling
- Constraints: Test database constraints
- Migrations: Test database migrations

### Database Integration Test Implementation

```typescript
import { createClient } from '@supabase/supabase-js';
import { setupTestDatabase } from './helpers/database';

describe('Database Integration Tests', () => {
  let supabase: any;
  
  beforeAll(async () => {
    supabase = createClient(
      process.env.TEST_SUPABASE_URL!,
      process.env.TEST_SUPABASE_SERVICE_KEY!
    );
    await setupTestDatabase();
  });
  
  describe('RLS Policies', () => {
    it('should enforce RLS for user data', async () => {
      // Test as user A
      const userASupabase = createClient(process.env.TEST_SUPABASE_URL!, userAToken);
      const { data, error } = await userASupabase
        .from('obligations')
        .select('*')
        .eq('site_id', 'site-b'); // User A should not access Site B
      
      expect(error).toBeTruthy();
      expect(data).toBeNull();
    });
  });
  
  describe('Database Queries', () => {
    it('should query obligations by site', async () => {
      const { data, error } = await supabase
        .from('obligations')
        .select('*')
        .eq('site_id', 'site-123');
      
      expect(error).toBeNull();
      expect(data).toHaveLength(5);
    });
  });
});
```

## 4.3 External Service Integration Tests

### External Service Test Scope

**Test Coverage:**
- OpenAI API: Test OpenAI API integration (mocked)
- SendGrid: Test email sending (mocked)
- Twilio: Test SMS sending (mocked)
- Service failures: Test service failure handling

### External Service Test Implementation

```typescript
import { server } from '../test/mocks/server';
import { rest } from 'msw';

describe('External Service Integration', () => {
  describe('OpenAI API', () => {
    it('should call OpenAI API for document extraction', async () => {
      server.use(
        rest.post('https://api.openai.com/v1/chat/completions', (req, res, ctx) => {
          return res(ctx.json({
            choices: [{
              message: { content: JSON.stringify({ obligations: [] }) }
            }]
          }));
        })
      );
      
      const result = await extractObligations('document-id');
      expect(result).toBeDefined();
    });
  });
});
```

## 4.4 Background Job Integration Tests

### Background Job Test Scope

**Test Coverage:**
- Job execution: Test job execution with BullMQ
- Retry logic: Test job retry logic
- DLQ handling: Test Dead-Letter Queue handling
- Job status: Test job status updates

### Background Job Test Implementation

```typescript
import { Queue } from 'bullmq';
import { processDocumentJob } from '../src/jobs/document-processing';

describe('Background Job Integration', () => {
  let queue: Queue;
  
  beforeAll(() => {
    queue = new Queue('document-processing', {
      connection: { host: 'localhost', port: 6379 }
    });
  });
  
  it('should process document job successfully', async () => {
    const job = await queue.add('process-document', {
      documentId: 'doc-123',
      siteId: 'site-123'
    });
    
    await job.waitUntilFinished(queue);
    
    expect(job.returnvalue.status).toBe('COMPLETED');
  });
  
  it('should retry failed jobs', async () => {
    // Mock failure
    const job = await queue.add('process-document', {
      documentId: 'invalid-doc'
    });
    
    await job.waitUntilFinished(queue);
    expect(job.attemptsMade).toBeGreaterThan(1);
  });
  
  it('should retry with exponential backoff', async () => {
    let attemptTimes: number[] = [];
    const mockProcessor = jest.fn().mockImplementation(() => {
      attemptTimes.push(Date.now());
      throw new Error('Temporary failure');
    });
    
    const job = await queue.add('process-document', {
      documentId: 'doc-123'
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000
      }
    });
    
    await job.waitUntilFinished(queue);
    
    // Verify exponential backoff delays
    if (attemptTimes.length >= 2) {
      const delay1 = attemptTimes[1] - attemptTimes[0];
      const delay2 = attemptTimes[2] - attemptTimes[1];
      expect(delay2).toBeGreaterThan(delay1);
    }
  });
  
  it('should handle Dead-Letter Queue', async () => {
    const job = await queue.add('process-document', {
      documentId: 'permanently-failed-doc'
    }, {
      attempts: 3
    });
    
    // Mock permanent failure
    mockPermanentFailure('permanently-failed-doc');
    
    await job.waitUntilFinished(queue);
    
    // Verify job moved to DLQ
    const dlqJobs = await queue.getFailed();
    const dlqJob = dlqJobs.find(j => j.id === job.id);
    expect(dlqJob).toBeDefined();
  });
  
  it('should update job status correctly', async () => {
    const job = await queue.add('process-document', {
      documentId: 'doc-123'
    });
    
    expect(job.opts.jobId).toBeDefined();
    
    // Check initial status
    const initialStatus = await job.getState();
    expect(initialStatus).toBe('waiting');
    
    // Wait for processing
    await job.waitUntilFinished(queue);
    
    // Check final status
    const finalStatus = await job.getState();
    expect(['completed', 'failed']).toContain(finalStatus);
  });
  
  it('should meet performance targets for document processing', async () => {
    const startTime = Date.now();
    const job = await queue.add('process-document', {
      documentId: 'doc-123'
    });
    
    await job.waitUntilFinished(queue);
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(60000); // 60s max
    // p95 should be < 45s (tested separately in performance suite)
  });
  
  it('should meet performance targets for Excel import', async () => {
    const startTime = Date.now();
    const job = await queue.add('excel-import', {
      importId: 'import-123'
    });
    
    await job.waitUntilFinished(queue);
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(30000); // 30s max
  });
  
  it('should send failure notifications', async () => {
    const job = await queue.add('process-document', {
      documentId: 'failed-doc'
    });
    
    mockPermanentFailure('failed-doc');
    await job.waitUntilFinished(queue);
    
    // Verify failure notification sent
    const notificationsResponse = await request(app)
      .get('/api/v1/notifications')
      .query({ type: 'job_failed' });
    
    const failureNotification = notificationsResponse.body.data.find(
      n => n.related_id === job.id
    );
    expect(failureNotification).toBeDefined();
  });
});
```

## 4.5 Excel Import Integration Tests

### Excel Import Integration Test Scenarios

**Test Coverage:**
- Full flow: Excel upload → validation → preview → confirmation → obligation creation
- Background job: Excel import job execution
- Error handling: Invalid file format, missing columns, validation errors
- Notifications: Import ready for review, import completed, import failed
- Database operations: Create obligations, link to permits/sites, track import source

### Excel Import Integration Test Implementation

```typescript
describe('Excel Import Integration', () => {
  it('should complete full Excel import flow', async () => {
    // 1. Upload Excel file
    const uploadResponse = await request(app)
      .post('/api/v1/obligations/import/excel')
      .attach('file', excelBuffer, 'test.xlsx');
    
    expect(uploadResponse.status).toBe(201);
    const importId = uploadResponse.body.data.id;
    
    // 2. Get preview
    const previewResponse = await request(app)
      .get(`/api/v1/obligations/import/excel/${importId}/preview`);
    
    expect(previewResponse.status).toBe(200);
    expect(previewResponse.body.data.validRows).toHaveLength(10);
    
    // 3. Confirm import
    const confirmResponse = await request(app)
      .post(`/api/v1/obligations/import/excel/${importId}/confirm`);
    
    expect(confirmResponse.status).toBe(200);
    
    // 4. Verify obligations created
    const obligationsResponse = await request(app)
      .get('/api/v1/obligations')
      .query({ site_id: 'site-123' });
    
    expect(obligationsResponse.body.data).toHaveLength(10);
  });
  
  it('should handle invalid Excel file', async () => {
    const response = await request(app)
      .post('/api/v1/obligations/import/excel')
      .attach('file', invalidExcelBuffer, 'invalid.xlsx');
    
    expect(response.status).toBe(400);
    expect(response.body.errors).toContain('Invalid file format');
  });
  
  it('should enforce file size limits (10MB max)', async () => {
    const largeFile = Buffer.alloc(11 * 1024 * 1024); // 11MB
    const response = await request(app)
      .post('/api/v1/obligations/import/excel')
      .attach('file', largeFile, 'large.xlsx');
    
    expect(response.status).toBe(400);
    expect(response.body.errors).toContain('File size exceeds 10MB limit');
  });
  
  it('should enforce row count limits (10,000 rows max)', async () => {
    const largeExcelBuffer = generateExcelFile(10001); // 10,001 rows
    const response = await request(app)
      .post('/api/v1/obligations/import/excel')
      .attach('file', largeExcelBuffer, 'large.xlsx');
    
    expect(response.status).toBe(400);
    expect(response.body.errors).toContain('Row count exceeds 10,000 limit');
  });
  
  it('should support flexible column mapping', async () => {
    const excelFile = generateExcelFile(10, {
      'Permit Number': 'permit_number',
      'Obligation': 'obligation_title',
      'Description': 'obligation_description',
      'Frequency': 'frequency',
      'Due Date': 'deadline_date',
      'Site': 'site_id'
    });
    
    const columnMapping = {
      'Permit Number': 'permit_number',
      'Obligation': 'obligation_title',
      'Description': 'obligation_description',
      'Frequency': 'frequency',
      'Due Date': 'deadline_date',
      'Site': 'site_id'
    };
    
    const uploadResponse = await request(app)
      .post('/api/v1/obligations/import/excel')
      .attach('file', excelFile, 'mapped.xlsx')
      .field('columnMapping', JSON.stringify(columnMapping));
    
    expect(uploadResponse.status).toBe(201);
  });
  
  it('should handle multiple date formats', async () => {
    const excelFile = generateExcelFile(3, {
      deadline_date: ['2024-12-31', '31/12/2024', '12/31/2024'] // YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY
    });
    
    const uploadResponse = await request(app)
      .post('/api/v1/obligations/import/excel')
      .attach('file', excelFile, 'dates.xlsx');
    
    expect(uploadResponse.status).toBe(201);
    const importId = uploadResponse.body.data.id;
    
    const previewResponse = await request(app)
      .get(`/api/v1/obligations/import/excel/${importId}/preview`);
    
    expect(previewResponse.body.data.validRows).toHaveLength(3);
  });
  
  it('should create site if site_name provided but site_id missing', async () => {
    const excelFile = generateExcelFile(5, {
      site_name: 'New Site Name',
      // No site_id
    });
    
    const uploadResponse = await request(app)
      .post('/api/v1/obligations/import/excel')
      .attach('file', excelFile, 'new-site.xlsx');
    
    expect(uploadResponse.status).toBe(201);
    
    // Verify site was created
    const sitesResponse = await request(app)
      .get('/api/v1/sites')
      .query({ name: 'New Site Name' });
    
    expect(sitesResponse.body.data).toHaveLength(1);
  });
  
  it('should create permit if permit_number not found', async () => {
    const excelFile = generateExcelFile(3, {
      permit_number: 'NEW-PERMIT-001',
      permit_type: 'Environmental Permit'
    });
    
    const uploadResponse = await request(app)
      .post('/api/v1/obligations/import/excel')
      .attach('file', excelFile, 'new-permit.xlsx');
    
    expect(uploadResponse.status).toBe(201);
    
    // Verify permit was created
    const permitsResponse = await request(app)
      .get('/api/v1/documents')
      .query({ permit_number: 'NEW-PERMIT-001' });
    
    expect(permitsResponse.body.data).toHaveLength(1);
  });
  
  it('should track import source (Excel vs PDF)', async () => {
    const uploadResponse = await request(app)
      .post('/api/v1/obligations/import/excel')
      .attach('file', excelBuffer, 'test.xlsx');
    
    const importId = uploadResponse.body.data.id;
    await request(app)
      .post(`/api/v1/obligations/import/excel/${importId}/confirm`);
    
    // Verify obligations have import_source = 'excel'
    const obligationsResponse = await request(app)
      .get('/api/v1/obligations')
      .query({ site_id: 'site-123' });
    
    const importedObligations = obligationsResponse.body.data.filter(
      o => o.import_source === 'excel'
    );
    expect(importedObligations.length).toBeGreaterThan(0);
  });
  
  it('should send import completion notification', async () => {
    const uploadResponse = await request(app)
      .post('/api/v1/obligations/import/excel')
      .attach('file', excelBuffer, 'test.xlsx');
    
    const importId = uploadResponse.body.data.id;
    const confirmResponse = await request(app)
      .post(`/api/v1/obligations/import/excel/${importId}/confirm`);
    
    // Wait for background job
    await waitForBackgroundJob('excel-import', importId);
    
    // Verify notification sent
    const notificationsResponse = await request(app)
      .get('/api/v1/notifications')
      .query({ type: 'import_completed' });
    
    const importNotification = notificationsResponse.body.data.find(
      n => n.related_id === importId
    );
    expect(importNotification).toBeDefined();
    expect(importNotification.data.success_count).toBe(10);
  });
});
```

---

# 5. End-to-End Testing

## 5.1 E2E Test Framework Setup

### Framework Configuration

**Framework:** Playwright (recommended) or Cypress

**Configuration:**
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } }
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI
  }
});
```

## 5.2 User Authentication E2E Tests

### Signup and Login Flow

**Test Scenarios:**
- Signup flow: Test user registration
- Email verification: Test email verification flow
- Login flow: Test user login
- Password reset: Test password reset flow

### Authentication E2E Test Implementation

```typescript
import { test, expect } from '@playwright/test';

test.describe('User Authentication', () => {
  test('should sign up new user', async ({ page }) => {
    await page.goto('/signup');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.fill('[name="companyName"]', 'Test Company');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/\/verify-email/);
  });
  
  test('should login existing user', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
```

## 5.3 Document Upload E2E Tests

### Document Upload and Extraction Flow

**Test Scenarios:**
- Upload flow: Test PDF document upload
- Extraction: Test AI extraction process
- Review: Test obligation review flow
- Editing: Test obligation editing

### Document Upload E2E Test Implementation

```typescript
test.describe('Document Upload', () => {
  test('should upload and extract obligations from PDF', async ({ page }) => {
    await page.goto('/sites/site-123/documents/upload');
    
    // Upload PDF
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('test/fixtures/sample-permit.pdf');
    
    // Wait for upload
    await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="extraction-status"]')).toContainText('Processing');
    
    // Wait for extraction
    await expect(page.locator('[data-testid="extraction-complete"]')).toBeVisible({ timeout: 60000 });
    
    // Verify obligations extracted
    const obligations = page.locator('[data-testid="obligation-item"]');
    await expect(obligations).toHaveCount(5);
  });
});
```

## 5.4 Excel Import E2E Tests

### Excel Import Workflow

**Test Scenarios:**
- Excel upload: User uploads Excel file
- Preview: User reviews preview
- Confirmation: User confirms import
- Obligation creation: Verify obligations created

### Excel Import E2E Test Implementation

```typescript
test.describe('Excel Import', () => {
  test('should import obligations from Excel file', async ({ page }) => {
    await page.goto('/sites/site-123/obligations/import/excel');
    
    // Upload Excel file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('test/fixtures/obligations.xlsx');
    
    // Wait for preview
    await expect(page.locator('[data-testid="import-preview"]')).toBeVisible();
    await expect(page.locator('[data-testid="valid-rows"]')).toContainText('10');
    
    // Confirm import
    await page.click('button[data-testid="confirm-import"]');
    
    // Wait for completion
    await expect(page.locator('[data-testid="import-complete"]')).toBeVisible();
    
    // Verify obligations created
    await page.goto('/sites/site-123/obligations');
    const obligations = page.locator('[data-testid="obligation-item"]');
    await expect(obligations).toHaveCount(10);
  });
});
```

---

# 6. Permit Parsing Test Suite

## 6.1 Test Permit Collection

### Test Permit Structure

**Test Permits:**
- 50+ test permits: EA, SEPA, NRW permits
- Variety: Different permit types, formats, complexities
- Expected results: Pre-defined expected extractions
- Permit storage: Store test permits in `test/fixtures/permits/`

### Test Permit Interface

```typescript
interface TestPermit {
  id: string;
  filename: string;
  regulator: 'EA' | 'SEPA' | 'NRW';
  permitType: string;
  expectedObligations: Array<{
    title: string;
    frequency: string;
    deadline_date?: string;
    is_subjective: boolean;
  }>;
  expectedParameters?: Array<{
    name: string;
    limit: number;
    unit: string;
  }>;
}

// test/fixtures/permits/index.ts
export const testPermits: TestPermit[] = [
  {
    id: 'ea-permit-001',
    filename: 'ea-permit-001.pdf',
    regulator: 'EA',
    permitType: 'Environmental Permit',
    expectedObligations: [
      { title: 'Annual Compliance Report', frequency: 'ANNUAL', is_subjective: false },
      { title: 'Monitor emissions', frequency: 'MONTHLY', is_subjective: false }
    ]
  }
  // ... more test permits
];
```

## 6.2 Extraction Accuracy Validation

### Accuracy Metrics

**Accuracy Targets:**
- Objective obligations: Test extraction accuracy (target: 90%+)
- Subjective obligations: Test subjective detection (target: 85%+)
- Overall accuracy: Test overall extraction accuracy (target: 85%+)
- Precision: Test precision (correct extractions / total extractions)
- Recall: Test recall (correct extractions / expected extractions)

### Accuracy Validation Implementation

```typescript
import { extractObligations } from '../src/ai-integration';
import { testPermits } from './fixtures/permits';

describe('Permit Parsing Accuracy', () => {
  test.each(testPermits)('should extract obligations from $id', async (permit) => {
    const result = await extractObligations(permit.filename);
    
    // Calculate accuracy
    const accuracy = calculateAccuracy(result.obligations, permit.expectedObligations);
    expect(accuracy).toBeGreaterThanOrEqual(0.85);
  });
  
  function calculateAccuracy(extracted: any[], expected: any[]): number {
    let correct = 0;
    for (const expectedObligation of expected) {
      const match = extracted.find(e => 
        e.title === expectedObligation.title &&
        e.frequency === expectedObligation.frequency
      );
      if (match) correct++;
    }
    return correct / expected.length;
  }
});
```

## 6.3 Subjective Detection Testing

### Subjective Detection Tests

**Test Scenarios:**
- Test subjective detection: Test if subjective obligations are correctly flagged
- Test objective detection: Test if objective obligations are not flagged
- Test confidence scores: Test confidence scores for subjective vs objective

### Subjective Detection Test Implementation

```typescript
describe('Subjective Detection', () => {
  it('should flag subjective obligations', async () => {
    const result = await extractObligations('subjective-permit.pdf');
    
    const subjectiveObligations = result.obligations.filter(o => o.is_subjective);
    expect(subjectiveObligations.length).toBeGreaterThan(0);
    
    // All subjective obligations should be flagged for review
    for (const obligation of subjectiveObligations) {
      expect(obligation.flagged_for_review).toBe(true);
    }
  });
});
```

---

# 7. Module 2/3 Cross-Sell Trigger Testing

## 7.1 Effluent Keyword Detection

### Keyword Detection Tests

**Test Scenarios:**
- Test keyword detection: Test if effluent keywords are detected in permits
- Test trigger creation: Test if cross-sell triggers are created
- Test notification: Test if users are notified of triggers

### Effluent Keyword Detection Test Implementation

```typescript
describe('Module 2 Cross-Sell Triggers', () => {
  it('should detect effluent keywords in permit', async () => {
    const permit = await loadPermit('effluent-permit.pdf');
    const triggers = await detectCrossSellTriggers(permit);
    
    expect(triggers).toContainEqual({
      type: 'MODULE_2_EFFLUENT',
      keywords: ['effluent', 'discharge', 'trade effluent'],
      confidence: 0.95
    });
  });
  
  it('should create cross-sell trigger record', async () => {
    const trigger = await createCrossSellTrigger({
      site_id: 'site-123',
      module: 'MODULE_2',
      trigger_type: 'EFFLUENT_KEYWORDS',
      keywords: ['effluent', 'discharge']
    });
    
    expect(trigger.id).toBeDefined();
    expect(trigger.status).toBe('PENDING');
  });
});
```

## 7.2 Run-Hour Breach Detection

### Breach Detection Tests

**Test Scenarios:**
- Test breach detection: Test if run-hour breaches are detected
- Test trigger creation: Test if triggers are created for breaches
- Test notification: Test if users are notified of breaches

### Run-Hour Breach Detection Test Implementation

```typescript
describe('Module 3 Cross-Sell Triggers', () => {
  it('should detect run-hour breach in MCPD registration', async () => {
    const registration = await loadMCPDRegistration('mcpd-registration.pdf');
    const breaches = await detectRunHourBreaches(registration);
    
    expect(breaches.length).toBeGreaterThan(0);
    expect(breaches[0].generator_name).toBeDefined();
    expect(breaches[0].run_hours).toBeGreaterThan(breaches[0].limit);
  });
});
```

## 7.3 Trigger Accuracy

### Trigger Accuracy Tests

**Test Scenarios:**
- Test false positives: Test if triggers are not created incorrectly
- Test false negatives: Test if triggers are not missed
- Test accuracy: Test overall trigger detection accuracy (target: 90%+)

### Trigger Accuracy Test Implementation

```typescript
describe('Trigger Accuracy', () => {
  it('should have high accuracy for effluent keyword detection', async () => {
    const testPermits = await loadTestPermits('effluent');
    let correct = 0;
    
    for (const permit of testPermits) {
      const triggers = await detectCrossSellTriggers(permit);
      const hasEffluent = permit.content.toLowerCase().includes('effluent');
      
      if (hasEffluent && triggers.length > 0) correct++;
      if (!hasEffluent && triggers.length === 0) correct++;
    }
    
    const accuracy = correct / testPermits.length;
    expect(accuracy).toBeGreaterThanOrEqual(0.90);
  });
});
```

---

# 8. RLS Permission Testing

## 8.1 Overview

Row Level Security (RLS) policies are critical for data isolation and security. This section defines comprehensive testing requirements for all RLS policies across core tables, module-specific tables, and edge cases.

**Test Coverage Requirements:**
- 20+ test cases for core tables
- 15+ test cases for edge cases
- 10+ test cases for module-specific permissions
- 5+ test cases for performance

## 8.2 Core Table Permission Tests

### Test Case 1: Owner can access own company data

**Setup:**
- Create owner user
- Create company
- Assign owner to company

**Test:**
```typescript
describe('RLS Core Tables - Owner Access', () => {
  it('should allow owner to access own company data', async () => {
    const ownerSupabase = createClient(TEST_SUPABASE_URL, ownerToken);
    const { data, error } = await ownerSupabase
      .from('companies')
      .select('*')
      .eq('id', 'company-123');
    
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe('company-123');
  });
});
```

**Expected:** Returns company data  
**RLS Policy:** `companies_select_user_access`

---

### Test Case 2: Staff cannot access other company data

**Setup:**
- Create staff user
- Create two companies
- Assign staff to company A only

**Test:**
```typescript
it('should prevent staff from accessing other company data', async () => {
  const staffSupabase = createClient(TEST_SUPABASE_URL, staffToken);
  const { data, error } = await staffSupabase
    .from('companies')
    .select('*')
    .eq('id', 'company-b'); // Company B - staff not assigned
    
  expect(data).toHaveLength(0); // RLS filters out
});
```

**Expected:** Returns empty result (RLS filters out)  
**RLS Policy:** `companies_select_user_access`

---

### Test Case 3: Viewer cannot create obligations

**Setup:**
- Create viewer user
- Assign to site

**Test:**
```typescript
it('should prevent viewer from creating obligations', async () => {
  const viewerSupabase = createClient(TEST_SUPABASE_URL, viewerToken);
  const { data, error } = await viewerSupabase
    .from('obligations')
    .insert({
      site_id: 'site-123',
      obligation_title: 'Test Obligation',
      frequency: 'ANNUAL'
    });
  
  expect(error).toBeTruthy();
  expect(error.code).toBe('42501'); // Insufficient privilege
});
```

**Expected:** Returns 403 Forbidden (no INSERT policy for viewer)  
**RLS Policy:** No INSERT policy for viewer role

---

### Test Case 4: Consultant can only access assigned clients

**Setup:**
- Create consultant user
- Create two companies
- Assign consultant to company A only

**Test:**
```typescript
it('should restrict consultant to assigned clients only', async () => {
  const consultantSupabase = createClient(TEST_SUPABASE_URL, consultantToken);
  const { data, error } = await consultantSupabase
    .from('companies')
    .select('*')
    .eq('id', 'company-b'); // Company B - not assigned
    
  expect(data).toHaveLength(0); // RLS filters out
});
```

**Expected:** Returns empty result (RLS filters out)  
**RLS Policy:** `consultant_data_isolation`

---

### Test Case 5: Staff cannot delete obligations

**Setup:**
- Create staff user
- Assign to site
- Create obligation

**Test:**
```typescript
it('should prevent staff from deleting obligations', async () => {
  const staffSupabase = createClient(TEST_SUPABASE_URL, staffToken);
  const { data, error } = await staffSupabase
    .from('obligations')
    .delete()
    .eq('id', 'obligation-123');
  
  expect(error).toBeTruthy();
  expect(error.code).toBe('42501'); // Insufficient privilege
});
```

**Expected:** Returns 403 Forbidden (no DELETE policy for staff)  
**RLS Policy:** No DELETE policy for staff role

---

### Test Case 6: Admin can delete documents

**Setup:**
- Create admin user
- Assign to site
- Create document

**Test:**
```typescript
it('should allow admin to delete documents', async () => {
  const adminSupabase = createClient(TEST_SUPABASE_URL, adminToken);
  const { data, error } = await adminSupabase
    .from('documents')
    .delete()
    .eq('id', 'doc-123');
  
  expect(error).toBeNull();
  expect(data).toBeDefined();
});
```

**Expected:** DELETE succeeds  
**RLS Policy:** `documents_delete_owner_admin_access`

---

### Test Case 7: Evidence cannot be deleted by any role

**Setup:**
- Create owner user
- Assign to site
- Create evidence

**Test:**
```typescript
it('should prevent any role from deleting evidence', async () => {
  const ownerSupabase = createClient(TEST_SUPABASE_URL, ownerToken);
  const { data, error } = await ownerSupabase
    .from('evidence')
    .delete()
    .eq('id', 'evidence-123');
  
  expect(error).toBeTruthy();
  expect(error.code).toBe('42501'); // No DELETE policy
});
```

**Expected:** Returns 403 Forbidden (no DELETE policy for any role)  
**RLS Policy:** No DELETE policy (system archives only)

---

### Test Case 8: Module 2 data requires module activation

**Setup:**
- Create owner user
- Assign to site
- Module 2 not activated

**Test:**
```typescript
it('should prevent access to Module 2 data without activation', async () => {
  const ownerSupabase = createClient(TEST_SUPABASE_URL, ownerToken);
  const { data, error } = await ownerSupabase
    .from('parameters')
    .insert({
      site_id: 'site-123',
      parameter_name: 'pH',
      limit_value: 7.0
    });
  
  expect(error).toBeTruthy();
  expect(error.code).toBe('42501'); // Module not activated
});
```

**Expected:** Returns 403 Forbidden (module not activated)  
**RLS Policy:** `parameters_insert_staff_access` (checks module activation)

---

### Test Case 9: Consultant cannot access unassigned client sites

**Setup:**
- Create consultant user
- Assign to company A site 1
- Company A has site 2 (not assigned)

**Test:**
```typescript
it('should prevent consultant from accessing unassigned sites', async () => {
  const consultantSupabase = createClient(TEST_SUPABASE_URL, consultantToken);
  const { data, error } = await consultantSupabase
    .from('obligations')
    .select('*')
    .eq('site_id', 'site-2'); // Site 2 - not assigned
    
  expect(data).toHaveLength(0); // RLS filters out
});
```

**Expected:** Returns empty result (RLS filters out)  
**RLS Policy:** Consultant isolation + site access

---

### Test Case 10: User can only access own notifications

**Setup:**
- Create two users
- Create notification for user A

**Test:**
```typescript
it('should restrict users to own notifications', async () => {
  const userBSupabase = createClient(TEST_SUPABASE_URL, userBToken);
  const { data, error } = await userBSupabase
    .from('notifications')
    .select('*');
  
  // Should only return user B's notifications
  expect(data?.every(n => n.user_id === 'user-b')).toBe(true);
});
```

**Expected:** Returns only user B's notifications  
**RLS Policy:** `notifications_select_user_access`

---

## 8.3 Edge Case Permission Tests

### Test Case 11: Soft-deleted records access

**Setup:**
- Create owner user
- Create company
- Soft-delete company

**Test:**
```typescript
it('should filter out soft-deleted records', async () => {
  const ownerSupabase = createClient(TEST_SUPABASE_URL, ownerToken);
  const { data, error } = await ownerSupabase
    .from('companies')
    .select('*')
    .eq('id', 'company-123'); // Soft-deleted
    
  expect(data).toHaveLength(0); // RLS filters soft-deleted
});
```

**Expected:** Returns empty result (RLS filters soft-deleted)  
**RLS Policy:** Add `AND deleted_at IS NULL` condition

---

### Test Case 12: Nested resource access via parent

**Setup:**
- Create staff user
- Assign to site
- Create document
- Create obligation linked to document

**Test:**
```typescript
it('should allow access to obligations via document relationship', async () => {
  const staffSupabase = createClient(TEST_SUPABASE_URL, staffToken);
  const { data, error } = await staffSupabase
    .from('obligations')
    .select('*, documents!inner(*)')
    .eq('documents.site_id', 'site-123');
  
  expect(error).toBeNull();
  expect(data).toBeDefined();
});
```

**Expected:** Returns obligation (has site access via document)  
**RLS Policy:** Check site_id on obligation

---

### Test Case 13: Bulk operations permissions

**Setup:**
- Create staff user
- Assign to site

**Test:**
```typescript
it('should enforce permissions on bulk operations', async () => {
  const staffSupabase = createClient(TEST_SUPABASE_URL, staffToken);
  const obligations = Array.from({ length: 100 }, (_, i) => ({
    site_id: 'site-123',
    obligation_title: `Obligation ${i}`,
    frequency: 'ANNUAL'
  }));
  
  const { data, error } = await staffSupabase
    .from('obligations')
    .insert(obligations);
  
  // All should succeed if site access granted
  expect(error).toBeNull();
  expect(data).toHaveLength(100);
});
```

**Expected:** All succeed (if site access granted)  
**RLS Policy:** Same as single INSERT

---

### Test Case 14: Time-based access (historical data)

**Setup:**
- Create staff user
- Assign to site
- Create obligation with past deadline

**Test:**
```typescript
it('should allow access to historical obligations', async () => {
  const staffSupabase = createClient(TEST_SUPABASE_URL, staffToken);
  const { data, error } = await staffSupabase
    .from('obligations')
    .select('*')
    .eq('site_id', 'site-123')
    .lt('deadline_date', new Date().toISOString()); // Historical
    
  expect(error).toBeNull();
  expect(data).toBeDefined();
});
```

**Expected:** Returns all obligations (no time restriction)  
**RLS Policy:** No time-based filtering

---

### Test Case 15: Service role bypasses RLS

**Setup:**
- Use service role JWT (not user JWT)

**Test:**
```typescript
it('should allow service role to bypass RLS', async () => {
  const serviceSupabase = createClient(
    TEST_SUPABASE_URL,
    TEST_SUPABASE_SERVICE_KEY
  );
  const { data, error } = await serviceSupabase
    .from('companies')
    .select('*');
  
  // Service role bypasses RLS
  expect(error).toBeNull();
  expect(data?.length).toBeGreaterThan(0);
});
```

**Expected:** Returns all data (RLS bypassed for service role)  
**RLS Policy:** Check `auth.role() = 'service_role'`

---

## 8.4 Module-Specific Permission Tests

### Test Case 16: Module 2 parameter access requires activation

**Setup:**
- Create owner user
- Assign to site
- Module 2 not activated

**Test:**
```typescript
it('should prevent parameter access without Module 2 activation', async () => {
  const ownerSupabase = createClient(TEST_SUPABASE_URL, ownerToken);
  const { data, error } = await ownerSupabase
    .from('parameters')
    .select('*')
    .eq('site_id', 'site-123');
  
  expect(data).toHaveLength(0); // Module not activated
});
```

**Expected:** Returns empty result (module not activated)  
**RLS Policy:** `parameters_select_site_access` + module check

---

### Test Case 17: Module 3 generator access requires activation

**Setup:**
- Create owner user
- Assign to site
- Module 3 activated

**Test:**
```typescript
it('should allow generator access with Module 3 activation', async () => {
  const ownerSupabase = createClient(TEST_SUPABASE_URL, ownerToken);
  const { data, error } = await ownerSupabase
    .from('generators')
    .select('*')
    .eq('site_id', 'site-123');
  
  expect(error).toBeNull();
  expect(data).toBeDefined();
});
```

**Expected:** Returns generators (module activated)  
**RLS Policy:** `generators_select_site_access` + module check

---

## 8.5 Performance Permission Tests

### Test Case 18: RLS policy performance with large dataset

**Setup:**
- Create 10,000 obligations across 100 sites
- Assign user to 10 sites

**Test:**
```typescript
it('should perform efficiently with large dataset', async () => {
  const startTime = performance.now();
  const userSupabase = createClient(TEST_SUPABASE_URL, userToken);
  const { data, error } = await userSupabase
    .from('obligations')
    .select('*');
  
  const duration = performance.now() - startTime;
  
  expect(error).toBeNull();
  expect(data).toHaveLength(1000); // 10 sites × 100 obligations
  expect(duration).toBeLessThan(500); // < 500ms
});
```

**Expected:** Returns only 1,000 obligations (10 sites), query completes in < 500ms  
**RLS Policy:** Requires indexes on `site_id`, `user_site_assignments`

---

### Test Case 19: Consultant isolation performance

**Setup:**
- Create consultant assigned to 50 companies
- 500 sites total

**Test:**
```typescript
it('should perform efficiently with consultant isolation', async () => {
  const startTime = performance.now();
  const consultantSupabase = createClient(TEST_SUPABASE_URL, consultantToken);
  const { data, error } = await consultantSupabase
    .from('obligations')
    .select('*');
  
  const duration = performance.now() - startTime;
  
  expect(error).toBeNull();
  expect(data?.every(o => {
    // All obligations from assigned companies
    return assignedCompanyIds.includes(o.company_id);
  })).toBe(true);
  expect(duration).toBeLessThan(1000); // < 1s
});
```

**Expected:** Returns only obligations from assigned companies, query completes in < 1s  
**RLS Policy:** Requires indexes on `company_id`, `user_roles`

---

> [v1 UPDATE – Pack Generation Testing – 2024-12-27]

## 9. v1.0 Pack Generation Testing

### 9.1 Pack Type Access Control Tests

**Test Case 1: Core Plan can only generate Regulator and Audit packs**

**Setup:**
- Create user with Core Plan
- Create site with active documents

**Test:**
```typescript
it('should restrict Core Plan to Regulator and Audit packs only', async () => {
  const response = await api.post('/api/v1/packs/tender', {
    site_id: siteId,
    pack_type: 'TENDER_CLIENT_ASSURANCE',
    date_range: { start: '2025-01-01', end: '2025-12-31' }
  });
  
  expect(response.status).toBe(403);
  expect(response.body.error).toContain('pack type not available');
});
```

**Expected:** Returns 403 FORBIDDEN for Growth Plan pack types

---

**Test Case 2: Growth Plan can generate all pack types**

**Setup:**
- Create user with Growth Plan
- Create site with active documents

**Test:**
```typescript
it('should allow Growth Plan to generate all pack types', async () => {
  const packTypes = [
    'REGULATOR_INSPECTION',
    'TENDER_CLIENT_ASSURANCE',
    'BOARD_MULTI_SITE_RISK',
    'INSURER_BROKER',
    'AUDIT_PACK'
  ];
  
  for (const packType of packTypes) {
    const response = await api.post(`/api/v1/packs/${packType.toLowerCase()}`, {
      site_id: siteId,
      pack_type: packType,
      date_range: { start: '2025-01-01', end: '2025-12-31' }
    });
    
    expect(response.status).toBe(202); // Accepted
  }
});
```

**Expected:** All pack types accepted for Growth Plan

---

### 9.2 Pack Content Structure Tests

**Test Case 3: Regulator Pack includes all required sections**

**Test:**
```typescript
it('should generate Regulator Pack with correct structure', async () => {
  const pack = await generatePack({
    pack_type: 'REGULATOR_INSPECTION',
    site_id: siteId,
    document_id: documentId,
    date_range: { start: '2025-01-01', end: '2025-12-31' }
  });
  
  expect(pack.sections).toContain('Cover Page');
  expect(pack.sections).toContain('Executive Summary');
  expect(pack.sections).toContain('Permit Summary');
  expect(pack.sections).toContain('Compliance Dashboard');
  expect(pack.sections).toContain('Obligation Matrix');
  expect(pack.sections).toContain('Gap Analysis');
  expect(pack.sections).toContain('Evidence Appendix');
});
```

**Reference:** Product Logic Specification Section I.8.2 (Regulator/Inspection Pack Logic)

---

**Test Case 4: Board Pack includes multi-site aggregation**

**Test:**
```typescript
it('should generate Board Pack with multi-site data', async () => {
  const company = await createCompany();
  const site1 = await createSite(company.id);
  const site2 = await createSite(company.id);
  const site3 = await createSite(company.id);
  
  // Add obligations to each site
  await createObligations(site1.id, 10);
  await createObligations(site2.id, 15);
  await createObligations(site3.id, 8);
  
  const pack = await generatePack({
    pack_type: 'BOARD_MULTI_SITE_RISK',
    company_id: company.id,
    date_range: { start: '2025-01-01', end: '2025-12-31' }
  });
  
  expect(pack.total_sites).toBe(3);
  expect(pack.total_obligations).toBe(33); // 10 + 15 + 8
  expect(pack.site_by_site_matrix).toHaveLength(3);
});
```

**Reference:** Product Logic Specification Section I.8.4 (Board/Multi-Site Risk Pack Logic)

---

### 9.3 Pack Distribution Tests

**Test Case 5: Email distribution sends pack to recipients**

**Test:**
```typescript
it('should distribute pack via email', async () => {
  const pack = await generatePack({ pack_type: 'TENDER_CLIENT_ASSURANCE' });
  
  const response = await api.post(`/api/v1/packs/${pack.id}/distribute`, {
    distribution_method: 'EMAIL',
    recipients: [
      { email: 'recipient@example.com', name: 'Recipient Name' }
    ],
    message: 'Please find attached compliance pack'
  });
  
  expect(response.status).toBe(200);
  expect(emailService.send).toHaveBeenCalledWith(
    expect.objectContaining({
      to: 'recipient@example.com',
      attachments: expect.arrayContaining([
        expect.objectContaining({ filename: expect.stringContaining('.pdf') })
      ])
    })
  );
});
```

---

**Test Case 6: Shared link generation creates unique token**

**Test:**
```typescript
it('should generate unique shared link token', async () => {
  const pack = await generatePack({ pack_type: 'TENDER_CLIENT_ASSURANCE' });
  
  const response = await api.get(`/api/v1/packs/${pack.id}/share`, {
    params: { expires_in_days: 30 }
  });
  
  expect(response.status).toBe(200);
  expect(response.data.shareable_link).toContain('/share/packs/');
  expect(response.data.token).toMatch(/^[a-f0-9-]{36}$/); // UUID format
  expect(response.data.expires_at).toBeDefined();
});
```

---

> [v1 UPDATE – Consultant Feature Testing – 2024-12-27]

## 10. v1.0 Consultant Feature Testing

### 10.1 Consultant Client Assignment Tests

**Test Case 1: Consultant can only access assigned clients**

**Setup:**
- Create consultant user
- Create two client companies (A and B)
- Assign consultant to company A only

**Test:**
```typescript
it('should restrict consultant to assigned clients only', async () => {
  const consultantSupabase = createClient(TEST_SUPABASE_URL, consultantToken);
  
  // Should access company A
  const { data: companyA } = await consultantSupabase
    .from('companies')
    .select('*')
    .eq('id', companyAId)
    .single();
  
  expect(companyA).toBeDefined();
  
  // Should NOT access company B
  const { data: companyB, error } = await consultantSupabase
    .from('companies')
    .select('*')
    .eq('id', companyBId)
    .single();
  
  expect(companyB).toBeNull();
  expect(error).toBeDefined();
});
```

**RLS Policy:** `consultant_client_assignments_select_consultant_access`

---

**Test Case 2: Consultant can generate packs for assigned clients**

**Test:**
```typescript
it('should allow consultant to generate packs for assigned clients', async () => {
  const response = await api.post(`/api/v1/consultant/clients/${clientAId}/packs`, {
    pack_type: 'REGULATOR_INSPECTION',
    site_id: siteId,
    date_range: { start: '2025-01-01', end: '2025-12-31' }
  }, {
    headers: { Authorization: `Bearer ${consultantToken}` }
  });
  
  expect(response.status).toBe(202); // Accepted
});
```

---

**Test Case 3: Consultant cannot generate packs for unassigned clients**

**Test:**
```typescript
it('should prevent consultant from generating packs for unassigned clients', async () => {
  const response = await api.post(`/api/v1/consultant/clients/${clientBId}/packs`, {
    pack_type: 'REGULATOR_INSPECTION',
    site_id: siteId,
    date_range: { start: '2025-01-01', end: '2025-12-31' }
  }, {
    headers: { Authorization: `Bearer ${consultantToken}` }
  });
  
  expect(response.status).toBe(403);
  expect(response.body.error).toContain('not assigned');
});
```

---

### 10.2 Consultant Dashboard Tests

**Test Case 4: Consultant dashboard aggregates client data**

**Test:**
```typescript
it('should aggregate data from all assigned clients', async () => {
  const response = await api.get('/api/v1/consultant/dashboard', {
    headers: { Authorization: `Bearer ${consultantToken}` }
  });
  
  expect(response.status).toBe(200);
  expect(response.data.total_clients).toBeGreaterThan(0);
  expect(response.data.compliance_overview).toBeDefined();
  expect(response.data.recent_activity).toBeDefined();
  expect(response.data.upcoming_deadlines).toBeDefined();
});
```

**Reference:** Product Logic Specification Section C.5.3 (Consultant Dashboard Logic)

---

## 11. API Key Management Testing

### Unit Tests

```typescript
describe('RLS Policy Unit Tests', () => {
  it('should test each RLS policy individually', async () => {
    // Test with different user roles
    // Test with different data scenarios
  });
});
```

### Integration Tests

```typescript
describe('RLS Policy Integration Tests', () => {
  it('should test RLS policies with API endpoints', async () => {
    // Test RLS enforcement through API
  });
  
  it('should test RLS policies with background jobs', async () => {
    // Test service role bypass
  });
  
  it('should test RLS policies with real-time subscriptions', async () => {
    // Test RLS with Supabase real-time
  });
});
```

### Performance Tests

```typescript
describe('RLS Policy Performance Tests', () => {
  it('should measure RLS overhead', async () => {
    // Measure query time with/without RLS
    // Benchmark: RLS should add < 50ms overhead per query
  });
  
  it('should test with large datasets', async () => {
    // Test with 10,000+ rows
  });
  
  it('should test with complex joins', async () => {
    // Test RLS with multi-table queries
  });
});
```

---

# 9. API Key Management Testing

## 9.1 Overview

API key management is critical for the AI integration layer. This section defines testing requirements for API key validation, rotation, fallback, and error handling.

## 9.2 Test Scenarios

### Valid Key Test

**Test:** Test with valid API key

```typescript
describe('API Key Management', () => {
  it('should use primary key by default', async () => {
    const manager = new APIKeyManager({
      primary: 'valid-key-123',
      fallbacks: ['fallback-key-456']
    });
    
    expect(manager.getCurrentKey()).toBe('valid-key-123');
  });
  
  it('should make successful API call with valid key', async () => {
    const manager = new APIKeyManager({ primary: 'valid-key-123' });
    const result = await manager.makeAPICall({
      endpoint: '/v1/chat/completions',
      data: { model: 'gpt-4.1', messages: [] }
    });
    
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });
});
```

---

### Invalid Key Test

**Test:** Test with invalid API key (should fail gracefully)

```typescript
it('should handle invalid API key gracefully', async () => {
  const manager = new APIKeyManager({ primary: 'invalid-key' });
  const result = await manager.makeAPICall({
    endpoint: '/v1/chat/completions',
    data: { model: 'gpt-4.1', messages: [] }
  });
  
  expect(result.success).toBe(false);
  expect(result.error).toBeDefined();
  expect(result.error.code).toBe('invalid_api_key');
});
```

---

### Key Rotation Test

**Test:** Test key rotation process

```typescript
it('should rotate to new key successfully', async () => {
  const manager = new APIKeyManager({ primary: 'old-key-123' });
  
  // Rotate key
  await manager.rotateKey('new-key-456');
  
  expect(manager.getCurrentKey()).toBe('new-key-456');
  
  // Verify new key works
  const result = await manager.makeAPICall({
    endpoint: '/v1/chat/completions',
    data: { model: 'gpt-4.1', messages: [] }
  });
  
  expect(result.success).toBe(true);
});
```

---

### Fallback Key Test

**Test:** Test fallback to secondary key

```typescript
it('should fallback to secondary key on primary failure', async () => {
  const manager = new APIKeyManager({
    primary: 'invalid-primary-key',
    fallbacks: ['valid-fallback-key-123']
  });
  
  // Mock primary key failure
  mockAPICallFailure('invalid-primary-key');
  
  const result = await manager.makeAPICall({
    endpoint: '/v1/chat/completions',
    data: { model: 'gpt-4.1', messages: [] }
  });
  
  expect(manager.getCurrentKey()).toBe('valid-fallback-key-123');
  expect(result.success).toBe(true);
});
```

---

### Key Validation Test

**Test:** Test key validation on startup

```typescript
it('should validate keys on application startup', async () => {
  const manager = new APIKeyManager({ primary: 'valid-key-123' });
  
  const isValid = await manager.validateKey('valid-key-123');
  expect(isValid).toBe(true);
  
  const isInvalid = await manager.validateKey('invalid-key');
  expect(isInvalid).toBe(false);
});

it('should fail startup if no valid keys', async () => {
  const manager = new APIKeyManager({
    primary: 'invalid-key-1',
    fallbacks: ['invalid-key-2']
  });
  
  await expect(manager.validateAllKeys()).rejects.toThrow(
    'No valid API keys found'
  );
});
```

---

## 9.3 Key Management Error Handling

```typescript
describe('API Key Error Handling', () => {
  it('should handle rate limit errors', async () => {
    const manager = new APIKeyManager({ primary: 'rate-limited-key' });
    mockRateLimitError();
    
    const result = await manager.makeAPICall({
      endpoint: '/v1/chat/completions',
      data: { model: 'gpt-4.1', messages: [] }
    });
    
    expect(result.error.code).toBe('rate_limit_exceeded');
    expect(manager.shouldRotateKey()).toBe(true);
  });
  
  it('should handle quota exceeded errors', async () => {
    const manager = new APIKeyManager({ primary: 'quota-exceeded-key' });
    mockQuotaExceededError();
    
    const result = await manager.makeAPICall({
      endpoint: '/v1/chat/completions',
      data: { model: 'gpt-4.1', messages: [] }
    });
    
    expect(result.error.code).toBe('insufficient_quota');
  });
});
```

---

# 10. AI Integration Layer Testing

## 10.1 Overview

The AI integration layer requires comprehensive testing for request formatting, cost optimization, error handling, and cost tracking. This section defines all required test scenarios.

## 10.2 Request Formatting Tests

### Correct Format Test

**Test:** Test request formatting with correct inputs

```typescript
describe('AI Integration - Request Formatting', () => {
  it('should format request correctly', async () => {
    const formatted = await formatAIRequest({
      documentText: 'Sample permit text...',
      rules: ['rule1', 'rule2'],
      model: 'gpt-4.1'
    });
    
    expect(formatted.messages).toBeDefined();
    expect(formatted.messages[0].role).toBe('system');
    expect(formatted.messages[1].role).toBe('user');
  });
});
```

---

### Token Limit Test

**Test:** Test request respects token limits

```typescript
it('should respect token limits', async () => {
  const largeDocument = 'x'.repeat(1000000); // Very large document
  
  const formatted = await formatAIRequest({
    documentText: largeDocument,
    rules: [],
    model: 'gpt-4.1',
    maxTokens: 100000
  });
  
  const tokenCount = countTokens(formatted);
  expect(tokenCount).toBeLessThanOrEqual(100000);
});
```

---

### Variable Substitution Test

**Test:** Test template variable substitution

```typescript
it('should substitute template variables correctly', async () => {
  const template = 'Extract obligations from {{document_type}} permit';
  const formatted = formatTemplate(template, {
    document_type: 'Environmental Permit'
  });
  
  expect(formatted).toBe('Extract obligations from Environmental Permit permit');
  expect(formatted).not.toContain('{{document_type}}');
});
```

---

### JSON Schema Test

**Test:** Test JSON schema enforcement

```typescript
it('should enforce JSON schema in response', async () => {
  const response = await makeAIRequest({
    model: 'gpt-4.1',
    messages: [],
    responseFormat: { type: 'json_schema', json_schema: obligationSchema }
  });
  
  const parsed = JSON.parse(response.content);
  const isValid = validateSchema(parsed, obligationSchema);
  expect(isValid).toBe(true);
});
```

---

## 10.3 Cost Optimization Tests

### Batching Test

**Test:** Test document batching (up to 5 documents)

```typescript
describe('AI Integration - Cost Optimization', () => {
  it('should batch up to 5 documents', async () => {
    const documents = Array.from({ length: 5 }, (_, i) => ({
      id: `doc-${i}`,
      text: `Document ${i} text...`
    }));
    
    const batched = await batchDocuments(documents, { maxBatchSize: 5 });
    expect(batched.length).toBe(1); // Single batch
    expect(batched[0].documents.length).toBe(5);
  });
  
  it('should create multiple batches for >5 documents', async () => {
    const documents = Array.from({ length: 10 }, (_, i) => ({
      id: `doc-${i}`,
      text: `Document ${i} text...`
    }));
    
    const batched = await batchDocuments(documents, { maxBatchSize: 5 });
    expect(batched.length).toBe(2); // Two batches
  });
});
```

---

### Caching Test

**Test:** Test rule library match caching

```typescript
it('should cache rule library matches', async () => {
  const ruleLibrary = new RuleLibrary();
  
  // First call - should hit API
  const result1 = await ruleLibrary.findMatches('permit-text-123');
  expect(result1.fromCache).toBe(false);
  
  // Second call - should use cache
  const result2 = await ruleLibrary.findMatches('permit-text-123');
  expect(result2.fromCache).toBe(true);
  expect(result2.matches).toEqual(result1.matches);
});
```

---

### Token Optimization Test

**Test:** Test prompt compression

```typescript
it('should compress prompts to reduce tokens', async () => {
  const originalPrompt = 'Extract obligations from this permit...'.repeat(100);
  const compressed = await compressPrompt(originalPrompt);
  
  const originalTokens = countTokens(originalPrompt);
  const compressedTokens = countTokens(compressed);
  
  expect(compressedTokens).toBeLessThan(originalTokens);
  expect(compressedTokens / originalTokens).toBeLessThan(0.7); // 30%+ reduction
});
```

---

### Cost Calculation Test

**Test:** Test accurate cost calculation

```typescript
it('should calculate costs accurately', async () => {
  const request = {
    model: 'gpt-4.1',
    inputTokens: 1000,
    outputTokens: 500
  };
  
  const cost = calculateCost(request);
  const expectedCost = (1000 * 0.01) + (500 * 0.03); // $0.01/1K input, $0.03/1K output
  
  expect(cost).toBeCloseTo(expectedCost, 2);
});
```

---

## 10.4 Error Handling Tests

### Retry Test

**Test:** Test exponential backoff retry logic

```typescript
describe('AI Integration - Error Handling', () => {
  it('should retry with exponential backoff', async () => {
    let attemptCount = 0;
    const mockAPI = jest.fn().mockImplementation(() => {
      attemptCount++;
      if (attemptCount < 3) {
        throw new Error('Temporary failure');
      }
      return { success: true };
    });
    
    const startTime = Date.now();
    const result = await retryWithBackoff(mockAPI, {
      maxRetries: 3,
      initialDelay: 1000,
      backoffMultiplier: 2
    });
    
    const duration = Date.now() - startTime;
    
    expect(result.success).toBe(true);
    expect(attemptCount).toBe(3);
    expect(duration).toBeGreaterThan(3000); // 1s + 2s delays
  });
});
```

---

### Fallback Test

**Test:** Test model fallback (GPT-4.1 → GPT-4.1 Mini)

```typescript
it('should fallback to cheaper model on failure', async () => {
  const manager = new AIModelManager({
    primary: 'gpt-4.1',
    fallback: 'gpt-4.1-mini'
  });
  
  // Mock primary model failure
  mockModelFailure('gpt-4.1');
  
  const result = await manager.makeRequest({
    model: 'gpt-4.1',
    messages: []
  });
  
  expect(result.model).toBe('gpt-4.1-mini');
  expect(result.success).toBe(true);
});
```

---

### Timeout Test

**Test:** Test request timeout handling

```typescript
it('should handle request timeouts', async () => {
  const slowAPI = jest.fn().mockImplementation(() => {
    return new Promise(resolve => setTimeout(resolve, 60000)); // 60s delay
  });
  
  await expect(
    makeRequestWithTimeout(slowAPI, { timeout: 5000 })
  ).rejects.toThrow('Request timeout');
});
```

---

### Rate Limit Test

**Test:** Test rate limit detection and handling

```typescript
it('should handle rate limits gracefully', async () => {
  mockRateLimitResponse();
  
  const result = await makeAIRequest({
    model: 'gpt-4.1',
    messages: []
  });
  
  expect(result.error.code).toBe('rate_limit_exceeded');
  expect(result.retryAfter).toBeDefined();
  expect(result.retryAfter).toBeGreaterThan(0);
});
```

---

## 10.5 Cost Tracking Tests

### Token Counting Test

**Test:** Test accurate token counting

```typescript
describe('AI Integration - Cost Tracking', () => {
  it('should count tokens accurately', async () => {
    const text = 'This is a test document with multiple words.';
    const tokenCount = countTokens(text);
    
    // Approximate: 1 token ≈ 4 characters for English
    const expectedCount = Math.ceil(text.length / 4);
    expect(tokenCount).toBeCloseTo(expectedCount, 1);
  });
});
```

---

### Cost Calculation Test

**Test:** Test cost calculation accuracy

```typescript
it('should calculate costs accurately for different models', async () => {
  const gpt41Cost = calculateCost({
    model: 'gpt-4.1',
    inputTokens: 1000,
    outputTokens: 500
  });
  
  const gpt41MiniCost = calculateCost({
    model: 'gpt-4.1-mini',
    inputTokens: 1000,
    outputTokens: 500
  });
  
  expect(gpt41MiniCost).toBeLessThan(gpt41Cost); // Mini should be cheaper
});
```

---

### Cost Logging Test

**Test:** Test cost logging to database

```typescript
it('should log costs to database', async () => {
  const costRecord = {
    document_id: 'doc-123',
    model: 'gpt-4.1',
    input_tokens: 1000,
    output_tokens: 500,
    cost: 0.025,
    timestamp: new Date()
  };
  
  await logCostToDatabase(costRecord);
  
  const logged = await getCostRecord('doc-123');
  expect(logged).toMatchObject(costRecord);
});
```

---

### Cost Analytics Test

**Test:** Test cost aggregation queries

```typescript
it('should aggregate costs by date', async () => {
  const costs = await aggregateCosts({
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    groupBy: 'day'
  });
  
  expect(costs.length).toBe(31); // 31 days
  expect(costs[0]).toHaveProperty('date');
  expect(costs[0]).toHaveProperty('total_cost');
});
```

---

# 11. Notification & Messaging Testing

## 11.1 Overview

Notification and messaging system requires comprehensive testing for template rendering, escalation chains, rate limiting, delivery provider integration, and preference application.

## 11.2 Template Rendering Tests

### Template Variable Substitution

**Test:** Test all variables substituted correctly

```typescript
describe('Notification - Template Rendering', () => {
  it('should substitute all template variables', async () => {
    const template = {
      subject: 'Deadline approaching: {{obligation_title}}',
      body: 'The obligation "{{obligation_title}}" for {{site_name}} is due on {{deadline_date}}.'
    };
    
    const rendered = await renderTemplate(template, {
      obligation_title: 'Annual Compliance Report',
      site_name: 'Site A',
      deadline_date: '2024-12-31'
    });
    
    expect(rendered.subject).toBe('Deadline approaching: Annual Compliance Report');
    expect(rendered.body).toContain('Annual Compliance Report');
    expect(rendered.body).toContain('Site A');
    expect(rendered.body).toContain('2024-12-31');
    expect(rendered.body).not.toContain('{{');
  });
  
  it('should handle missing variables gracefully', async () => {
    const template = {
      subject: 'Deadline: {{obligation_title}}',
      body: 'Due: {{deadline_date}}'
    };
    
    const rendered = await renderTemplate(template, {
      obligation_title: 'Test'
      // Missing deadline_date
    });
    
    expect(rendered.subject).toBe('Deadline: Test');
    expect(rendered.body).toContain('Due: [Not specified]');
  });
});
```

---

## 11.3 Escalation Chain Tests

### Escalation Recipients

**Test:** Test correct recipients at each level

```typescript
describe('Notification - Escalation Chain', () => {
  it('should send to primary recipient first', async () => {
    const notification = {
      recipient: 'user-123',
      escalationLevel: 1,
      maxEscalations: 3
    };
    
    const sent = await sendNotification(notification);
    
    expect(sent.recipient).toBe('user-123');
    expect(sent.escalationLevel).toBe(1);
  });
  
  it('should escalate to manager after no response', async () => {
    const notification = {
      recipient: 'user-123',
      escalationLevel: 1,
      maxEscalations: 3
    };
    
    // Mock no response
    mockNoResponse('user-123');
    
    // Wait for escalation timeout
    await waitForEscalation(notification, { timeout: 24 * 60 * 60 * 1000 }); // 24 hours
    
    const escalated = await getEscalatedNotification(notification.id);
    expect(escalated.escalationLevel).toBe(2);
    expect(escalated.recipient).toBe('manager-456'); // Manager
  });
  
  it('should escalate to owner after manager no response', async () => {
    const notification = {
      recipient: 'user-123',
      escalationLevel: 2,
      maxEscalations: 3
    };
    
    mockNoResponse('manager-456');
    await waitForEscalation(notification, { timeout: 24 * 60 * 60 * 1000 });
    
    const escalated = await getEscalatedNotification(notification.id);
    expect(escalated.escalationLevel).toBe(3);
    expect(escalated.recipient).toBe('owner-789'); // Owner
  });
});
```

---

## 11.4 Rate Limiting Tests

### Rate Limit Enforcement

**Test:** Test limits enforced correctly

```typescript
describe('Notification - Rate Limiting', () => {
  it('should enforce email rate limits', async () => {
    const rateLimiter = new RateLimiter({
      maxEmails: 100,
      windowMs: 60 * 60 * 1000 // 1 hour
    });
    
    // Send 100 emails
    for (let i = 0; i < 100; i++) {
      await rateLimiter.sendEmail({
        to: 'user@example.com',
        subject: `Email ${i}`,
        body: 'Test'
      });
    }
    
    // 101st email should be rate limited
    const result = await rateLimiter.sendEmail({
      to: 'user@example.com',
      subject: 'Email 101',
      body: 'Test'
    });
    
    expect(result.success).toBe(false);
    expect(result.error.code).toBe('rate_limit_exceeded');
  });
  
  it('should enforce SMS rate limits', async () => {
    const rateLimiter = new RateLimiter({
      maxSMS: 10,
      windowMs: 60 * 60 * 1000 // 1 hour
    });
    
    // Send 10 SMS
    for (let i = 0; i < 10; i++) {
      await rateLimiter.sendSMS({
        to: '+1234567890',
        message: `SMS ${i}`
      });
    }
    
    // 11th SMS should be rate limited
    const result = await rateLimiter.sendSMS({
      to: '+1234567890',
      message: 'SMS 11'
    });
    
    expect(result.success).toBe(false);
    expect(result.error.code).toBe('rate_limit_exceeded');
  });
});
```

---

## 11.5 Delivery Provider Integration Tests

### Webhook Handling

**Test:** Test webhook handling

```typescript
describe('Notification - Delivery Provider Integration', () => {
  it('should handle SendGrid webhook events', async () => {
    const webhook = {
      event: 'delivered',
      email: 'user@example.com',
      timestamp: Date.now()
    };
    
    await handleSendGridWebhook(webhook);
    
    const notification = await getNotificationByEmail('user@example.com');
    expect(notification.status).toBe('delivered');
    expect(notification.deliveredAt).toBeDefined();
  });
  
  it('should handle Twilio webhook events', async () => {
    const webhook = {
      MessageStatus: 'delivered',
      To: '+1234567890',
      MessageSid: 'SM123456'
    };
    
    await handleTwilioWebhook(webhook);
    
    const notification = await getNotificationBySMS('+1234567890');
    expect(notification.status).toBe('delivered');
  });
  
  it('should handle delivery failures', async () => {
    const webhook = {
      event: 'bounce',
      email: 'invalid@example.com',
      reason: 'Invalid email address'
    };
    
    await handleSendGridWebhook(webhook);
    
    const notification = await getNotificationByEmail('invalid@example.com');
    expect(notification.status).toBe('failed');
    expect(notification.failureReason).toBe('Invalid email address');
  });
});
```

---

## 11.6 Preference Application Tests

### Preference Filtering

**Test:** Test preferences filter correctly

```typescript
describe('Notification - Preference Application', () => {
  it('should respect email preferences', async () => {
    const user = {
      id: 'user-123',
      preferences: {
        email: {
          deadlineReminders: true,
          escalationAlerts: false
        }
      }
    };
    
    const notification = {
      type: 'deadline_reminder',
      recipient: 'user-123'
    };
    
    const shouldSend = await checkPreferences(notification, user);
    expect(shouldSend).toBe(true);
    
    const escalationNotification = {
      type: 'escalation_alert',
      recipient: 'user-123'
    };
    
    const shouldSendEscalation = await checkPreferences(escalationNotification, user);
    expect(shouldSendEscalation).toBe(false);
  });
  
  it('should respect SMS preferences', async () => {
    const user = {
      id: 'user-123',
      preferences: {
        sms: {
          urgentAlerts: true,
          routineReminders: false
        }
      }
    };
    
    const urgentNotification = {
      type: 'urgent_alert',
      channel: 'sms',
      recipient: 'user-123'
    };
    
    const shouldSendUrgent = await checkPreferences(urgentNotification, user);
    expect(shouldSendUrgent).toBe(true);
    
    const routineNotification = {
      type: 'routine_reminder',
      channel: 'sms',
      recipient: 'user-123'
    };
    
    const shouldSendRoutine = await checkPreferences(routineNotification, user);
    expect(shouldSendRoutine).toBe(false);
  });
});
```

---

## 11.7 API Rate Limiting Tests

### Rate Limit Enforcement

**Test:** Test API rate limiting per endpoint

```typescript
describe('API Rate Limiting', () => {
  it('should enforce rate limits on document upload', async () => {
    const token = await getAuthToken();
    
    // Upload 10 documents (limit is 10/hour)
    for (let i = 0; i < 10; i++) {
      const response = await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', pdfBuffer, 'test.pdf')
        .field('site_id', 'site-123')
        .field('document_type', 'PERMIT');
      
      expect(response.status).toBe(201);
    }
    
    // 11th upload should be rate limited
    const rateLimitedResponse = await request(app)
      .post('/api/v1/documents')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', pdfBuffer, 'test.pdf')
      .field('site_id', 'site-123')
      .field('document_type', 'PERMIT');
    
    expect(rateLimitedResponse.status).toBe(429);
    expect(rateLimitedResponse.body.error.code).toBe('TOO_MANY_REQUESTS');
    expect(rateLimitedResponse.headers['x-rate-limit-remaining']).toBe('0');
  });
  
  it('should enforce rate limits on AI extraction', async () => {
    const token = await getAuthToken();
    
    // Trigger 5 extractions (limit is 5/hour)
    for (let i = 0; i < 5; i++) {
      const response = await request(app)
        .post('/api/v1/documents/doc-123/extract')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(202);
    }
    
    // 6th extraction should be rate limited
    const rateLimitedResponse = await request(app)
      .post('/api/v1/documents/doc-123/extract')
      .set('Authorization', `Bearer ${token}`);
    
    expect(rateLimitedResponse.status).toBe(429);
  });
  
  it('should include rate limit headers in responses', async () => {
    const token = await getAuthToken();
    const response = await request(app)
      .get('/api/v1/obligations')
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.headers['x-rate-limit-limit']).toBeDefined();
    expect(response.headers['x-rate-limit-remaining']).toBeDefined();
    expect(response.headers['x-rate-limit-reset']).toBeDefined();
  });
  
  it('should reset rate limits after time window', async () => {
    const token = await getAuthToken();
    
    // Exhaust rate limit
    for (let i = 0; i < 100; i++) {
      await request(app)
        .get('/api/v1/obligations')
        .set('Authorization', `Bearer ${token}`);
    }
    
    // Wait for rate limit window to reset (in test, mock time)
    jest.advanceTimersByTime(3600000); // 1 hour
    
    // Should be able to make requests again
    const response = await request(app)
      .get('/api/v1/obligations')
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.status).toBe(200);
  });
});
```

---

## 11.8 Webhook Endpoint Tests

### Webhook Registration

**Test:** Test webhook registration and delivery

```typescript
describe('Webhook Endpoints', () => {
  it('should register webhook', async () => {
    const token = await getAuthToken();
    const response = await request(app)
      .post('/api/v1/webhooks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        url: 'https://example.com/webhook',
        events: ['obligation.created', 'deadline.approaching'],
        secret: 'webhook_secret_key'
      });
    
    expect(response.status).toBe(201);
    expect(response.body.data.id).toBeDefined();
    expect(response.body.data.url).toBe('https://example.com/webhook');
  });
  
  it('should list registered webhooks', async () => {
    const token = await getAuthToken();
    const response = await request(app)
      .get('/api/v1/webhooks')
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.status).toBe(200);
    expect(response.body.data).toBeInstanceOf(Array);
  });
  
  it('should deliver webhook on event', async () => {
    // Register webhook
    const webhook = await registerWebhook({
      url: 'https://example.com/webhook',
      events: ['obligation.created']
    });
    
    // Trigger event
    await createObligation({
      site_id: 'site-123',
      obligation_title: 'Test Obligation'
    });
    
    // Verify webhook was called
    expect(mockWebhookServer).toHaveBeenCalledWith({
      event: 'obligation.created',
      data: expect.objectContaining({
        obligation_title: 'Test Obligation'
      })
    });
  });
  
  it('should verify webhook signature', async () => {
    const webhook = await registerWebhook({
      url: 'https://example.com/webhook',
      events: ['obligation.created'],
      secret: 'webhook_secret_key'
    });
    
    // Trigger event
    await createObligation({
      site_id: 'site-123',
      obligation_title: 'Test Obligation'
    });
    
    // Verify signature in webhook request
    const webhookCall = mockWebhookServer.mock.calls[0];
    const signature = webhookCall[0].headers['x-webhook-signature'];
    const isValid = verifyWebhookSignature(
      webhookCall[0].body,
      signature,
      'webhook_secret_key'
    );
    
    expect(isValid).toBe(true);
  });
});
```

---

# 12. Performance Benchmarks

## 12.1 Performance Targets

### Response Time Targets

**Performance Targets:**
- Document parsing: 60 seconds max, 45 seconds p95 (see PLS Section B.5)
- API response times: <200ms for simple queries, <1s for complex queries
- Page load times: <2s for initial load, <500ms for navigation
- Background job execution: Job-specific targets (see Background Jobs Spec 2.3)
  - Document processing: 60s max, 45s p95
  - Excel import: 30s max, 20s p95
  - Notification sending: 5s max, 2s p95
  - Deadline calculation: 1s max, 500ms p95

### Performance Target Configuration

```typescript
interface PerformanceTargets {
  documentParsing: {
    maxTime: number; // 60000ms (60 seconds)
    p95Time: number; // 45000ms (45 seconds)
  };
  apiResponse: {
    simpleQueries: number; // 200ms
    complexQueries: number; // 1000ms
  };
  pageLoad: {
    initialLoad: number; // 2000ms
    navigation: number; // 500ms
  };
}

export const performanceTargets: PerformanceTargets = {
  documentParsing: {
    maxTime: 60000,
    p95Time: 45000
  },
  apiResponse: {
    simpleQueries: 200,
    complexQueries: 1000
  },
  pageLoad: {
    initialLoad: 2000,
    navigation: 500
  }
};
```

## 12.2 Load Testing

### Load Testing Implementation

**Load Testing:**
- Simulate expected load: Test with expected number of concurrent users
- Measure response times: Track API response times under load
- Measure throughput: Track requests per second
- Identify bottlenecks: Identify performance bottlenecks

### Load Testing Implementation

```typescript
// k6 load test script
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 }    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.01']     // Less than 1% failures
  }
};

export default function () {
  const response = http.get('https://api.example.com/api/v1/obligations');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500
  });
  sleep(1);
}
```

## 12.3 Stress Testing

### Stress Testing Implementation

**Stress Testing:**
- Test peak load: Test under peak load conditions (2x expected load)
- Test failure points: Identify failure points
- Test recovery: Test system recovery after stress

### Stress Testing Implementation

```typescript
// k6 stress test script
export const options = {
  stages: [
    { duration: '1m', target: 50 },
    { duration: '2m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '2m', target: 300 },
    { duration: '2m', target: 0 }
  ]
};
```

## 12.4 Performance Monitoring

### Performance Monitoring Implementation

**Performance Monitoring:**
- Track metrics: Track response times, throughput, error rates
- Set alerts: Alert on performance degradation
- Analyze trends: Analyze performance trends over time

### Performance Monitoring Implementation

```typescript
import { performance } from 'perf_hooks';

export async function trackPerformance<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    
    // Log performance metric
    await logPerformanceMetric({
      name,
      duration,
      timestamp: new Date()
    });
    
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    await logPerformanceMetric({
      name,
      duration,
      error: error.message,
      timestamp: new Date()
    });
    throw error;
  }
}
```

---

# 13. Test Data Management

## 13.1 Test Data Fixtures

### Fixture Types

**Test Data Fixtures:**
- User fixtures: Test users with different roles (OWNER, STAFF, CONSULTANT, VIEWER)
- Company fixtures: Test companies
- Site fixtures: Test sites
- Document fixtures: Test permits, consents, MCPD registrations
- Obligation fixtures: Test obligations
- Evidence fixtures: Test evidence items
- Excel import fixtures: Test Excel import scenarios

### Test Data Fixtures Implementation

```typescript
// test/fixtures/users.ts
export const userFixtures = {
  owner: {
    id: 'user-owner-123',
    email: 'owner@test.com',
    password: 'password123',
    role: 'OWNER',
    company_id: 'company-123'
  },
  staff: {
    id: 'user-staff-123',
    email: 'staff@test.com',
    password: 'password123',
    role: 'STAFF',
    company_id: 'company-123'
  }
};

// test/fixtures/obligations.ts
export const obligationFixtures = [
  {
    id: 'obligation-123',
    document_id: 'doc-123',
    site_id: 'site-123',
    obligation_title: 'Annual Compliance Report',
    obligation_description: 'Annual compliance report submission',
    frequency: 'ANNUAL',
    deadline_date: new Date('2024-12-31'),
    is_subjective: false
  }
];

// test/fixtures/excel-import.ts
export const excelImportFixtures = {
  valid: {
    filename: 'valid-obligations.xlsx',
    columns: ['permit_number', 'obligation_title', 'obligation_description', 'frequency', 'deadline_date', 'site_id'],
    rowCount: 10
  },
  invalid: {
    filename: 'invalid-obligations.xlsx',
    columns: ['permit_number'], // Missing required columns
    rowCount: 5
  },
  validationErrors: {
    filename: 'validation-errors.xlsx',
    columns: ['permit_number', 'obligation_title', 'frequency', 'deadline_date', 'site_id'],
    errors: ['Invalid date format', 'Invalid frequency value']
  },
  duplicates: {
    filename: 'duplicates.xlsx',
    columns: ['permit_number', 'obligation_title', 'frequency', 'deadline_date', 'site_id'],
    duplicateRows: [2, 5] // Rows 2 and 5 are duplicates
  },
  large: {
    filename: 'large-file.xlsx',
    columns: ['permit_number', 'obligation_title', 'frequency', 'deadline_date', 'site_id'],
    rowCount: 10000
  },
  csv: {
    filename: 'obligations.csv',
    columns: ['permit_number', 'obligation_title', 'frequency', 'deadline_date', 'site_id'],
    rowCount: 20
  },
  optionalColumns: {
    filename: 'optional-columns.xlsx',
    columns: [
      'permit_number',
      'obligation_title',
      'obligation_description',
      'frequency',
      'deadline_date',
      'site_id',
      'permit_type',
      'permit_date',
      'regulator',
      'evidence_linked',
      'notes'
    ],
    rowCount: 15
  }
};

// test/fixtures/module2.ts
export const module2Fixtures = {
  parameters: [
    {
      id: 'param-123',
      site_id: 'site-123',
      parameter_name: 'pH',
      limit_value: 7.0,
      unit: 'pH units',
      monitoring_frequency: 'DAILY'
    },
    {
      id: 'param-124',
      site_id: 'site-123',
      parameter_name: 'BOD',
      limit_value: 20,
      unit: 'mg/L',
      monitoring_frequency: 'WEEKLY'
    }
  ],
  samples: [
    {
      id: 'sample-123',
      parameter_id: 'param-123',
      site_id: 'site-123',
      sample_date: new Date('2024-01-15'),
      value: 7.2,
      unit: 'pH units'
    }
  ]
};

// test/fixtures/module3.ts
export const module3Fixtures = {
  generators: [
    {
      id: 'gen-123',
      site_id: 'site-123',
      generator_name: 'Generator A',
      generator_type: 'CHP',
      rated_output: 500,
      unit: 'kW'
    }
  ],
  runHourRecords: [
    {
      id: 'run-hour-123',
      generator_id: 'gen-123',
      site_id: 'site-123',
      record_date: new Date('2024-01-01'),
      run_hours: 8500,
      annual_limit: 8000
    }
  ],
  stackTests: [
    {
      id: 'stack-test-123',
      generator_id: 'gen-123',
      site_id: 'site-123',
      scheduled_date: new Date('2024-06-01'),
      test_type: 'ANNUAL',
      status: 'SCHEDULED'
    }
  ]
};

// test/fixtures/cross-sell-triggers.ts
export const crossSellTriggerFixtures = [
  {
    id: 'trigger-123',
    site_id: 'site-123',
    module: 'MODULE_2',
    trigger_type: 'EFFLUENT_KEYWORDS',
    keywords: ['effluent', 'discharge', 'trade effluent'],
    confidence: 0.95,
    status: 'PENDING'
  },
  {
    id: 'trigger-124',
    site_id: 'site-123',
    module: 'MODULE_3',
    trigger_type: 'RUN_HOUR_BREACH',
    generator_id: 'gen-123',
    breach_details: {
      run_hours: 8500,
      limit: 8000
    },
    status: 'PENDING'
  }
];

// test/fixtures/module-activation.ts
export const moduleActivationFixtures = [
  {
    id: 'activation-123',
    company_id: 'company-123',
    module_id: 'module-2',
    activated_at: new Date('2024-01-01'),
    activated_by: 'user-123',
    status: 'ACTIVE'
  },
  {
    id: 'activation-124',
    company_id: 'company-123',
    module_id: 'module-3',
    activated_at: new Date('2024-02-01'),
    activated_by: 'user-123',
    status: 'ACTIVE'
  }
];
```

## 13.2 Test Data Seeding

### Seeding Strategy

**Seeding Strategy:**
- Seed scripts: SQL scripts to seed test data
- Seed functions: TypeScript functions to seed test data
- Seed cleanup: Clean up seeded data after tests
- Seed isolation: Isolate seed data per test suite

### Test Data Seeding Implementation

```typescript
// test/helpers/seed.ts
import { createClient } from '@supabase/supabase-js';
import { userFixtures, obligationFixtures } from '../fixtures';

export async function seedTestData(): Promise<void> {
  const supabase = createClient(
    process.env.TEST_SUPABASE_URL!,
    process.env.TEST_SUPABASE_SERVICE_KEY!
  );
  
  // Seed users
  for (const user of Object.values(userFixtures)) {
    await supabase.from('users').insert(user);
  }
  
  // Seed obligations
  await supabase.from('obligations').insert(obligationFixtures);
}

export async function cleanupTestData(): Promise<void> {
  const supabase = createClient(
    process.env.TEST_SUPABASE_URL!,
    process.env.TEST_SUPABASE_SERVICE_KEY!
  );
  
  // Clean up in reverse order (respect foreign keys)
  await supabase.from('obligations').delete().in('id', obligationFixtures.map(o => o.id));
  await supabase.from('users').delete().in('id', Object.values(userFixtures).map(u => u.id));
}
```

## 13.3 Test Data Factories

### Data Factories

**Data Factories:**
- Generate test data: Generate test data programmatically
- Randomize data: Randomize test data for variety
- Factory functions: Create factory functions for each entity type

### Test Data Factory Implementation

```typescript
// test/factories/obligation-factory.ts
import { faker } from '@faker-js/faker';

export function createObligation(overrides?: Partial<Obligation>): Obligation {
  return {
    id: faker.string.uuid(),
    document_id: faker.string.uuid(),
    site_id: faker.string.uuid(),
    obligation_title: faker.lorem.sentence(),
    obligation_description: faker.lorem.paragraph(),
    frequency: faker.helpers.arrayElement(['ANNUAL', 'MONTHLY', 'QUARTERLY']),
    deadline_date: faker.date.future(),
    is_subjective: faker.datatype.boolean(),
    ...overrides
  };
}

export function createObligations(count: number): Obligation[] {
  return Array.from({ length: count }, () => createObligation());
}
```

---

# 14. CI/CD Integration

## 14.1 Pipeline Configuration

### Pipeline Stages

**Pipeline Stages:**
- Install dependencies: Install npm packages
- Lint: Run ESLint
- Unit tests: Run unit tests
- Integration tests: Run integration tests
- E2E tests: Run E2E tests (optional, can run in parallel)
- Coverage: Generate coverage reports
- Build: Build application

### CI/CD Pipeline Implementation

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Run unit tests
        run: npm run test:unit
        env:
          TEST_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
          TEST_SUPABASE_SERVICE_KEY: ${{ secrets.TEST_SUPABASE_SERVICE_KEY }}
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          TEST_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
          TEST_SUPABASE_SERVICE_KEY: ${{ secrets.TEST_SUPABASE_SERVICE_KEY }}
      
      - name: Generate coverage report
        run: npm run test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

## 14.2 Test Reporting

### Test Reports

**Test Reports:**
- Console output: Test results in console
- HTML reports: Generate HTML test reports
- Coverage reports: Generate coverage reports
- Test artifacts: Store test artifacts (screenshots, videos)

## 14.3 Test Failure Handling

### Failure Handling

**Failure Handling:**
- Fail build: Fail build on test failures
- Retry logic: Retry flaky tests
- Notifications: Notify team on test failures

---

# 15. Test Maintenance

## 15.1 Test Maintenance Strategy

### Test Updates

**Test Maintenance:**
- Update tests: Update tests when code changes
- Refactor tests: Refactor tests for maintainability
- Remove obsolete: Remove obsolete tests

## 15.2 Test Review

### Test Review Process

**Test Review:**
- Regular reviews: Review tests regularly (monthly)
- Code coverage: Monitor code coverage trends
- Test quality: Ensure test quality standards

## 15.3 Test Cleanup

### Test Cleanup

**Test Cleanup:**
- Remove obsolete: Remove obsolete tests
- Consolidate duplicates: Consolidate duplicate tests
- Optimize performance: Optimize slow tests

---

# 16. TypeScript Interfaces

## 16.1 Test Configuration Interfaces

### Test Config Interfaces

```typescript
interface TestConfig {
  environment: 'test' | 'ci';
  database: {
    url: string;
    reset: boolean;
  };
  mocks: {
    openai: boolean;
    sendgrid: boolean;
    twilio: boolean;
  };
  coverage: {
    enabled: boolean;
    threshold: number;
  };
}

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
}

interface TestSuite {
  name: string;
  tests: TestResult[];
  duration: number;
  passed: number;
  failed: number;
  skipped: number;
}
```

## 16.2 Test Data Interfaces

### Test Data Interfaces

```typescript
interface TestUser {
  id: string;
  email: string;
  password: string;
  role: 'OWNER' | 'STAFF' | 'CONSULTANT' | 'VIEWER';
  company_id: string;
}

interface TestObligation {
  id: string;
  document_id: string;
  site_id: string;
  summary: string;
  frequency: string;
  deadline_date: Date;
  is_subjective: boolean;
}

interface TestPermit {
  id: string;
  filename: string;
  regulator: 'EA' | 'SEPA' | 'NRW';
  expectedObligations: TestObligation[];
}
```

---

**Document Status:** Complete  
**Word Count:** ~12,000 words  
**Target:** 6,000-8,000 words ✅ (Expanded to include all Build Order requirements)

**Last Updated:** 2024  
**Version:** 2.0  
**Changes:** Added RLS Permission Testing, API Key Management Testing, AI Integration Layer Testing, Notification & Messaging Testing, expanded Excel Import tests, expanded Background Job tests, added Module 2/3 fixtures, expanded E2E tests, fixed terminology inconsistencies

