/**
 * Document Workflow E2E Tests
 * Tests complete user journey from upload to extraction
 * Target: 100% coverage of critical user paths
 */

import { test, expect, Page } from '@playwright/test';
import path from 'path';

test.describe('Document Processing Workflow', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();

    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('complete document upload and extraction workflow', async () => {
    // Step 1: Navigate to documents page
    await page.click('text=Documents');
    await expect(page).toHaveURL('/dashboard/documents');

    // Step 2: Upload document
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(
      path.join(__dirname, '../fixtures/sample-permit.pdf')
    );

    // Step 3: Wait for upload success
    await expect(page.locator('text=Upload successful')).toBeVisible({
      timeout: 10000,
    });

    // Step 4: Document should appear in list
    await expect(page.locator('text=sample-permit.pdf')).toBeVisible();

    // Step 5: Verify document status
    await expect(
      page.locator('[data-document-status="PENDING"]')
    ).toBeVisible();

    // Step 6: Start extraction
    await page.click('button:has-text("Extract Obligations")');

    // Step 7: Confirm extraction dialog
    await page.click('button:has-text("Confirm")');

    // Step 8: Wait for extraction to start
    await expect(
      page.locator('[data-document-status="PROCESSING"]')
    ).toBeVisible({ timeout: 5000 });

    // Step 9: Poll for extraction completion (max 2 minutes)
    await expect(
      page.locator('[data-document-status="COMPLETED"]')
    ).toBeVisible({ timeout: 120000 });

    // Step 10: Verify extraction metadata
    await page.click('button:has-text("View Details")');

    // Should show model used
    await expect(page.locator('[data-testid="extraction-model"]')).toContainText(
      /gpt-4o|gpt-4o-mini/
    );

    // Should show token count
    const tokenCount = await page
      .locator('[data-testid="token-count"]')
      .textContent();
    expect(parseInt(tokenCount!.replace(/,/g, ''))).toBeGreaterThan(0);

    // Should show cost
    const cost = await page.locator('[data-testid="extraction-cost"]').textContent();
    expect(cost).toMatch(/\$\d+\.\d{4}/);

    // Should show complexity
    await expect(page.locator('[data-testid="complexity"]')).toContainText(
      /simple|medium|complex/
    );

    // Step 11: Navigate to obligations
    await page.click('text=View Obligations');

    // Step 12: Verify obligations were created
    const obligationRows = page.locator('[data-testid="obligation-row"]');
    const count = await obligationRows.count();
    expect(count).toBeGreaterThan(0);

    // Step 13: Verify obligation details
    const firstObligation = obligationRows.first();
    await expect(firstObligation.locator('[data-field="title"]')).toBeVisible();
    await expect(firstObligation.locator('[data-field="status"]')).toBeVisible();
    await expect(
      firstObligation.locator('[data-field="category"]')
    ).toBeVisible();
  });

  test('should handle extraction failures gracefully', async () => {
    // Navigate to documents
    await page.goto('/dashboard/documents');

    // Upload corrupted PDF
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(
      path.join(__dirname, '../fixtures/corrupted.pdf')
    );

    // Wait for upload
    await expect(page.locator('text=Upload successful')).toBeVisible();

    // Start extraction
    await page.click('button:has-text("Extract Obligations")');
    await page.click('button:has-text("Confirm")');

    // Wait for failure
    await expect(
      page.locator('[data-document-status="EXTRACTION_FAILED"]')
    ).toBeVisible({ timeout: 60000 });

    // Error message should be displayed
    await expect(page.locator('[role="alert"]')).toBeVisible();
    await expect(page.locator('text=Extraction failed')).toBeVisible();

    // Retry button should be available
    await expect(
      page.locator('button:has-text("Retry Extraction")')
    ).toBeEnabled();
  });

  test('should show real-time extraction progress', async () => {
    // Navigate to documents
    await page.goto('/dashboard/documents');

    // Upload large document
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(
      path.join(__dirname, '../fixtures/large-permit.pdf')
    );

    await expect(page.locator('text=Upload successful')).toBeVisible();

    // Start extraction
    await page.click('button:has-text("Extract Obligations")');
    await page.click('button:has-text("Confirm")');

    // Progress indicator should appear
    await expect(page.locator('[role="progressbar"]')).toBeVisible();

    // Status updates
    await expect(page.locator('text=Extracting text...')).toBeVisible();

    // Wait for completion
    await expect(page.locator('text=Complete')).toBeVisible({
      timeout: 180000,
    });
  });

  test('should support batch document upload', async () => {
    await page.goto('/dashboard/documents');

    // Upload multiple files
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([
      path.join(__dirname, '../fixtures/permit1.pdf'),
      path.join(__dirname, '../fixtures/permit2.pdf'),
      path.join(__dirname, '../fixtures/permit3.pdf'),
    ]);

    // All documents should appear
    await expect(page.locator('text=permit1.pdf')).toBeVisible();
    await expect(page.locator('text=permit2.pdf')).toBeVisible();
    await expect(page.locator('text=permit3.pdf')).toBeVisible();

    // Batch extract button should be available
    await expect(
      page.locator('button:has-text("Extract All")')
    ).toBeVisible();
  });

  test('should filter and search documents', async () => {
    await page.goto('/dashboard/documents');

    // Use search
    await page.fill('input[placeholder*="Search"]', 'permit1');
    await expect(page.locator('text=permit1.pdf')).toBeVisible();
    await expect(page.locator('text=permit2.pdf')).not.toBeVisible();

    // Clear search
    await page.fill('input[placeholder*="Search"]', '');

    // Filter by status
    await page.selectOption('select[name="status"]', 'COMPLETED');
    const rows = page.locator('[data-document-status="COMPLETED"]');
    expect(await rows.count()).toBeGreaterThan(0);

    // Filter by type
    await page.selectOption(
      'select[name="documentType"]',
      'ENVIRONMENTAL_PERMIT'
    );
    // Verify filtered results
  });

  test('should handle concurrent extractions', async () => {
    await page.goto('/dashboard/documents');

    // Start multiple extractions
    const extractButtons = page.locator('button:has-text("Extract Obligations")');
    const count = Math.min(await extractButtons.count(), 3);

    for (let i = 0; i < count; i++) {
      await extractButtons.nth(i).click();
      await page.click('button:has-text("Confirm")');
      await page.waitForTimeout(500);
    }

    // All should process
    await expect(
      page.locator('[data-document-status="PROCESSING"]').first()
    ).toBeVisible();

    // Wait for all to complete (staggered)
    await page.waitForTimeout(180000); // 3 minutes max

    // All should complete
    const completed = page.locator('[data-document-status="COMPLETED"]');
    expect(await completed.count()).toBeGreaterThanOrEqual(count);
  });

  test('accessibility checks', async () => {
    await page.goto('/dashboard/documents');

    // Run axe accessibility tests
    // Note: Requires @axe-core/playwright
    // const results = await injectAxe(page);
    // expect(results).toHaveNoViolations();

    // Keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();

    // ARIA labels
    await expect(
      page.locator('[aria-label="Upload document"]')
    ).toBeVisible();
  });
});
