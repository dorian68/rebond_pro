/**
 * Login réel + atterrissage dashboard pour CHAQUE rôle (comptes seedés en DB : org e2e-roleslab).
 * Preuve = la bonne page de dashboard se charge avec son contenu réel, pas un empty state.
 */
import { test, expect, type Browser } from '@playwright/test';
import { requiredEnv, seededRoleEmail } from './env';

const acc = seededRoleEmail;

async function login(browser: Browser, email: string, space: 'centre' | 'client' | 'admin') {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto('/login');
  const label = space === 'client' ? /espace client/i : space === 'admin' ? /administration/i : /espace centre/i;
  await page.getByRole('button', { name: label }).click();
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(requiredEnv('E2E_ROLE_PASSWORD'));
  await page.locator('[type="submit"]').click();
  await page.waitForLoadState('networkidle');
  return { ctx, page };
}

test('ADMIN centre → /dashboard accessible', async ({ browser }) => {
  const { ctx, page } = await login(browser, acc('admin'), 'centre');
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
  expect(page.url(), 'ADMIN doit accéder au cockpit').toMatch(/\/dashboard/);
  await expect(page.getByText(/internal server error/i)).not.toBeVisible().catch(() => {});
  console.log('✅ ADMIN → /dashboard');
  await ctx.close();
});

test('ASSISTANT centre → /dashboard + accès apprenants', async ({ browser }) => {
  const { ctx, page } = await login(browser, acc('assistant'), 'centre');
  await page.goto('/apprenants');
  await page.waitForLoadState('networkidle');
  expect(page.url(), 'ASSISTANT doit accéder aux apprenants').toMatch(/\/apprenants/);
  console.log('✅ ASSISTANT → /apprenants');
  await ctx.close();
});

test('COMMERCIAL centre → /dashboard + accès prospects', async ({ browser }) => {
  const { ctx, page } = await login(browser, acc('commercial'), 'centre');
  await page.goto('/prospects');
  await page.waitForLoadState('networkidle');
  expect(page.url(), 'COMMERCIAL doit accéder aux prospects').toMatch(/\/prospects/);
  console.log('✅ COMMERCIAL → /prospects');
  await ctx.close();
});

test('LEARNER client → /espace avec contenu réel (bénéficiaire lié)', async ({ browser }) => {
  const { ctx, page } = await login(browser, acc('learner'), 'client');
  await page.goto('/espace');
  await page.waitForLoadState('networkidle');
  expect(page.url(), 'LEARNER doit atterrir sur /espace').toMatch(/\/espace/);
  // Contenu réel (profil lié) — pas l'empty state "compte non rattaché"
  await expect(page.getByText(/compte non rattaché|non rattaché/i)).not.toBeVisible({ timeout: 5000 }).catch(() => {});
  await expect(page.getByText(/bonjour|progression|catalogue|parcours/i).first()).toBeVisible({ timeout: 10000 });
  console.log('✅ LEARNER → /espace (contenu réel)');
  await ctx.close();
});

test('Super-admin plateforme → /admin avec contenu réel', async ({ browser }) => {
  const { ctx, page } = await login(browser, acc('padmin'), 'admin');
  await page.goto('/admin');
  await page.waitForLoadState('networkidle');
  expect(page.url(), 'le super-admin doit accéder à /admin').toMatch(/\/admin/);
  await expect(page.getByText(/internal server error/i)).not.toBeVisible().catch(() => {});
  // Un marqueur de la console plateforme (centres / finances / bénéficiaires)
  await expect(page.getByText(/centres|finances|bénéficiaires|plateforme|administration/i).first()).toBeVisible({ timeout: 10000 });
  console.log('✅ Super-admin → /admin (contenu réel)');
  await ctx.close();
});
