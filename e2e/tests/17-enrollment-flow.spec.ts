/**
 * Flux d'inscription complet : formation → session → apprenant → inscription → statut → désinscription.
 * Teste le cœur métier B2B (relation session/apprenant) de bout en bout via l'UI.
 */
import { test, expect } from '@playwright/test';
import { fill, pick, expectNoServerError } from '../helpers';

const TAG = `[E2E-Enroll-${Date.now()}]`;

const FUTURE_START = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
})();
const FUTURE_END = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 31);
  return d.toISOString().slice(0, 10);
})();

test.describe('Module 17 — Flux inscription apprenant → session', () => {
  let formationUrl = '';
  let sessionUrl = '';
  let learnerUrl = '';
  const learnerFirstName = `${TAG}`;
  const learnerLastName = 'Inscrit';

  test('setup — créer formation + session + apprenant', async ({ page }) => {
    // 1. Création formation
    await page.goto('/formations/new');
    await fill(page, 'title', `${TAG} Formation`);
    await pick(page, 'modality', 'DISTANCIEL');
    await pick(page, 'level', 'DEBUTANT');
    await pick(page, 'status', 'BROUILLON');
    await fill(page, 'priceEuros', '100');
    await fill(page, 'durationHours', '7');
    await page.getByRole('button', { name: /créer|enregistrer|sauvegarder/i }).last().click();
    await page.waitForURL(/\/formations\/(?!new)[a-z0-9-]{4,}/, { timeout: 15_000 });
    formationUrl = page.url();

    // 2. Création session sur cette formation
    await page.goto('/sessions/new');
    // Exact label match — pas de regex (TAG contient [ ] qui sont des métacaractères)
    await page.locator('select[name="formationId"]').selectOption({ label: `${TAG} Formation` });
    await page.locator('input[name="startDate"]').fill(FUTURE_START);
    await page.locator('input[name="endDate"]').fill(FUTURE_END);
    await pick(page, 'status', 'OUVERTE');
    await page.getByRole('button', { name: /créer|enregistrer|sauvegarder/i }).last().click();
    await page.waitForURL(/\/sessions\/(?!new)[a-z0-9-]{4,}/, { timeout: 15_000 });
    sessionUrl = page.url();

    // 3. Création apprenant
    await page.goto('/apprenants/new');
    await fill(page, 'firstName', learnerFirstName);
    await fill(page, 'lastName', learnerLastName);
    await page.getByRole('button', { name: /créer|enregistrer|sauvegarder/i }).last().click();
    await page.waitForURL(/\/apprenants\/(?!new)[a-z0-9-]{4,}/, { timeout: 15_000 });
    learnerUrl = page.url();

    expect(formationUrl).toMatch(/\/formations\//);
    expect(sessionUrl).toMatch(/\/sessions\//);
    expect(learnerUrl).toMatch(/\/apprenants\//);
  });

  test('inscription — EnrollPanel : sélectionner apprenant et cliquer Inscrire', async ({ page }) => {
    test.skip(!sessionUrl, 'session non créée (test précédent échoué)');
    await page.goto(sessionUrl);
    await page.waitForLoadState('networkidle');
    await expectNoServerError(page);

    // Le panel d'inscription doit être visible (session OUVERTE, apprenant disponible)
    const enrollSelect = page.locator('select[name="learnerId"]');
    await expect(enrollSelect).toBeVisible({ timeout: 10_000 });

    // Sélectionner l'apprenant E2E — label exact "firstName lastName" (RegExp non supporté ici)
    const escaped = learnerFirstName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await enrollSelect.selectOption({ label: `${learnerFirstName} ${learnerLastName}` });
    await page.getByRole('button', { name: /^inscrire$/i }).click();

    // Après router.refresh() — l'apprenant doit apparaître dans la table
    await expect(page.getByRole('link', { name: new RegExp(escaped) })).toBeVisible({ timeout: 10_000 });
    // Le compteur passe de 0/N à 1/N
    await expect(page.getByText(/apprenants inscrits \(1\//i)).toBeVisible({ timeout: 8_000 });
  });

  test('statut inscription — changer via StatusSelect (PRE_INSCRIT → CONFIRME)', async ({ page }) => {
    test.skip(!sessionUrl, 'session non créée');
    await page.goto(sessionUrl);
    await page.waitForLoadState('networkidle');

    // La ligne de l'apprenant contient un <select> de statut
    const learnerRow = page.locator('tr').filter({ hasText: learnerFirstName });
    const statusSelect = learnerRow.locator('select');
    await expect(statusSelect).toBeVisible({ timeout: 8_000 });

    await statusSelect.selectOption('CONFIRME');
    // Après transition async (useTransition), le select affiche CONFIRME
    await expect(statusSelect).toHaveValue('CONFIRME', { timeout: 8_000 });
  });

  test("désinscription — UnenrollButton retire l'apprenant de la table", async ({ page }) => {
    test.skip(!sessionUrl, 'session non créée');
    await page.goto(sessionUrl);
    await page.waitForLoadState('networkidle');

    // Cliquer le bouton X "Désinscrire" dans la ligne de l'apprenant
    const learnerRow = page.locator('tr').filter({ hasText: learnerFirstName });
    await learnerRow.getByTitle('Désinscrire').click();

    // Après router.refresh() — la table revient à 0 inscrits
    await expect(page.getByText(/aucun apprenant inscrit/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/apprenants inscrits \(0\//i)).toBeVisible({ timeout: 8_000 });
  });

  test('teardown — supprimer apprenant + session + formation', async ({ page }) => {
    test.skip(!learnerUrl || !sessionUrl || !formationUrl, 'URLs non disponibles');

    // Supprimer l'apprenant
    await page.goto(learnerUrl);
    await page.getByRole('button', { name: /supprimer/i }).first().click();
    const confirmLearner = page.getByRole('button', { name: /^oui/i }).first();
    if (await confirmLearner.isVisible({ timeout: 2_000 }).catch(() => false)) await confirmLearner.click();
    await page.waitForURL(/\/apprenants$/, { timeout: 10_000 });

    // Supprimer la session (via sa page détail)
    await page.goto(sessionUrl);
    await page.getByRole('button', { name: /supprimer/i }).first().click();
    const confirmSession = page.getByRole('button', { name: /^oui/i }).first();
    if (await confirmSession.isVisible({ timeout: 2_000 }).catch(() => false)) await confirmSession.click();
    await page.waitForURL(/\/sessions$/, { timeout: 10_000 });

    // Supprimer la formation
    await page.goto(formationUrl);
    await page.getByRole('button', { name: /supprimer/i }).first().click();
    const confirmFormation = page.getByRole('button', { name: /oui.*supprimer|^oui/i }).first();
    if (await confirmFormation.isVisible({ timeout: 2_000 }).catch(() => false)) await confirmFormation.click();
    await page.waitForURL(/\/formations$/, { timeout: 10_000 });
  });
});
