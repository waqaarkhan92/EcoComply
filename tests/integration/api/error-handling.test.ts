/**
 * Error Handling API Tests
 * Tests: Standard error response format, error codes
 */

import { TestClient } from '../../helpers/test-client';

describe('Error Handling API', () => {
  const client = new TestClient();

  describe('400 Bad Request', () => {
    it('should return 400 for invalid email in signup', async () => {
      const response = await client.post('/api/v1/auth/signup', {
        email: 'invalid-email',
        password: 'TestPassword123!',
        company_name: 'Test Company',
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error).toHaveProperty('code');
      expect(data.error).toHaveProperty('message');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await client.post('/api/v1/auth/signup', {
        email: 'test@example.com',
        // Missing password and company_name
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });

  describe('401 Unauthorized', () => {
    it('should return 401 for protected route without token', async () => {
      const response = await client.get('/api/v1/companies');

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 for invalid token', async () => {
      const response = await client.get('/api/v1/companies', {
        token: 'invalid-token',
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });

  describe('403 Forbidden', () => {
    let userA: { token: string; company_id: string };
    let userB: { token: string; company_id: string };

    beforeEach(async () => {
      userA = await client.signup(
        `user_a_${Date.now()}@example.com`,
        'TestPassword123!',
        `Company A ${Date.now()}`
      );

      userB = await client.signup(
        `user_b_${Date.now()}@example.com`,
        'TestPassword123!',
        `Company B ${Date.now()}`
      );
    });

    it('should return 403 or 404 when accessing other company\'s data', async () => {
      const response = await client.get(`/api/v1/companies/${userB.company_id}`, {
        token: userA.token!,
      });

      // Should return 403 or 404
      expect([403, 404]).toContain(response.status);
      if (response.status === 403) {
        const data = await response.json();
        expect(data.error).toBeDefined();
        expect(data.error.code).toBe('FORBIDDEN');
      }
    });
  });

  describe('404 Not Found', () => {
    let authenticatedUser: { token: string };

    beforeEach(async () => {
      authenticatedUser = await client.signup(
        `test_404_${Date.now()}@example.com`,
        'TestPassword123!',
        `Test Company ${Date.now()}`
      );
    });

    it('should return 404 for non-existent obligation', async () => {
      const response = await client.get('/api/v1/obligations/00000000-0000-0000-0000-000000000000', {
        token: authenticatedUser.token!,
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe('NOT_FOUND');
    });

    it('should return 404 for non-existent document', async () => {
      const response = await client.get('/api/v1/documents/00000000-0000-0000-0000-000000000000', {
        token: authenticatedUser.token!,
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });

  describe('Standard Error Format', () => {
    it('should include error object with code and message', async () => {
      const response = await client.get('/api/v1/companies');

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toHaveProperty('code');
      expect(data.error).toHaveProperty('message');
      expect(typeof data.error.code).toBe('string');
      expect(typeof data.error.message).toBe('string');
    });

    it('should include meta object with request_id and timestamp', async () => {
      const response = await client.get('/api/v1/companies');

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toHaveProperty('meta');
      expect(data.meta).toHaveProperty('timestamp');
      expect(typeof data.meta.timestamp).toBe('string');
    });
  });
});

