/**
 * POINT 1 — AUTH RÉELLE (prod, sans DEV_AUTOLOGIN).
 * Register d'un centre → email de vérif lu via Composio → confirmation → login réel → logout → gating.
 * Persiste les identifiants OWNER + la storageState pour les specs suivants (rôles, chaînes).
 */
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { waitForEmail, findLink, extractLinks } from '../gmail';
import { e2eEmail, requiredEnv } from './env';

const TS = Date.now();
const AUTH_DIR = path.join(__dirname, '../.auth');

function ownerAccount() {
  return {
    centerName: `E2E Centre ${TS}`,
    name: `E2E Owner ${TS}`,
    email: e2eEmail(`e2e-owner-${TS}`),
    password: requiredEnv('E2E_REGISTER_PASSWORD'),
  };
}

test.describe.configure({ mode: 'serial' });

test.describe('Point 1 — Auth réelle (centre)', () => {
  test('register centre → email de vérification réellement reçu', async ({ page }) => {
    const OWNER = ownerAccount();
    fs.mkdirSync(AUTH_DIR, { recursive: true });
    await page.goto('/register');
    await page.getByRole('button', { name: /un centre de formation/i }).click();

    await page.locator('input[name="centerName"]').fill(OWNER.centerName);
    await page.locator('input[name="name"]').fill(OWNER.name);
    await page.locator('input[name="email"]').fill(OWNER.email);
    await page.locator('input[name="password"]').fill(OWNER.password);
    const terms = page.locator('input[name="terms"]');
    if (await terms.count()) await terms.check();

    await page.getByRole('button', { name: /créer|inscrire|s'inscrire|commencer|valider/i }).last().click();

    // Preuve de bout de chaîne : l'email de vérif arrive réellement dans la boîte (compte créé + pipeline email OK).
    const mail = await waitForEmail({
      query: `to:${OWNER.email} newer_than:1h`,
      timeoutMs: 120_000,
      predicate: (m) => /confirmez votre email/i.test(m.subject),
    });
    const link = findLink(mail, 'verify-email');
    expect(link, `lien verify-email introuvable. Liens: ${extractLinks(mail).join(', ')}`).toBeTruthy();

    fs.writeFileSync(path.join(AUTH_DIR, 'accounts.json'), JSON.stringify({ owner: OWNER, verifyLink: link }, null, 2));
    console.log(`✅ Email de vérif reçu — sujet "${mail.subject}" — lien: ${link}`);
  });

  test('confirmation email → compte activé', async ({ page }) => {
    const { verifyLink } = JSON.parse(fs.readFileSync(path.join(AUTH_DIR, 'accounts.json'), 'utf8'));
    const resp = await page.goto(verifyLink);
    expect(resp?.status(), 'le lien de vérif ne doit pas être en erreur').toBeLessThan(400);
    await page.waitForLoadState('networkidle');
    // Confirmation : page email-confirmed OU message de succès OU redirection login
    const ok = await page.getByText(/confirm|validé|activé|connecter|succès/i).first().isVisible({ timeout: 8_000 }).catch(() => false);
    expect(ok, `pas de confirmation visible (url: ${page.url()})`).toBeTruthy();
    console.log(`✅ Confirmation email — url finale: ${page.url()}`);
  });

  test('login réel (Espace centre) → cockpit', async ({ page, context }) => {
    const OWNER = ownerAccount();
    await page.goto('/login');
    await page.getByRole('button', { name: /espace centre/i }).click();
    await page.locator('#email').fill(OWNER.email);
    await page.locator('#password').fill(OWNER.password);
    await page.locator('[type="submit"]').click();
    // Login réussi → on quitte /login pour le cockpit ou l'onboarding (pas DEV_AUTOLOGIN)
    await page.waitForURL(/dashboard|onboarding/, { timeout: 25_000 });
    expect(page.url()).toMatch(/dashboard|onboarding/);

    fs.mkdirSync(AUTH_DIR, { recursive: true });
    await context.storageState({ path: path.join(AUTH_DIR, 'owner.json') });
    console.log(`✅ Login réel OK — url: ${page.url()} — session sauvegardée (owner.json)`);
  });

  test('logout → route protégée redirige vers /login (gating réel)', async ({ page }) => {
    // Repart d'une session OWNER chargée
    await page.context().addCookies(
      JSON.parse(fs.readFileSync(path.join(AUTH_DIR, 'owner.json'), 'utf8')).cookies
    );
    await page.goto('/dashboard');
    // Tente un logout via l'API NextAuth si dispo, sinon on vide les cookies
    await page.goto('/api/auth/signout').catch(() => {});
    const signoutBtn = page.getByRole('button', { name: /déconn|sign out|se déconnecter/i }).first();
    if (await signoutBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await signoutBtn.click().catch(() => {});
      await page.waitForLoadState('networkidle').catch(() => {});
    }
    await page.context().clearCookies();

    // Preuve : accès à une route protégée sans session → redirection login
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    expect(page.url(), 'sans session, /dashboard doit rediriger vers /login').toMatch(/login/);
    console.log(`✅ Gating réel — /dashboard sans session → ${page.url()}`);
  });
});
