import "./_env";
import { prisma } from "../src/lib/prisma";
import { createPublicLead, getPublicFormationUncached } from "../src/server/public-conversion";
import { createTestTenant } from "./_tenant";

function step(label: string, details?: unknown) {
  console.log(JSON.stringify({ step: label, status: "pass", details }));
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const tenant = await createTestTenant("lot5");
  const publicSlug = `lot5-${Date.now()}`;
  await prisma.organization.update({
    where: { id: tenant.organizationId },
    data: {
      publicProfileEnabled: true,
      marketplaceStatus: "APPROVED",
      marketplaceReviewedAt: new Date(),
      marketplaceReviewedBy: tenant.userId,
    },
  });
  const formation = await prisma.formation.create({
    data: {
      organizationId: tenant.organizationId,
      title: "Formation publique Lot 5",
      slug: publicSlug,
      publicSlug,
      status: "PUBLIE",
      isPublic: true,
      price: 50_000,
    },
  });
  step("public_formation_fixture", { orgSlug: tenant.organizationSlug, publicSlug });

  const publicPage = await getPublicFormationUncached(tenant.organizationSlug!, publicSlug);
  assert(publicPage?.id === formation.id, "La résolution publique ne renvoie pas la formation attendue.");
  step("public_formation_resolution", { title: publicPage.title, sessions: publicPage.sessions.length });

  const email = `smoke-lot5-${Date.now()}@example.test`;
  try {
    const first = await createPublicLead(tenant.organizationSlug!, publicSlug, {
      contactName: "Smoke Test Lot 5",
      company: "Entreprise Smoke",
      email,
      phone: "",
      intent: "INSCRIPTION",
      message: "Validation automatique du parcours public.",
    });
    assert(first.created, "La première demande publique doit créer un prospect.");

    const prospect = await prisma.prospect.findUnique({ where: { id: first.id } });
    assert(prospect?.organizationId === formation.organizationId, "Le prospect a été créé dans le mauvais tenant.");
    assert(prospect.source === "PAGE_PUBLIQUE", "La source du prospect public est incorrecte.");
    assert(prospect.formationOfInterestId === formation.id, "La formation d'intérêt n'est pas reliée.");
    step("public_lead_creation", { prospectId: first.id, tenantIsolated: true });

    const second = await createPublicLead(tenant.organizationSlug!, publicSlug, {
      contactName: "Smoke Test Lot 5",
      company: "Entreprise Smoke",
      email,
      phone: "0600000000",
      intent: "RAPPEL",
      message: "Deuxième demande, doit mettre à jour sans dupliquer.",
    });
    assert(!second.created && second.id === first.id, "Une demande répétée doit mettre à jour le prospect actif.");
    const duplicates = await prisma.prospect.count({ where: { organizationId: formation.organizationId, email, formationOfInterestId: formation.id } });
    assert(duplicates === 1, "La déduplication des demandes publiques a échoué.");
    step("public_lead_deduplication", { duplicates });
  } finally {
    await tenant.cleanup();
  }

  step("lot5_smoke_complete");
}

main()
  .catch((error) => {
    console.error(JSON.stringify({ step: "lot5_smoke", status: "fail", error: error instanceof Error ? error.message : String(error) }));
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
