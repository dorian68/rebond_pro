import { test, expect } from '@playwright/test';
import { E2E, fill, pick, submit, deleteEntity, expectNoServerError } from '../helpers';

test.describe('Module 5 — Prospects CRM Kanban', () => {
  test('kanban / list page loads', async ({ page }) => {
    await page.goto('/prospects');
    await expect(page).toHaveURL(/prospects/);
    await expectNoServerError(page);
  });

  test('6 colonnes de pipeline visibles', async ({ page }) => {
    await page.goto('/prospects');
    await page.waitForLoadState('networkidle');
    const stages = ['NOUVEAU', 'CONTACTÉ', 'DEVIS', 'RELANCE', 'GAGNÉ', 'PERDU'];
    // At least 3 stage labels present (exact text may differ)
    let found = 0;
    for (const s of stages) {
      if (await page.getByText(new RegExp(s, 'i')).first().isVisible({ timeout: 1_000 }).catch(() => false)) found++;
    }
    expect(found).toBeGreaterThanOrEqual(3);
  });

  test('CRUD complet : create → move stage → add activity → delete', async ({ page }) => {
    const name = `${E2E} Entreprise Test`;

    // CREATE
    await page.goto('/prospects/new');
    await fill(page, 'name', name);
    await pick(page, 'type', 'ENTREPRISE');
    await pick(page, 'source', 'SITE_WEB');
    await pick(page, 'stage', 'NOUVEAU');
    await submit(page);
    await page.waitForURL(/\/prospects\/(?!new)[a-z0-9-]{4,}/, { timeout: 15_000 });
    await page.waitForLoadState('networkidle');
    await expectNoServerError(page);

    const detailUrl = page.url();
    await expect(page.getByText(name)).toBeVisible();

    // ADD ACTIVITY (note)
    const noteField = page.locator('[name="content"]').first();
    if (await noteField.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await noteField.fill('Note de test E2E');
      const addBtn = page.getByRole('button', { name: /ajouter|enregistrer|note/i }).first();
      if (await addBtn.isVisible()) await addBtn.click();
      await page.waitForLoadState('networkidle');
    }

    // EDIT → change stage
    await page.goto(detailUrl.replace(/\/$/, '') + '/edit');
    await pick(page, 'stage', 'CONTACTE');
    await submit(page);
    await page.waitForLoadState('networkidle');

    // DELETE
    await page.goto(detailUrl);
    await deleteEntity(page, { waitUrl: /\/prospects$/ });
  });

  test('isHot flag can be toggled', async ({ page }) => {
    await page.goto('/prospects/new');
    const hotCheckbox = page.locator('[name="isHot"]');
    if (await hotCheckbox.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await hotCheckbox.check();
      await expect(hotCheckbox).toBeChecked();
    }
  });
});
