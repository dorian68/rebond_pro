import { test, expect } from '@playwright/test';
import { expectNoServerError } from '../helpers';

/**
 * Tests des pages publiques (route group (public)/).
 * Marketplace, légal, ikigai (avec token invalide → 404).
 */
test.describe('Module 16 — Pages Publiques', () => {
  test('marketplace — page charge avec contenu formations', async ({ page }) => {
    await page.goto('/marketplace');
    await page.waitForLoadState('networkidle');
    await expectNoServerError(page);
    // La page a un titre metadata "Trouver une formation"
    const title = await page.title();
    expect(title).toMatch(/formation|rebond/i);
    await expect(page).toHaveURL(/\/marketplace/);
  });

  test('marketplace — pas de crash JS', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('/marketplace');
    await page.waitForLoadState('networkidle');
    const realErrors = errors.filter(e => !e.includes('ResizeObserver'));
    expect(realErrors, `JS errors: ${realErrors.join(', ')}`).toHaveLength(0);
  });

  test('legal CGU — page charge avec contenu légal', async ({ page }) => {
    await page.goto('/legal/cgu');
    await page.waitForLoadState('networkidle');
    await expectNoServerError(page);
    await expect(page.getByText("Conditions Générales d'Utilisation").first()).toBeVisible({ timeout: 10_000 });
  });

  test('legal confidentialité — page charge', async ({ page }) => {
    await page.goto('/legal/confidentialite');
    await page.waitForLoadState('networkidle');
    await expectNoServerError(page);
    await expect(page).toHaveURL(/\/legal\/confidentialite/);
  });

  test('bilan ikigai avec token invalide — retourne 404', async ({ page }) => {
    const resp = await page.goto('/bilan/ikigai/token-invalide-xyz');
    // Next.js notFound() retourne un status 404
    expect(resp?.status()).toBe(404);
  });
});
