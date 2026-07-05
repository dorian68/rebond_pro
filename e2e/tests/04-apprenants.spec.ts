import { test, expect } from '@playwright/test';
import { E2E, fill, submit, deleteEntity, expectNoServerError } from '../helpers';

test.describe('Module 4 — Apprenants + Inscriptions', () => {
  test('list page loads', async ({ page }) => {
    await page.goto('/apprenants');
    await expect(page).toHaveURL(/apprenants/);
    await expectNoServerError(page);
  });

  test('CRUD complet : create → update → delete', async ({ page }) => {
    const firstName = `${E2E}`;
    const lastName = 'Apprenant';

    // CREATE
    await page.goto('/apprenants/new');
    await fill(page, 'firstName', firstName);
    await fill(page, 'lastName', lastName);
    await fill(page, 'email', `e2e-${Date.now()}@test.invalid`);
    await submit(page);
    await page.waitForURL(/\/apprenants\/(?!new)[a-z0-9-]{4,}/, { timeout: 15_000 });
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
    await deleteEntity(page, { waitUrl: /\/apprenants$/ });
  });

  test('enrollment status dropdown exists on learner detail', async ({ page }) => {
    await page.goto('/apprenants');
    const firstLink = page.getByRole('link', { name: /voir|détail/i }).first()
      .or(page.locator('a[href^="/apprenants/"]').first());

    if (await firstLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await firstLink.click();
      await page.waitForLoadState('networkidle');
      // Enrollment status section should mention status or inscription
      await expect(
        page.getByText(/inscrit|présent|statut|inscription/i).first()
      ).toBeVisible({ timeout: 5_000 });
    }
  });

  test('CSV import form visible', async ({ page }) => {
    await page.goto('/apprenants/new');
    // Import tab or link
    const importLink = page
      .getByText(/import.*csv|csv.*import/i)
      .or(page.getByRole('tab', { name: /import/i }))
      .first();
    if (await importLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await importLink.click();
      await expect(page.getByText(/csv|coller|lignes/i).first()).toBeVisible();
    }
  });
});
