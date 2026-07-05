/**
 * POINT 3 — CHAÎNES INTER-ENTITÉS RÉELLES (preuve = effet en bout de chaîne).
 * A) formation → session → apprenant inscrit → génération émargement → DOWNLOAD → le nom de l'apprenant est DANS le PDF.
 * B) TRAINER crée une demande de changement → OWNER approuve → statut "Acceptée" persisté (reload).
 */
import { test, expect, type Browser, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { extractText } from '../parse-doc';
import { appUrl } from './env';

const AUTH_DIR = path.join(__dirname, '../.auth');
const TS = Date.now();
const TAG = `E2E${TS}`;

test.describe.configure({ mode: 'serial' });

function futureDate(daysFromNow: number) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

async function loginOwner(browser: Browser) {
  const accounts = JSON.parse(fs.readFileSync(path.join(AUTH_DIR, 'accounts.json'), 'utf8')) as { owner: { email: string; password: string } };
  const OWNER = accounts.owner;
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto('/login');
  await page.getByRole('button', { name: /espace centre/i }).click();
  await page.locator('#email').fill(OWNER.email);
  await page.locator('#password').fill(OWNER.password);
  await page.locator('[type="submit"]').click();
  await page.waitForLoadState('networkidle');
  if (page.url().includes('/onboarding')) {
    await page.getByRole('button', { name: /passer pour l'instant|passer/i }).first().click().catch(() => {});
    await page.waitForLoadState('networkidle');
  }
  return { ctx, page };
}

/** Sélectionne l'option d'un <select> dont le texte contient `substring`. */
async function selectByText(page: Page, selector: string, substring: string) {
  const value = await page.$eval(
    selector,
    (el, sub) => {
      const sel = el as HTMLSelectElement;
      const opt = [...sel.options].find((o) => (o.textContent || '').includes(sub as string));
      return opt?.value ?? '';
    },
    substring
  );
  expect(value, `option contenant "${substring}" introuvable dans ${selector}`).toBeTruthy();
  await page.locator(selector).selectOption(value);
}

test.describe('Point 3 — Chaînes métier', () => {
  test('A) inscription → émargement → le nom de l’apprenant figure dans le PDF généré', async ({ browser }) => {
    const { ctx, page } = await loginOwner(browser);
    const learnerLast = `Emarge${TS}`;

    // 1. Formation
    await page.goto('/formations/new');
    await page.locator('input[name="title"]').fill(`${TAG} Formation`);
    await page.locator('select[name="modality"]').selectOption('DISTANCIEL');
    await page.locator('select[name="level"]').selectOption('DEBUTANT');
    await page.locator('select[name="status"]').selectOption('BROUILLON');
    await page.locator('input[name="priceEuros"]').fill('100');
    await page.locator('input[name="durationHours"]').fill('7');
    await page.getByRole('button', { name: /créer|enregistrer|sauvegarder/i }).last().click();
    await page.waitForURL(/\/formations\/(?!new)[a-z0-9-]{4,}/, { timeout: 20_000 });

    // 2. Session future ouverte
    await page.goto('/sessions/new');
    await selectByText(page, 'select[name="formationId"]', `${TAG} Formation`);
    await page.locator('input[name="startDate"]').fill(futureDate(20));
    await page.locator('input[name="endDate"]').fill(futureDate(21));
    await page.locator('select[name="status"]').selectOption('OUVERTE');
    await page.getByRole('button', { name: /créer|enregistrer|sauvegarder/i }).last().click();
    await page.waitForURL(/\/sessions\/(?!new)[a-z0-9-]{4,}/, { timeout: 20_000 });

    // 3. Apprenant inscrit directement à la session (sessionId au create → enrollment)
    await page.goto('/apprenants/new');
    await page.locator('input[name="firstName"]').fill('E2E');
    await page.locator('input[name="lastName"]').fill(learnerLast);
    await page.locator('input[name="company"]').fill(`${TAG} Corp`);
    await selectByText(page, 'select[name="sessionId"]', `${TAG} Formation`);
    await page.getByRole('button', { name: /créer|enregistrer|sauvegarder/i }).last().click();
    await page.waitForURL(/\/apprenants\/(?!new)[a-z0-9-]{4,}/, { timeout: 20_000 });

    // 4. Générer la feuille d'émargement via le bouton "Générer" de SA suggestion (porte type=EMARGEMENT + sessionId)
    await page.goto('/documents');
    await page.waitForLoadState('networkidle');
    const linkSel = 'a[href*="/api/documents/"][href*="/download"]';
    const before = new Set(
      await page.locator(linkSel).evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).getAttribute('href')))
    );
    const emargementGenerate = page
      .getByText(/Feuille d'émargement/i)
      .first()
      .locator('xpath=following::button[contains(., "Générer")][1]');
    await expect(emargementGenerate, 'suggestion émargement introuvable').toBeVisible({ timeout: 10_000 });
    await emargementGenerate.click();

    // 5. Récupérer LE document créé par CE run (diff des liens avant/après), puis vérifier son CONTENU
    let href = '';
    for (let i = 0; i < 20 && !href; i++) {
      await page.waitForTimeout(1500);
      await page.reload();
      await page.waitForLoadState('networkidle');
      const now = await page.locator(linkSel).evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).getAttribute('href')));
      href = now.find((h) => h && !before.has(h)) || '';
    }
    expect(href, 'nouveau document d’émargement non apparu après génération').toBeTruthy();
    const url = href.startsWith('http') ? href : appUrl(href);
    const resp = await page.request.get(url);
    expect(resp.ok(), `download HTTP ${resp.status()}`).toBeTruthy();
    const buf = Buffer.from(await resp.body());
    const ct = resp.headers()['content-type'];
    const text = await extractText(buf, ct);

    // PREUVE DE BOUT DE CHAÎNE : le nom de l'apprenant inscrit est réellement dans le fichier d'émargement
    expect(text, `nom "${learnerLast}" absent du document (${ct}, ${buf.length}o). Extrait: ${text.slice(0, 300)}`).toContain(learnerLast);
    console.log(`✅ Chaîne A — émargement (${ct}, ${buf.length}o) contient l'apprenant "${learnerLast}"`);
    await ctx.close();
  });

  test('B) demande formateur → approbation centre → statut "Acceptée" persisté', async ({ browser }) => {
    // --- TRAINER crée la demande ---
    const trainerCtx = await browser.newContext({ storageState: path.join(AUTH_DIR, 'trainer.json') });
    const tPage = await trainerCtx.newPage();
    await tPage.goto('/trainer/demandes');
    await tPage.waitForLoadState('networkidle');
    await tPage.getByRole('button', { name: /créer une demande/i }).first().click().catch(() => {});
    await tPage.locator('select[name="requestType"]').selectOption('unavailable');
    const reason = `${TAG} indispo de test`;
    await tPage.locator('textarea[name="reason"]').fill(reason);
    await tPage.locator('input[name="proposedDate"]').fill(futureDate(25)).catch(() => {});
    await tPage.locator('select[name="proposedSlot"]').selectOption('JOURNEE').catch(() => {});
    await tPage.getByRole('button', { name: /envoyer la demande/i }).click();
    await expect(tPage.getByText(/demande envoyée au centre|✓/i).first()).toBeVisible({ timeout: 15_000 });
    console.log('✅ Chaîne B — demande créée côté formateur');
    await trainerCtx.close();

    // --- OWNER approuve ---
    const { ctx, page } = await loginOwner(browser);
    await page.goto('/formateurs/demandes');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(reason).first(), 'la demande du formateur doit apparaître côté centre').toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: /^accepter$/i }).first().click();
    // Attendre que l'action serveur se reflète dans la page (sinon naviguer l'annulerait)
    await expect(page.getByText(/acceptée/i).first(), 'le statut doit passer à "Acceptée" après le clic').toBeVisible({ timeout: 20_000 });

    // PREUVE DE PERSISTANCE : après reload complet, motif présent ET statut "Acceptée"
    await page.goto('/formateurs/demandes');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(reason).first(), 'le motif doit rester visible après reload').toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/acceptée/i).first(), 'la demande doit rester "Acceptée" après reload').toBeVisible({ timeout: 10_000 });
    console.log('✅ Chaîne B — approbation persistée (statut "Acceptée")');
    await ctx.close();
  });
});
