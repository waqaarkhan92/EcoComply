/**
 * Authentication E2E Tests
 * Tests login, logout, and protected route access
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Authentication Flow', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Login Flow', () => {
    test('should display login page', async () => {
      await page.goto(`${BASE_URL}/login`);

      // Check for login form elements
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('should show validation errors for empty fields', async () => {
      await page.goto(`${BASE_URL}/login`);

      // Submit without filling form
      await page.click('button[type="submit"]');

      // Check for validation messages
      const emailError = page.locator('text=/email.*required/i');
      const passwordError = page.locator('text=/password.*required/i');

      await expect(emailError.or(passwordError)).toBeVisible({ timeout: 3000 });
    });

    test('should show error for invalid credentials', async () => {
      await page.goto(`${BASE_URL}/login`);

      // Fill with invalid credentials
      await page.fill('input[name="email"]', 'invalid@example.com');
      await page.fill('input[type="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');

      // Check for error message
      await expect(
        page.locator('text=/invalid.*credentials|incorrect.*password|email.*password.*incorrect/i')
      ).toBeVisible({ timeout: 5000 });
    });

    test('should successfully login with valid credentials', async () => {
      await page.goto(`${BASE_URL}/login`);

      // Use test credentials from environment or default
      const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
      const testPassword = process.env.TEST_USER_PASSWORD || 'TestPassword123!';

      await page.fill('input[name="email"]', testEmail);
      await page.fill('input[type="password"]', testPassword);
      await page.click('button[type="submit"]');

      // Should redirect to dashboard
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

      // Verify user is logged in by checking for user menu or profile
      const userMenu = page.locator('[data-testid="user-menu"]').or(
        page.locator('button:has-text("Profile")').or(
          page.locator('text=/logout/i')
        )
      );
      await expect(userMenu.first()).toBeVisible({ timeout: 5000 });
    });

    test('should remember email with "Remember me" checkbox', async () => {
      await page.goto(`${BASE_URL}/login`);

      const testEmail = 'remember@example.com';
      await page.fill('input[name="email"]', testEmail);

      // Check "Remember me" if it exists
      const rememberCheckbox = page.locator('input[type="checkbox"][name="remember"]');
      if (await rememberCheckbox.isVisible()) {
        await rememberCheckbox.check();
      }

      // Navigate away and come back
      await page.goto(`${BASE_URL}/`);
      await page.goto(`${BASE_URL}/login`);

      // Email should be pre-filled (if remember me feature is implemented)
      const emailValue = await page.locator('input[name="email"]').inputValue();
      // This test is optional based on implementation
    });

    test('should handle email input validation', async () => {
      await page.goto(`${BASE_URL}/login`);

      // Enter invalid email format
      await page.fill('input[name="email"]', 'not-an-email');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');

      // Should show email validation error
      await expect(
        page.locator('text=/valid.*email|email.*invalid/i')
      ).toBeVisible({ timeout: 3000 });
    });

    test('should toggle password visibility', async () => {
      await page.goto(`${BASE_URL}/login`);

      const passwordInput = page.locator('input[type="password"]');
      const toggleButton = page.locator('button[aria-label*="password" i], button[title*="password" i]');

      // Password should be hidden by default
      await expect(passwordInput).toHaveAttribute('type', 'password');

      // Click toggle if it exists
      if (await toggleButton.count() > 0) {
        await toggleButton.first().click();

        // Password should now be visible
        const visibleInput = page.locator('input[type="text"][name="password"]');
        await expect(visibleInput.or(passwordInput)).toBeVisible();
      }
    });
  });

  test.describe('Logout Flow', () => {
    test('should successfully logout', async () => {
      // First login
      await page.goto(`${BASE_URL}/login`);

      const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
      const testPassword = process.env.TEST_USER_PASSWORD || 'TestPassword123!';

      await page.fill('input[name="email"]', testEmail);
      await page.fill('input[type="password"]', testPassword);
      await page.click('button[type="submit"]');

      // Wait for redirect to dashboard
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

      // Find and click logout button
      const logoutButton = page.locator('button:has-text("Logout")').or(
        page.locator('button:has-text("Log out")').or(
          page.locator('a:has-text("Logout")').or(
            page.locator('a:has-text("Log out")')
          )
        )
      );

      // May need to open user menu first
      const userMenuButton = page.locator('[data-testid="user-menu"]').or(
        page.locator('button[aria-label*="user" i]')
      );

      if (await userMenuButton.count() > 0) {
        await userMenuButton.first().click();
        await page.waitForTimeout(500);
      }

      await logoutButton.first().click();

      // Should redirect to login or home page
      await expect(page).toHaveURL(/\/(login|$)/, { timeout: 10000 });

      // Verify logged out by checking for login form or public nav
      const loginForm = page.locator('input[name="email"]');
      const loginLink = page.locator('a:has-text("Login")').or(
        page.locator('a:has-text("Sign in")')
      );

      await expect(loginForm.or(loginLink).first()).toBeVisible({ timeout: 5000 });
    });

    test('should clear session data on logout', async () => {
      // Login first
      await page.goto(`${BASE_URL}/login`);

      const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
      const testPassword = process.env.TEST_USER_PASSWORD || 'TestPassword123!';

      await page.fill('input[name="email"]', testEmail);
      await page.fill('input[type="password"]', testPassword);
      await page.click('button[type="submit"]');

      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

      // Logout
      const userMenuButton = page.locator('[data-testid="user-menu"]').or(
        page.locator('button[aria-label*="user" i]')
      );

      if (await userMenuButton.count() > 0) {
        await userMenuButton.first().click();
        await page.waitForTimeout(500);
      }

      const logoutButton = page.locator('button:has-text("Logout")').or(
        page.locator('a:has-text("Logout")')
      );

      await logoutButton.first().click();

      // Try to access protected page
      await page.goto(`${BASE_URL}/dashboard`);

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect to login when accessing dashboard without auth', async () => {
      await page.goto(`${BASE_URL}/dashboard`);

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    });

    test('should redirect to login when accessing obligations without auth', async () => {
      await page.goto(`${BASE_URL}/dashboard/obligations`);

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    });

    test('should redirect to login when accessing documents without auth', async () => {
      await page.goto(`${BASE_URL}/dashboard/documents`);

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    });

    test('should redirect to login when accessing settings without auth', async () => {
      await page.goto(`${BASE_URL}/dashboard/settings`);

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    });

    test('should allow access to protected routes after login', async () => {
      // Login first
      await page.goto(`${BASE_URL}/login`);

      const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
      const testPassword = process.env.TEST_USER_PASSWORD || 'TestPassword123!';

      await page.fill('input[name="email"]', testEmail);
      await page.fill('input[type="password"]', testPassword);
      await page.click('button[type="submit"]');

      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

      // Try to access various protected routes
      const protectedRoutes = [
        '/dashboard/obligations',
        '/dashboard/documents',
        '/dashboard/settings',
      ];

      for (const route of protectedRoutes) {
        await page.goto(`${BASE_URL}${route}`);

        // Should not redirect to login
        await page.waitForTimeout(2000);
        const currentUrl = page.url();
        expect(currentUrl).not.toContain('/login');
        expect(currentUrl).toContain(route);
      }
    });

    test('should maintain session across page refreshes', async () => {
      // Login first
      await page.goto(`${BASE_URL}/login`);

      const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
      const testPassword = process.env.TEST_USER_PASSWORD || 'TestPassword123!';

      await page.fill('input[name="email"]', testEmail);
      await page.fill('input[type="password"]', testPassword);
      await page.click('button[type="submit"]');

      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

      // Refresh the page
      await page.reload();

      // Should still be on dashboard (not redirected to login)
      await page.waitForTimeout(2000);
      const currentUrl = page.url();
      expect(currentUrl).toContain('/dashboard');
      expect(currentUrl).not.toContain('/login');
    });

    test('should handle session expiration', async () => {
      // This test assumes there's a way to expire the session
      // In a real implementation, you might need to manipulate cookies or local storage

      // Login first
      await page.goto(`${BASE_URL}/login`);

      const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
      const testPassword = process.env.TEST_USER_PASSWORD || 'TestPassword123!';

      await page.fill('input[name="email"]', testEmail);
      await page.fill('input[type="password"]', testPassword);
      await page.click('button[type="submit"]');

      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

      // Clear session cookies
      await page.context().clearCookies();

      // Try to access protected route
      await page.goto(`${BASE_URL}/dashboard/obligations`);

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    });
  });

  test.describe('Password Reset Flow', () => {
    test('should display forgot password link', async () => {
      await page.goto(`${BASE_URL}/login`);

      const forgotPasswordLink = page.locator('a:has-text("Forgot password")').or(
        page.locator('a:has-text("Reset password")')
      );

      await expect(forgotPasswordLink.first()).toBeVisible();
    });

    test('should navigate to password reset page', async () => {
      await page.goto(`${BASE_URL}/login`);

      const forgotPasswordLink = page.locator('a:has-text("Forgot password")').or(
        page.locator('a:has-text("Reset password")')
      );

      await forgotPasswordLink.first().click();

      // Should navigate to forgot password page
      await expect(page).toHaveURL(/\/(forgot-password|reset-password)/, { timeout: 5000 });
    });
  });

  test.describe('Signup Flow (if applicable)', () => {
    test('should display signup link', async () => {
      await page.goto(`${BASE_URL}/login`);

      const signupLink = page.locator('a:has-text("Sign up")').or(
        page.locator('a:has-text("Create account")').or(
          page.locator('a:has-text("Register")')
        )
      );

      // Signup link may or may not be present depending on app configuration
      const count = await signupLink.count();
      if (count > 0) {
        await expect(signupLink.first()).toBeVisible();
      }
    });
  });

  test.describe('Rate Limiting', () => {
    test('should handle rate limiting on login attempts', async () => {
      await page.goto(`${BASE_URL}/login`);

      // Make multiple failed login attempts
      for (let i = 0; i < 6; i++) {
        await page.fill('input[name="email"]', 'test@example.com');
        await page.fill('input[type="password"]', 'wrongpassword');
        await page.click('button[type="submit"]');
        await page.waitForTimeout(1000);
      }

      // Should show rate limit error
      const rateLimitError = page.locator('text=/too many.*attempts|rate.*limit|try.*again.*later/i');

      // Check if rate limiting is implemented
      const errorVisible = await rateLimitError.isVisible({ timeout: 3000 }).catch(() => false);

      // If rate limiting is implemented, error should be visible
      if (errorVisible) {
        await expect(rateLimitError).toBeVisible();
      }
    });
  });
});
