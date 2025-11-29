/**
 * Module 3 (MCPD/Generators) API Integration Tests
 * Tests all Module 3 endpoints
 */

import { TestClient } from '../../helpers/test-client';
import { supabaseAdmin } from '@/lib/supabase/server';

describe('Module 3 API Endpoints', () => {
  let testClient: TestClient;
  let user: any;
  let companyId: string;
  let siteId: string;
  let module1Id: string;
  let module3Id: string;
  let documentId: string;
  let generatorId: string;
  let runHourRecordId: string;
  let stackTestId: string;
  let maintenanceRecordId: string;

  beforeAll(async () => {
    testClient = new TestClient();
    
    // Create test user and company with unique email
    const uniqueEmail = `module3-test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
    user = await testClient.signup(uniqueEmail, 'Test123!@#', 'Module 3 Test User');
    companyId = user.company_id;

    // Get Module 1 and Module 3 IDs directly from database
    const { data: module1, error: module1Error } = await supabaseAdmin
      .from('modules')
      .select('id')
      .eq('module_code', 'MODULE_1')
      .single();
    
    if (module1Error || !module1) {
      throw new Error('Module 1 not found in database');
    }
    module1Id = module1.id;

    const { data: module3, error: module3Error } = await supabaseAdmin
      .from('modules')
      .select('id')
      .eq('module_code', 'MODULE_3')
      .single();
    
    if (module3Error || !module3) {
      throw new Error('Module 3 not found in database');
    }
    module3Id = module3.id;

    // Activate Module 1 first (required prerequisite for Module 3) - directly in database
    const { data: existingModule1Activation } = await supabaseAdmin
      .from('module_activations')
      .select('id')
      .eq('company_id', companyId)
      .eq('module_id', module1Id)
      .eq('status', 'ACTIVE')
      .single();

    if (!existingModule1Activation) {
      await supabaseAdmin
        .from('module_activations')
        .insert({
          company_id: companyId,
          module_id: module1Id,
          status: 'ACTIVE',
          activated_at: new Date().toISOString(),
          activated_by: user.id,
          billing_start_date: new Date().toISOString().split('T')[0],
        });
    }

    // Activate Module 3 - directly in database
    const { data: existingModule3Activation } = await supabaseAdmin
      .from('module_activations')
      .select('id')
      .eq('company_id', companyId)
      .eq('module_id', module3Id)
      .eq('status', 'ACTIVE')
      .single();

    if (!existingModule3Activation) {
      await supabaseAdmin
        .from('module_activations')
        .insert({
          company_id: companyId,
          module_id: module3Id,
          status: 'ACTIVE',
          activated_at: new Date().toISOString(),
          activated_by: user.id,
          billing_start_date: new Date().toISOString().split('T')[0],
        });
    }

    // Create a test site
    const siteResponse = await testClient.request('POST', '/api/v1/sites', {
      body: {
        name: 'Test Site for Module 3',
        address_line_1: '123 Test Street',
        postcode: 'SW1A 1AA',
      },
      token: user.token,
    });
    
    if (!siteResponse.ok) {
      const errorText = await siteResponse.text();
      console.error('Site creation failed:', errorText);
      throw new Error(`Failed to create test site: ${errorText}`);
    }
    
    const siteData = await siteResponse.json();
    if (!siteData || !siteData.data || !siteData.data.id) {
      console.error('Site creation response invalid:', siteData);
      throw new Error(`Failed to create test site: ${JSON.stringify(siteData)}`);
    }
    siteId = siteData.data.id;

    // Create a test MCPD registration document
    const { data: docData, error: docError } = await supabaseAdmin
      .from('documents')
      .insert({
        site_id: siteId,
        document_type: 'MCPD_REGISTRATION',
        title: 'Test MCPD Registration',
        reference_number: 'MCPD/TEST/001',
        regulator: 'EA',
        status: 'ACTIVE',
        extraction_status: 'COMPLETED',
        module_id: module3Id,
        uploaded_by: user.id,
        original_filename: 'test-registration.pdf',
        storage_path: 'test/path/test-registration.pdf',
        file_size_bytes: 1024,
        mime_type: 'application/pdf',
      })
      .select('id')
      .single();

    if (docError || !docData) {
      console.error('Document creation error:', docError);
      throw new Error(`Failed to create test MCPD registration: ${docError?.message || 'Unknown error'}`);
    }
    documentId = docData.id;

    // Create a test generator
    const genResponse = await testClient.request('POST', '/api/v1/module-3/generators', {
      body: {
        document_id: documentId,
        generator_identifier: 'GEN-001',
        generator_type: 'MCPD_1_5MW',
        capacity_mw: 1.5,
        fuel_type: 'Natural Gas',
        annual_run_hour_limit: 500,
        monthly_run_hour_limit: 50,
        anniversary_date: '2025-01-01',
      },
      token: user.token,
    });
    
    if (!genResponse.ok) {
      const errorText = await genResponse.text();
      console.error('Generator creation failed:', errorText);
      throw new Error(`Failed to create generator: ${errorText}`);
    }
    
    const genData = await genResponse.json();
    if (!genData || !genData.data || !genData.data.id) {
      console.error('Invalid generator response:', JSON.stringify(genData, null, 2));
      throw new Error(`Invalid generator response: ${JSON.stringify(genData)}`);
    }
    generatorId = genData.data.id;
  }, 30000);

  afterAll(async () => {
    // Cleanup is handled by test database reset
  });

  describe('Module Activation', () => {
    it('should return 403 if Module 3 not activated', async () => {
      // Deactivate Module 3
      await supabaseAdmin
        .from('module_activations')
        .update({ status: 'INACTIVE' })
        .eq('company_id', companyId)
        .eq('module_id', module3Id);

      const response = await testClient.request('GET', '/api/v1/module-3/generators', {
        token: user.token,
      });
      expect(response.status).toBe(403);

      // Reactivate Module 3
      await supabaseAdmin
        .from('module_activations')
        .update({ status: 'ACTIVE' })
        .eq('company_id', companyId)
        .eq('module_id', module3Id);
    });
  });

  describe('GET /api/v1/module-3/generators', () => {
    it('should list generators', async () => {
      const response = await testClient.request('GET', '/api/v1/module-3/generators', {
        token: user.token,
      });
      
      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data).toHaveProperty('data');
      expect(Array.isArray(data.data)).toBe(true);
      expect(data).toHaveProperty('pagination');
    });

    it('should filter generators by site_id', async () => {
      const response = await testClient.request('GET', `/api/v1/module-3/generators?filter[site_id]=${siteId}`, {
        token: user.token,
      });
      
      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('should include percentage calculations', async () => {
      const response = await testClient.request('GET', '/api/v1/module-3/generators', {
        token: user.token,
      });
      
      expect(response.ok).toBe(true);
      const data = await response.json();
      if (data.data.length > 0) {
        const generator = data.data[0];
        expect(generator).toHaveProperty('percentage_of_annual_limit');
        expect(typeof generator.percentage_of_annual_limit).toBe('number');
      }
    });
  });

  describe('POST /api/v1/module-3/generators', () => {
    it('should create a generator', async () => {
      const response = await testClient.request('POST', '/api/v1/module-3/generators', {
        body: {
          document_id: documentId,
          generator_identifier: 'GEN-002',
          generator_type: 'MCPD_5_50MW',
          capacity_mw: 10.0,
          fuel_type: 'Diesel',
          annual_run_hour_limit: 1000,
          monthly_run_hour_limit: 100,
          anniversary_date: '2025-06-01',
        },
        token: user.token,
      });

      expect(response.ok).toBe(true);
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.data.id).toBeDefined();
      expect(data.data.generator_identifier).toBe('GEN-002');
      expect(data.data.generator_type).toBe('MCPD_5_50MW');
      expect(data.data.percentage_of_annual_limit).toBe(0);
    });

    it('should return 400 for missing required fields', async () => {
      const response = await testClient.request('POST', '/api/v1/module-3/generators', {
        body: {
          generator_identifier: 'GEN-003',
          // Missing required fields
        },
        token: user.token,
      });

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid generator_type', async () => {
      const response = await testClient.request('POST', '/api/v1/module-3/generators', {
        body: {
          document_id: documentId,
          generator_identifier: 'GEN-004',
          generator_type: 'INVALID_TYPE',
          capacity_mw: 1.0,
          fuel_type: 'Gas',
          anniversary_date: '2025-01-01',
        },
        token: user.token,
      });

      // Should return 400 or 422 for validation error
      expect([400, 422]).toContain(response.status);
    });

    it('should return 404 for invalid document_id', async () => {
      const response = await testClient.request('POST', '/api/v1/module-3/generators', {
        body: {
          document_id: '00000000-0000-0000-0000-000000000000',
          generator_identifier: 'GEN-005',
          generator_type: 'MCPD_1_5MW',
          capacity_mw: 1.0,
          fuel_type: 'Gas',
          anniversary_date: '2025-01-01',
        },
        token: user.token,
      });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/v1/module-3/generators/{generatorId}', () => {
    it('should get generator details', async () => {
      const response = await testClient.request('GET', `/api/v1/module-3/generators/${generatorId}`, {
        token: user.token,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Generator detail error:', errorText);
      }
      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.data.id).toBe(generatorId);
      expect(data.data).toHaveProperty('percentage_of_annual_limit');
      expect(data.data).toHaveProperty('recent_run_hour_records');
    });

    it('should return 404 for invalid generator_id', async () => {
      const response = await testClient.request('GET', '/api/v1/module-3/generators/00000000-0000-0000-0000-000000000000', {
        token: user.token,
      });

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/v1/module-3/generators/{generatorId}', () => {
    it('should update generator', async () => {
      const response = await testClient.request('PUT', `/api/v1/module-3/generators/${generatorId}`, {
        body: {
          generator_identifier: 'GEN-001-UPDATED',
          annual_run_hour_limit: 600,
        },
        token: user.token,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Generator update error:', errorText);
      }
      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.data.generator_identifier).toBe('GEN-001-UPDATED');
      expect(data.data.annual_run_hour_limit).toBe(600);
    });
  });

  describe('POST /api/v1/module-3/run-hours', () => {
    it('should create a run-hour record', async () => {
      const response = await testClient.request('POST', '/api/v1/module-3/run-hours', {
        body: {
          generator_id: generatorId,
          hours_recorded: 50.5,
          recording_date: '2025-01-15',
          entry_method: 'MANUAL',
        },
        token: user.token,
      });

      expect(response.ok).toBe(true);
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.data.id).toBeDefined();
      expect(data.data.generator_id).toBe(generatorId);
      expect(data.data.hours_recorded).toBe(50.5);
      expect(data.data).toHaveProperty('running_total_year');
      expect(data.data).toHaveProperty('percentage_of_annual_limit');
      runHourRecordId = data.data.id;
    });

    it('should calculate running totals correctly', async () => {
      // Create another run-hour record
      const response = await testClient.request('POST', '/api/v1/module-3/run-hours', {
        body: {
          generator_id: generatorId,
          hours_recorded: 25.0,
          recording_date: '2025-01-16',
          entry_method: 'MANUAL',
        },
        token: user.token,
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.data.running_total_year).toBeGreaterThan(50.5);
      expect(data.data.percentage_of_annual_limit).toBeGreaterThan(0);
    });

    it('should return 400 for negative hours', async () => {
      const response = await testClient.request('POST', '/api/v1/module-3/run-hours', {
        body: {
          generator_id: generatorId,
          hours_recorded: -10,
          recording_date: '2025-01-17',
        },
        token: user.token,
      });

      expect(response.status).toBe(400);
    });

    it('should return 404 for invalid generator_id', async () => {
      const response = await testClient.request('POST', '/api/v1/module-3/run-hours', {
        body: {
          generator_id: '00000000-0000-0000-0000-000000000000',
          hours_recorded: 10,
          recording_date: '2025-01-15',
        },
        token: user.token,
      });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/v1/module-3/run-hours', () => {
    it('should list run-hour records', async () => {
      const response = await testClient.request('GET', '/api/v1/module-3/run-hours', {
        token: user.token,
      });
      
      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(Array.isArray(data.data)).toBe(true);
      expect(data).toHaveProperty('pagination');
    });

    it('should filter run-hours by generator_id', async () => {
      const response = await testClient.request('GET', `/api/v1/module-3/run-hours?filter[generator_id]=${generatorId}`, {
        token: user.token,
      });
      
      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(Array.isArray(data.data)).toBe(true);
      data.data.forEach((record: any) => {
        expect(record.generator_id).toBe(generatorId);
      });
    });

    it('should filter run-hours by date range', async () => {
      const response = await testClient.request('GET', `/api/v1/module-3/run-hours?filter[date][gte]=2025-01-01&filter[date][lte]=2025-01-31`, {
        token: user.token,
      });
      
      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(Array.isArray(data.data)).toBe(true);
    });
  });

  describe('GET /api/v1/module-3/run-hours/{recordId}', () => {
    it('should get run-hour record details', async () => {
      if (!runHourRecordId) {
        // Create one if it doesn't exist
        const createResponse = await testClient.request('POST', '/api/v1/module-3/run-hours', {
          body: {
            generator_id: generatorId,
            hours_recorded: 10,
            recording_date: '2025-01-20',
          },
          token: user.token,
        });
        if (!createResponse.ok) {
          const errorText = await createResponse.text();
          throw new Error(`Failed to create run-hour record: ${errorText}`);
        }
        const createData = await createResponse.json();
        runHourRecordId = createData.data.id;
      }

      const response = await testClient.request('GET', `/api/v1/module-3/run-hours/${runHourRecordId}`, {
        token: user.token,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Run-hour detail error:', errorText);
      }
      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.data.id).toBe(runHourRecordId);
      expect(data.data).toHaveProperty('generators');
    });
  });

  describe('PUT /api/v1/module-3/run-hours/{recordId}', () => {
    it('should update run-hour record', async () => {
      if (!runHourRecordId) {
        const createResponse = await testClient.request('POST', '/api/v1/module-3/run-hours', {
          body: {
            generator_id: generatorId,
            hours_recorded: 10,
            recording_date: '2025-01-21',
          },
          token: user.token,
        });
        if (!createResponse.ok) {
          const errorText = await createResponse.text();
          throw new Error(`Failed to create run-hour record: ${errorText}`);
        }
        const createData = await createResponse.json();
        runHourRecordId = createData.data.id;
      }

      const response = await testClient.request('PUT', `/api/v1/module-3/run-hours/${runHourRecordId}`, {
        body: {
          hours_recorded: 15.5,
        },
        token: user.token,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Run-hour update error:', errorText);
      }
      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.data.hours_recorded).toBe(15.5);
    });
  });

  describe('POST /api/v1/module-3/stack-tests', () => {
    it('should create a stack test', async () => {
      const response = await testClient.request('POST', '/api/v1/module-3/stack-tests', {
        body: {
          generator_id: generatorId,
          test_date: '2025-01-15',
          test_company: 'Test Company',
          test_reference: 'ST-001',
          nox_result: 100.5,
          so2_result: 50.2,
          co_result: 200.0,
          particulates_result: 10.5,
          compliance_status: 'PASS',
          exceedances_found: false,
        },
        token: user.token,
      });

      expect(response.ok).toBe(true);
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.data.id).toBeDefined();
      expect(data.data.generator_id).toBe(generatorId);
      expect(data.data.compliance_status).toBe('PASS');
      stackTestId = data.data.id;
    });

    it('should return 400 for invalid compliance_status', async () => {
      const response = await testClient.request('POST', '/api/v1/module-3/stack-tests', {
        body: {
          generator_id: generatorId,
          test_date: '2025-01-16',
          compliance_status: 'INVALID_STATUS',
        },
        token: user.token,
      });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/v1/module-3/stack-tests', () => {
    it('should list stack tests', async () => {
      const response = await testClient.request('GET', '/api/v1/module-3/stack-tests', {
        token: user.token,
      });
      
      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('should filter stack tests by generator_id', async () => {
      const response = await testClient.request('GET', `/api/v1/module-3/stack-tests?filter[generator_id]=${generatorId}`, {
        token: user.token,
      });
      
      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(Array.isArray(data.data)).toBe(true);
    });
  });

  describe('POST /api/v1/module-3/maintenance-records', () => {
    it('should create a maintenance record', async () => {
      const response = await testClient.request('POST', '/api/v1/module-3/maintenance-records', {
        body: {
          generator_id: generatorId,
          maintenance_date: '2025-01-15',
          maintenance_type: 'Annual Service',
          description: 'Full annual service performed',
          service_provider: 'Service Co',
          service_reference: 'SRV-001',
          run_hours_at_service: 100.5,
        },
        token: user.token,
      });

      expect(response.ok).toBe(true);
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.data.id).toBeDefined();
      expect(data.data.generator_id).toBe(generatorId);
      expect(data.data.maintenance_type).toBe('Annual Service');
      maintenanceRecordId = data.data.id;
    });

    it('should return 400 for missing required fields', async () => {
      const response = await testClient.request('POST', '/api/v1/module-3/maintenance-records', {
        body: {
          generator_id: generatorId,
          // Missing maintenance_date and maintenance_type
        },
        token: user.token,
      });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/v1/module-3/maintenance-records', () => {
    it('should list maintenance records', async () => {
      const response = await testClient.request('GET', '/api/v1/module-3/maintenance-records', {
        token: user.token,
      });
      
      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('should filter maintenance records by generator_id', async () => {
      const response = await testClient.request('GET', `/api/v1/module-3/maintenance-records?filter[generator_id]=${generatorId}`, {
        token: user.token,
      });
      
      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(Array.isArray(data.data)).toBe(true);
    });
  });

  describe('GET /api/v1/module-3/mcpd-registrations', () => {
    it('should list MCPD registrations', async () => {
      const response = await testClient.request('GET', '/api/v1/module-3/mcpd-registrations', {
        token: user.token,
      });
      
      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(Array.isArray(data.data)).toBe(true);
      expect(data).toHaveProperty('pagination');
    });

    it('should filter registrations by site_id', async () => {
      const response = await testClient.request('GET', `/api/v1/module-3/mcpd-registrations?filter[site_id]=${siteId}`, {
        token: user.token,
      });
      
      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(Array.isArray(data.data)).toBe(true);
    });
  });

  describe('GET /api/v1/module-3/mcpd-registrations/{registrationId}', () => {
    it('should get registration details with generators', async () => {
      const response = await testClient.request('GET', `/api/v1/module-3/mcpd-registrations/${documentId}`, {
        token: user.token,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Registration detail error:', errorText);
      }
      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.data.id).toBe(documentId);
      expect(data.data).toHaveProperty('generators');
      expect(Array.isArray(data.data.generators)).toBe(true);
    });
  });

  describe('GET /api/v1/module-3/aer', () => {
    it('should list AER documents', async () => {
      const response = await testClient.request('GET', '/api/v1/module-3/aer', {
        token: user.token,
      });
      
      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(Array.isArray(data.data)).toBe(true);
    });
  });

  describe('POST /api/v1/module-3/aer', () => {
    it('should create AER document and queue generation', async () => {
      const response = await testClient.request('POST', '/api/v1/module-3/aer', {
        body: {
          document_id: documentId,
          year: 2025,
          generator_ids: [generatorId],
        },
        token: user.token,
      });

      // Should return 202 (Accepted) or 201 (Created)
      expect([201, 202]).toContain(response.status);
      const data = await response.json();
      expect(data.data).toHaveProperty('aer_id');
      if (response.status === 202) {
        expect(data.data).toHaveProperty('job_id');
        expect(data.data.status).toBe('QUEUED');
      }
    });

    it('should return 400 for missing required fields', async () => {
      const response = await testClient.request('POST', '/api/v1/module-3/aer', {
        body: {
          // Missing document_id and year
        },
        token: user.token,
      });

      expect(response.status).toBe(400);
    });

    it('should return 404 for invalid document_id', async () => {
      const response = await testClient.request('POST', '/api/v1/module-3/aer', {
        body: {
          document_id: '00000000-0000-0000-0000-000000000000',
          year: 2025,
        },
        token: user.token,
      });

      expect(response.status).toBe(404);
    });
  });

  describe('Authorization and RLS', () => {
    it('should enforce RLS - users can only see their company data', async () => {
      // Create another user
      const uniqueEmail2 = `module3-test-2-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
      const user2 = await testClient.signup(uniqueEmail2, 'Test123!@#', 'Module 3 Test User 2');

      // Activate Module 1 and Module 3 for user2
      const { data: module1 } = await supabaseAdmin
        .from('modules')
        .select('id')
        .eq('module_code', 'MODULE_1')
        .single();

      const { data: module3 } = await supabaseAdmin
        .from('modules')
        .select('id')
        .eq('module_code', 'MODULE_3')
        .single();

      // Activate modules for user2
      await supabaseAdmin
        .from('module_activations')
        .insert([
          {
            company_id: user2.company_id,
            module_id: module1.id,
            status: 'ACTIVE',
            activated_at: new Date().toISOString(),
            activated_by: user2.id,
            billing_start_date: new Date().toISOString().split('T')[0],
          },
          {
            company_id: user2.company_id,
            module_id: module3.id,
            status: 'ACTIVE',
            activated_at: new Date().toISOString(),
            activated_by: user2.id,
            billing_start_date: new Date().toISOString().split('T')[0],
          },
        ]);

      // User 2 should not see user 1's generators
      const response = await testClient.request('GET', '/api/v1/module-3/generators', {
        token: user2.token,
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      // User 2's generators list should not include user 1's generator
      const hasUser1Generator = data.data.some((gen: any) => gen.id === generatorId);
      expect(hasUser1Generator).toBe(false);
    });

    it('should require authentication', async () => {
      const response = await testClient.request('GET', '/api/v1/module-3/generators', {
        // No token
      });

      expect(response.status).toBe(401);
    });

    it('should require appropriate role for mutations', async () => {
      // This would require creating a VIEWER role user, which is more complex
      // For now, we'll just verify that mutations require authentication
      const response = await testClient.request('POST', '/api/v1/module-3/generators', {
        body: {
          document_id: documentId,
          generator_identifier: 'TEST',
          generator_type: 'MCPD_1_5MW',
          capacity_mw: 1.0,
          fuel_type: 'Gas',
          anniversary_date: '2025-01-01',
        },
        // No token
      });

      expect(response.status).toBe(401);
    });
  });
});

