import "server-only";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * Inscription automatique suite à l'achat d'une formation (webhook FORMATION_PURCHASE).
 * Crée/retrouve un Learner dans le centre vendeur et l'inscrit à la prochaine session OUVERTE.
 * Idempotent (Learner dédupliqué par email, Enrollment par contrainte unique learnerId+sessionId).
 * Ne lève jamais : en cas d'échec, journalise et renvoie null pour ne pas casser le webhook.
 */
export async function enrollBeneficiaryInFormation(input: {
  organizationId: string;
  formationId: string;
  beneficiaryId?: string | null;
  payerEmail?: string | null;
  payerName?: string | null;
}): Promise<{ learnerId: string; enrollmentId: string | null } | null> {
  try {
    // 1. Identité de l'acheteur : priorité au bénéficiaire lié, sinon infos du payeur Stripe.
    let firstName = "Acheteur";
    let lastName = "En ligne";
    let email: string | null = input.payerEmail ?? null;

    if (input.beneficiaryId) {
      const b = await prisma.beneficiary.findUnique({
        where: { id: input.beneficiaryId },
        select: { firstName: true, lastName: true, email: true },
      });
      if (b) { firstName = b.firstName; lastName = b.lastName; email = b.email ?? email; }
    } else if (input.payerName) {
      const parts = input.payerName.trim().split(/\s+/);
      firstName = parts[0] ?? firstName;
      lastName = parts.slice(1).join(" ") || lastName;
    }

    // 2. Learner : retrouver par email dans l'org (non supprimé), sinon créer.
    let learner = email
      ? await prisma.learner.findFirst({ where: { organizationId: input.organizationId, email, deletedAt: null }, select: { id: true } })
      : null;
    if (!learner) {
      learner = await prisma.learner.create({
        data: { organizationId: input.organizationId, firstName, lastName, email },
        select: { id: true },
      });
    }

    // 3. Session cible : prochaine session OUVERTE de la formation (non terminée, non supprimée).
    const session = await prisma.session.findFirst({
      where: { organizationId: input.organizationId, formationId: input.formationId, status: "OUVERTE", deletedAt: null, endDate: { gte: new Date() } },
      orderBy: { startDate: "asc" },
      select: { id: true },
    });

    if (!session) {
      // Pas de session ouverte : l'acheteur est enregistré comme apprenant, le centre le placera manuellement.
      logger.info("finance.enrollment.no_open_session", { organizationId: input.organizationId, formationId: input.formationId, learnerId: learner.id });
      return { learnerId: learner.id, enrollmentId: null };
    }

    // 4. Inscription idempotente (unique learnerId+sessionId).
    const enrollment = await prisma.enrollment.upsert({
      where: { learnerId_sessionId: { learnerId: learner.id, sessionId: session.id } },
      create: { organizationId: input.organizationId, learnerId: learner.id, sessionId: session.id, status: "INSCRIT" },
      update: {},
      select: { id: true },
    });
    logger.info("finance.enrollment.created", { organizationId: input.organizationId, formationId: input.formationId, learnerId: learner.id, enrollmentId: enrollment.id });
    return { learnerId: learner.id, enrollmentId: enrollment.id };
  } catch (e) {
    logger.error("finance.enrollment.failed", { error: e instanceof Error ? e.message : String(e) });
    return null;
  }
}
