import { test, expect } from '@playwright/test';
import { E2E, fill, pick, submit, deleteEntity, expectNoServerError } from '../helpers';

test.describe('Module 2 — Formations CRUD + Publication', () => {
  test('list page loads', async ({ page }) => {
    await page.goto('/formations');
    await expect(page).toHaveURL(/formations/);
    await expectNoServerError(page);
  });

  test('CRUD complet : create → edit → publish → delete', async ({ page }) => {
    const title = `${E2E} Formation Test`;

    // ── CREATE ──────────────────────────────────────────────────────────────
    await page.goto('/formations/new');
    await fill(page, 'title', title);
    await pick(page, 'modality', 'DISTANCIEL');
    await pick(page, 'level', 'DEBUTANT');
    await pick(page, 'status', 'BROUILLON');
    await fill(page, 'priceEuros', '490');
    await fill(page, 'durationHours', '14');
    await submit(page);
    await page.waitForURL(/\/formations\/(?!new)[a-z0-9-]{4,}/, { timeout: 15_000 });

    const detailUrl = page.url();
    await expect(page.getByText(title)).toBeVisible();
    await expectNoServerError(page);

    // ── EDIT ────────────────────────────────────────────────────────────────
    await page.goto(detailUrl.replace(/\/$/, '') + '/edit');
    // Edit page fetches formation + trainers from remote DB — wait explicitly
    await page.locator('[name="title"]').waitFor({ state: 'visible', timeout: 60_000 });
    await fill(page, 'title', title + ' (édité)');
    await submit(page);
    await expect(page.getByText(title + ' (édité)')).toBeVisible({ timeout: 10_000 });

    // ── TOGGLE PUBLISH ──────────────────────────────────────────────────────
    // Publication button (togglePublish action)
    const publishBtn = page
      .getByRole('button', { name: /publier|dépublier|page publique/i })
      .first();
    if (await publishBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await publishBtn.click();
      await page.waitForLoadState('networkidle');
    }

    // ── DELETE ──────────────────────────────────────────────────────────────
    await page.goto(detailUrl);
    await deleteEntity(page, { waitUrl: /\/formations$/ });
    await expect(page.getByText(title + ' (édité)')).not.toBeVisible({ timeout: 8_000 });
  });

  test('validation error shown on empty title', async ({ page }) => {
    await page.goto('/formations/new');
    // Submit without required field
    await pick(page, 'modality', 'PRESENTIEL');
    await pick(page, 'level', 'INTERMEDIAIRE');
    await pick(page, 'status', 'BROUILLON');
    await submit(page);
    // Should stay on /formations/new or show error
    const hasError = await page
      .getByText(/titre|requis|obligatoire|invalid/i)
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    const stayedOnPage = page.url().includes('/new');
    expect(hasError || stayedOnPage).toBe(true);
  });
});
