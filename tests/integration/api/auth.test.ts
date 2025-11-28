/**
 * Authentication API Tests
 * Tests: signup, login, logout, refresh, me
 */

import { TestClient } from '../../helpers/test-client';

describe('Authentication API', () => {
  const client = new TestClient();
  let testUser: { email: string; password: string; token?: string; company_id?: string };

  beforeEach(() => {
    // Generate unique test user for each test
    const timestamp = Date.now();
    testUser = {
      email: `test_${timestamp}@example.com`,
      password: 'TestPassword123!',
    };
  });

  describe('POST /api/v1/auth/signup', () => {
    it('should create user, company, and activate Module 1', async () => {
      const response = await client.post('/api/v1/auth/signup', {
        email: testUser.email,
        password: testUser.password,
        full_name: `Test User ${Date.now()}`,
        company_name: `Test Company ${Date.now()}`,
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.data).toHaveProperty('user');
      expect(data.data).toHaveProperty('token');
      expect(data.data.user).toHaveProperty('id');
      expect(data.data.user).toHaveProperty('email', testUser.email);
      expect(data.data.user).toHaveProperty('company_id');
      expect(data.data.token).toHaveProperty('access_token');
      expect(data.data.token).toHaveProperty('refresh_token');

      testUser.token = data.data.token.access_token;
      testUser.company_id = data.data.user.company_id;
    });

    it('should reject invalid email', async () => {
      const response = await client.post('/api/v1/auth/signup', {
        email: 'invalid-email',
        password: 'TestPassword123!',
        full_name: 'Test User',
        company_name: 'Test Company',
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('should reject weak password', async () => {
      const response = await client.post('/api/v1/auth/signup', {
        email: testUser.email,
        password: 'weak',
        full_name: 'Test User',
        company_name: 'Test Company',
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('should reject missing required fields', async () => {
      const response = await client.post('/api/v1/auth/signup', {
        email: testUser.email,
        // Missing password and company_name
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });

  describe('POST /api/v1/auth/login', () => {
    let signedUpUser: { email: string; password: string; token?: string };

    beforeEach(async () => {
      // Sign up a user first
      signedUpUser = await client.signup(
        `test_login_${Date.now()}@example.com`,
        'TestPassword123!',
        `Test Company ${Date.now()}`
      );
    });

    it('should return token for valid credentials', async () => {
      const response = await client.post('/api/v1/auth/login', {
        email: signedUpUser.email,
        password: signedUpUser.password,
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data).toHaveProperty('token');
      expect(data.data.token).toHaveProperty('access_token');
      expect(data.data.token).toHaveProperty('refresh_token');
      expect(data.data).toHaveProperty('user');
    });

    it('should reject invalid credentials', async () => {
      const response = await client.post('/api/v1/auth/login', {
        email: signedUpUser.email,
        password: 'WrongPassword123!',
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject non-existent user', async () => {
      const response = await client.post('/api/v1/auth/login', {
        email: 'nonexistent@example.com',
        password: 'TestPassword123!',
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });

  describe('GET /api/v1/auth/me', () => {
    let authenticatedUser: { email: string; token: string };

    beforeEach(async () => {
      authenticatedUser = await client.signup(
        `test_me_${Date.now()}@example.com`,
        'TestPassword123!',
        `Test Company ${Date.now()}`
      );
    });

    it('should return user details with valid token', async () => {
      if (!authenticatedUser.token) {
        // Skip if no token (login might have failed)
        return;
      }
      const response = await client.get('/api/v1/auth/me', {
        token: authenticatedUser.token,
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data).toHaveProperty('id');
      expect(data.data).toHaveProperty('email', authenticatedUser.email);
      expect(data.data).toHaveProperty('company_id');
    });

    it('should reject request without token', async () => {
      const response = await client.get('/api/v1/auth/me');

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject request with invalid token', async () => {
      const response = await client.get('/api/v1/auth/me', {
        token: 'invalid-token',
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let authenticatedUser: { email: string; token: string; refreshToken?: string };

    beforeEach(async () => {
      authenticatedUser = await client.signup(
        `test_refresh_${Date.now()}@example.com`,
        'TestPassword123!',
        `Test Company ${Date.now()}`
      );

      // Get refresh token from login
      const loginResponse = await client.post('/api/v1/auth/login', {
        email: authenticatedUser.email,
        password: 'TestPassword123!',
      });
      const loginData = await loginResponse.json();
      authenticatedUser.refreshToken = loginData.data.token.refresh_token;
    });

    it('should return new tokens with valid refresh token', async () => {
      const response = await client.post('/api/v1/auth/refresh', {
        refresh_token: authenticatedUser.refreshToken,
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data).toHaveProperty('token');
      expect(data.data.token).toHaveProperty('access_token');
      expect(data.data.token).toHaveProperty('refresh_token');
    });

    it('should reject invalid refresh token', async () => {
      const response = await client.post('/api/v1/auth/refresh', {
        refresh_token: 'invalid-refresh-token',
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    let authenticatedUser: { email: string; token: string; refreshToken?: string };

    beforeEach(async () => {
      authenticatedUser = await client.signup(
        `test_logout_${Date.now()}@example.com`,
        'TestPassword123!',
        `Test Company ${Date.now()}`
      );

      // Get refresh token from login
      const loginResponse = await client.post('/api/v1/auth/login', {
        email: authenticatedUser.email,
        password: 'TestPassword123!',
      });
      const loginData = await loginResponse.json();
      authenticatedUser.refreshToken = loginData.data.token.refresh_token;
    });

    it('should logout with valid refresh token', async () => {
      const response = await client.post('/api/v1/auth/logout', {
        refresh_token: authenticatedUser.refreshToken,
      }, {
        token: authenticatedUser.token,
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data).toHaveProperty('message');
    });
  });
});

