import "./_env";
import { prisma } from "../src/lib/prisma";
import { step, assert, runner } from "./_tenant";
import { getPlatformOverview, listAllCenters, listAllTrainers, listAllBeneficiaries } from "../src/server/platform";

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
});
