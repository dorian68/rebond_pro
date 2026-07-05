import type { Page, Dialog } from '@playwright/test';
import { expect } from '@playwright/test';

/** Unique tag per test run — prefix all test-created entities */
export const E2E = `[E2E-${Date.now()}]`;

/** Fill a form field by its name attribute (stable across UI changes) */
export async function fill(page: Page, name: string, value: string) {
  await page.locator(`[name="${name}"]`).fill(value);
}

/** Select an option by its value in a <select name="..."> */
export async function pick(page: Page, name: string, value: string) {
  await page.locator(`[name="${name}"]`).selectOption(value);
}

/** Click the primary submit button (matches most French form labels) */
export async function submit(page: Page) {
  await page
    .getByRole('button', { name: /créer|enregistrer|sauvegarder|ajouter|valider|soumettre/i })
    .last() // .last() skips BulkEntityCreate batch button which renders first in the DOM
    .click();
}

/** Wait for a success indicator (redirect or toast) */
export async function expectSuccess(page: Page, urlPattern?: RegExp) {
  if (urlPattern) {
    await page.waitForURL(urlPattern, { timeout: 15_000 });
    return;
  }
  await expect(
    page
      .getByRole('alert')
      .or(page.getByText(/enregistré|créé|mis à jour|succès/i))
  )
    .toBeVisible({ timeout: 8_000 })
    .catch(() => {});
}

/** Delete an entity and confirm any modal / browser dialog */
export async function deleteEntity(page: Page, { waitUrl }: { waitUrl?: RegExp } = {}) {
  const dialogHandler = (dialog: Dialog) => void dialog.accept();
  page.on('dialog', dialogHandler);

  const deleteBtn = page.getByRole('button', { name: /supprimer/i }).first();
  await expect(deleteBtn).toBeVisible({ timeout: 5_000 });
  await deleteBtn.click();

  // Custom confirmation modal — buttons are "Oui" (sessions/apprenants/etc) or "Oui, supprimer" (formations)
  const confirmBtn = page.getByRole('button', { name: /^oui|supprimer définitivement/i }).first();
  const hasModal = await confirmBtn.isVisible({ timeout: 2_000 }).catch(() => false);
  if (hasModal) await confirmBtn.click();

  if (waitUrl) await page.waitForURL(waitUrl, { timeout: 12_000 });
  page.off('dialog', dialogHandler);
}

/** Assert no 500 / crash visible on page */
export async function expectNoServerError(page: Page) {
  await expect(page.getByText(/500|erreur serveur|internal server error/i)).not.toBeVisible();
}
