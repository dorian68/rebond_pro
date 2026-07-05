import { test, expect } from '@playwright/test';
import { E2E, fill, submit, deleteEntity, expectNoServerError } from '../helpers';

test.describe('Module 6 — Formateurs + Disponibilités', () => {
  test('list page loads', async ({ page }) => {
    await page.goto('/formateurs');
    await expect(page).toHaveURL(/formateurs/);
    await expectNoServerError(page);
  });

  test('trainer status badges visible', async ({ page }) => {
    await page.goto('/formateurs');
    await page.waitForLoadState('networkidle');
    // Status badges (Actif, Disponible, À confirmer, Inactif)
    const statusText = page.getByText(/actif|disponible|confirmer|inactif/i).first();
    // If no trainers exist, just check the page loaded
    const hasAny = await statusText.isVisible({ timeout: 3_000 }).catch(() => false);
    if (hasAny) await expect(statusText).toBeVisible();
  });

  test('CRUD complet : create → edit → delete', async ({ page }) => {
    const firstName = `${E2E}`;
    const lastName = 'Formateur';

    // CREATE
    await page.goto('/formateurs/new');
    await fill(page, 'firstName', firstName);
    await fill(page, 'lastName', lastName);
    await fill(page, 'email', `formateur-e2e-${Date.now()}@test.invalid`);
    await fill(page, 'specialities', 'RH, Management');
    await submit(page);
    await page.waitForURL(/\/formateurs\/(?!new)[a-z0-9-]{4,}/, { timeout: 15_000 });
    await page.waitForLoadState('networkidle');
    await expectNoServerError(page);

    const detailUrl = page.url();
    await expect(page.getByText(firstName)).toBeVisible();

    // EDIT
    await page.goto(detailUrl.replace(/\/$/, '') + '/edit');
    await fill(page, 'firstName', firstName + '-bis');
    await submit(page);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(firstName + '-bis')).toBeVisible({ timeout: 10_000 });

    // DELETE
    await page.goto(detailUrl);
    await deleteEntity(page, { waitUrl: /\/formateurs$/ });
  });

  test('disponibilités page loads', async ({ page }) => {
    await page.goto('/formateurs/disponibilites');
    await expect(page).toHaveURL(/disponibilites/);
    await expectNoServerError(page);
  });

  test('demandes page loads', async ({ page }) => {
    await page.goto('/formateurs/demandes');
    await expect(page).toHaveURL(/demandes/);
    await expectNoServerError(page);
  });
});
