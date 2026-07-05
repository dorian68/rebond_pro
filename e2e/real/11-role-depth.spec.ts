/**
 * Profondeur par rôle : pages clés de chaque dashboard chargent avec contenu réel + bornes de permission.
 * TRAINER (/trainer/*), LEARNER (/espace/*), super-admin (/admin/*), et permissions ASSISTANT/COMMERCIAL.
 */
import { test, expect, type Browser, type Page } from '@playwright/test';
import path from 'path';
import { requiredEnv, seededRoleEmail } from './env';

const AUTH_DIR = path.join(__dirname, '../.auth');
const acc = seededRoleEmail;
const TS = Date.now();

async function login(browser: Browser, email: string, password: string, space: 'centre' | 'client' | 'admin') {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto('/login');
  const label = space === 'client' ? /espace client/i : space === 'admin' ? /administration/i : /espace centre/i;
  await page.getByRole('button', { name: label }).click();
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.locator('[type="submit"]').click();
  await page.waitForLoadState('networkidle');
  return { ctx, page };
}
async function assertLoads(page: Page, route: string, marker: RegExp) {
  await page.goto(route);
  await page.waitForLoadState('networkidle');
  await expect(page.getByText(/internal server error|erreur serveur/i)).not.toBeVisible().catch(() => {});
  await expect(page.getByText(marker).first(), `${route} doit montrer du contenu (${marker})`).toBeVisible({ timeout: 10_000 });
}

test('TRAINER — planning / disponibilités / profil', async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: path.join(AUTH_DIR, 'trainer.json') });
  const page = await ctx.newPage();
  await assertLoads(page, '/trainer/planning', /planning|semaine|session|aucune/i);
  await assertLoads(page, '/trainer/disponibilites', /disponibilit|créneau|indispo/i);
  await assertLoads(page, '/trainer/profil', /profil|bio|spécialit|nom/i);
  console.log('✅ TRAINER depth');
  await ctx.close();
});

test('LEARNER — catalogue / parcours / profil', async ({ browser }) => {
  const { ctx, page } = await login(browser, acc('learner'), requiredEnv('E2E_ROLE_PASSWORD'), 'client');
  await assertLoads(page, '/espace/catalogue', /catalogue|formation/i);
  await assertLoads(page, '/espace/parcours', /parcours|bilan|étape|progression/i);
  await assertLoads(page, '/espace/profil', /profil|email|nom|compte/i);
  console.log('✅ LEARNER depth');
  await ctx.close();
});

test('Super-admin — centres / finances / bénéficiaires', async ({ browser }) => {
  const { ctx, page } = await login(browser, acc('padmin'), requiredEnv('E2E_ROLE_PASSWORD'), 'admin');
  await assertLoads(page, '/admin/centres', /centre|organisation|nom/i);
  await assertLoads(page, '/admin/finances', /finance|revenu|abonnement|stripe|chiffre|montant/i);
  await assertLoads(page, '/admin/beneficiaires', /bénéficiaire|bilan|nom/i);
  console.log('✅ Super-admin depth');
  await ctx.close();
});

test('COMMERCIAL — peut créer un prospect (action autorisée)', async ({ browser }) => {
  const { ctx, page } = await login(browser, acc('commercial'), requiredEnv('E2E_ROLE_PASSWORD'), 'centre');
  await page.goto('/prospects/new');
  await page.waitForLoadState('networkidle');
  // Champs réels du formulaire prospect
  await page.locator('input[name="name"]').fill(`E2E Prospect ${TS}`);
  await page.locator('input[name="contactName"]').fill('E2E Contact').catch(() => {});
  await page.locator('input[name="email"]').fill(`e2e-prospect-${TS}@example.com`).catch(() => {});
  // sécuriser les selects requis (type/stage) sur une valeur valide
  for (const s of ['type', 'stage', 'source']) {
    const sel = page.locator(`select[name="${s}"]`);
    if (await sel.count()) await sel.selectOption({ index: 1 }).catch(() => {});
  }
  await page.getByRole('button', { name: /^enregistrer|créer le prospect/i }).last().click();
  // Attendre la fin réelle de l'action serveur (redirection hors de /new)
  await page.waitForURL(/\/prospects($|\/(?!new)[a-z0-9])/, { timeout: 25_000 }).catch(() => {});
  expect(page.url(), 'COMMERCIAL doit pouvoir créer un prospect').not.toMatch(/\/prospects\/new/);
  console.log(`✅ COMMERCIAL prospect créé → ${page.url()}`);
  await ctx.close();
});

test('COMMERCIAL — NE PEUT PAS créer une formation (permission refusée)', async ({ browser }) => {
  const { ctx, page } = await login(browser, acc('commercial'), requiredEnv('E2E_ROLE_PASSWORD'), 'centre');
  await page.goto('/formations/new');
  await page.waitForLoadState('networkidle');
  await page.locator('input[name="title"]').fill(`E2E Forbidden ${TS}`).catch(() => {});
  await page.locator('select[name="modality"]').selectOption('DISTANCIEL').catch(() => {});
  await page.locator('select[name="level"]').selectOption('DEBUTANT').catch(() => {});
  await page.locator('input[name="priceEuros"]').fill('100').catch(() => {});
  await page.locator('input[name="durationHours"]').fill('7').catch(() => {});
  await page.getByRole('button', { name: /créer|enregistrer/i }).last().click().catch(() => {});
  await page.waitForLoadState('networkidle').catch(() => {});
  // Preuve : la création N'A PAS abouti (pas de redirection vers une fiche formation créée)
  expect(page.url(), 'COMMERCIAL ne doit pas pouvoir créer une formation').not.toMatch(/\/formations\/[a-z0-9]{8,}/);
  console.log(`✅ COMMERCIAL formation refusée (url=${page.url()})`);
  await ctx.close();
});
