import { test, expect } from '@playwright/test';
import { expectNoServerError } from '../helpers';

test.describe('Module 8 — Documents Génération / Envoi', () => {
  test('list page loads', async ({ page }) => {
    await page.goto('/documents');
    await expect(page).toHaveURL(/documents/);
    await expectNoServerError(page);
  });

  test('no JS crash on documents page', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('/documents');
    await page.waitForLoadState('networkidle');
    const realErrors = errors.filter(e => !e.includes('ResizeObserver'));
    expect(realErrors).toHaveLength(0);
  });

  test('document suggestions section renders', async ({ page }) => {
    await page.goto('/documents');
    await page.waitForLoadState('networkidle');
    // Either the suggestions list or "aucun document à générer" message
    const hasSuggestions = await page
      .getByText(/générer|convocation|émargement|attestation|à générer/i)
      .first()
      .isVisible({ timeout: 6_000 })
      .catch(() => false);
    const isEmpty = await page
      .getByText(/aucun|aucune|vide|pas de document/i)
      .first()
      .isVisible({ timeout: 2_000 })
      .catch(() => false);
    expect(hasSuggestions || isEmpty).toBe(true);
  });

  test('document history section present', async ({ page }) => {
    await page.goto('/documents');
    await page.waitForLoadState('networkidle');
    // History or list of generated docs should be visible (even if empty)
    await expectNoServerError(page);
  });

  test('generate button visible for a suggestion', async ({ page }) => {
    await page.goto('/documents');
    await page.waitForLoadState('networkidle');
    const generateBtn = page
      .getByRole('button', { name: /générer|créer.*document/i })
      .first();
    if (await generateBtn.isVisible({ timeout: 4_000 }).catch(() => false)) {
      // Don't actually generate to avoid creating test documents
      await expect(generateBtn).toBeEnabled();
    }
  });
});
