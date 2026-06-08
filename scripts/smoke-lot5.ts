import "./_env";
import { prisma } from "../src/lib/prisma";
import { createPublicLead, getPublicFormation } from "../src/server/public-conversion";

function step(label: string, details?: unknown) {
  console.log(JSON.stringify({ step: label, status: "pass", details }));
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const formation = await prisma.formation.findFirst({
    where: { isPublic: true, status: "PUBLIE", deletedAt: null, publicSlug: { not: null } },
    include: { organization: { select: { slug: true } } },
  });
  assert(formation?.publicSlug, "Aucune formation publique seedée. Exécutez npm run db:seed.");
  step("public_formation_fixture", { orgSlug: formation.organization.slug, publicSlug: formation.publicSlug });

  const publicPage = await getPublicFormation(formation.organization.slug, formation.publicSlug);
  assert(publicPage?.id === formation.id, "La résolution publique ne renvoie pas la formation attendue.");
  step("public_formation_resolution", { title: publicPage.title, sessions: publicPage.sessions.length });

  const email = `smoke-lot5-${Date.now()}@example.test`;
  let prospectId: string | null = null;
  try {
    const first = await createPublicLead(formation.organization.slug, formation.publicSlug, {
      contactName: "Smoke Test Lot 5",
      company: "Entreprise Smoke",
      email,
      phone: "",
      intent: "INSCRIPTION",
      message: "Validation automatique du parcours public.",
    });
    prospectId = first.id;
    assert(first.created, "La première demande publique doit créer un prospect.");

    const prospect = await prisma.prospect.findUnique({ where: { id: first.id } });
    assert(prospect?.organizationId === formation.organizationId, "Le prospect a été créé dans le mauvais tenant.");
    assert(prospect.source === "PAGE_PUBLIQUE", "La source du prospect public est incorrecte.");
    assert(prospect.formationOfInterestId === formation.id, "La formation d'intérêt n'est pas reliée.");
    step("public_lead_creation", { prospectId: first.id, tenantIsolated: true });

    const second = await createPublicLead(formation.organization.slug, formation.publicSlug, {
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
    if (prospectId) await prisma.prospect.delete({ where: { id: prospectId } });
  }

  step("lot5_smoke_complete");
}

main()
  .catch((error) => {
    console.error(JSON.stringify({ step: "lot5_smoke", status: "fail", error: error instanceof Error ? error.message : String(error) }));
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
