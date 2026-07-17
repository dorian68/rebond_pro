import "./_env";
import { prisma } from "../src/lib/prisma";
import { step, assert, runner, createTestTenant } from "./_tenant";
import { getPlatformOverview, listAllCenters, listAllTrainers, listAllBeneficiaries } from "../src/server/platform";
import { approveCenterMarketplaceForAdmin } from "../src/server/marketplace-moderation-service";

runner("platform_smoke", async () => {
  // 1. Vue d'ensemble cross-tenant : champs numériques cohérents
  const o = await getPlatformOverview();
  for (const k of ["centers", "trainers", "beneficiaries", "learners", "publishedFormations", "upcomingSessions", "activeProspects", "paidOrgs", "networkRevenue"] as const) {
    assert(typeof o[k] === "number" && o[k] >= 0, `Champ overview invalide: ${k}`);
  }
  assert(o.centers >= 1, "Au moins un centre attendu dans le réseau.");
  step("overview_aggregates", { centers: o.centers, trainers: o.trainers, beneficiaries: o.beneficiaries });

  // 2. Listes cross-tenant
  const [centers, trainers, beneficiaries] = [await listAllCenters(), await listAllTrainers(), await listAllBeneficiaries()];
  assert(Array.isArray(centers) && centers.length >= 1, "listAllCenters vide.");
  assert(Array.isArray(trainers), "listAllTrainers invalide.");
  assert(Array.isArray(beneficiaries), "listAllBeneficiaries invalide.");
  assert(centers.every((c) => typeof c.upcomingSessions === "number"), "Champ upcomingSessions manquant.");
  step("cross_tenant_lists", { centers: centers.length, trainers: trainers.length, beneficiaries: beneficiaries.length });

  // 3. La colonne platformAdmin fonctionne (round-trip)
  const email = `padmin-${Date.now()}@smoke.test`;
  const u = await prisma.user.create({ data: { email, name: "PA", platformAdmin: true } });
  try {
    const reread = await prisma.user.findUnique({ where: { id: u.id }, select: { platformAdmin: true } });
    assert(reread?.platformAdmin === true, "Le flag platformAdmin ne persiste pas.");
    step("platform_admin_flag");
  } finally {
    await prisma.user.delete({ where: { id: u.id } }).catch(() => {});
  }

  // 4. Modération marketplace : un super-admin peut publier en un clic.
  const t = await createTestTenant("platform-public-profile");
  const stamp = Date.now();
  let platformUserId: string | null = null;
  try {
    await prisma.organization.update({
      where: { id: t.organizationId },
      data: { publicProfileEnabled: false, marketplaceStatus: "PENDING" },
    });
    await prisma.formation.create({
      data: {
        organizationId: t.organizationId,
        title: "Formation moderation marketplace",
        slug: `platform-public-profile-${stamp}`,
        price: 50000,
        modality: "PRESENTIEL",
        level: "DEBUTANT",
        status: "PUBLIE",
        isPublic: true,
        publicSlug: `platform-public-profile-${stamp}`,
      },
    });

    const platformUser = await prisma.user.create({
      data: { email: `platform-admin-${stamp}@smoke.test`, name: "Smoke Platform Admin", platformAdmin: true },
    });
    platformUserId = platformUser.id;
    await prisma.membership.create({
      data: { userId: platformUser.id, organizationId: t.organizationId, role: "OWNER", status: "ACTIVE" },
    });
    const admin = { userId: platformUser.id, email: platformUser.email, name: platformUser.name };

    const approved = await approveCenterMarketplaceForAdmin(t.organizationId, admin, { revalidate: false, notify: false });
    assert(approved.ok, approved.error ?? "Publication marketplace en un clic echouee.");

    const orgAfterActivation = await prisma.organization.findUnique({
      where: { id: t.organizationId },
      select: { publicProfileEnabled: true, marketplaceStatus: true },
    });
    assert(orgAfterActivation?.publicProfileEnabled === true, "Le profil public n'a pas ete active.");
    assert(orgAfterActivation.marketplaceStatus === "APPROVED", "Le centre doit etre valide dans la meme action admin.");

    const audit = await prisma.auditLog.findFirst({
      where: { organizationId: t.organizationId, actorId: platformUser.id, action: "marketplace.public_profile_activated" },
    });
    assert(Boolean(audit), "Audit manquant pour l'activation admin du profil public.");

    const orgAfterApproval = await prisma.organization.findUnique({
      where: { id: t.organizationId },
      select: { marketplaceStatus: true, marketplaceReviewedBy: true, marketplaceReviewedAt: true },
    });
    assert(orgAfterApproval?.marketplaceStatus === "APPROVED", "Le centre n'est pas passe en APPROVED.");
    assert(orgAfterApproval.marketplaceReviewedBy === platformUser.id, "L'admin validateur n'est pas trace.");
    assert(Boolean(orgAfterApproval.marketplaceReviewedAt), "La date de revue marketplace n'est pas tracee.");
    step("marketplace_public_profile_admin_activation");
  } finally {
    if (platformUserId) await prisma.user.delete({ where: { id: platformUserId } }).catch(() => {});
    await t.cleanup();
  }
});
