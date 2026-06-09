import "./_env";
import { prisma } from "../src/lib/prisma";
import { createTestTenant, step, assert, runner } from "./_tenant";
import { DEFAULT_BILAN_STEPS } from "../src/server/bilan";
import { listBeneficiaries, getBeneficiary } from "../src/server/beneficiary";
import { getMyProgress, getMyInterests, getMySavedFormationIds } from "../src/server/beneficiary-self";

runner("beneficiary_smoke", async () => {
  const center = await createTestTenant("operator");
  const other = await createTestTenant("operator2");
  try {
    // 1. L'opérateur invite un bénéficiaire (compte + parcours seedé)
    const email = `ben-${Date.now()}@smoke.test`;
    const user = await prisma.user.create({ data: { email, name: "Bea Test" } });
    const ben = await prisma.beneficiary.create({
      data: {
        organizationId: center.organizationId, userId: user.id, firstName: "Bea", lastName: "Test", email,
        objective: "Reconversion", status: "active",
        steps: { create: DEFAULT_BILAN_STEPS.map((s, i) => ({ phase: s.phase, title: s.title, description: s.description, order: i })) },
      },
    });
    await prisma.membership.create({ data: { userId: user.id, organizationId: center.organizationId, role: "LEARNER", status: "INVITED", invitedEmail: email } });
    const steps = await prisma.bilanStep.count({ where: { beneficiaryId: ben.id } });
    assert(steps === DEFAULT_BILAN_STEPS.length, "Le parcours n'a pas été initialisé avec les étapes par défaut.");
    step("beneficiary_invited_with_journey", { steps });

    // 2. L'opérateur voit le bénéficiaire + sa progression
    const list = await listBeneficiaries(center);
    const inList = list.find((b) => b.id === ben.id);
    assert(inList && inList.stepsTotal === steps && inList.progress === 0, "Le bénéficiaire ne remonte pas correctement côté opérateur.");
    step("operator_sees_beneficiary");

    // 3. Le bénéficiaire complète une étape → progression
    const firstStep = await prisma.bilanStep.findFirst({ where: { beneficiaryId: ben.id }, orderBy: { order: "asc" } });
    await prisma.bilanStep.update({ where: { id: firstStep!.id }, data: { status: "done", completedAt: new Date() } });
    const progress = await getMyProgress(ben.id);
    assert(progress.done === 1 && progress.percent > 0, "La progression ne se met pas à jour.");
    step("step_completed", { percent: progress.percent });

    // 4. Catalogue : le bénéficiaire enregistre une formation publique d'un AUTRE centre
    const provider = await createTestTenant("provider");
    const formation = await prisma.formation.create({ data: { organizationId: provider.organizationId, title: "Form B2C", slug: `b2c-${Date.now()}`, price: 50000, modality: "PRESENTIEL", level: "DEBUTANT", status: "PUBLIE", isPublic: true, publicSlug: `b2c-${Date.now()}` } });
    await prisma.formationInterest.create({ data: { beneficiaryId: ben.id, formationId: formation.id, status: "saved" } });
    const saved = await getMySavedFormationIds(ben.id);
    assert(saved.has(formation.id), "La formation enregistrée n'apparaît pas dans les favoris.");
    step("catalogue_save");

    // 5. Demande d'infos → intérêt "requested" + prospect créé dans le centre propriétaire
    await prisma.formationInterest.update({ where: { beneficiaryId_formationId: { beneficiaryId: ben.id, formationId: formation.id } }, data: { status: "requested" } });
    await prisma.prospect.create({ data: { organizationId: provider.organizationId, formationOfInterestId: formation.id, name: "Bea Test", contactName: "Bea Test", type: "PARTICULIER", email, source: "PAGE_PUBLIQUE", stage: "NOUVEAU", potentialAmount: formation.price, isHot: true } });
    const interests = await getMyInterests(ben.id);
    assert(interests.some((i) => i.formation.id === formation.id && i.status === "requested"), "La demande d'infos n'a pas été enregistrée.");
    const prospect = await prisma.prospect.findFirst({ where: { organizationId: provider.organizationId, formationOfInterestId: formation.id, email } });
    assert(prospect, "La demande n'a pas généré de prospect dans le centre propriétaire.");
    step("catalogue_request_creates_prospect");

    // 6. Isolation : un autre opérateur ne voit pas ce bénéficiaire
    const otherList = await listBeneficiaries(other);
    assert(!otherList.some((b) => b.id === ben.id), "FUITE : un autre opérateur voit le bénéficiaire.");
    const crossRead = await getBeneficiary(other, ben.id);
    assert(!crossRead, "FUITE : lecture cross-tenant du bénéficiaire.");
    step("cross_tenant_isolation");

    await provider.cleanup();
  } finally {
    await center.cleanup();
    await other.cleanup();
    step("tenant_cleanup");
  }
});
