import { test, expect } from '@playwright/test';
import { expectNoServerError } from '../helpers';

test.describe('Module 9 — Qualité Métriques', () => {
  test('page loads', async ({ page }) => {
    await page.goto('/qualite');
    await expect(page).toHaveURL(/qualite/);
    await expectNoServerError(page);
  });

  test('no JS crash', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('/qualite');
    await page.waitForLoadState('networkidle');
    const realErrors = errors.filter(e => !e.includes('ResizeObserver'));
    expect(realErrors).toHaveLength(0);
  });

  test('satisfaction section visible', async ({ page }) => {
    await page.goto('/qualite');
    await page.waitForLoadState('networkidle');
    await expect(
      page.getByText(/satisfaction|note moyenne|avis/i).first()
    ).toBeVisible({ timeout: 8_000 });
  });

  test('taux de présence / complétion visible', async ({ page }) => {
    await page.goto('/qualite');
    await page.waitForLoadState('networkidle');
    const rateSection = page
      .getByText(/présence|complétion|taux/i)
      .first();
    await expect(rateSection).toBeVisible({ timeout: 8_000 });
  });

  test('réclamations / actions correctives sections present', async ({ page }) => {
    await page.goto('/qualite');
    await page.waitForLoadState('networkidle');
    const complaintsSection = page
      .getByText(/réclamation|plainte|amélioration|action corrective/i)
      .first();
    await expect(complaintsSection).toBeVisible({ timeout: 8_000 });
  });

  test('null metrics render gracefully (no crash when no data)', async ({ page }) => {
    // Quality metrics return null when no feedbacks exist
    // The page should still render (not throw 500)
    await page.goto('/qualite');
    await expectNoServerError(page);
    // No "—" or "N/A" crashing
    await page.waitForLoadState('networkidle');
  });
});
