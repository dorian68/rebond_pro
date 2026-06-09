import "./_env";
import { prisma } from "../src/lib/prisma";
import { createTestTenant, step, assert, runner } from "./_tenant";
import { recordTransaction, getFinanceSummary, settleTransaction, commissionFor } from "../src/server/finance";
import { enrollBeneficiaryInFormation } from "../src/server/enrollment-from-purchase";

runner("finance_smoke", async () => {
  const t = await createTestTenant("finance");
  try {
    const ref = `cs_test_${Date.now()}`;
    // 1. Achat de formation : commission calculée + statut de reversement "pending"
    const txId = await recordTransaction({ organizationId: t.organizationId, type: "FORMATION_PURCHASE", amount: 100000, stripeRef: ref, payerName: "Acheteur Test", description: "Formation X" });
    assert(txId, "recordTransaction doit renvoyer l'id de la transaction créée.");
    const tx = await prisma.transaction.findUnique({ where: { stripeRef: ref } });
    assert(tx, "Transaction non enregistrée.");
    assert(tx.amount === 100000 && tx.commission === commissionFor(100000), "Montant/commission incorrects.");
    assert(tx.payoutStatus === "pending", "Un achat de formation doit être 'pending' (net dû au centre).");
    step("formation_transaction", { amount: tx.amount, commission: tx.commission, payout: tx.payoutStatus });

    // 2. Idempotence : même stripeRef → pas de doublon, renvoie null
    const dup = await recordTransaction({ organizationId: t.organizationId, type: "FORMATION_PURCHASE", amount: 100000, stripeRef: ref });
    assert(dup === null, "Un doublon (même stripeRef) doit renvoyer null.");
    const count = await prisma.transaction.count({ where: { stripeRef: ref } });
    assert(count === 1, "La transaction a été dupliquée (idempotence cassée).");
    step("idempotency");

    // 3. Abonnement + bilan : revenus propres plateforme → payout "not_applicable"
    const subRef = `sub_${Date.now()}`;
    await recordTransaction({ organizationId: t.organizationId, type: "SUBSCRIPTION", amount: 4900, stripeRef: subRef });
    await recordTransaction({ organizationId: t.organizationId, type: "BILAN", amount: 120000, stripeRef: `bil_${Date.now()}` });
    const sub = await prisma.transaction.findUnique({ where: { stripeRef: subRef } });
    assert(sub?.payoutStatus === "not_applicable", "Un abonnement ne doit rien reverser (not_applicable).");
    step("subscription_and_bilan");

    // 4. Inscription automatique à l'achat : Learner + Enrollment dans une session OUVERTE
    const formation = await prisma.formation.create({ data: { organizationId: t.organizationId, title: "Formation Achat", slug: `f-achat-${Date.now()}`, price: 100000 } });
    const session = await prisma.session.create({ data: { organizationId: t.organizationId, formationId: formation.id, status: "OUVERTE", startDate: new Date(Date.now() + 7 * 864e5), endDate: new Date(Date.now() + 8 * 864e5) } });
    const enr = await enrollBeneficiaryInFormation({ organizationId: t.organizationId, formationId: formation.id, payerEmail: "acheteur@smoke.test", payerName: "Jean Dupont" });
    assert(enr?.enrollmentId, "L'achat doit produire une inscription dans la session ouverte.");
    const learner = await prisma.learner.findFirst({ where: { organizationId: t.organizationId, email: "acheteur@smoke.test" } });
    assert(learner && learner.firstName === "Jean" && learner.lastName === "Dupont", "Learner mal créé depuis le payeur.");
    const enrollment = await prisma.enrollment.findUnique({ where: { id: enr!.enrollmentId! } });
    assert(enrollment && enrollment.sessionId === session.id && enrollment.status === "INSCRIT", "Inscription incorrecte.");
    step("auto_enrollment", { learnerId: learner!.id, enrollmentId: enrollment!.id });

    // 4b. Idempotence de l'inscription (même payeur → pas de doublon)
    const enr2 = await enrollBeneficiaryInFormation({ organizationId: t.organizationId, formationId: formation.id, payerEmail: "acheteur@smoke.test", payerName: "Jean Dupont" });
    assert(enr2?.enrollmentId === enr!.enrollmentId, "Ré-inscription : l'inscription doit être idempotente.");
    const learnerCount = await prisma.learner.count({ where: { organizationId: t.organizationId, email: "acheteur@smoke.test" } });
    assert(learnerCount === 1, "Le Learner a été dupliqué.");
    step("enrollment_idempotency");

    // 5. Reversement : marquer la transaction d'achat comme reversée
    await settleTransaction(tx.id);
    const settled = await prisma.transaction.findUnique({ where: { id: tx.id }, select: { payoutStatus: true, settledAt: true } });
    assert(settled?.payoutStatus === "settled" && settled.settledAt, "Le reversement n'a pas été enregistré.");
    step("payout_settled");

    // 6. Synthèse consolidée (avec net restant à reverser)
    const s = await getFinanceSummary();
    assert(s.totalGross >= 100000 + 4900 + 120000, "Le volume brut consolidé est incohérent.");
    assert(s.totalCommission >= commissionFor(100000), "Les commissions consolidées sont incohérentes.");
    assert(typeof s.pendingPayout === "number", "pendingPayout doit être calculé.");
    step("finance_summary", { count: s.count, commission: s.totalCommission, pendingPayout: s.pendingPayout });
  } finally {
    await t.cleanup(); // cascade : supprime transactions, learners, enrollments, sessions, formations du tenant
    step("tenant_cleanup");
  }
});
