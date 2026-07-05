/**
 * Fixture DB pour les specs E2E nécessitant un accès Prisma direct.
 * Charge .env.local pour DATABASE_URL avant d'instancier le client.
 */
import '../scripts/_env';
import { createHmac } from 'crypto';
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

/** Retourne userId + organizationId pour l'utilisateur DEV_AUTOLOGIN. */
export async function getDevContext() {
  const devEmail = process.env.DEV_AUTOLOGIN_EMAIL ?? process.env.E2E_EMAIL;
  if (!devEmail) throw new Error('Set DEV_AUTOLOGIN_EMAIL or E2E_EMAIL for E2E DB fixtures.');
  const m = await prisma.membership.findFirst({
    where: { user: { email: devEmail }, status: 'ACTIVE', role: 'OWNER' },
    select: { userId: true, organizationId: true },
  });
  if (!m) throw new Error(`DEV_AUTOLOGIN user "${devEmail}" not found in DB`);
  return m;
}

/** Génère un token Ikigai signé HMAC — même logique que src/server/bilan-roadmap.ts */
export function createIkigaiToken(beneficiaryId: string, days = 30): string {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? 'local-dev-secret';
  const exp = Math.floor(Date.now() / 1000) + days * 86400;
  const payload = `${beneficiaryId}.${exp}`;
  const sig = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}
