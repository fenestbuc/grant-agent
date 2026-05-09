
import { test, expect } from '@playwright/test';

// Skip running in standard CI unless we explicitly want a staging DB test
test.describe.skip('True Staging Workflows', () => {
  
  test('Login and view dashboard', async ({ page }) => {
    // Requires process.env.TEST_USER_EMAIL and TEST_USER_PASSWORD
    await page.goto('/login');
    
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.click('button[type="submit"]');
    
    // In a real environment with magic links, we'd need to intercept the email.
    // For password auth (if enabled on staging):
    // await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD);
    
    // Expect to land on dashboard
    await expect(page.locator('text=Welcome')).toBeVisible({ timeout: 10000 });
  });

  test('Semantic recommendations load', async ({ page }) => {
    await page.goto('/grants');
    
    // Click recommended tab
    await page.click('text=Recommended for You');
    
    // Wait for the backend LLM service to process vector search
    await expect(page.locator('.grant-card')).not.toHaveCount(0, { timeout: 15000 });
  });

});
