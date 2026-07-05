/**
 * COHÉRENCE MÉTIER des documents : pas seulement "un fichier est produit", mais "le contenu est correct".
 * Session complète (formateur affecté + prix + apprenant) → génère les docs clés → asserte les VRAIES valeurs
 * (apprenant, formation, formateur, montant, mentions légales) + compte les [À compléter].
 */
import { test, expect, type Browser, type Page } from '@playwright/test';
import { extractText } from '../parse-doc';
import { account, appUrl } from './env';

const TS = Date.now();
const TAG = `Coh${TS}`;
const LEARNER_LAST = `Apprenant${TS}`;
const PRICE = '1500';

function futureDate(d: number) { const x = new Date(); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); }

async function loginOwner(browser: Browser) {
  const OWNER = account('E2E_REAL_OWNER_EMAIL', 'E2E_REAL_OWNER_PASSWORD');
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
async function pickByText(page: Page, sel: string, sub: string) {
  const v = await page.locator(sel).evaluate((el: HTMLSelectElement, s: string) => [...el.options].find((o) => (o.textContent || '').includes(s))?.value ?? '', sub);
  if (v) await page.locator(sel).selectOption(v);
  return v;
}

test('Cohérence métier des documents clés', async ({ browser }) => {
  test.setTimeout(8 * 60 * 1000);
  const { ctx, page } = await loginOwner(browser);

  // Formation avec prix
  await page.goto('/formations/new');
  await page.locator('input[name="title"]').fill(`${TAG} Formation`);
  await page.locator('select[name="modality"]').selectOption('PRESENTIEL').catch(async () => { await page.locator('select[name="modality"]').selectOption('DISTANCIEL'); });
  await page.locator('select[name="level"]').selectOption('DEBUTANT');
  await page.locator('select[name="status"]').selectOption('BROUILLON');
  await page.locator('input[name="priceEuros"]').fill(PRICE);
  await page.locator('input[name="durationHours"]').fill('14');
  await page.getByRole('button', { name: /créer|enregistrer/i }).last().click();
  await page.waitForURL(/\/formations\/(?!new)[a-z0-9-]{4,}/, { timeout: 20_000 });

  // Session avec FORMATEUR affecté
  await page.goto('/sessions/new');
  await pickByText(page, 'select[name="formationId"]', `${TAG} Formation`);
  await pickByText(page, 'select[name="trainerId"]', 'Formatrice');
  const off = 20 + (TS % 60); // dates uniques par run → évite les conflits formateur des runs précédents
  await page.locator('input[name="startDate"]').fill(futureDate(off));
  await page.locator('input[name="endDate"]').fill(futureDate(off + 1));
  await page.locator('select[name="status"]').selectOption('OUVERTE');
  await page.getByRole('button', { name: /créer|enregistrer/i }).last().click();
  await page.waitForURL(/\/sessions\/(?!new)[a-z0-9-]{4,}/, { timeout: 20_000 });

  // Apprenant inscrit (avec entreprise)
  await page.goto('/apprenants/new');
  await page.locator('input[name="firstName"]').fill('E2E');
  await page.locator('input[name="lastName"]').fill(LEARNER_LAST);
  await page.locator('input[name="company"]').fill(`${TAG} Entreprise`);
  await pickByText(page, 'select[name="sessionId"]', `${TAG} Formation`);
  await page.getByRole('button', { name: /créer|enregistrer/i }).last().click();
  await page.waitForURL(/\/apprenants\/(?!new)[a-z0-9-]{4,}/, { timeout: 20_000 });

  // Générateur manuel
  const linkSel = 'a[href*="/api/documents/"][href*="/download"]';
  async function generate(typeValue: string): Promise<{ mime: string; text: string }> {
    await page.goto('/documents');
    await page.waitForLoadState('networkidle');
    const form = page.locator('form').filter({ has: page.getByRole('button', { name: /générer le document/i }) }).first();
    const before = new Set(await page.locator(linkSel).evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).getAttribute('href'))));
    await form.locator('select').nth(0).selectOption(typeValue);
    const sv = await form.locator('select').nth(1).evaluate((el: HTMLSelectElement, s: string) => [...el.options].find((o) => (o.textContent || '').includes(s))?.value ?? '', `${TAG} Formation`);
    if (sv) await form.locator('select').nth(1).selectOption(sv);
    await form.getByRole('button', { name: /générer le document/i }).click();
    let href = '';
    for (let i = 0; i < 10 && !href; i++) {
      await page.waitForTimeout(1200); await page.reload(); await page.waitForLoadState('networkidle');
      const now = await page.locator(linkSel).evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).getAttribute('href')));
      href = now.find((h) => h && !before.has(h)) || '';
    }
    if (!href) return { mime: '', text: '' };
    const url = href.startsWith('http') ? href : appUrl(href);
    const resp = await page.request.get(url);
    const buf = Buffer.from(await resp.body());
    return { mime: (resp.headers()['content-type'] || '').split(';')[0], text: await extractText(buf, resp.headers()['content-type']) };
  }

  // type → marqueurs métier attendus (au moins 1 par groupe doit être présent)
  const cases: { type: string; label: string; expect: { name: string; rx: RegExp }[] }[] = [
    { type: 'EMARGEMENT', label: 'Émargement (PDF)', expect: [{ name: 'apprenant', rx: new RegExp(LEARNER_LAST) }, { name: 'formation', rx: new RegExp(TAG) }, { name: 'formateur', rx: /Formatrice/ }] },
    { type: 'CONVENTION', label: 'Convention (PDF)', expect: [{ name: 'formation', rx: new RegExp(TAG) }, { name: 'montant', rx: /1500/ }] },
    { type: 'DEVIS', label: 'Devis (PDF)', expect: [{ name: 'montant', rx: /1500/ }] },
    { type: 'CONVOCATION', label: 'Convocation (PDF)', expect: [{ name: 'formation', rx: new RegExp(TAG) }] },
    { type: 'ATTESTATION', label: 'Attestation (DOCX générique)', expect: [{ name: 'apprenant', rx: new RegExp(LEARNER_LAST) }, { name: 'formation', rx: new RegExp(TAG) }] },
    { type: 'ORDRE_MISSION_FORMATEUR', label: 'Ordre mission formateur (DOCX générique)', expect: [{ name: 'formateur', rx: /Formatrice/ }] },
  ];

  const report: string[] = [];
  const failures: string[] = [];
  for (const c of cases) {
    const { mime, text } = await generate(c.type);
    if (!text) { failures.push(`${c.type}: aucun fichier`); report.push(`❌ ${c.label} — aucun fichier`); continue; }
    // pdf-parse extrait le gras lettre-par-lettre → on teste aussi une version sans espaces (insécables inclus)
    const textNoSpace = text.replace(/[\s  ]/g, '');
    const placeholders = (text.match(/À compléter/gi) || []).length;
    const textDigits = text.replace(/\D/g, ''); // montants : "1 500 €" extrait par pdf-parse en "1/500" → on teste les chiffres seuls
    const missing = c.expect.filter((e) => !e.rx.test(text) && !e.rx.test(textNoSpace) && !e.rx.test(textDigits)).map((e) => e.name);
    const verdict = missing.length === 0 ? '✅' : '⚠️';
    if (missing.length) failures.push(`${c.type}: manque [${missing.join(', ')}]`);
    report.push(`${verdict} ${c.label} | ${mime} | placeholders=${placeholders} | manquants=[${missing.join(', ')}] | extrait="${text.slice(0, 120).replace(/\s+/g, ' ')}"`);
  }
  await ctx.close();

  console.log('\n===== COHÉRENCE DOCUMENTS =====\n' + report.join('\n'));
  expect(failures, `incohérences: ${failures.join(' | ')}`).toHaveLength(0);
});
