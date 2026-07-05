/**
 * POINT 2 — MATRICE DES RÔLES (réelle) + bootstrap d'un compte TRAINER via invitation.
 * Crée un formateur depuis le cockpit OWNER → invitation email (Composio) → définir mdp → login TRAINER.
 * Puis vérifie le gating par layout : redirections exactes selon le rôle (preuve = URL finale).
 *
 * LEARNER : non créable via le cockpit (composant InviteBeneficiary non monté) → testé en point dédié si possible.
 */
import { test, expect, type Browser } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { waitForEmail, findLink, extractLinks } from '../gmail';
import { e2eEmail, requiredEnv } from './env';

const AUTH_DIR = path.join(__dirname, '../.auth');
const TS = Date.now();

function ownerAccount() {
  const accounts = JSON.parse(fs.readFileSync(path.join(AUTH_DIR, 'accounts.json'), 'utf8')) as { owner: { email: string; password: string } };
  return accounts.owner;
}

function trainerAccount() {
  return {
    firstName: 'E2E',
    lastName: `Trainer ${TS}`,
    email: e2eEmail(`e2e-trainer-${TS}`),
    password: requiredEnv('E2E_TRAINER_INVITE_PASSWORD'),
  };
}

test.describe.configure({ mode: 'serial' });

async function login(browser: Browser, opts: { email: string; password: string; space: 'centre' | 'client' }) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto('/login');
  await page.getByRole('button', { name: opts.space === 'client' ? /espace client/i : /espace centre/i }).click();
  await page.locator('#email').fill(opts.email);
  await page.locator('#password').fill(opts.password);
  await page.locator('[type="submit"]').click();
  await page.waitForLoadState('networkidle');
  return { ctx, page };
}

test.describe('Point 2 — Rôles réels', () => {
  test('OWNER invite un formateur → email d’invitation réellement reçu', async ({ browser }) => {
    const OWNER = ownerAccount();
    const TRAINER = trainerAccount();
    const { ctx, page } = await login(browser, { email: OWNER.email, password: OWNER.password, space: 'centre' });
    if (page.url().includes('/onboarding')) {
      await page.getByRole('button', { name: /passer pour l'instant|passer/i }).first().click().catch(() => {});
      await page.waitForLoadState('networkidle');
    }
    // Créer le formateur (avec email → éligible à l'invitation)
    await page.goto('/formateurs/new');
    await page.locator('input[name="firstName"]').fill(TRAINER.firstName);
    await page.locator('input[name="lastName"]').fill(TRAINER.lastName);
    await page.locator('input[name="email"]').fill(TRAINER.email);
    await page.getByRole('button', { name: /créer|enregistrer|sauvegarder/i }).last().click();
    await page.waitForURL(/\/formateurs\/(?!new)[a-z0-9-]+/, { timeout: 20_000 });
    const trainerUrl = page.url();
    console.log(`Formateur créé: ${trainerUrl}`);

    // Cliquer "Inviter" si un bouton existe (sinon l'invitation a pu partir à la création)
    const inviteBtn = page.getByRole('button', { name: /inviter|envoyer.*invit|invitation/i }).first();
    if (await inviteBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await inviteBtn.click();
      await page.waitForLoadState('networkidle').catch(() => {});
      console.log('Bouton "Inviter" cliqué.');
    } else {
      console.log('Pas de bouton "Inviter" visible — on attend un envoi automatique.');
    }

    const mail = await waitForEmail({
      query: `to:${TRAINER.email} newer_than:1h`,
      timeoutMs: 120_000,
      predicate: (m) => /formateur|invit|mot de passe/i.test(m.subject),
    });
    const link = findLink(mail, 'reset-password');
    expect(link, `lien d'invitation introuvable. Sujet="${mail.subject}" liens=${extractLinks(mail).join(', ')}`).toBeTruthy();
    fs.writeFileSync(path.join(AUTH_DIR, 'trainer-invite.json'), JSON.stringify({ ...TRAINER, resetLink: link, trainerUrl }, null, 2));
    console.log(`✅ Invitation formateur reçue — sujet "${mail.subject}"`);
    await ctx.close();
  });

  test('formateur définit son mot de passe (lien d’invitation)', async ({ browser }) => {
    const TRAINER = trainerAccount();
    const t = JSON.parse(fs.readFileSync(path.join(AUTH_DIR, 'trainer-invite.json'), 'utf8'));
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const resp = await page.goto(t.resetLink);
    expect(resp?.status(), 'lien définir-mdp ne doit pas être en erreur').toBeLessThan(400);
    await page.locator('#password').fill(TRAINER.password);
    await page.getByRole('button', { name: /réinitialiser|définir|enregistrer|valider/i }).first().click();
    await page.waitForURL(/login/, { timeout: 20_000 });
    expect(page.url()).toMatch(/login/);
    console.log(`✅ Mot de passe formateur défini → ${page.url()}`);
    await ctx.close();
  });

  test('login TRAINER réel → portail /trainer', async ({ browser }) => {
    const TRAINER = trainerAccount();
    const { ctx, page } = await login(browser, { email: TRAINER.email, password: TRAINER.password, space: 'centre' });
    await page.goto('/trainer');
    await page.waitForLoadState('networkidle');
    expect(page.url(), 'TRAINER doit accéder à /trainer').toMatch(/\/trainer/);
    await ctx.storageState({ path: path.join(AUTH_DIR, 'trainer.json') });
    console.log(`✅ Login TRAINER OK → ${page.url()}`);
    await ctx.close();
  });

  test('gating TRAINER : /dashboard → /trainer, /admin → /login', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: path.join(AUTH_DIR, 'trainer.json') });
    const page = await ctx.newPage();

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    expect(page.url(), 'TRAINER sur /dashboard doit être redirigé vers /trainer').toMatch(/\/trainer/);

    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    expect(page.url(), 'TRAINER sur /admin doit être redirigé vers /login').toMatch(/\/login/);

    console.log('✅ Gating TRAINER conforme (/dashboard→/trainer, /admin→/login)');
    await ctx.close();
  });

  test('gating OWNER : /admin → /login (OWNER n’est pas super-admin plateforme)', async ({ browser }) => {
    const OWNER = ownerAccount();
    const { ctx, page } = await login(browser, { email: OWNER.email, password: OWNER.password, space: 'centre' });
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    expect(page.url(), 'OWNER sur /admin doit être redirigé vers /login').toMatch(/\/login/);
    console.log('✅ Gating OWNER conforme (/admin→/login)');
    await ctx.close();
  });
});
