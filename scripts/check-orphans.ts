/**
 * Vérifie les entités E2E orphelines en DB (non soft-deleted = deletedAt IS NULL).
 * Les entités soft-deleted sont ignorées — invisibles dans l'UI, nettoyées naturellement.
 */
import "./_env";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const email = process.env.DEV_AUTOLOGIN_EMAIL ?? process.env.E2E_EMAIL;
  if (!email) {
    throw new Error("Set DEV_AUTOLOGIN_EMAIL or E2E_EMAIL before running check-orphans.");
  }
  const m = await prisma.membership.findFirst({
    where: { user: { email }, status: "ACTIVE", role: "OWNER" },
    include: { organization: true },
  });
  if (!m) { console.log("No membership found"); return; }
  const orgId = m.organizationId;

  const formations = await prisma.formation.findMany({
    where: { organizationId: orgId, title: { startsWith: "[E2E-" }, deletedAt: null },
    select: { id: true, title: true },
  });
  const learners = await prisma.learner.findMany({
    where: { organizationId: orgId, firstName: { startsWith: "[E2E-" }, deletedAt: null },
    select: { id: true, firstName: true },
  });
  const prospects = await prisma.prospect.findMany({
    where: { organizationId: orgId, name: { startsWith: "[E2E-" }, deletedAt: null },
    select: { id: true, name: true },
  });
  const trainers = await prisma.trainer.findMany({
    where: { organizationId: orgId, firstName: { startsWith: "[E2E-" }, deletedAt: null },
    select: { id: true, firstName: true },
  });
  const sessions = await prisma.session.findMany({
    where: { organizationId: orgId, formation: { title: { startsWith: "[E2E-" } }, deletedAt: null },
    select: { id: true },
  });

  console.log(`Formations orphelines (deletedAt=null) : ${formations.length}`);
  formations.forEach(f => console.log(`  - ${f.title}`));
  console.log(`Apprenants orphelins  (deletedAt=null) : ${learners.length}`);
  learners.forEach(l => console.log(`  - ${l.firstName}`));
  console.log(`Prospects orphelins   (deletedAt=null) : ${prospects.length}`);
  prospects.forEach(p => console.log(`  - ${p.name}`));
  console.log(`Formateurs orphelins  (deletedAt=null) : ${trainers.length}`);
  trainers.forEach(t => console.log(`  - ${t.firstName}`));
  console.log(`Sessions orphelines   (deletedAt=null) : ${sessions.length}`);

  const total = formations.length + learners.length + prospects.length + trainers.length + sessions.length;
  console.log(`\nTotal vrais orphelins : ${total}`);
  if (total === 0) console.log("✅ DB propre");
  else console.log("⚠️  Entités E2E actives en DB — relancer e2e-cleanup.ts");
}

main().catch(console.error).finally(() => prisma.$disconnect());
