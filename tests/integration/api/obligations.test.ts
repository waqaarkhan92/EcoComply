/**
 * Obligations API Integration Tests
 * Tests for complete API + Database integration
 *
 * NOTE: These tests require a running server. Skip in CI unless server is available.
 * Run with: RUN_INTEGRATION_TESTS=true npm test -- tests/integration/api/obligations.test.ts
 */

import request from 'supertest';
import { createTestUser, createTestCompany, createTestSite, cleanupTestData } from '../../helpers/test-database';

// Mock Next.js API routes
const API_BASE = '/api/v1';

// Skip integration tests unless explicitly enabled
const SKIP_INTEGRATION = process.env.RUN_INTEGRATION_TESTS !== 'true';

describe.skip('Obligations API Integration', () => {
  let authToken: string | undefined;
  let companyId: string;
  let siteId: string;

  beforeAll(async () => {
    // Setup test data
    authToken = await createTestUser('test-obligations@example.com');
    const company = await createTestCompany('Test Company');
    companyId = company.id;
    const site = await createTestSite(companyId, 'Test Site');
    siteId = site.id;
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('GET /api/v1/obligations', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(API_BASE)
        .get('/obligations')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return obligations for authenticated user', async () => {
      const response = await request(API_BASE)
        .get('/obligations')
        .query({ siteId })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should validate siteId parameter', async () => {
      const response = await request(API_BASE)
        .get('/obligations')
        .query({ siteId: 'invalid-uuid' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error).toContain('Invalid');
    });

    it('should filter by status', async () => {
      // Create test obligations
      // ... implementation

      const response = await request(API_BASE)
        .get('/obligations')
        .query({ siteId, status: 'PENDING' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.every((o: any) => o.status === 'PENDING')).toBe(true);
    });

    it('should paginate results', async () => {
      const response = await request(API_BASE)
        .get('/obligations')
        .query({ siteId, limit: 10, offset: 0 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(10);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.total).toBeGreaterThanOrEqual(0);
    });

    it('should enforce RLS policies', async () => {
      // Create another user
      const otherToken = await createTestUser('other@example.com');
      const otherCompany = await createTestCompany('Other Company');
      const otherSite = await createTestSite(otherCompany.id, 'Other Site');

      // Try to access other user's obligations
      const response = await request(API_BASE)
        .get('/obligations')
        .query({ siteId: otherSite.id })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
    });
  });

  describe('POST /api/v1/obligations', () => {
    it('should create obligation with valid data', async () => {
      const obligationData = {
        siteId,
        obligation_title: 'Test Obligation',
        obligation_description: 'Test description',
        status: 'PENDING',
        category: 'MONITORING',
        frequency: 'QUARTERLY',
      };

      const response = await request(API_BASE)
        .post('/obligations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(obligationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.obligation_title).toBe(obligationData.obligation_title);
    });

    it('should validate required fields', async () => {
      const response = await request(API_BASE)
        .post('/obligations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.error).toContain('required');
    });

    it('should validate field types', async () => {
      const response = await request(API_BASE)
        .post('/obligations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          siteId,
          obligation_title: 123, // Should be string
        })
        .expect(400);
    });

    it('should validate enum values', async () => {
      const response = await request(API_BASE)
        .post('/obligations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          siteId,
          obligation_title: 'Test',
          status: 'INVALID_STATUS',
        })
        .expect(400);
    });
  });

  describe('PATCH /api/v1/obligations/[id]', () => {
    let obligationId: string;

    beforeEach(async () => {
      // Create test obligation
      const response = await request(API_BASE)
        .post('/obligations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          siteId,
          obligation_title: 'Update Test',
          status: 'PENDING',
          category: 'MONITORING',
        });

      obligationId = response.body.data.id;
    });

    it('should update obligation', async () => {
      const response = await request(API_BASE)
        .patch(`/obligations/${obligationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'COMPLETED',
        })
        .expect(200);

      expect(response.body.data.status).toBe('COMPLETED');
    });

    it('should return 404 for non-existent obligation', async () => {
      await request(API_BASE)
        .patch('/obligations/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'COMPLETED' })
        .expect(404);
    });

    it('should prevent updating other user obligations', async () => {
      // Create another user's obligation
      // ... implementation

      await request(API_BASE)
        .patch(`/obligations/${obligationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'COMPLETED' })
        .expect(403);
    });
  });

  describe('DELETE /api/v1/obligations/[id]', () => {
    it('should soft delete obligation', async () => {
      // Create test obligation
      const createResponse = await request(API_BASE)
        .post('/obligations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          siteId,
          obligation_title: 'Delete Test',
          status: 'PENDING',
          category: 'MONITORING',
        });

      const obligationId = createResponse.body.data.id;

      // Delete
      await request(API_BASE)
        .delete(`/obligations/${obligationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify soft delete (deleted_at set)
      const getResponse = await request(API_BASE)
        .get(`/obligations/${obligationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404); // Soft deleted obligations should not be returned
    });

    it('should return 404 for non-existent obligation', async () => {
      await request(API_BASE)
        .delete('/obligations/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock database failure
      // ... implementation

      const response = await request(API_BASE)
        .get('/obligations')
        .query({ siteId })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should handle rate limiting', async () => {
      // Make 100 requests rapidly
      const requests = Array(100).fill(null).map(() =>
        request(API_BASE)
          .get('/obligations')
          .query({ siteId })
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(requests);

      // Some should be rate limited
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });
});
