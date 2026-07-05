import { test, expect } from '@playwright/test';
import { expectNoServerError } from '../helpers';

test.describe('Module 12 — Espace Admin Plateforme', () => {
  test('admin overview — KPIs et cartes chargent', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await expectNoServerError(page);
    // KPI labels present
    await expect(page.getByText('Centres de formation').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Formateurs actifs').first()).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText('Bénéficiaires (bilan)').first()).toBeVisible({ timeout: 8_000 });
  });

  test('admin centres — liste charge', async ({ page }) => {
    await page.goto('/admin/centres');
    await page.waitForLoadState('networkidle');
    await expectNoServerError(page);
    await expect(page.getByText('Centres de formation').first()).toBeVisible({ timeout: 10_000 });
  });

  test('admin bénéficiaires — liste charge', async ({ page }) => {
    await page.goto('/admin/beneficiaires');
    await page.waitForLoadState('networkidle');
    await expectNoServerError(page);
    // Page loads without 500
    await expect(page).toHaveURL(/\/admin\/beneficiaires/);
  });

  test('admin formateurs — liste charge', async ({ page }) => {
    await page.goto('/admin/formateurs');
    await page.waitForLoadState('networkidle');
    await expectNoServerError(page);
    await expect(page).toHaveURL(/\/admin\/formateurs/);
  });

  test('admin finances — page charge', async ({ page }) => {
    await page.goto('/admin/finances');
    await page.waitForLoadState('networkidle');
    await expectNoServerError(page);
    await expect(page).toHaveURL(/\/admin\/finances/);
  });

  test('admin roadmap — page charge', async ({ page }) => {
    await page.goto('/admin/roadmap');
    await page.waitForLoadState('networkidle');
    await expectNoServerError(page);
    await expect(page.getByText('Roadmap').first()).toBeVisible({ timeout: 10_000 });
  });

  test('admin agents — page charge', async ({ page }) => {
    await page.goto('/admin/agents');
    await page.waitForLoadState('networkidle');
    await expectNoServerError(page);
    await expect(page).toHaveURL(/\/admin\/agents/);
  });

  test('admin pas de crash JS', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    const realErrors = errors.filter(e => !e.includes('ResizeObserver'));
    expect(realErrors, `JS errors: ${realErrors.join(', ')}`).toHaveLength(0);
  });
});
