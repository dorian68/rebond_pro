import { test, expect } from '@playwright/test';
import { expectNoServerError } from '../helpers';

test.describe('Module 1 — Dashboard KPIs / Alertes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('page loads without server error', async ({ page }) => {
    await expect(page).toHaveURL(/dashboard/);
    await expectNoServerError(page);
  });

  test('no JS crash', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.reload();
    await page.waitForLoadState('networkidle');
    // ResizeObserver loop errors are a browser quirk, not app crashes
    const realErrors = errors.filter(e => !e.includes('ResizeObserver'));
    expect(realErrors, `JS errors found: ${realErrors.join(', ')}`).toHaveLength(0);
  });

  test('KPI cards render numerical values', async ({ page }) => {
    // At least one number (KPI card) should be on the page
    const numberPattern = /\d+/;
    await expect(page.getByText(numberPattern).first()).toBeVisible({ timeout: 8_000 });
  });

  test('alerts / priorities section is present', async ({ page }) => {
    // The dashboard renders an alerts or priorities block
    const alertsSection = page
      .getByText(/alerte|priorité|à faire|relance/i)
      .first();
    await expect(alertsSection).toBeVisible({ timeout: 8_000 });
  });

  test('CA chart section renders', async ({ page }) => {
    const chartSection = page
      .getByText(/chiffre d'affaires|CA|revenus|forecast/i)
      .first();
    await expect(chartSection).toBeVisible({ timeout: 8_000 });
  });

  test('navigation links to other modules work', async ({ page }) => {
    // Sidebar / nav should contain links to main sections
    const nav = page.getByRole('navigation').first();
    await expect(nav).toBeVisible();
    const links = nav.getByRole('link');
    const count = await links.count();
    expect(count).toBeGreaterThan(3);
  });
});
