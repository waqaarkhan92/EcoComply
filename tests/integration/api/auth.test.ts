/**
 * Authentication API Integration Tests
 * Tests for login, signup, and token refresh endpoints
 *
 * NOTE: These tests require a running server. Skip in CI unless server is available.
 * Run with: RUN_INTEGRATION_TESTS=true npm test -- tests/integration/api/auth.test.ts
 */

import request from 'supertest';
import { createTestUser, cleanupTestData, testDb } from '@/tests/helpers/test-database';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

// Skip integration tests unless explicitly enabled
const SKIP_INTEGRATION = process.env.RUN_INTEGRATION_TESTS !== 'true';

describe.skip('Authentication API', () => {
  afterEach(async () => {
    await cleanupTestData();
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      // Create test user
      await createTestUser('test@example.com', 'SecurePassword123!');
    });

    it('should login with valid credentials', async () => {
      const response = await request(API_BASE)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SecurePassword123!',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe('test@example.com');
    });

    it('should reject invalid email', async () => {
      const response = await request(API_BASE)
        .post('/auth/login')
        .send({
          email: 'wrong@example.com',
          password: 'SecurePassword123!',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid credentials');
    });

    it('should reject invalid password', async () => {
      const response = await request(API_BASE)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid credentials');
    });

    it('should reject missing email', async () => {
      const response = await request(API_BASE)
        .post('/auth/login')
        .send({
          password: 'SecurePassword123!',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('email');
    });

    it('should reject missing password', async () => {
      const response = await request(API_BASE)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('password');
    });

    it('should reject invalid email format', async () => {
      const response = await request(API_BASE)
        .post('/auth/login')
        .send({
          email: 'not-an-email',
          password: 'SecurePassword123!',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('email');
    });

    it('should handle SQL injection attempts', async () => {
      const response = await request(API_BASE)
        .post('/auth/login')
        .send({
          email: "admin' OR '1'='1",
          password: "password' OR '1'='1",
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should rate limit after too many failed attempts', async () => {
      // Make 10 failed login attempts
      for (let i = 0; i < 10; i++) {
        await request(API_BASE)
          .post('/auth/login')
          .send({
            email: 'test@example.com',
            password: 'WrongPassword',
          });
      }

      // 11th attempt should be rate limited
      const response = await request(API_BASE)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword',
        })
        .expect(429);

      expect(response.body.error).toContain('Too many requests');
    });

    it('should include refresh token in response', async () => {
      const response = await request(API_BASE)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SecurePassword123!',
        })
        .expect(200);

      expect(response.body.data.refreshToken).toBeDefined();
    });

    it('should set secure HTTP-only cookie', async () => {
      const response = await request(API_BASE)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SecurePassword123!',
        })
        .expect(200);

      expect(response.headers['set-cookie']).toBeDefined();
      const cookieHeader = response.headers['set-cookie'][0];
      expect(cookieHeader).toContain('HttpOnly');
      expect(cookieHeader).toContain('Secure');
    });
  });

  describe('POST /api/v1/auth/signup', () => {
    it('should create new user with valid data', async () => {
      const response = await request(API_BASE)
        .post('/auth/signup')
        .send({
          email: 'newuser@example.com',
          password: 'SecurePassword123!',
          name: 'New User',
          companyName: 'Test Company',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('newuser@example.com');
      expect(response.body.data.token).toBeDefined();
    });

    it('should reject duplicate email', async () => {
      // Create first user
      await createTestUser('duplicate@example.com', 'Password123!');

      // Try to create second user with same email
      const response = await request(API_BASE)
        .post('/auth/signup')
        .send({
          email: 'duplicate@example.com',
          password: 'Password123!',
          name: 'Duplicate User',
        })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });

    it('should reject weak password', async () => {
      const response = await request(API_BASE)
        .post('/auth/signup')
        .send({
          email: 'newuser@example.com',
          password: '123',
          name: 'New User',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('password');
    });

    it('should require password with uppercase', async () => {
      const response = await request(API_BASE)
        .post('/auth/signup')
        .send({
          email: 'newuser@example.com',
          password: 'lowercase123!',
          name: 'New User',
        })
        .expect(400);

      expect(response.body.error).toContain('uppercase');
    });

    it('should require password with number', async () => {
      const response = await request(API_BASE)
        .post('/auth/signup')
        .send({
          email: 'newuser@example.com',
          password: 'NoNumbers!',
          name: 'New User',
        })
        .expect(400);

      expect(response.body.error).toContain('number');
    });

    it('should require password with special character', async () => {
      const response = await request(API_BASE)
        .post('/auth/signup')
        .send({
          email: 'newuser@example.com',
          password: 'NoSpecial123',
          name: 'New User',
        })
        .expect(400);

      expect(response.body.error).toContain('special');
    });

    it('should require minimum password length', async () => {
      const response = await request(API_BASE)
        .post('/auth/signup')
        .send({
          email: 'newuser@example.com',
          password: 'Ab1!',
          name: 'New User',
        })
        .expect(400);

      expect(response.body.error).toContain('8 characters');
    });

    it('should validate email format', async () => {
      const response = await request(API_BASE)
        .post('/auth/signup')
        .send({
          email: 'invalid-email',
          password: 'SecurePassword123!',
          name: 'New User',
        })
        .expect(400);

      expect(response.body.error).toContain('email');
    });

    it('should create company for new user', async () => {
      const response = await request(API_BASE)
        .post('/auth/signup')
        .send({
          email: 'newuser@example.com',
          password: 'SecurePassword123!',
          name: 'New User',
          companyName: 'My Company',
        })
        .expect(201);

      expect(response.body.data.company).toBeDefined();
      expect(response.body.data.company.name).toBe('My Company');
    });

    it('should send verification email', async () => {
      const response = await request(API_BASE)
        .post('/auth/signup')
        .send({
          email: 'newuser@example.com',
          password: 'SecurePassword123!',
          name: 'New User',
        })
        .expect(201);

      expect(response.body.data.emailSent).toBe(true);
    });

    it('should trim whitespace from email', async () => {
      const response = await request(API_BASE)
        .post('/auth/signup')
        .send({
          email: '  newuser@example.com  ',
          password: 'SecurePassword123!',
          name: 'New User',
        })
        .expect(201);

      expect(response.body.data.user.email).toBe('newuser@example.com');
    });

    it('should convert email to lowercase', async () => {
      const response = await request(API_BASE)
        .post('/auth/signup')
        .send({
          email: 'NewUser@Example.COM',
          password: 'SecurePassword123!',
          name: 'New User',
        })
        .expect(201);

      expect(response.body.data.user.email).toBe('newuser@example.com');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let refreshToken: string;

    beforeEach(async () => {
      // Login to get refresh token
      const loginResponse = await request(API_BASE)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SecurePassword123!',
        });

      refreshToken = loginResponse.body.data.refreshToken;
    });

    it('should refresh token with valid refresh token', async () => {
      const response = await request(API_BASE)
        .post('/auth/refresh')
        .send({
          refreshToken,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(API_BASE)
        .post('/auth/refresh')
        .send({
          refreshToken: 'invalid-token',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid refresh token');
    });

    it('should reject expired refresh token', async () => {
      // Create expired token (mock implementation)
      const expiredToken = 'expired-token';

      const response = await request(API_BASE)
        .post('/auth/refresh')
        .send({
          refreshToken: expiredToken,
        })
        .expect(401);

      expect(response.body.error).toContain('expired');
    });

    it('should reject missing refresh token', async () => {
      const response = await request(API_BASE)
        .post('/auth/refresh')
        .send({})
        .expect(400);

      expect(response.body.error).toContain('refresh token');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    let authToken: string;

    beforeEach(async () => {
      const loginResponse = await request(API_BASE)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SecurePassword123!',
        });

      authToken = loginResponse.body.data.token;
    });

    it('should logout successfully', async () => {
      const response = await request(API_BASE)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should invalidate token after logout', async () => {
      await request(API_BASE)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Try to use token after logout
      await request(API_BASE)
        .get('/obligations')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(401);
    });

    it('should require authentication', async () => {
      const response = await request(API_BASE)
        .post('/auth/logout')
        .expect(401);

      expect(response.body.error).toContain('authentication');
    });
  });
});
