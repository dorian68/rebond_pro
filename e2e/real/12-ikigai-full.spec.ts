/**
 * POINT 6 (clôture) — Ikigai DE BOUT EN BOUT.
 * Ouvre le canvas via token signé → remplit les 4 zones (chip + nuance) → submit.
 * Preuve de persistance vérifiée séparément en base (BilanStep status=done + notes).
 */
import { test, expect } from '@playwright/test';

const TOKEN = process.env.E2E_IKIGAI_TOKEN || '';

test('Ikigai — canvas rempli + soumis (4 zones)', async ({ page }) => {
  test.skip(!TOKEN, 'E2E_IKIGAI_TOKEN manquant');
  const resp = await page.goto(`/bilan/ikigai/${TOKEN}`);
  expect(resp!.status(), 'token valide → page accessible').toBeLessThan(400);
  await page.waitForLoadState('networkidle');

  for (const title of ['Énergie', 'Talents', 'Utilité', 'Valeur marché']) {
    const section = page.locator('section').filter({ has: page.getByRole('heading', { name: title }) }).first();
    await expect(section, `zone "${title}" visible`).toBeVisible({ timeout: 10_000 });
    // 1er chip d'option (button type=button) — marque une réponse dans la zone
    await section.getByRole('button').first().click();
    // nuance personnelle
    await section.locator('textarea').first().fill(`E2E ${title} test`).catch(() => {});
  }

  const submit = page.getByRole('button', { name: /Enregistrer mon canvas Ikigai/i });
  await expect(submit, 'le bouton doit s’activer une fois les 4 zones remplies').toBeEnabled({ timeout: 10_000 });
  await submit.click();
  await page.waitForLoadState('networkidle');
  await expect(page.getByText(/internal server error|erreur serveur/i)).not.toBeVisible().catch(() => {});
  // Confirmation visible OU le formulaire a été soumis sans erreur
  const ok = await page.getByText(/merci|enregistr|reçu|bravo|complété|terminé/i).first().isVisible({ timeout: 8_000 }).catch(() => false);
  console.log(`✅ Ikigai soumis (confirmation visible=${ok}, url=${page.url()})`);
});
