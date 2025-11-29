/**
 * Phase 7: Production Readiness Tests
 * Automated tests that verify production readiness (automates Phase 7 manual verification)
 */

import { test, expect } from '@playwright/test';
import { TestClient } from '../helpers/test-client';

test.describe('Production Readiness', () => {
  const client = new TestClient();
  const baseURL = process.env.BASE_URL || 'http://localhost:3000';

  test('Production-like environment: Complete user journey works', async ({ page }) => {
    const timestamp = Date.now();
    const testUser = {
      email: `prod_test_${timestamp}@example.com`,
      password: 'TestPassword123!',
      companyName: `Prod Test Company ${timestamp}`,
      fullName: `Prod Test User ${timestamp}`,
    };

    // Step 1: Signup
    await page.goto(`${baseURL}/signup`);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="confirmPassword"]', testUser.password);
    await page.fill('input[name="fullName"]', testUser.fullName);
    await page.fill('input[name="companyName"]', testUser.companyName);
    await page.check('input[name="terms"]');
    await page.click('button[type="submit"]');
    
    // Wait for redirect
    await page.waitForURL(/dashboard/, { timeout: 10000 });
    
    // Step 2: Verify dashboard loads
    await expect(page).toHaveURL(/dashboard/);
    
    // Step 3: Measure page load time
    const loadTime = await page.evaluate(() => {
      return performance.timing.loadEventEnd - performance.timing.navigationStart;
    });
    
    // Assert: Page load time < 3s
    expect(loadTime).toBeLessThan(3000);
  });

  test('Security: RLS policies prevent cross-tenant access', async () => {
    // Create two user accounts
    const timestamp1 = Date.now();
    const timestamp2 = timestamp1 + 1;
    
    const user1 = {
      email: `user1_${timestamp1}@example.com`,
      password: 'TestPassword123!',
      companyName: `Company 1 ${timestamp1}`,
      fullName: `User 1 ${timestamp1}`,
    };
    
    const user2 = {
      email: `user2_${timestamp2}@example.com`,
      password: 'TestPassword123!',
      companyName: `Company 2 ${timestamp2}`,
      fullName: `User 2 ${timestamp2}`,
    };
    
    // Signup User 1
    const signup1Response = await client.post('/api/v1/auth/signup', user1);
    expect(signup1Response.status).toBe(201);
    const signup1Data = await signup1Response.json();
    const user1Token = signup1Data.data.access_token || signup1Data.data.token;
    const user1CompanyId = signup1Data.data.user.company_id;
    
    // Signup User 2
    const signup2Response = await client.post('/api/v1/auth/signup', user2);
    expect(signup2Response.status).toBe(201);
    const signup2Data = await signup2Response.json();
    const user2Token = signup2Data.data.access_token || signup2Data.data.token;
    
    // User 1 creates data
    const client1 = new TestClient(user1Token);
    const createSiteResponse = await client1.post('/api/v1/sites', {
      name: 'User 1 Site',
      address: '123 User 1 St',
      regulator: 'EA',
    });
    expect(createSiteResponse.status).toBe(201);
    const siteData = await createSiteResponse.json();
    const siteId = siteData.data.id;
    
    // User 2 tries to access User 1's data
    const client2 = new TestClient(user2Token);
    const getSiteResponse = await client2.get(`/api/v1/sites/${siteId}`);
    
    // Assert: User 2 cannot see User 1's data (403 Forbidden or 404 Not Found)
    expect([403, 404]).toContain(getSiteResponse.status);
  });

  test('Data integrity: Upload 10 documents and verify extraction', async () => {
    // This test would:
    // 1. Upload 10 test documents
    // 2. Wait for extraction to complete
    // 3. Count obligations extracted
    // 4. Verify obligation count matches expected
    // 5. Verify evidence links correctly
    // 6. Generate pack and verify pack contains correct data
    
    // Note: This is a placeholder - actual implementation would require test documents
    test.skip(); // Skip until test documents are available
  });

  test('Error recovery: Corrupted PDF upload', async ({ page }) => {
    await page.goto(`${baseURL}/dashboard/documents`);
    
    // Create corrupted PDF buffer
    const corruptedBuffer = Buffer.from('This is not a valid PDF file');
    
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.isVisible({ timeout: 2000 })) {
      await fileInput.setInputFiles({
        name: 'corrupted.pdf',
        mimeType: 'application/pdf',
        buffer: corruptedBuffer,
      });
      
      // Wait for error message (should be graceful, not 500 error)
      await expect(page.locator('text=Invalid file, text=File upload failed, text=Please try again')).toBeVisible({ timeout: 10000 });
      
      // Verify error is user-friendly (not 500 Internal Server Error)
      const errorText = await page.textContent('body');
      expect(errorText).not.toContain('500');
      expect(errorText).not.toContain('Internal Server Error');
    }
  });

  test('Performance: API response times < 200ms (p95)', async () => {
    const responseTimes: number[] = [];
    const endpoints = [
      '/api/v1/health',
      '/api/v1/users/me',
    ];
    
    // Make 20 requests to each endpoint
    for (const endpoint of endpoints) {
      for (let i = 0; i < 20; i++) {
        const start = Date.now();
        const response = await client.get(endpoint);
        const duration = Date.now() - start;
        
        if (response.ok) {
          responseTimes.push(duration);
        }
      }
    }
    
    // Calculate p95
    responseTimes.sort((a, b) => a - b);
    const p95Index = Math.floor(responseTimes.length * 0.95);
    const p95 = responseTimes[p95Index];
    
    // Assert: p95 < 200ms
    expect(p95).toBeLessThan(200);
  });

  test('Monitoring: Health check endpoint works', async () => {
    const response = await client.get('/api/v1/health');
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('status');
    expect(['healthy', 'degraded', 'unhealthy']).toContain(data.status);
    
    if (data.services) {
      expect(data.services).toHaveProperty('database');
      expect(data.services).toHaveProperty('redis');
      expect(data.services).toHaveProperty('storage');
    }
    
    // Assert: Response time < 100ms
    const start = Date.now();
    await client.get('/api/v1/health');
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(100);
  });
});

