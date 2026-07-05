/**
 * E2E cleanup script: delete orphaned E2E test data and upgrade test org to PRO plan.
 * Run before E2E tests to ensure clean state and no quota issues.
 */
import "./_env";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Find the DEV_AUTOLOGIN user's org
  const email = process.env.DEV_AUTOLOGIN_EMAIL ?? process.env.E2E_EMAIL;
  if (!email) {
    throw new Error("Set DEV_AUTOLOGIN_EMAIL or E2E_EMAIL before running e2e-cleanup.");
  }
  const membership = await prisma.membership.findFirst({
    where: { user: { email }, status: "ACTIVE", role: "OWNER" },
    include: { organization: true },
  });
  if (!membership) {
    console.error(`No OWNER membership found for ${email}`);
    process.exit(1);
  }
  const orgId = membership.organizationId;
  console.log(`Org: ${membership.organization.name} (${orgId})`);

  // Upgrade to PRO to remove quotas
  await prisma.organization.update({ where: { id: orgId }, data: { plan: "PRO" } });
  console.log("✅ Plan upgraded to PRO");

  // Delete orphaned E2E sessions (sessions whose formation title starts with [E2E-)
  const e2eFormations = await prisma.formation.findMany({
    where: { organizationId: orgId, title: { startsWith: "[E2E-" } },
    select: { id: true, title: true },
  });
  if (e2eFormations.length > 0) {
    console.log(`Found ${e2eFormations.length} E2E formation(s):`, e2eFormations.map(f => f.title));
    const formationIds = e2eFormations.map(f => f.id);
    // Delete sessions linked to these formations
    const delSessions = await prisma.session.deleteMany({
      where: { organizationId: orgId, formationId: { in: formationIds } },
    });
    console.log(`✅ Deleted ${delSessions.count} E2E session(s)`);
    // Delete the formations themselves
    const delFormations = await prisma.formation.deleteMany({
      where: { organizationId: orgId, id: { in: formationIds } },
    });
    console.log(`✅ Deleted ${delFormations.count} E2E formation(s)`);
  } else {
    console.log("No E2E formations found to clean up");
  }

  // Delete orphaned E2E apprenants
  const delLearners = await prisma.learner.deleteMany({
    where: { organizationId: orgId, firstName: { startsWith: "[E2E-" } },
  });
  if (delLearners.count > 0) console.log(`✅ Deleted ${delLearners.count} E2E apprenant(s)`);

  // Delete orphaned E2E prospects
  const delProspects = await prisma.prospect.deleteMany({
    where: { organizationId: orgId, name: { startsWith: "[E2E-" } },
  });
  if (delProspects.count > 0) console.log(`✅ Deleted ${delProspects.count} E2E prospect(s)`);

  // Delete orphaned E2E trainers
  const delTrainers = await prisma.trainer.deleteMany({
    where: { organizationId: orgId, firstName: { startsWith: "[E2E-" } },
  });
  if (delTrainers.count > 0) console.log(`✅ Deleted ${delTrainers.count} E2E trainer(s)`);

  console.log("✅ E2E cleanup complete");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
