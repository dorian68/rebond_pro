/**
 * FOCUS — Génération de CHAQUE type de document du cockpit centre (78 types).
 * Pour chaque type : sélection dans le générateur manuel → génération → récupération du fichier créé
 * (diff des liens de download) → vérification que le fichier est NON VIDE + aperçu du contenu.
 * Produit un rapport par type (✅ généré+contenu / ⚠️ vide / ❌ pas de fichier|erreur).
 */
import { test, expect, type Browser, type Locator, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { extractText } from '../parse-doc';
import { DOCUMENT_TYPES } from '../../src/lib/document-types';
import { appUrl, e2eEmail } from './env';

const AUTH_DIR = path.join(__dirname, '../.auth');
const TS = Date.now();
const TAG = `E2Edoc${TS}`;

function futureDate(d: number) { const x = new Date(); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); }

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
async function selectByText(scope: Page | Locator, sel: string, sub: string) {
  const value = await scope.locator(sel).evaluate((el: HTMLSelectElement, s: string) =>
    [...(el as HTMLSelectElement).options].find((o) => (o.textContent || '').includes(s))?.value ?? '', sub);
  if (value) await scope.locator(sel).selectOption(value);
  return value;
}

test('Génération de chaque type de document (78) — fichier produit + contenu', async ({ browser }) => {
  test.setTimeout(25 * 60 * 1000);
  const { ctx, page } = await loginOwner(browser);

  // Session riche : formation + apprenant inscrit (cible des docs par-apprenant et session)
  await page.goto('/formations/new');
  await page.locator('input[name="title"]').fill(`${TAG} Formation`);
  await page.locator('select[name="modality"]').selectOption('DISTANCIEL');
  await page.locator('select[name="level"]').selectOption('DEBUTANT');
  await page.locator('select[name="status"]').selectOption('BROUILLON');
  await page.locator('input[name="priceEuros"]').fill('1200');
  await page.locator('input[name="durationHours"]').fill('14');
  await page.getByRole('button', { name: /créer|enregistrer/i }).last().click();
  await page.waitForURL(/\/formations\/(?!new)[a-z0-9-]{4,}/, { timeout: 20_000 });

  await page.goto('/sessions/new');
  await selectByText(page, 'select[name="formationId"]', `${TAG} Formation`);
  await page.locator('input[name="startDate"]').fill(futureDate(15));
  await page.locator('input[name="endDate"]').fill(futureDate(16));
  await page.locator('select[name="status"]').selectOption('OUVERTE');
  await page.getByRole('button', { name: /créer|enregistrer/i }).last().click();
  await page.waitForURL(/\/sessions\/(?!new)[a-z0-9-]{4,}/, { timeout: 20_000 });

  await page.goto('/apprenants/new');
  await page.locator('input[name="firstName"]').fill('E2E');
  await page.locator('input[name="lastName"]').fill(`Doc${TS}`);
  await page.locator('input[name="company"]').fill(`${TAG} Corp`);
  await page.locator('input[name="email"]').fill(e2eEmail(`e2e-doclearner-${TS}`)).catch(() => {});
  await selectByText(page, 'select[name="sessionId"]', `${TAG} Formation`);
  await page.getByRole('button', { name: /créer|enregistrer/i }).last().click();
  await page.waitForURL(/\/apprenants\/(?!new)[a-z0-9-]{4,}/, { timeout: 20_000 });

  // Générateur manuel : formulaire contenant "Générer le document"
  await page.goto('/documents');
  await page.waitForLoadState('networkidle');
  const form = page.locator('form').filter({ has: page.getByRole('button', { name: /générer le document/i }) }).first();
  const selects = form.locator('select');
  const typeSel = selects.nth(0);
  const sessionSel = selects.nth(1);
  const genBtn = form.getByRole('button', { name: /générer le document/i });
  const linkSel = 'a[href*="/api/documents/"][href*="/download"]';

  // associer la session créée
  await selectByText(page, `form:has(button:has-text("Générer le document")) select >> nth=1`, `${TAG} Formation`).catch(() => {});

  type Res = { type: string; label: string; status: 'OK' | 'EMPTY' | 'NONE' | 'ERR'; bytes: number; mime: string; note: string };
  const results: Res[] = [];

  for (const dt of DOCUMENT_TYPES) {
    try {
      const before = new Set(await page.locator(linkSel).evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).getAttribute('href'))));
      // (re)sélectionner type + session à chaque tour
      await typeSel.selectOption(dt.value).catch(() => {});
      await sessionSel.selectOption({ index: 1 }).catch(() => {});
      // forcer la bonne session par texte si possible
      const sv = await sessionSel.evaluate((el: HTMLSelectElement, s: string) => [...el.options].find((o) => (o.textContent || '').includes(s))?.value ?? '', `${TAG} Formation`);
      if (sv) await sessionSel.selectOption(sv).catch(() => {});
      await genBtn.click();

      // attendre un nouveau lien — détection par RELOAD (revalidate fiable après reload) + 1 retry de génération
      let href = '';
      for (let attempt = 0; attempt < 2 && !href; attempt++) {
        for (let i = 0; i < 8 && !href; i++) {
          await page.waitForTimeout(1200);
          await page.reload();
          await page.waitForLoadState('networkidle');
          const now = await page.locator(linkSel).evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).getAttribute('href')));
          href = now.find((h) => h && !before.has(h)) || '';
        }
        if (!href && attempt === 0) {
          // retry : re-sélectionner et re-générer (le form a été rechargé)
          const f2 = page.locator('form').filter({ has: page.getByRole('button', { name: /générer le document/i }) }).first();
          await f2.locator('select').nth(0).selectOption(dt.value).catch(() => {});
          const sv2 = await f2.locator('select').nth(1).evaluate((el: HTMLSelectElement, s: string) => [...el.options].find((o) => (o.textContent || '').includes(s))?.value ?? '', `${TAG} Formation`);
          if (sv2) await f2.locator('select').nth(1).selectOption(sv2).catch(() => {});
          await f2.getByRole('button', { name: /générer le document/i }).click().catch(() => {});
        }
      }
      if (!href) { results.push({ type: dt.value, label: dt.label, status: 'NONE', bytes: 0, mime: '', note: 'aucun fichier produit (après retry)' }); continue; }

      const url = href.startsWith('http') ? href : appUrl(href);
      const resp = await page.request.get(url);
      const buf = Buffer.from(await resp.body());
      const mime = resp.headers()['content-type'] || '';
      const text = await extractText(buf, mime).catch(() => '');
      const status: Res['status'] = buf.length > 600 ? 'OK' : 'EMPTY';
      results.push({ type: dt.value, label: dt.label, status, bytes: buf.length, mime: mime.split(';')[0], note: text.replace(/\s+/g, ' ').slice(0, 60) });
    } catch (e: unknown) {
      results.push({ type: dt.value, label: dt.label, status: 'ERR', bytes: 0, mime: '', note: String(e instanceof Error ? e.message : e).slice(0, 80) });
    }
  }
  await ctx.close();

  // Rapport
  const ok = results.filter((r) => r.status === 'OK');
  const bad = results.filter((r) => r.status !== 'OK');
  console.log('\n===== RAPPORT GÉNÉRATION DOCUMENTS (78 types) =====');
  for (const r of results) console.log(`${r.status.padEnd(5)} | ${r.type.padEnd(34)} | ${String(r.bytes).padStart(6)}o | ${r.mime.padEnd(48)} | ${r.note}`);
  console.log(`\nTOTAL OK=${ok.length} / ${results.length} — KO: ${bad.map((b) => `${b.type}(${b.status})`).join(', ') || 'aucun'}`);
  fs.writeFileSync(path.join(AUTH_DIR, 'doc-report.json'), JSON.stringify(results, null, 2));

  // Critère strict : tous les types produisent un fichier non vide
  expect(bad, `types KO: ${bad.map((b) => `${b.type}=${b.status}`).join(', ')}`).toHaveLength(0);
});
