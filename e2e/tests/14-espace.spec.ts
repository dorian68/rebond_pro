import { test, expect } from '@playwright/test';
import { expectNoServerError } from '../helpers';

/**
 * Tests de l'espace bénéficiaire (/espace).
 * L'utilisateur DEV_AUTOLOGIN (OWNER) n'est pas lié à un profil bénéficiaire.
 * Toutes les pages affichent un empty state "non relié" — comportement attendu et non-crash.
 */
test.describe('Module 14 — Espace Bénéficiaire (/espace)', () => {
  test('espace home — affiche message "Bienvenue" pour user non lié', async ({ page }) => {
    await page.goto('/espace');
    await page.waitForLoadState('networkidle');
    await expectNoServerError(page);
    await expect(page.getByText('Bienvenue sur votre espace').first()).toBeVisible({ timeout: 10_000 });
  });

  test('espace catalogue — empty state pour user non lié', async ({ page }) => {
    await page.goto('/espace/catalogue');
    await page.waitForLoadState('networkidle');
    await expectNoServerError(page);
    await expect(page.getByText('Catalogue de formations').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Bientôt disponible').first()).toBeVisible({ timeout: 8_000 });
  });

  test('espace profil — page charge avec empty state', async ({ page }) => {
    await page.goto('/espace/profil');
    await page.waitForLoadState('networkidle');
    await expectNoServerError(page);
    await expect(page.getByText('Mon profil').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Espace en préparation').first()).toBeVisible({ timeout: 8_000 });
  });

  test('espace parcours — page charge avec empty state', async ({ page }) => {
    await page.goto('/espace/parcours');
    await page.waitForLoadState('networkidle');
    await expectNoServerError(page);
    await expect(page.getByText('Mon parcours').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Parcours en préparation').first()).toBeVisible({ timeout: 8_000 });
  });

  test('espace pas de crash JS', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('/espace');
    await page.waitForLoadState('networkidle');
    const realErrors = errors.filter(e => !e.includes('ResizeObserver'));
    expect(realErrors, `JS errors: ${realErrors.join(', ')}`).toHaveLength(0);
  });
});
