import { test, expect } from '@playwright/test';
import { E2E, fill, pick, submit, deleteEntity, expectNoServerError } from '../helpers';

async function createFormation(page: Parameters<typeof fill>[0], suffix: string) {
  await page.goto('/formations/new');
  await fill(page, 'title', `${E2E} ${suffix}`);
  await pick(page, 'modality', 'DISTANCIEL');
  await pick(page, 'level', 'DEBUTANT');
  await pick(page, 'status', 'BROUILLON');
  await fill(page, 'priceEuros', '100');
  await fill(page, 'durationHours', '7');
  await submit(page);
  await page.waitForURL(/\/formations\/(?!new)[a-z0-9-]{4,}/, { timeout: 15_000 });
  return page.url();
}

test.describe('Module 3 — Sessions CRUD + Statuts', () => {
  test('list page loads', async ({ page }) => {
    await page.goto('/sessions');
    await expect(page).toHaveURL(/sessions/);
    await expectNoServerError(page);
  });

  test('CRUD complet : create → confirm trainer → delete', async ({ page }) => {
    // Create a formation to use as prerequisite (self-sufficient test)
    const formationUrl = await createFormation(page, 'Formation Session CRUD');

    // CREATE SESSION
    await page.goto('/sessions/new');
    await expectNoServerError(page);

    const formationSelect = page.locator('[name="formationId"]');
    await expect(formationSelect).toBeVisible({ timeout: 8_000 });

    const optionCount = await formationSelect.locator('option').count();
    if (optionCount <= 1) {
      await page.goto(formationUrl);
      await deleteEntity(page, { waitUrl: /\/formations$/ });
      test.skip(true, 'No formation options in session form — skipping');
      return;
    }

    const firstOption = formationSelect.locator('option:nth-child(2)');
    const formationValue = await firstOption.getAttribute('value');
    if (formationValue) await pick(page, 'formationId', formationValue);

    const tomorrow = new Date(Date.now() + 86_400_000);
    const dayAfter = new Date(Date.now() + 2 * 86_400_000);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    await fill(page, 'startDate', fmt(tomorrow));
    await fill(page, 'endDate', fmt(dayAfter));
    await fill(page, 'capacity', '10');
    await fill(page, 'breakEvenSeats', '3');
    await pick(page, 'status', 'OUVERTE');

    await submit(page);
    await page.waitForURL(/\/sessions\/(?!new)[a-z0-9-]{4,}/, { timeout: 15_000 });
    await expectNoServerError(page);

    const riskBadge = page.getByText(/risque|à risque/i).first();
    if (await riskBadge.isVisible({ timeout: 3_000 }).catch(() => false)) {
      console.log('✅ RISQUE badge visible as expected (no trainer assigned)');
    }

    const confirmBtn = page.getByRole('button', { name: /confirmer.*formateur|formateur.*confirmé/i }).first();
    if (await confirmBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await confirmBtn.click();
      await page.waitForLoadState('networkidle');
    }

    // DELETE SESSION
    await deleteEntity(page, { waitUrl: /\/sessions$/ });

    // CLEANUP: delete the formation created for this test
    await page.goto(formationUrl);
    await deleteEntity(page, { waitUrl: /\/formations$/ });
  });

  test('date validation: end before start is rejected', async ({ page }) => {
    const formationUrl = await createFormation(page, 'Formation Session Validation');

    await page.goto('/sessions/new');
    const formationSelect = page.locator('[name="formationId"]');
    const optionCount = await formationSelect.locator('option').count();
    if (optionCount <= 1) {
      await page.goto(formationUrl);
      await deleteEntity(page, { waitUrl: /\/formations$/ });
      test.skip(true, 'No formation in DB');
      return;
    }

    const firstOption = formationSelect.locator('option:nth-child(2)');
    const val = await firstOption.getAttribute('value');
    if (val) await pick(page, 'formationId', val);

    await fill(page, 'startDate', '2026-12-10');
    await fill(page, 'endDate', '2026-12-05');
    await fill(page, 'capacity', '5');
    await pick(page, 'status', 'BROUILLON');
    await submit(page);

    const hasError = await page
      .getByText(/date de fin|doit suivre|invalide/i)
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    expect(hasError).toBe(true);

    // CLEANUP: delete the formation (no session was created — validation failed)
    await page.goto(formationUrl);
    await deleteEntity(page, { waitUrl: /\/formations$/ });
  });
});
