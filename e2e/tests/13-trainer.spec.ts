import { test, expect } from '@playwright/test';
import { expectNoServerError } from '../helpers';

/**
 * Tests de l'espace formateur (/trainer).
 * L'utilisateur DEV_AUTOLOGIN (OWNER) n'a pas de profil formateur lié en DB.
 * - /trainer (home) → redirige vers /dashboard (comportement attendu pour OWNER sans profil)
 * - Les autres pages affichent un empty state "Compte non rattaché"
 */
test.describe('Module 13 — Espace Formateur (/trainer)', () => {
  test('trainer home — redirige dashboard si aucun profil formateur lié', async ({ page }) => {
    await page.goto('/trainer');
    await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
    await expectNoServerError(page);
  });

  test('trainer disponibilités — empty state "Compte non rattaché"', async ({ page }) => {
    await page.goto('/trainer/disponibilites');
    await page.waitForLoadState('networkidle');
    await expectNoServerError(page);
    await expect(page.getByText('Compte non rattaché').first()).toBeVisible({ timeout: 10_000 });
  });

  test('trainer profil — page charge avec empty state', async ({ page }) => {
    await page.goto('/trainer/profil');
    await page.waitForLoadState('networkidle');
    await expectNoServerError(page);
    await expect(page.getByText('Mon profil').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Compte non rattaché').first()).toBeVisible({ timeout: 8_000 });
  });

  test('trainer demandes — page charge avec empty state', async ({ page }) => {
    await page.goto('/trainer/demandes');
    await page.waitForLoadState('networkidle');
    await expectNoServerError(page);
    await expect(page.getByText('Mes demandes').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Compte non rattaché').first()).toBeVisible({ timeout: 8_000 });
  });

  test('trainer planning — page charge avec empty state', async ({ page }) => {
    await page.goto('/trainer/planning');
    await page.waitForLoadState('networkidle');
    await expectNoServerError(page);
    await expect(page.getByText('Mon planning').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Compte non rattaché').first()).toBeVisible({ timeout: 8_000 });
  });

  test('trainer pas de crash JS', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('/trainer/disponibilites');
    await page.waitForLoadState('networkidle');
    const realErrors = errors.filter(e => !e.includes('ResizeObserver'));
    expect(realErrors, `JS errors: ${realErrors.join(', ')}`).toHaveLength(0);
  });
});
