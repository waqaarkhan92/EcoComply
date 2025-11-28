/**
 * Pagination API Tests
 * Tests: cursor-based pagination for all list endpoints
 */

import { TestClient } from '../../helpers/test-client';

describe('Pagination API', () => {
  const client = new TestClient();
  let authenticatedUser: { token: string; company_id: string; site_id?: string };

  beforeEach(async () => {
    authenticatedUser = await client.signup(
      `test_pagination_${Date.now()}@example.com`,
      'TestPassword123!',
      `Test Company ${Date.now()}`
    );

    // Create a site for testing
    const siteResponse = await client.post('/api/v1/sites', {
      name: `Test Site ${Date.now()}`,
      company_id: authenticatedUser.company_id,
    }, {
      token: authenticatedUser.token!,
    });

    if (siteResponse.ok) {
      const siteData = await siteResponse.json();
      authenticatedUser.site_id = siteData.data.id;
    }
  });

  describe('Companies Pagination', () => {
    it('should return pagination object', async () => {
      const response = await client.get('/api/v1/companies?limit=10', {
        token: authenticatedUser.token!,
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('pagination');
      expect(data.pagination).toHaveProperty('limit');
      expect(data.pagination).toHaveProperty('has_more');
    });

    it('should respect limit parameter', async () => {
      const response = await client.get('/api/v1/companies?limit=5', {
        token: authenticatedUser.token!,
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.length).toBeLessThanOrEqual(5);
      expect(data.pagination.limit).toBe(5);
    });

    it('should handle cursor parameter', async () => {
      const firstResponse = await client.get('/api/v1/companies?limit=1', {
        token: authenticatedUser.token!,
      });

      expect(firstResponse.status).toBe(200);
      const firstData = await firstResponse.json();

      if (firstData.pagination?.cursor) {
        const secondResponse = await client.get(`/api/v1/companies?limit=1&cursor=${firstData.pagination.cursor}`, {
          token: authenticatedUser.token!,
        });

        expect(secondResponse.status).toBe(200);
        const secondData = await secondResponse.json();
        expect(secondData.data).toBeDefined();
      }
    });

    it('should enforce max limit of 100', async () => {
      const response = await client.get('/api/v1/companies?limit=200', {
        token: authenticatedUser.token!,
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.pagination.limit).toBeLessThanOrEqual(100);
    });
  });

  describe('Sites Pagination', () => {
    it('should return pagination object', async () => {
      const response = await client.get('/api/v1/sites?limit=10', {
        token: authenticatedUser.token!,
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('pagination');
      expect(data.pagination).toHaveProperty('limit');
      expect(data.pagination).toHaveProperty('has_more');
    });
  });

  describe('Obligations Pagination', () => {
    it('should return pagination object', async () => {
      const response = await client.get('/api/v1/obligations?limit=10', {
        token: authenticatedUser.token!,
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('pagination');
      expect(data.pagination).toHaveProperty('limit');
      expect(data.pagination).toHaveProperty('has_more');
    });
  });

  describe('Evidence Pagination', () => {
    it('should return pagination object', async () => {
      const response = await client.get('/api/v1/evidence?limit=10', {
        token: authenticatedUser.token!,
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('pagination');
      expect(data.pagination).toHaveProperty('limit');
      expect(data.pagination).toHaveProperty('has_more');
    });
  });

  describe('Documents Pagination', () => {
    it('should return pagination object', async () => {
      const response = await client.get('/api/v1/documents?limit=10', {
        token: authenticatedUser.token!,
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('pagination');
      expect(data.pagination).toHaveProperty('limit');
      expect(data.pagination).toHaveProperty('has_more');
    });
  });
});

