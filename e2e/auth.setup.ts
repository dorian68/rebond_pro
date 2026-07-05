import { test as setup, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const AUTH_FILE = path.join(__dirname, '.auth/user.json');

setup('authenticate', async ({ page }) => {
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });

  const isLocal = (process.env.E2E_BASE_URL ?? 'http://localhost:3000').includes('localhost');

  if (isLocal) {
    // DEV_AUTOLOGIN=true in .env.local → session created server-side, no cookie flow needed
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    if (page.url().includes('/login')) {
      // DEV_AUTOLOGIN not active → fall back to real login
      await doLogin(page);
    } else {
      await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 });
    }
  } else {
    await page.goto('/login');
    await doLogin(page);
  }

  await page.context().storageState({ path: AUTH_FILE });
  console.log(`✅ Auth saved to ${AUTH_FILE}`);
});

async function doLogin(page: import('@playwright/test').Page) {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  if (!email || !password) {
    throw new Error(
      'Auth required. Set E2E_EMAIL + E2E_PASSWORD, or enable DEV_AUTOLOGIN=true in .env.local for localhost.'
    );
  }
  // Select "Espace centre" (training center space)
  await page.getByRole('button', { name: /espace centre/i }).click();
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.locator('[type="submit"]').click();
  await page.waitForURL(/dashboard/, { timeout: 20_000 });
}
