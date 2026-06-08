import "./_env";
import { prisma } from "../src/lib/prisma";
import { createTestTenant, step, assert, runner } from "./_tenant";

runner("dedup_smoke", async () => {
  const t = await createTestTenant("dedup");
  try {
    const f = await prisma.formation.create({ data: { organizationId: t.organizationId, title: "F dedup", slug: `fd-${Date.now()}`, price: 0, modality: "PRESENTIEL", level: "DEBUTANT", status: "PUBLIE" } });
    const email = `dup-${Date.now()}@dedup.test`;

    // 1er prospect actif → OK
    await prisma.prospect.create({ data: { organizationId: t.organizationId, name: "P1", email, formationOfInterestId: f.id, source: "PAGE_PUBLIQUE", stage: "NOUVEAU" } });
    step("first_active_prospect_ok");

    // 2e prospect actif identique (org+formation+email) → doit être REJETÉ par l'index unique partiel
    let rejected = false;
    try {
      await prisma.prospect.create({ data: { organizationId: t.organizationId, name: "P1-dup", email, formationOfInterestId: f.id, source: "PAGE_PUBLIQUE", stage: "CONTACTE" } });
    } catch (e) {
      rejected = (e as { code?: string }).code === "P2002" || /unique/i.test(e instanceof Error ? e.message : "");
    }
    assert(rejected, "Le doublon de prospect actif aurait dû être rejeté par la contrainte unique.");
    step("active_duplicate_rejected");

    // Un prospect GAGNE avec le même email/formation est AUTORISÉ (hors index partiel)
    const won = await prisma.prospect.create({ data: { organizationId: t.organizationId, name: "P1-gagne", email, formationOfInterestId: f.id, source: "PAGE_PUBLIQUE", stage: "GAGNE" } });
    assert(won.id, "Un prospect GAGNE en double devrait être autorisé (réengagement).");
    step("won_duplicate_allowed");
  } finally {
    await t.cleanup();
    step("tenant_cleanup");
  }
});
