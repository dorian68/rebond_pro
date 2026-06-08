import "./_env";
import { prisma } from "../src/lib/prisma";
import { createTestTenant, step, assert, runner } from "./_tenant";
import { WRITE_TOOLS } from "../src/server/agent/write-tools";
import type { TenantContext } from "../src/lib/tenant";

function tool(name: string) {
  const t = WRITE_TOOLS.find((x) => x.name === name);
  if (!t) throw new Error(`Outil introuvable: ${name}`);
  return t;
}
const call = (name: string, ctx: TenantContext, args: Record<string, unknown>) => tool(name).execute(ctx, args);

runner("crud_smoke", async () => {
  const t = await createTestTenant("crud");
  try {
    // CREATE formation
    await call("create_formation", t, { title: "Formation CRUD", priceEuros: 500, modality: "PRESENTIEL", status: "PUBLIE", durationDays: 2 });
    const f = await prisma.formation.findFirst({ where: { organizationId: t.organizationId, title: "Formation CRUD" } });
    assert(f, "Formation non créée.");
    assert(f.price === 50000, "Prix non converti en centimes.");
    step("formation_create", { id: f.id, price: f.price });

    // UPDATE formation
    await call("update_formation", t, { id: f.id, title: "Formation CRUD v2", priceEuros: 600 });
    const f2 = await prisma.formation.findUnique({ where: { id: f.id } });
    assert(f2?.title === "Formation CRUD v2" && f2.price === 60000, "Mise à jour formation échouée.");
    step("formation_update", { title: f2.title, price: f2.price });

    // CREATE learner
    await call("create_learner", t, { firstName: "Alice", lastName: "Test", email: "alice@crud.test" });
    const learner = await prisma.learner.findFirst({ where: { organizationId: t.organizationId, email: "alice@crud.test" } });
    assert(learner, "Apprenant non créé.");
    step("learner_create", { id: learner.id });

    // CREATE session
    const start = new Date(Date.now() + 7 * 86400000).toISOString();
    const end = new Date(Date.now() + 8 * 86400000).toISOString();
    await call("create_session", t, { formationId: f.id, startDate: start, endDate: end, capacity: 5 });
    const session = await prisma.session.findFirst({ where: { organizationId: t.organizationId, formationId: f.id } });
    assert(session, "Session non créée.");
    assert(session.capacity === 5, "Capacité session incorrecte.");
    step("session_create", { id: session.id, capacity: session.capacity });

    // ENROLL learner
    await call("enroll_learner", t, { learnerId: learner.id, sessionId: session.id });
    const enrollment = await prisma.enrollment.findFirst({ where: { organizationId: t.organizationId, learnerId: learner.id, sessionId: session.id } });
    assert(enrollment?.status === "INSCRIT", "Inscription échouée.");
    step("enrollment_create", { id: enrollment.id, status: enrollment.status });

    // DELETE session (soft)
    await call("delete_session", t, { id: session.id });
    const delSession = await prisma.session.findUnique({ where: { id: session.id } });
    assert(delSession?.deletedAt, "Session non supprimée (soft delete attendu).");
    step("session_delete", { deletedAt: !!delSession.deletedAt });

    // DELETE formation (soft)
    await call("delete_formation", t, { id: f.id });
    const delF = await prisma.formation.findUnique({ where: { id: f.id } });
    assert(delF?.deletedAt, "Formation non supprimée.");
    step("formation_delete", { deletedAt: !!delF.deletedAt });
  } finally {
    await t.cleanup();
    step("tenant_cleanup");
  }
});
