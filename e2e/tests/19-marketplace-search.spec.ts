/**
 * Marketplace publique — recherche, filtres, navigation.
 * Teste le moteur de recherche et les filtres facettes côté public (SSR, aucune auth requise).
 */
import { test, expect } from '@playwright/test';

test.describe('Module 19 — Marketplace : recherche et filtres', () => {
  test('recherche textuelle — URL reflète le paramètre ?q=', async ({ page }) => {
    await page.goto('/marketplace');
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('input[name="q"]');
    await expect(searchInput).toBeVisible({ timeout: 8_000 });

    await searchInput.fill('formation');
    await page.getByRole('button', { name: /rechercher/i }).click();
    await page.waitForLoadState('networkidle');

    // L'URL doit contenir ?q=formation
    expect(page.url()).toContain('q=formation');
  });

  test('recherche textuelle — la page se recharge sans erreur serveur', async ({ page }) => {
    await page.goto('/marketplace?q=test');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/500|erreur serveur/i)).not.toBeVisible();
    await expect(page).toHaveURL(/q=test/);
  });

  test('filtre modalité — URL reflète le paramètre &modality=', async ({ page }) => {
    await page.goto('/marketplace');
    await page.waitForLoadState('networkidle');

    const modalitySelect = page.locator('select[name="modality"]');
    await expect(modalitySelect).toBeVisible({ timeout: 8_000 });

    await modalitySelect.selectOption('DISTANCIEL');
    // Le form method=GET soumet en changeant la sélection (ou appuyer submit)
    // Certains formulaires ont un bouton submit, d'autres auto-soumettent
    // On cherche un bouton de type submit dans le formulaire
    await page.getByRole('button', { name: /rechercher/i }).click();
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('modality=DISTANCIEL');
  });

  test('filtre niveau — URL reflète le paramètre &level=', async ({ page }) => {
    await page.goto('/marketplace');
    await page.waitForLoadState('networkidle');

    await page.locator('select[name="level"]').selectOption('DEBUTANT');
    await page.getByRole('button', { name: /rechercher/i }).click();
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('level=DEBUTANT');
  });

  test('filtre vide — retour à la liste complète', async ({ page }) => {
    await page.goto('/marketplace?q=xyz_inexistant_123&modality=DISTANCIEL');
    await page.waitForLoadState('networkidle');
    // La page charge sans erreur même si 0 résultat
    await expect(page.getByText(/500|erreur serveur/i)).not.toBeVisible();
  });

  test('pas de crash JS sur marketplace', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('/marketplace');
    await page.waitForLoadState('networkidle');
    const realErrors = errors.filter(e => !e.includes('ResizeObserver'));
    expect(realErrors, `JS errors: ${realErrors.join(', ')}`).toHaveLength(0);
  });
});
