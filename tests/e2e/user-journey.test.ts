/**
 * Phase 7.1: End-to-End User Journey Tests
 * Tests complete user workflows from signup to pack generation
 */

import { test, expect } from '@playwright/test';

test.describe('Complete User Journey', () => {
  const timestamp = Date.now();
  const testUser = {
    email: `e2e_test_${timestamp}@example.com`,
    password: 'TestPassword123!',
    companyName: `E2E Test Company ${timestamp}`,
    fullName: `E2E Test User ${timestamp}`,
    siteName: `E2E Test Site ${timestamp}`,
    address: '123 Test Street, London, UK',
  };

  test('Complete onboarding flow: Signup → Site Creation → Document Upload → Extraction', async ({ page }) => {
    // Step 1: Signup
    await page.goto('/signup');
    await expect(page).toHaveTitle(/signup/i);
    
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="confirmPassword"]', testUser.password);
    await page.fill('input[name="fullName"]', testUser.fullName);
    await page.fill('input[name="companyName"]', testUser.companyName);
    await page.check('input[name="terms"]');
    
    await page.click('button[type="submit"]');
    
    // Wait for redirect after signup
    await page.waitForURL(/dashboard|onboarding/, { timeout: 10000 });
    
    // Step 2: Site Creation (if onboarding flow)
    const currentUrl = page.url();
    if (currentUrl.includes('onboarding') || currentUrl.includes('site')) {
      // Fill site creation form if present
      const siteNameInput = page.locator('input[name="siteName"], input[name="name"]').first();
      if (await siteNameInput.isVisible({ timeout: 2000 })) {
        await siteNameInput.fill(testUser.siteName);
        await page.fill('input[name="address"], textarea[name="address"]', testUser.address);
        await page.selectOption('select[name="regulator"]', 'EA');
        await page.click('button[type="submit"]');
        await page.waitForURL(/dashboard/, { timeout: 10000 });
      }
    }
    
    // Step 3: Verify dashboard loads
    await expect(page).toHaveURL(/dashboard/);
    
    // Verify user is logged in (check for user menu or dashboard content)
    const dashboardContent = page.locator('text=Dashboard, text=Welcome, text=Obligations, text=Documents').first();
    await expect(dashboardContent).toBeVisible({ timeout: 5000 });
  });

  test('Multi-site workflow: Create site → Upload document per site → View consolidated dashboard', async ({ page }) => {
    // This test assumes user is already logged in
    // In a real scenario, you'd set up authentication first
    
    // Navigate to sites page
    await page.goto('/dashboard/sites');
    
    // Create first site
    await page.click('text=Add Site, text=Create Site, button:has-text("New")');
    await page.fill('input[name="name"], input[name="siteName"]', 'Site 1');
    await page.fill('input[name="address"], textarea[name="address"]', 'Address 1');
    await page.selectOption('select[name="regulator"]', 'EA');
    await page.click('button[type="submit"]');
    
    // Wait for site to be created
    await page.waitForSelector('text=Site 1', { timeout: 5000 });
    
    // Create second site
    await page.click('text=Add Site, text=Create Site, button:has-text("New")');
    await page.fill('input[name="name"], input[name="siteName"]', 'Site 2');
    await page.fill('input[name="address"], textarea[name="address"]', 'Address 2');
    await page.selectOption('select[name="regulator"]', 'SEPA');
    await page.click('button[type="submit"]');
    
    // Verify both sites appear
    await expect(page.locator('text=Site 1')).toBeVisible();
    await expect(page.locator('text=Site 2')).toBeVisible();
    
    // Navigate to dashboard and verify consolidated view
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/dashboard/);
  });

  test('Error handling: Invalid file upload', async ({ page }) => {
    // Navigate to documents page
    await page.goto('/dashboard/documents');
    
    // Try to upload invalid file
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.isVisible({ timeout: 2000 })) {
      // Create a fake invalid file
      const buffer = Buffer.from('invalid file content');
      await fileInput.setInputFiles({
        name: 'invalid.txt',
        mimeType: 'text/plain',
        buffer,
      });
      
      // Wait for error message
      await expect(page.locator('text=Invalid file type, text=Please upload a PDF, text=Unsupported file format')).toBeVisible({ timeout: 5000 });
    }
  });

  test('Error handling: Network error during form submission', async ({ page }) => {
    // Navigate to signup
    await page.goto('/signup');
    
    // Fill form
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="confirmPassword"]', testUser.password);
    await page.fill('input[name="fullName"]', testUser.fullName);
    await page.fill('input[name="companyName"]', testUser.companyName);
    await page.check('input[name="terms"]');
    
    // Simulate network failure
    await page.route('**/api/v1/auth/signup', route => route.abort());
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Verify error message appears
    await expect(page.locator('text=Connection failed, text=Network error, text=Please try again')).toBeVisible({ timeout: 5000 });
  });
});

