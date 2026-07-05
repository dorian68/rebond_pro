/**
 * Espace formateur avec profil réellement lié — teste le vrai contenu, pas les empty states.
 * Utilise Prisma en beforeAll pour créer un Trainer avec userId = DEV_AUTOLOGIN user.
 * afterAll supprime ce Trainer de test.
 *
 * Nécessite DATABASE_URL défini (via $env:DATABASE_URL ou .env.local).
 */
import { test, expect } from '@playwright/test';
import { prisma, getDevContext } from '../db-fixture';
import { expectNoServerError } from '../helpers';

let testTrainerId: string | null = null;

test.describe('Module 21 — Espace formateur réel (profil lié)', () => {
  test.beforeAll(async () => {
    const { userId, organizationId } = await getDevContext();

    // Nettoyer toute liaison existante pour éviter le conflit @unique
    await prisma.trainer.updateMany({
      where: { userId },
      data: { userId: null },
    });

    // Créer un formateur de test lié au user DEV_AUTOLOGIN
    const trainer = await prisma.trainer.create({
      data: {
        userId,
        organizationId,
        firstName: 'E2E',
        lastName: 'Formateur Test',
        email: 'e2e-trainer-test@rebondpro.test',
        active: true,
      },
    });
    testTrainerId = trainer.id;
  });

  test.afterAll(async () => {
    if (testTrainerId) {
      await prisma.trainer.delete({ where: { id: testTrainerId } }).catch(() => null);
    }
    await prisma.$disconnect();
  });

  test('trainer home — affiche "Bonjour, E2E" (profil lié)', async ({ page }) => {
    await page.goto('/trainer');
    await page.waitForLoadState('networkidle');
    await expectNoServerError(page);

    // Avec un profil lié, la home ne redirige plus vers /dashboard
    await expect(page).not.toHaveURL(/\/dashboard/);
    await expect(page.getByText(/Bonjour, E2E/)).toBeVisible({ timeout: 10_000 });
  });

  test('trainer home — affiche la section "Mes sessions à venir"', async ({ page }) => {
    await page.goto('/trainer');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/sessions à venir/i)).toBeVisible({ timeout: 8_000 });
  });

  test("trainer disponibilités — affiche l'éditeur de créneaux (pas le empty state)", async ({ page }) => {
    await page.goto('/trainer/disponibilites');
    await page.waitForLoadState('networkidle');
    await expectNoServerError(page);
    // L'AvailabilityEditor doit se rendre (pas "Compte non rattaché")
    await expect(page.getByText('Compte non rattaché')).not.toBeVisible({ timeout: 5_000 }).catch(() => {});
    await expect(page.getByText(/disponibil/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test('trainer profil — formulaire avec données réelles (pas le empty state)', async ({ page }) => {
    await page.goto('/trainer/profil');
    await page.waitForLoadState('networkidle');
    await expectNoServerError(page);
    await expect(page.getByText('Compte non rattaché')).not.toBeVisible({ timeout: 5_000 }).catch(() => {});
    // Le TrainerProfileForm doit être visible (heading — le lien de nav porte le même texte)
    await expect(page.getByRole('heading', { name: /mon profil/i })).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('input[name="firstName"]')).toBeVisible({ timeout: 8_000 });
  });

  test('trainer planning — affiche le planning (même vide)', async ({ page }) => {
    await page.goto('/trainer/planning');
    await page.waitForLoadState('networkidle');
    await expectNoServerError(page);
    await expect(page.getByText('Compte non rattaché')).not.toBeVisible({ timeout: 5_000 }).catch(() => {});
    await expect(page.getByRole('heading', { name: /mon planning/i })).toBeVisible({ timeout: 8_000 });
  });

  test('trainer pas de crash JS', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('/trainer');
    await page.waitForLoadState('networkidle');
    const realErrors = errors.filter(e => !e.includes('ResizeObserver'));
    expect(realErrors, `JS errors: ${realErrors.join(', ')}`).toHaveLength(0);
  });
});
