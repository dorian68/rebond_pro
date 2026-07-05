/**
 * Génère les 70 types de docs pour la session RICHE (Lab3) et sauvegarde le texte de chacun
 * + un manifest, pour jugement de contextualité par agents persona.
 */
import { test, expect, type Browser } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { extractText } from '../parse-doc';
import { DOCUMENT_TYPES } from '../../src/lib/document-types';
import { account, appUrl, optionalEnv } from './env';

const FORMATION = 'Excel Perfectionnement';
const OUT = optionalEnv('E2E_DOC_EXTRACT_DIR', path.join(process.cwd(), 'test-results', 'doc-extract'));

const CONTEXT = {
  centre: 'Centre Lab3 Formation', raisonSociale: 'Lab3 Formation SARL', nda: '11756789012', representant: 'Claire Directrice',
  formation: 'Excel Perfectionnement', duree: '14 h / 2 jours', formateur: 'Marc Formateur',
  apprenant: 'Sophie Martin', entreprise: 'ACME Industries', prix: '1 500 €', salle: 'Salle Informatique A',
  objectifs: 'TCD, formules avancées, tableaux de bord', modules: 'Formules avancées ; Tableaux croisés dynamiques',
};

type ExtractionManifestEntry = {
  type: string;
  label: string;
  phase?: string;
  mime: string;
  bytes: number;
  ok: boolean;
  placeholders: number;
};

async function loginOwner(browser: Browser) {
  const OWNER = account('E2E_DOC_OWNER_EMAIL', 'E2E_DOC_OWNER_PASSWORD');
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto('/login');
  await page.getByRole('button', { name: /espace centre/i }).click();
  await page.locator('#email').fill(OWNER.email);
  await page.locator('#password').fill(OWNER.password);
  await page.locator('[type="submit"]').click();
  await page.waitForLoadState('networkidle');
  if (page.url().includes('/onboarding')) { await page.getByRole('button', { name: /passer/i }).first().click().catch(() => {}); await page.waitForLoadState('networkidle'); }
  return { ctx, page };
}

test('Extraire le texte des 70 docs (session riche Lab3)', async ({ browser }) => {
  test.setTimeout(30 * 60 * 1000);
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, '_context.json'), JSON.stringify(CONTEXT, null, 2));
  const { ctx, page } = await loginOwner(browser);
  const linkSel = 'a[href*="/api/documents/"][href*="/download"]';
  const manifest: ExtractionManifestEntry[] = [];

  for (const dt of DOCUMENT_TYPES) {
    let text = '', mime = '', bytes = 0, ok = false;
    try {
      await page.goto('/documents'); await page.waitForLoadState('networkidle');
      const form = page.locator('form').filter({ has: page.getByRole('button', { name: /générer le document/i }) }).first();
      const before = new Set(await page.locator(linkSel).evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).getAttribute('href'))));
      await form.locator('select').nth(0).selectOption(dt.value);
      const sv = await form.locator('select').nth(1).evaluate((el: HTMLSelectElement, s: string) => [...el.options].find((o) => (o.textContent || '').includes(s))?.value ?? '', FORMATION);
      if (sv) await form.locator('select').nth(1).selectOption(sv);
      await form.getByRole('button', { name: /générer le document/i }).click();
      let href = '';
      for (let i = 0; i < 10 && !href; i++) {
        await page.waitForTimeout(1200); await page.reload(); await page.waitForLoadState('networkidle');
        const now = await page.locator(linkSel).evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).getAttribute('href')));
        href = now.find((h) => h && !before.has(h)) || '';
      }
      if (href) {
        const url = href.startsWith('http') ? href : appUrl(href);
        const resp = await page.request.get(url);
        const buf = Buffer.from(await resp.body());
        mime = (resp.headers()['content-type'] || '').split(';')[0]; bytes = buf.length;
        text = await extractText(buf, resp.headers()['content-type']);
        ok = true;
      }
    } catch (e: unknown) { text = 'ERR: ' + String(e instanceof Error ? e.message : e).slice(0, 100); }
    const placeholders = (text.match(/À compléter/gi) || []).length;
    fs.writeFileSync(path.join(OUT, `${dt.value}.txt`), text);
    manifest.push({ type: dt.value, label: dt.label, phase: dt.phase, mime, bytes, ok, placeholders });
    console.log(`${ok ? 'OK' : 'KO'} ${dt.value} (${bytes}o, ${placeholders} placeholders)`);
  }
  await ctx.close();
  fs.writeFileSync(path.join(OUT, '_manifest.json'), JSON.stringify(manifest, null, 2));
  const okCount = manifest.filter((m) => m.ok).length;
  console.log(`\nExtrait ${okCount}/${manifest.length} docs → ${OUT}`);
  expect(okCount, 'tous les docs doivent être extraits').toBeGreaterThanOrEqual(70);
});
