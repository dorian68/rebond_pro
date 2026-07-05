import { test, expect } from '@playwright/test';

/**
 * Tests du site vitrine public (route group (site)/).
 * Pages "use client" avec animations framer-motion.
 * On vérifie le chargement et l'absence d'erreur — on n'assert pas toBeVisible()
 * sur des éléments animés (opacity:0 initial) mais on check le titre et l'URL.
 */
test.describe('Module 15 — Site Vitrine (/)', () => {
  async function expectPageLoads(page: import('@playwright/test').Page, path: string) {
    const resp = await page.goto(path);
    expect(resp?.status(), `${path} returned HTTP error`).toBeLessThan(500);
    await page.waitForLoadState('networkidle');
    expect(page.url(), `${path} should not redirect to error`).not.toMatch(/error|500/i);
  }

  test('page accueil charge et titre correct', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const title = await page.title();
    expect(title).toMatch(/Rebond/i);
    expect(page.url()).not.toMatch(/error|500/i);
  });

  test('a-propos charge sans erreur', async ({ page }) => {
    await expectPageLoads(page, '/a-propos');
  });

  test('tarifs charge sans erreur', async ({ page }) => {
    await expectPageLoads(page, '/tarifs');
  });

  test('bilan-de-competences charge sans erreur', async ({ page }) => {
    await expectPageLoads(page, '/bilan-de-competences');
  });

  test('methode charge sans erreur', async ({ page }) => {
    await expectPageLoads(page, '/methode');
  });

  test('contact charge sans erreur', async ({ page }) => {
    await expectPageLoads(page, '/contact');
  });

  test('blog liste charge sans erreur', async ({ page }) => {
    await expectPageLoads(page, '/blog');
  });

  test('centres charge sans erreur', async ({ page }) => {
    await expectPageLoads(page, '/centres');
  });

  test('tarifs — pas de crash JS', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('/tarifs');
    await page.waitForLoadState('networkidle');
    const realErrors = errors.filter(e => !e.includes('ResizeObserver'));
    expect(realErrors, `JS errors: ${realErrors.join(', ')}`).toHaveLength(0);
  });

  test('accueil — pas de crash JS', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const realErrors = errors.filter(e => !e.includes('ResizeObserver'));
    expect(realErrors, `JS errors: ${realErrors.join(', ')}`).toHaveLength(0);
  });
});
