/**
 * Consultant Control Centre API Tests
 * Tests for all consultant endpoints
 */

import { TestClient } from '../../helpers/test-client';
import { supabaseAdmin } from '@/lib/supabase/server';

describe('Consultant Control Centre API', () => {
  let testClient: TestClient;
  let consultantUser: any;
  let clientCompany: any;
  let clientSite: any;
  let assignmentId: string;

  beforeAll(async () => {
    testClient = new TestClient();

    // Clean up old test data
    const { TestCleanup } = await import('../../helpers/test-cleanup');
    await TestCleanup.cleanupOldTestData();

    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Create consultant user
    const consultantEmail = `consultant-${Date.now()}@test.com`;
    const consultantSignup = await testClient.signup(
      consultantEmail,
      'Test123!@#',
      undefined,
      'Test Consultant'
    );

    consultantUser = {
      id: consultantSignup.id,
      email: consultantSignup.email,
      company_id: consultantSignup.company_id,
    };

    // Add CONSULTANT role
    await supabaseAdmin.from('user_roles').insert({
      user_id: consultantUser.id,
      role: 'CONSULTANT',
    });

    // Update user plan to CONSULTANT
    await supabaseAdmin
      .from('users')
      .update({ subscription_tier: 'consultant' })
      .eq('id', consultantUser.id);

    // Store token for consultant
    const consultantToken = await testClient.login(consultantEmail, 'Test123!@#');
    consultantUser.token = consultantToken;

    // Create a client company (separate company)
    const { data: clientCompanyData, error: clientCompanyError } = await supabaseAdmin
      .from('companies')
      .insert({
        name: 'Test Client Company',
        subscription_tier: 'growth',
      })
      .select('id, name')
      .single();

    if (clientCompanyError || !clientCompanyData) {
      throw new Error('Failed to create client company');
    }

    clientCompany = clientCompanyData;

    // Create a site for the client company
    const { data: clientSiteData, error: clientSiteError } = await supabaseAdmin
      .from('sites')
      .insert({
        company_id: clientCompany.id,
        name: 'Test Client Site',
      })
      .select('id, name, company_id')
      .single();

    if (clientSiteError || !clientSiteData) {
      throw new Error('Failed to create client site');
    }

    clientSite = clientSiteData;

    // Create consultant assignment
    const { data: assignmentData, error: assignmentError } = await supabaseAdmin
      .from('consultant_client_assignments')
      .insert({
        consultant_id: consultantUser.id,
        client_company_id: clientCompany.id,
        status: 'ACTIVE',
        assigned_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (assignmentError || !assignmentData) {
      throw new Error('Failed to create consultant assignment');
    }

    assignmentId = assignmentData.id;
  });

  afterAll(async () => {
    // Cleanup
    if (assignmentId) {
      await supabaseAdmin
        .from('consultant_client_assignments')
        .delete()
        .eq('id', assignmentId);
    }
    if (clientSite) {
      await supabaseAdmin.from('sites').delete().eq('id', clientSite.id);
    }
    if (clientCompany) {
      await supabaseAdmin.from('companies').delete().eq('id', clientCompany.id);
    }
    if (consultantUser) {
      await supabaseAdmin.from('user_roles').delete().eq('user_id', consultantUser.id);
      await supabaseAdmin.from('users').delete().eq('id', consultantUser.id);
    }
  });

  describe('GET /api/v1/consultant/dashboard', () => {
    it('should return consultant dashboard with aggregated data', async () => {
      const response = await testClient.get('/api/v1/consultant/dashboard', {
        token: consultantUser.token,
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('total_clients');
      expect(data.data).toHaveProperty('active_clients');
      expect(data.data).toHaveProperty('total_sites');
      expect(data.data).toHaveProperty('compliance_overview');
      expect(data.data).toHaveProperty('recent_activity');
      expect(data.data).toHaveProperty('upcoming_deadlines');

      expect(data.data.total_clients).toBeGreaterThanOrEqual(1);
      expect(data.data.total_sites).toBeGreaterThanOrEqual(1);
    });

    it('should return empty dashboard if no clients assigned', async () => {
      // Create a new consultant with no assignments
      const newConsultantEmail = `consultant-empty-${Date.now()}@test.com`;
      const newConsultant = await testClient.signup(
        newConsultantEmail,
        'Test123!@#',
        undefined,
        'Empty Consultant'
      );

      await supabaseAdmin.from('user_roles').insert({
        user_id: newConsultant.id,
        role: 'CONSULTANT',
      });

      await testClient.login(newConsultantEmail, 'Test123!@#');

      const token = await testClient.login(newConsultantEmail, 'Test123!@#');
      const response = await testClient.get('/api/v1/consultant/dashboard', { token });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.total_clients).toBe(0);
      expect(data.data.total_sites).toBe(0);
    });

    it('should require CONSULTANT role', async () => {
      // Create a regular user (not consultant)
      const regularEmail = `regular-${Date.now()}@test.com`;
      await testClient.signup(regularEmail, 'Test123!@#', undefined, 'Regular User');
      await testClient.login(regularEmail, 'Test123!@#');

      const token = await testClient.login(regularEmail, 'Test123!@#');
      const response = await testClient.get('/api/v1/consultant/dashboard', { token });

      expect(response.status).toBe(403);
      const error = await response.json();
      expect(error.error.message).toContain('Insufficient permissions');
    });
  });

  describe('GET /api/v1/consultant/clients', () => {
    it('should return list of assigned clients', async () => {
      const token = await testClient.login(consultantUser.email, 'Test123!@#');
      const response = await testClient.get('/api/v1/consultant/clients', { token });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('data');
      expect(Array.isArray(data.data)).toBe(true);

      if (data.data.length > 0) {
        const client = data.data[0];
        expect(client).toHaveProperty('client_company_id');
        expect(client).toHaveProperty('company_name');
        expect(client).toHaveProperty('status');
        expect(client).toHaveProperty('site_count');
        expect(client).toHaveProperty('compliance_summary');
      }
    });

    it('should filter by status', async () => {
      const token = await testClient.login(consultantUser.email, 'Test123!@#');
      const response = await testClient.get('/api/v1/consultant/clients?status=ACTIVE', { token });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.every((c: any) => c.status === 'ACTIVE')).toBe(true);
    });
  });

  describe('GET /api/v1/consultant/clients/{clientId}', () => {
    it('should return client details for assigned client', async () => {
      const token = await testClient.login(consultantUser.email, 'Test123!@#');
      const response = await testClient.get(`/api/v1/consultant/clients/${clientCompany.id}`, { token });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data).toHaveProperty('company_id', clientCompany.id);
      expect(data.data).toHaveProperty('company_name');
      expect(data.data).toHaveProperty('site_count');
      expect(data.data).toHaveProperty('sites');
      expect(data.data).toHaveProperty('compliance_summary');
      expect(data.data).toHaveProperty('upcoming_deadlines');
    });

    it('should return 403 for unassigned client', async () => {
      // Create another company that consultant is not assigned to
      const { data: otherCompany } = await supabaseAdmin
        .from('companies')
        .insert({
          name: 'Other Company',
          subscription_tier: 'core',
        })
        .select('id')
        .single();

      const token = await testClient.login(consultantUser.email, 'Test123!@#');
      const response = await testClient.get(`/api/v1/consultant/clients/${otherCompany.id}`, { token });

      expect(response.status).toBe(403);
      const error = await response.json();
      expect(error.error.message).toContain('not assigned');

      // Cleanup
      await supabaseAdmin.from('companies').delete().eq('id', otherCompany.id);
    });
  });

  describe('POST /api/v1/consultant/clients/{clientId}/packs', () => {
    it('should generate pack for assigned client', async () => {
      const token = await testClient.login(consultantUser.email, 'Test123!@#');
      const response = await testClient.post(
        `/api/v1/consultant/clients/${clientCompany.id}/packs`,
        {
          pack_type: 'AUDIT_PACK',
          site_id: clientSite.id,
          date_range_start: '2025-01-01',
          date_range_end: '2025-12-31',
          recipient_name: 'Test Recipient',
        },
        { token }
      );

      expect(response.status).toBe(202);
      const data = await response.json();
      expect(data.data).toHaveProperty('pack_id');
      expect(data.data).toHaveProperty('pack_type', 'AUDIT_PACK');
      expect(data.data).toHaveProperty('status', 'PENDING');
    });

    it('should reject Board Pack generation', async () => {
      const token = await testClient.login(consultantUser.email, 'Test123!@#');
      const response = await testClient.post(
        `/api/v1/consultant/clients/${clientCompany.id}/packs`,
        {
          pack_type: 'BOARD_MULTI_SITE_RISK',
          site_id: clientSite.id,
        },
        { token }
      );

      expect(response.status).toBe(403);
      const error = await response.json();
      expect(error.error.message).toContain('cannot generate Board Packs');
    });

    it('should require ACTIVE assignment', async () => {
      // Create another company without assignment
      const { data: unassignedCompany } = await supabaseAdmin
        .from('companies')
        .insert({
          name: 'Unassigned Company',
          subscription_tier: 'core',
        })
        .select('id')
        .single();

      const { data: unassignedSite } = await supabaseAdmin
        .from('sites')
        .insert({
          company_id: unassignedCompany.id,
          name: 'Unassigned Site',
        })
        .select('id')
        .single();

      const token = await testClient.login(consultantUser.email, 'Test123!@#');
      const response = await testClient.post(
        `/api/v1/consultant/clients/${unassignedCompany.id}/packs`,
        {
          pack_type: 'AUDIT_PACK',
          site_id: unassignedSite.id,
        },
        { token }
      );

      expect(response.status).toBe(403);
      const error = await response.json();
      expect(error.error.message).toContain('not assigned');

      // Cleanup
      await supabaseAdmin.from('sites').delete().eq('id', unassignedSite.id);
      await supabaseAdmin.from('companies').delete().eq('id', unassignedCompany.id);
    });

    it('should validate required fields', async () => {
      const token = await testClient.login(consultantUser.email, 'Test123!@#');
      const response = await testClient.post(
        `/api/v1/consultant/clients/${clientCompany.id}/packs`,
        {
          // Missing pack_type and site_id
        },
        { token }
      );

      expect(response.status).toBe(422);
    });
  });

  describe('POST /api/v1/companies/{companyId}/consultants/assign', () => {
    let ownerUser: any;
    let ownerCompany: any;

    beforeAll(async () => {
      // Create owner user and company
      const ownerEmail = `owner-${Date.now()}@test.com`;
      const ownerSignup = await testClient.signup(
        ownerEmail,
        'Test123!@#',
        undefined,
        'Test Owner'
      );

      ownerUser = {
        id: ownerSignup.id,
        email: ownerSignup.email,
        company_id: ownerSignup.company_id,
      };

      // Get owner's company
      const { data: ownerCompanyData } = await supabaseAdmin
        .from('companies')
        .select('id, name')
        .eq('id', ownerUser.company_id)
        .single();

      ownerCompany = ownerCompanyData;

      // Add OWNER role
      await supabaseAdmin.from('user_roles').insert({
        user_id: ownerUser.id,
        role: 'OWNER',
      });

      await testClient.login(ownerEmail, 'Test123!@#');
    });

    afterAll(async () => {
      if (ownerUser) {
        await supabaseAdmin.from('user_roles').delete().eq('user_id', ownerUser.id);
      }
    });

    it('should assign consultant to company', async () => {
      const token = await testClient.login(ownerUser.email, 'Test123!@#');
      const response = await testClient.post(
        `/api/v1/companies/${ownerCompany.id}/consultants/assign`,
        {
          consultant_email: consultantUser.email,
        },
        { token }
      );

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.data).toHaveProperty('assignment_id');
      expect(data.data).toHaveProperty('status', 'ACTIVE');

      // Cleanup assignment
      await supabaseAdmin
        .from('consultant_client_assignments')
        .delete()
        .eq('consultant_id', consultantUser.id)
        .eq('client_company_id', ownerCompany.id);
    });

    it('should require OWNER or ADMIN role', async () => {
      // Login as regular user
      const regularEmail = `regular-assign-${Date.now()}@test.com`;
      await testClient.signup(regularEmail, 'Test123!@#', undefined, 'Regular User');
      const token = await testClient.login(regularEmail, 'Test123!@#');

      const response = await testClient.post(
        `/api/v1/companies/${ownerCompany.id}/consultants/assign`,
        {
          consultant_email: consultantUser.email,
        },
        { token }
      );

      expect(response.status).toBe(403);
    });

    it('should validate consultant exists', async () => {
      const token = await testClient.login(ownerUser.email, 'Test123!@#');
      const response = await testClient.post(
        `/api/v1/companies/${ownerCompany.id}/consultants/assign`,
        {
          consultant_email: 'nonexistent@test.com',
        },
        { token }
      );

      expect(response.status).toBe(404);
    });

    it('should validate user is a consultant', async () => {
      // Create a regular user (not consultant)
      const regularEmail = `regular-not-consultant-${Date.now()}@test.com`;
      await testClient.signup(regularEmail, 'Test123!@#', undefined, 'Regular User');

      const token = await testClient.login(ownerUser.email, 'Test123!@#');
      const response = await testClient.post(
        `/api/v1/companies/${ownerCompany.id}/consultants/assign`,
        {
          consultant_email: regularEmail,
        },
        { token }
      );

      expect(response.status).toBe(422);
      const error = await response.json();
      expect(error.error.message).toContain('not a consultant');
    });
  });
});

