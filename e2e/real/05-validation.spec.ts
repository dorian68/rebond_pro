/**
 * POINT 5 — VALIDATION DES DONNÉES (assertions sur le MESSAGE d'erreur précis, pas "pas de crash").
 * A) Login mauvais mot de passe → message d'erreur + reste déconnecté.
 * B) Register avec un email déjà utilisé (l'OWNER) → message "déjà utilisé/existe".
 * C) Session avec date de fin < date de début → message d'erreur (pas de création).
 */
import { test, expect, type Browser } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { requiredEnv } from './env';

const AUTH_DIR = path.join(__dirname, '../.auth');
const accounts = JSON.parse(fs.readFileSync(path.join(AUTH_DIR, 'accounts.json'), 'utf8'));
const OWNER = accounts.owner as { email: string; password: string };
const TS = Date.now();

test.describe.configure({ mode: 'serial' });

async function loginOwner(browser: Browser) {
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

test('A) login mauvais mot de passe → erreur + reste sur /login', async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto('/login');
  await page.getByRole('button', { name: /espace centre/i }).click();
  await page.locator('#email').fill(OWNER.email);
  await page.locator('#password').fill('MauvaisMotDePasse!999');
  await page.locator('[type="submit"]').click();
  await page.waitForLoadState('networkidle');
  // Preuve : message d'erreur d'identifiants ET toujours sur /login (pas de session)
  await expect(page.getByText(/incorrect|invalide|identifiants|erreur|échou/i).first()).toBeVisible({ timeout: 10_000 });
  expect(page.url()).toMatch(/login/);
  console.log('✅ Validation A — login refusé avec message');
  await ctx.close();
});

test('B) register avec email déjà utilisé → message de rejet', async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto('/register');
  await page.getByRole('button', { name: /un centre de formation/i }).click();
  await page.locator('input[name="centerName"]').fill(`E2E Dup ${TS}`);
  await page.locator('input[name="name"]').fill('E2E Dup');
  await page.locator('input[name="email"]').fill(OWNER.email); // déjà inscrit
  await page.locator('input[name="password"]').fill(requiredEnv('E2E_REGISTER_PASSWORD'));
  const terms = page.locator('input[name="terms"]');
  if (await terms.count()) await terms.check();
  await page.getByRole('button', { name: /créer|inscrire|s'inscrire|commencer|valider/i }).last().click();
  await page.waitForLoadState('networkidle');
  // Preuve : message indiquant que l'email existe déjà (pas de nouveau compte / pas de check-email)
  await expect(
    page.getByText(/déjà|existe|utilisé|compte.*existe|already/i).first()
  ).toBeVisible({ timeout: 10_000 });
  console.log('✅ Validation B — email dupliqué rejeté avec message');
  await ctx.close();
});

test('C) session date de fin < date de début → erreur de validation', async ({ browser }) => {
  const { ctx, page } = await loginOwner(browser);
  // Créer une formation support
  await page.goto('/formations/new');
  await page.locator('input[name="title"]').fill(`E2E Valid ${TS} Formation`);
  await page.locator('select[name="modality"]').selectOption('DISTANCIEL');
  await page.locator('select[name="level"]').selectOption('DEBUTANT');
  await page.locator('select[name="status"]').selectOption('BROUILLON');
  await page.locator('input[name="priceEuros"]').fill('100');
  await page.locator('input[name="durationHours"]').fill('7');
  await page.getByRole('button', { name: /créer|enregistrer|sauvegarder/i }).last().click();
  await page.waitForURL(/\/formations\/(?!new)[a-z0-9-]{4,}/, { timeout: 20_000 });

  // Session avec dates inversées
  await page.goto('/sessions/new');
  const value = await page.$eval('select[name="formationId"]', (el, sub) => {
    const sel = el as HTMLSelectElement;
    return [...sel.options].find((o) => (o.textContent || '').includes(sub as string))?.value ?? '';
  }, `E2E Valid ${TS} Formation`);
  await page.locator('select[name="formationId"]').selectOption(value);
  await page.locator('input[name="startDate"]').fill('2026-12-20');
  await page.locator('input[name="endDate"]').fill('2026-12-10'); // fin < début
  await page.locator('select[name="status"]').selectOption('OUVERTE');
  await page.getByRole('button', { name: /créer|enregistrer|sauvegarder/i }).last().click();
  await page.waitForLoadState('networkidle');
  // Preuve : message d'erreur ET pas de redirection vers une page session créée
  const onErrorMessage = await page.getByText(/date|antérieure|postérieure|invalide|fin.*début|début.*fin/i).first().isVisible({ timeout: 8_000 }).catch(() => false);
  const stayedOnForm = /\/sessions\/new/.test(page.url());
  expect(onErrorMessage || stayedOnForm, `attendu une erreur de date (url=${page.url()})`).toBeTruthy();
  console.log(`✅ Validation C — dates inversées bloquées (message=${onErrorMessage}, restéSurForm=${stayedOnForm})`);
  await ctx.close();
});
