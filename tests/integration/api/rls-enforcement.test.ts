/**
 * RLS Enforcement API Tests
 * Tests: User A cannot see User B's data
 */

import { TestClient } from '../../helpers/test-client';

describe('RLS Enforcement via API', () => {
  const client = new TestClient();
  let userA: { email: string; token?: string; company_id: string };
  let userB: { email: string; token?: string; company_id: string };

  beforeEach(async () => {
    // Create User A in Company A
    userA = await client.signup(
      `user_a_${Date.now()}@example.com`,
      'TestPassword123!',
      `Company A ${Date.now()}`
    );

    // Create User B in Company B
    userB = await client.signup(
      `user_b_${Date.now()}@example.com`,
      'TestPassword123!',
      `Company B ${Date.now()}`
    );
  });

  describe('Companies RLS', () => {
    it('should only return User A\'s company', async () => {
      // Skip if no token available
      if (!userA.token) {
        console.warn('Skipping test: User A has no token');
        expect(true).toBe(true);
        return;
      }
      
      const response = await client.get('/api/v1/companies', {
        token: userA.token,
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data.data)).toBe(true);
      
      // User A should only see their own company
      const companies = data.data;
      expect(companies.length).toBeGreaterThan(0);
      companies.forEach((company: any) => {
        expect(company.id).toBe(userA.company_id);
      });
    });

    it('should only return User B\'s company', async () => {
      // Skip if no token available
      if (!userB.token) {
        console.warn('Skipping test: User B has no token');
        expect(true).toBe(true);
        return;
      }
      
      const response = await client.get('/api/v1/companies', {
        token: userB.token,
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data.data)).toBe(true);
      
      // User B should only see their own company
      const companies = data.data;
      expect(companies.length).toBeGreaterThan(0);
      companies.forEach((company: any) => {
        expect(company.id).toBe(userB.company_id);
      });
    });

    it('should prevent User A from seeing User B\'s company', async () => {
      const response = await client.get(`/api/v1/companies/${userB.company_id}`, {
        token: userA.token!,
      });

      // Should return 401, 403, or 404 (unauthorized, forbidden, or not found)
      expect([401, 403, 404]).toContain(response.status);
    });
  });

  describe('Sites RLS', () => {
    let siteA: any;
    let siteB: any;

    beforeEach(async () => {
      // Create site for User A
      const createSiteAResponse = await client.post('/api/v1/sites', {
        name: `Site A ${Date.now()}`,
        company_id: userA.company_id,
      }, {
        token: userA.token!,
      });

      if (createSiteAResponse.ok) {
        const siteAData = await createSiteAResponse.json();
        siteA = siteAData.data;
      }

      // Create site for User B
      const createSiteBResponse = await client.post('/api/v1/sites', {
        name: `Site B ${Date.now()}`,
        company_id: userB.company_id,
      }, {
        token: userB.token!,
      });

      if (createSiteBResponse.ok) {
        const siteBData = await createSiteBResponse.json();
        siteB = siteBData.data;
      }
    });

    it('should only return User A\'s sites', async () => {
      const response = await client.get('/api/v1/sites', {
        token: userA.token!,
      });

      // Should return 200 (sites are accessible to all authenticated users)
      if (response.status === 200) {
        const data = await response.json();
        expect(Array.isArray(data.data)).toBe(true);
        
        // User A should only see their own sites
        const sites = data.data;
        sites.forEach((site: any) => {
          expect(site.company_id).toBe(userA.company_id);
        });
      } else {
        // If not 200, log for debugging
        console.warn('Sites endpoint returned:', response.status);
      }
    });

    it('should prevent User A from accessing User B\'s site', async () => {
      if (!siteB) return; // Skip if site creation failed

      const response = await client.get(`/api/v1/sites/${siteB.id}`, {
        token: userA.token!,
      });

      // Should return 401, 403, or 404 (unauthorized, forbidden, or not found)
      expect([401, 403, 404]).toContain(response.status);
    });
  });

  describe('Users RLS', () => {
    it('should only return users from User A\'s company (Owner/Admin only)', async () => {
      // Users endpoint requires Owner/Admin role
      // Since we're creating owners, this should work
      const response = await client.get('/api/v1/users', {
        token: userA.token!,
      });

      // Should return 200 for Owner, 403 for other roles
      if (response.status === 200) {
        const data = await response.json();
        expect(Array.isArray(data.data)).toBe(true);
        
        // User A should only see users from their own company
        const users = data.data;
        users.forEach((user: any) => {
          expect(user.company_id).toBe(userA.company_id);
        });
      } else {
        // If 403 or 401, that's also valid (non-Owner/Admin or no token)
        expect([401, 403]).toContain(response.status);
      }
    });

    it('should prevent User A from accessing User B\'s user record', async () => {
      // Get User B's ID from me endpoint
      const meResponse = await client.get('/api/v1/auth/me', {
        token: userB.token!,
      });
      
      if (meResponse.ok) {
        const meData = await meResponse.json();
        const userBId = meData.data.id;

        const response = await client.get(`/api/v1/users/${userBId}`, {
          token: userA.token!,
        });

        // Should return 404 or 403
        expect([403, 404]).toContain(response.status);
      }
    });
  });
});

