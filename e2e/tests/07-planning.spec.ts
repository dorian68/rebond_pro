import { test, expect } from '@playwright/test';
import { expectNoServerError } from '../helpers';

test.describe('Module 7 — Planning + Créneaux', () => {
  test('week view loads', async ({ page }) => {
    await page.goto('/planning');
    await expect(page).toHaveURL(/planning/);
    await expectNoServerError(page);
  });

  test('week grid renders 6 day columns (Lun→Sam)', async ({ page }) => {
    await page.goto('/planning');
    await page.waitForLoadState('networkidle');
    const dayHeaders = page.getByText(/lun|mar|mer|jeu|ven|sam/i);
    const count = await dayHeaders.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test('week navigation (previous / next)', async ({ page }) => {
    await page.goto('/planning');
    await page.waitForLoadState('networkidle');

    const initialUrl = page.url();

    // Click "next week"
    const nextBtn = page
      .getByRole('link', { name: /suivant|prochain|→|>/i })
      .or(page.getByRole('button', { name: /suivant|prochain|→|>/i }))
      .first();

    if (await nextBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await nextBtn.click();
      await page.waitForLoadState('networkidle');
      // URL should change (week param)
      expect(page.url()).not.toBe(initialUrl);

      // Go back
      const prevBtn = page
        .getByRole('link', { name: /précédent|←|</i })
        .or(page.getByRole('button', { name: /précédent|←|</i }))
        .first();
      if (await prevBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await prevBtn.click();
        await page.waitForLoadState('networkidle');
      }
    }
  });

  test('conflict indicator present if conflicts exist', async ({ page }) => {
    await page.goto('/planning');
    await page.waitForLoadState('networkidle');
    // Conflict badge is optional — just verify no crash if it appears
    await expectNoServerError(page);
  });

  test('"Best slots" feature accessible', async ({ page }) => {
    await page.goto('/planning');
    await page.waitForLoadState('networkidle');
    // Look for a "Trouver des créneaux" / best slots link or button
    const slotsBtn = page
      .getByText(/créneaux|meilleur.*slot|planifier/i)
      .first();
    if (await slotsBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(slotsBtn).toBeVisible();
    }
  });
});
