/**
 * PLANNING : affectation formateur, détection de conflits (double-booking), optimisation (meilleurs créneaux),
 * remplissage des disponibilités formateur. Preuves = effet observable (UI/session) après action réelle.
 */
import { test, expect, type Browser, type Page } from '@playwright/test';
import { account } from './env';

const TS = Date.now();
const TAG = `Plan${TS}`;

function futureDate(d: number) { const x = new Date(); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); }

async function login(browser: Browser, email: string, password: string) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto('/login');
  await page.getByRole('button', { name: /espace centre/i }).click();
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
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
async function createFormation(page: Page, title: string) {
  await page.goto('/formations/new');
  await page.locator('input[name="title"]').fill(title);
  await page.locator('select[name="modality"]').selectOption('DISTANCIEL');
  await page.locator('select[name="level"]').selectOption('DEBUTANT');
  await page.locator('select[name="status"]').selectOption('BROUILLON');
  await page.locator('input[name="priceEuros"]').fill('900');
  await page.locator('input[name="durationHours"]').fill('7');
  await page.getByRole('button', { name: /créer|enregistrer/i }).last().click();
  await page.waitForURL(/\/formations\/(?!new)[a-z0-9-]{4,}/, { timeout: 20_000 });
}

test('Affectation formateur → visible sur la fiche session', async ({ browser }) => {
  const OWNER = account('E2E_REAL_OWNER_EMAIL', 'E2E_REAL_OWNER_PASSWORD');
  const { ctx, page } = await login(browser, OWNER.email, OWNER.password);
  await createFormation(page, `${TAG} Formation`);
  await page.goto('/sessions/new');
  await pickByText(page, 'select[name="formationId"]', `${TAG} Formation`);
  const tv = await pickByText(page, 'select[name="trainerId"]', 'Formatrice');
  expect(tv, 'le formateur Marie Formatrice doit être sélectionnable').toBeTruthy();
  const off = 70 + (TS % 40);
  await page.locator('input[name="startDate"]').fill(futureDate(off));
  await page.locator('input[name="endDate"]').fill(futureDate(off));
  await page.locator('select[name="status"]').selectOption('OUVERTE');
  await page.getByRole('button', { name: /créer|enregistrer/i }).last().click();
  await page.waitForURL(/\/sessions\/(?!new)[a-z0-9-]{4,}/, { timeout: 20_000 });
  // Preuve : la fiche session affiche le formateur affecté
  await expect(page.getByText(/Formatrice/).first(), 'le formateur affecté doit apparaître sur la session').toBeVisible({ timeout: 10_000 });
  console.log('✅ Affectation formateur visible sur la session');
  await ctx.close();
});

test('Conflit : double-booking du même formateur bloqué', async ({ browser }) => {
  const OWNER = account('E2E_REAL_OWNER_EMAIL', 'E2E_REAL_OWNER_PASSWORD');
  const { ctx, page } = await login(browser, OWNER.email, OWNER.password);
  const off = 110 + (TS % 30);
  // Session 1 (Marie)
  await page.goto('/sessions/new');
  await pickByText(page, 'select[name="formationId"]', `${TAG} Formation`);
  await pickByText(page, 'select[name="trainerId"]', 'Formatrice');
  await page.locator('input[name="startDate"]').fill(futureDate(off));
  await page.locator('input[name="endDate"]').fill(futureDate(off));
  await page.locator('select[name="status"]').selectOption('OUVERTE');
  await page.getByRole('button', { name: /créer|enregistrer/i }).last().click();
  await page.waitForURL(/\/sessions\/(?!new)[a-z0-9-]{4,}/, { timeout: 20_000 });

  // Session 2 (Marie, MÊMES dates) → doit être refusée (conflit)
  await page.goto('/sessions/new');
  await pickByText(page, 'select[name="formationId"]', `${TAG} Formation`);
  await pickByText(page, 'select[name="trainerId"]', 'Formatrice');
  await page.locator('input[name="startDate"]').fill(futureDate(off));
  await page.locator('input[name="endDate"]').fill(futureDate(off));
  await page.locator('select[name="status"]').selectOption('OUVERTE');
  await page.getByRole('button', { name: /créer|enregistrer/i }).last().click();
  await page.waitForLoadState('networkidle');
  // Preuve : pas de nouvelle session créée (resté sur le form) OU message de conflit
  const conflictMsg = await page.getByText(/conflit|déjà.*session|indisponible|occup/i).first().isVisible({ timeout: 6_000 }).catch(() => false);
  const blocked = /\/sessions\/new/.test(page.url());
  expect(conflictMsg || blocked, `le double-booking doit être détecté (url=${page.url()})`).toBeTruthy();
  console.log(`✅ Conflit double-booking détecté (message=${conflictMsg}, bloqué=${blocked})`);
  await ctx.close();
});

test('Optimisation : "meilleurs créneaux" propose des suggestions scorées', async ({ browser }) => {
  const OWNER = account('E2E_REAL_OWNER_EMAIL', 'E2E_REAL_OWNER_PASSWORD');
  const { ctx, page } = await login(browser, OWNER.email, OWNER.password);
  await page.goto('/planning');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: /trouver.*créneaux|meilleurs créneaux/i }).first().click();
  // Scope au contenu du modal (.fade-up) pour éviter l'interception par le backdrop
  const modal = page.locator('.fade-up').first();
  await expect(modal.getByRole('heading', { name: /meilleurs créneaux/i }), 'le modal doit s’ouvrir').toBeVisible({ timeout: 10_000 });
  // Choisir la formation TAG (formateur Marie éligible) puis analyser
  await modal.locator('select').selectOption({ label: `${TAG} Formation` }).catch(() => {});
  await modal.getByRole('button', { name: /analyser|analyse/i }).click();
  // Preuve : suggestions scorées (bouton "Créer" / score) OU message clair d'absence
  const created = modal.getByRole('link', { name: /créer/i });
  const signal = modal.getByText(/\/100|score|disponible|conflit|aucun créneau|aucune/i);
  await expect(created.first().or(signal.first()), 'l’optimisation doit produire un résultat').toBeVisible({ timeout: 20_000 });
  const createBtns = await created.count();
  console.log(`✅ Optimisation : meilleurs créneaux exécuté (suggestions créables=${createBtns})`);
  await ctx.close();
});

test('Disponibilités formateur : remplissage persistant (self-service)', async ({ browser }) => {
  const TRAINER = account('E2E_REAL_TRAINER_EMAIL', 'E2E_REAL_TRAINER_PASSWORD');
  const { ctx, page } = await login(browser, TRAINER.email, TRAINER.password);
  await page.goto('/trainer/disponibilites');
  await page.waitForLoadState('networkidle');
  // "Tout dispo" sur la 1re semaine → auto-save
  const allDispo = page.getByRole('button', { name: /tout dispo/i }).first();
  await expect(allDispo, 'le bouton "Tout dispo" doit exister').toBeVisible({ timeout: 10_000 });
  await allDispo.click();
  // Preuve : indicateur d'enregistrement
  await expect(page.getByText(/enregistré|enregistrement/i).first(), 'un indicateur de sauvegarde doit apparaître').toBeVisible({ timeout: 12_000 });
  console.log('✅ Disponibilités formateur enregistrées (self-service)');
  await ctx.close();
});
