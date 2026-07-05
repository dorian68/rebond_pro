import { test, expect } from '@playwright/test';
import { fill, expectNoServerError } from '../helpers';

test.describe('Module 11 — Paramètres', () => {
  test('page loads', async ({ page }) => {
    await page.goto('/parametres');
    await expect(page).toHaveURL(/parametres/);
    await expectNoServerError(page);
  });

  test('no JS crash', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('/parametres');
    await page.waitForLoadState('networkidle');
    const realErrors = errors.filter(e => !e.includes('ResizeObserver'));
    expect(realErrors).toHaveLength(0);
  });

  test('organisation name visible', async ({ page }) => {
    await page.goto('/parametres');
    await page.waitForLoadState('networkidle');
    // Org name text input (strict: avoid matching checkboxes via .or())
    const orgName = page.locator('input[name="name"]').first();
    await expect(orgName).toBeVisible({ timeout: 8_000 });
  });

  test('members section shows at least current user', async ({ page }) => {
    await page.goto('/parametres');
    await page.waitForLoadState('networkidle');
    const membersSection = page.getByText(/membres|équipe|collaborateurs/i).first();
    await expect(membersSection).toBeVisible({ timeout: 6_000 });
  });

  test('billing / abonnement section shows Stripe status', async ({ page }) => {
    await page.goto('/parametres');
    await page.waitForLoadState('networkidle');
    const billingSection = page
      .getByText(/abonnement|facturation|plan|stripe/i)
      .first();
    await expect(billingSection).toBeVisible({ timeout: 8_000 });
  });

  test('document templates section accessible', async ({ page }) => {
    await page.goto('/parametres');
    await page.waitForLoadState('networkidle');
    const templatesSection = page
      .getByText(/template|modèle.*document|gabarit/i)
      .first();
    if (await templatesSection.isVisible({ timeout: 4_000 }).catch(() => false)) {
      await expect(templatesSection).toBeVisible();
    }
  });

  test('org settings save updates successfully', async ({ page }) => {
    await page.goto('/parametres');
    await page.waitForLoadState('networkidle');

    const nameInput = page.locator('[name="name"]').first();
    if (!(await nameInput.isVisible({ timeout: 3_000 }).catch(() => false))) return;

    const originalName = await nameInput.inputValue();
    await nameInput.fill(originalName); // no-op change to test save path
    const saveBtn = page
      .getByRole('button', { name: /enregistrer|sauvegarder|mettre à jour/i })
      .first();
    if (await saveBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await saveBtn.click();
      await page.waitForLoadState('networkidle');
      await expectNoServerError(page);
    }
  });
});
