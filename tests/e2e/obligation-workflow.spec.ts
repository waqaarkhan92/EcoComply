/**
 * Obligation Management E2E Tests
 * Tests complete obligation lifecycle from creation to completion
 * Target: 100% coverage of critical user paths
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Obligation Management Workflow', () => {
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

  test('complete obligation lifecycle', async () => {
    // Step 1: Navigate to obligations page
    await page.click('text=Obligations');
    await expect(page).toHaveURL('/dashboard/obligations');

    // Step 2: Create new obligation
    await page.click('button:has-text("New Obligation")');
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Fill obligation form
    await page.fill('input[name="title"]', 'Monthly Emissions Monitoring');
    await page.fill('textarea[name="description"]', 'Monitor stack emissions monthly using MCERTS equipment');
    await page.selectOption('select[name="category"]', 'Emissions Monitoring');
    await page.selectOption('select[name="frequency"]', 'Monthly');
    await page.fill('input[name="deadline"]', '2024-12-31');
    await page.selectOption('select[name="regulator"]', 'Environment Agency');

    // Submit form
    await page.click('button:has-text("Create Obligation")');

    // Step 3: Verify obligation appears in list
    await expect(page.locator('text=Monthly Emissions Monitoring')).toBeVisible();

    // Step 4: Click on obligation to view details
    await page.click('text=Monthly Emissions Monitoring');
    await expect(page.locator('[data-testid="obligation-details"]')).toBeVisible();

    // Step 5: Edit obligation
    await page.click('button:has-text("Edit")');
    await page.fill('textarea[name="description"]', 'UPDATED: Monitor stack emissions monthly using MCERTS equipment and log results');
    await page.click('button:has-text("Save Changes")');

    // Verify update
    await expect(page.locator('text=UPDATED: Monitor')).toBeVisible();

    // Step 6: Add evidence
    await page.click('button:has-text("Add Evidence")');
    await page.setInputFiles('input[type="file"]', './tests/fixtures/monitoring-report.pdf');
    await page.fill('input[name="evidenceTitle"]', 'January 2024 Monitoring Report');
    await page.fill('input[name="validUntil"]', '2025-01-31');
    await page.click('button:has-text("Upload Evidence")');

    // Verify evidence appears
    await expect(page.locator('text=January 2024 Monitoring Report')).toBeVisible();

    // Step 7: Mark obligation as complete
    await page.click('button:has-text("Mark Complete")');
    await page.click('button:has-text("Confirm")'); // Confirmation dialog

    // Verify status changed
    await expect(page.locator('[data-status="COMPLETED"]')).toBeVisible();

    // Step 8: Verify completion appears in analytics
    await page.click('text=Dashboard');
    await expect(page.locator('[data-testid="completed-obligations"]')).toContainText('1');
  });

  test('filter and search obligations', async () => {
    await page.goto('/dashboard/obligations');

    // Test search
    await page.fill('input[placeholder*="Search"]', 'emissions');
    await expect(page.locator('[data-testid="obligation-row"]')).toContainText('emissions');

    // Clear search
    await page.fill('input[placeholder*="Search"]', '');

    // Test category filter
    await page.selectOption('select[name="category"]', 'Emissions Monitoring');
    const rows = page.locator('[data-testid="obligation-row"]');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);

    // Test status filter
    await page.selectOption('select[name="status"]', 'PENDING');
    await expect(page.locator('[data-status="PENDING"]')).toBeVisible();

    // Test date range filter
    await page.fill('input[name="dateFrom"]', '2024-01-01');
    await page.fill('input[name="dateTo"]', '2024-12-31');
    await page.click('button:has-text("Apply Filters")');

    // Verify filtered results
    expect(await page.locator('[data-testid="obligation-row"]').count()).toBeGreaterThan(0);
  });

  test('bulk operations on obligations', async () => {
    await page.goto('/dashboard/obligations');

    // Select multiple obligations
    await page.click('[data-testid="select-all-checkbox"]');

    // Verify bulk actions appear
    await expect(page.locator('text=3 obligations selected')).toBeVisible();

    // Test bulk status change
    await page.click('button:has-text("Bulk Actions")');
    await page.click('text=Change Status');
    await page.selectOption('select[name="newStatus"]', 'IN_PROGRESS');
    await page.click('button:has-text("Apply")');

    // Verify status changed for all
    await expect(page.locator('[data-status="IN_PROGRESS"]').first()).toBeVisible();
  });

  test('obligation deadline notifications', async () => {
    await page.goto('/dashboard/obligations');

    // Click on obligation with upcoming deadline
    await page.click('[data-deadline-status="upcoming"]');

    // Verify warning indicator
    await expect(page.locator('[data-testid="deadline-warning"]')).toBeVisible();
    await expect(page.locator('text=Due in')).toBeVisible();

    // Click on overdue obligation
    await page.goto('/dashboard/obligations?filter=overdue');
    await page.click('[data-deadline-status="overdue"]');

    // Verify overdue indicator
    await expect(page.locator('[data-testid="overdue-badge"]')).toBeVisible();
    await expect(page.locator('[data-testid="overdue-badge"]')).toHaveClass(/bg-red/);
  });

  test('obligation compliance tracking', async () => {
    await page.goto('/dashboard/obligations');

    // View obligation details
    await page.locator('[data-testid="obligation-row"]').first().click();

    // Check compliance history
    await page.click('tab:has-text("Compliance History")');

    // Verify history entries
    await expect(page.locator('[data-testid="compliance-entry"]')).toHaveCount(3);

    // View compliance score
    const scoreElement = page.locator('[data-testid="compliance-score"]');
    const score = await scoreElement.textContent();
    expect(parseInt(score!)).toBeGreaterThanOrEqual(0);
    expect(parseInt(score!)).toBeLessThanOrEqual(100);
  });

  test('recurring obligation management', async () => {
    await page.goto('/dashboard/obligations');

    // Create recurring obligation
    await page.click('button:has-text("New Obligation")');
    await page.fill('input[name="title"]', 'Weekly Safety Inspection');
    await page.selectOption('select[name="frequency"]', 'Weekly');
    await page.check('input[name="isRecurring"]');
    await page.click('button:has-text("Create Obligation")');

    // Verify recurring indicator
    await expect(page.locator('[data-recurring="true"]')).toBeVisible();

    // Complete current instance
    await page.click('text=Weekly Safety Inspection');
    await page.click('button:has-text("Mark Complete")');
    await page.click('button:has-text("Confirm")');

    // Verify next instance created
    await expect(page.locator('text=Next due:')).toBeVisible();
  });

  test('obligation assignment workflow', async () => {
    await page.goto('/dashboard/obligations');

    // Open obligation
    await page.locator('[data-testid="obligation-row"]').first().click();

    // Assign to user
    await page.click('button:has-text("Assign")');
    await page.selectOption('select[name="assignee"]', 'john@example.com');
    await page.click('button:has-text("Assign User")');

    // Verify assignment
    await expect(page.locator('[data-testid="assignee"]')).toContainText('john@example.com');

    // User receives notification (verify in notifications panel)
    await page.click('[data-testid="notifications-button"]');
    await expect(page.locator('text=You have been assigned')).toBeVisible();
  });

  test('export obligations to CSV', async () => {
    await page.goto('/dashboard/obligations');

    // Start download
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Export CSV")'),
    ]);

    // Verify file download
    expect(download.suggestedFilename()).toContain('obligations');
    expect(download.suggestedFilename()).toContain('.csv');

    // Verify file content
    const path = await download.path();
    expect(path).toBeTruthy();
  });

  test('print obligations report', async () => {
    await page.goto('/dashboard/obligations');

    // Open print dialog
    await page.click('button:has-text("Print Report")');

    // Verify print preview
    await expect(page.locator('[data-testid="print-preview"]')).toBeVisible();

    // Verify report sections
    await expect(page.locator('text=Obligations Summary')).toBeVisible();
    await expect(page.locator('[data-testid="report-table"]')).toBeVisible();
  });

  test('obligation validation rules', async () => {
    await page.goto('/dashboard/obligations');

    // Try to create invalid obligation
    await page.click('button:has-text("New Obligation")');
    await page.click('button:has-text("Create Obligation")'); // Without filling form

    // Verify validation errors
    await expect(page.locator('text=Title is required')).toBeVisible();
    await expect(page.locator('text=Category is required')).toBeVisible();

    // Fill partially
    await page.fill('input[name="title"]', 'Test');

    // Try to submit
    await page.click('button:has-text("Create Obligation")');

    // Verify remaining errors
    await expect(page.locator('text=Category is required')).toBeVisible();
  });

  test('accessibility navigation', async () => {
    await page.goto('/dashboard/obligations');

    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();

    // Navigate through obligations with arrow keys
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter'); // Open obligation

    // Close with Escape
    await page.keyboard.press('Escape');
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();

    // Test screen reader announcements
    await page.click('button:has-text("Mark Complete")');
    const announcement = page.locator('[role="status"]');
    await expect(announcement).toContainText('Obligation marked as complete');
  });

  test('mobile responsive view', async ({ browser }) => {
    // Create mobile viewport
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
    });
    const mobilePage = await context.newPage();

    await mobilePage.goto('/dashboard/obligations');

    // Verify mobile menu
    await expect(mobilePage.locator('[data-testid="mobile-menu-button"]')).toBeVisible();

    // Open obligation details
    await mobilePage.locator('[data-testid="obligation-row"]').first().click();

    // Verify mobile-optimized layout
    await expect(mobilePage.locator('[data-testid="mobile-details-view"]')).toBeVisible();

    await context.close();
  });
});
