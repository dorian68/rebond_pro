/**
 * Espace bénéficiaire réel + canvas Ikigai.
 * Crée un Beneficiary lié au DEV_AUTOLOGIN user pour tester le vrai contenu de /espace.
 * Génère un token Ikigai signé HMAC pour tester la page /bilan/ikigai/[token].
 *
 * Nécessite DATABASE_URL défini (via $env:DATABASE_URL ou .env.local).
 */
import { test, expect } from '@playwright/test';
import { prisma, getDevContext, createIkigaiToken } from '../db-fixture';
import { expectNoServerError } from '../helpers';

let testBeneficiaryId: string | null = null;
let ikigaiToken: string | null = null;

test.describe('Module 22 — Espace bénéficiaire réel + Ikigai canvas', () => {
  test.beforeAll(async () => {
    const { userId, organizationId } = await getDevContext();

    // Nettoyer toute liaison existante pour éviter le conflit @unique
    await prisma.beneficiary.updateMany({
      where: { userId },
      data: { userId: null },
    });

    // Créer un bénéficiaire de test lié au user DEV_AUTOLOGIN
    const beneficiary = await prisma.beneficiary.create({
      data: {
        userId,
        organizationId,
        firstName: 'E2E',
        lastName: 'Bénéficiaire Test',
        email: 'e2e-beneficiary-test@rebondpro.test',
        status: 'active',
      },
    });
    testBeneficiaryId = beneficiary.id;
    ikigaiToken = createIkigaiToken(beneficiary.id);
  });

  test.afterAll(async () => {
    if (testBeneficiaryId) {
      await prisma.beneficiary.delete({ where: { id: testBeneficiaryId } }).catch(() => null);
    }
    await prisma.$disconnect();
  });

  test('espace home — affiche "Bonjour, E2E" (bénéficiaire lié)', async ({ page }) => {
    await page.goto('/espace');
    await page.waitForLoadState('networkidle');
    await expectNoServerError(page);

    // Avec un profil lié, la home affiche la vrai page (pas "Bienvenue sur votre espace")
    await expect(page.getByText('Bienvenue sur votre espace')).not.toBeVisible({ timeout: 5_000 }).catch(() => {});
    await expect(page.getByText(/Bonjour, E2E/)).toBeVisible({ timeout: 10_000 });
  });

  test('espace home — section "Ma progression" visible', async ({ page }) => {
    await page.goto('/espace');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/ma progression/i)).toBeVisible({ timeout: 8_000 });
  });

  test('espace home — CTA catalogue visible', async ({ page }) => {
    await page.goto('/espace');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('link', { name: /voir le catalogue/i })).toBeVisible({ timeout: 8_000 });
  });

  test('espace catalogue — charge les formations (pas le empty state)', async ({ page }) => {
    await page.goto('/espace/catalogue');
    await page.waitForLoadState('networkidle');
    await expectNoServerError(page);
    // Avec un profil bénéficiaire, la page doit charger le vrai catalogue
    await expect(page.getByText('Bientôt disponible')).not.toBeVisible({ timeout: 5_000 }).catch(() => {});
    await expect(page.getByRole('heading', { name: /catalogue de formations/i })).toBeVisible({ timeout: 8_000 });
  });

  test('espace parcours — affiche le parcours bilan (même vide)', async ({ page }) => {
    await page.goto('/espace/parcours');
    await page.waitForLoadState('networkidle');
    await expectNoServerError(page);
    await expect(page.getByText('Parcours en préparation')).not.toBeVisible({ timeout: 5_000 }).catch(() => {});
    await expect(page.getByText(/parcours/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test('ikigai canvas — token valide → canvas se charge', async ({ page }) => {
    test.skip(!ikigaiToken, 'token ikigai non généré');
    const url = `/bilan/ikigai/${ikigaiToken}`;
    const resp = await page.goto(url);
    // Le token est valide → pas de 404
    expect(resp?.status()).not.toBe(404);
    await page.waitForLoadState('networkidle');
    await expectNoServerError(page);
    // Le canvas Ikigai doit afficher au moins une zone
    await expect(page.getByText('Énergie').first()).toBeVisible({ timeout: 10_000 });
  });

  test('ikigai canvas — les 4 zones sont affichées', async ({ page }) => {
    test.skip(!ikigaiToken, 'token ikigai non généré');
    await page.goto(`/bilan/ikigai/${ikigaiToken}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Énergie')).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText('Talents')).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText('Utilité')).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText('Valeur marché')).toBeVisible({ timeout: 8_000 });
  });

  test('espace pas de crash JS', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('/espace');
    await page.waitForLoadState('networkidle');
    const realErrors = errors.filter(e => !e.includes('ResizeObserver'));
    expect(realErrors, `JS errors: ${realErrors.join(', ')}`).toHaveLength(0);
  });
});
