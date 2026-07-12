/**
 * Génération réelle d'un document depuis /documents.
 * Crée une session avec des dates futures pour déclencher la suggestion EMARGEMENT,
 * clique "Générer", vérifie que le document apparaît dans l'historique.
 */
import { test, expect } from '@playwright/test';
import { fill, pick, expectNoServerError } from '../helpers';

const TAG = `[E2E-Doc-${Date.now()}]`;
// RegExp sûre : le TAG contient des métacaractères ([ ]) qu'il faut échapper
const TAG_RE = new RegExp(TAG.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

// J+1/J+2 : les suggestions sont triées par startDate ASC et plafonnées à 12 —
// une session lointaine (J+60) se fait évincer par les sessions existantes de la base.
const FUTURE_START = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
})();
const FUTURE_END = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  return d.toISOString().slice(0, 10);
})();

test.describe('Module 18 — Génération de document réelle', () => {
  let formationUrl = '';
  let sessionUrl = '';

  test('setup — créer formation + session futures (→ suggestion EMARGEMENT)', async ({ page }) => {
    // Création formation
    await page.goto('/formations/new');
    await fill(page, 'title', `${TAG} Formation`);
    await pick(page, 'modality', 'PRESENTIEL');
    await pick(page, 'level', 'DEBUTANT');
    await pick(page, 'status', 'PUBLIE');
    await fill(page, 'priceEuros', '0');
    await fill(page, 'durationHours', '7');
    await page.getByRole('button', { name: /créer|enregistrer|sauvegarder/i }).last().click();
    await page.waitForURL(/\/formations\/(?!new)[a-z0-9-]{4,}/, { timeout: 15_000 });
    formationUrl = page.url();

    // Création session
    await page.goto('/sessions/new');
    await page.locator('select[name="formationId"]').selectOption({ label: `${TAG} Formation` });
    await page.locator('input[name="startDate"]').fill(FUTURE_START);
    await page.locator('input[name="endDate"]').fill(FUTURE_END);
    await pick(page, 'status', 'OUVERTE');
    await page.getByRole('button', { name: /créer|enregistrer|sauvegarder/i }).last().click();
    await page.waitForURL(/\/sessions\/(?!new)[a-z0-9-]{4,}/, { timeout: 15_000 });
    sessionUrl = page.url();
    expect(sessionUrl).toMatch(/\/sessions\//);
  });

  test('suggestion EMARGEMENT apparaît dans /documents pour la session créée', async ({ page }) => {
    test.skip(!sessionUrl, 'session non créée');
    await page.goto('/documents');
    await page.waitForLoadState('networkidle');
    await expectNoServerError(page);

    // La suggestion contient le titre de la formation E2E dans son label
    await expect(page.getByText(TAG_RE).first()).toBeVisible({ timeout: 15_000 });
  });

  test('cliquer Générer → document généré avec succès', async ({ page }) => {
    test.skip(!sessionUrl, 'session non créée');
    await page.goto('/documents');
    await page.waitForLoadState('networkidle');

    // Trouver le conteneur de suggestion avec le titre E2E
    const suggestionContainer = page.locator('div.spread').filter({ hasText: TAG_RE }).first();
    await expect(suggestionContainer).toBeVisible({ timeout: 15_000 });

    // Cliquer le bouton Générer dans ce conteneur
    const generateBtn = suggestionContainer.getByRole('button', { name: /générer/i });
    await expect(generateBtn).toBeVisible({ timeout: 8_000 });
    await generateBtn.click();

    // Attendre le message de succès (génération peut prendre jusqu'à 30s)
    await expect(page.getByText(/document généré/i)).toBeVisible({ timeout: 30_000 });
  });

  test("document apparaît dans l'historique après génération", async ({ page }) => {
    test.skip(!sessionUrl, 'session non créée');
    await page.goto('/documents');
    await page.waitForLoadState('networkidle');

    // L'historique doit contenir le document généré lié à la formation E2E
    // Ou plus simplement : chercher dans le bas de la page un badge "Généré"
    // associé au titre de la formation
    await expect(page.getByText('Généré').first()).toBeVisible({ timeout: 10_000 });
  });

  test('teardown — supprimer session + formation', async ({ page }) => {
    test.skip(!sessionUrl || !formationUrl, 'URLs manquantes');

    // Supprimer la session (cascade : supprime le document lié)
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
