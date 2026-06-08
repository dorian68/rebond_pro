import "./_env";
import { prisma } from "../src/lib/prisma";
import { createTestTenant, step, assert, runner } from "./_tenant";
import { listFormations } from "../src/server/formations";
import { WRITE_TOOLS } from "../src/server/agent/write-tools";

const call = (name: string, ctx: Parameters<typeof WRITE_TOOLS[number]["execute"]>[0], args: Record<string, unknown>) =>
  WRITE_TOOLS.find((x) => x.name === name)!.execute(ctx, args);

runner("tenant_isolation_smoke", async () => {
  const a = await createTestTenant("tenantA");
  const b = await createTestTenant("tenantB");
  try {
    // Formation dans le tenant A
    const fa = await prisma.formation.create({ data: { organizationId: a.organizationId, title: "Secret A", slug: `secret-${Date.now()}`, price: 0, modality: "PRESENTIEL", level: "DEBUTANT", status: "PUBLIE" } });

    // 1. La liste scopée de B ne voit pas la formation de A
    const listB = await listFormations(b);
    assert(!listB.some((f) => f.id === fa.id), "FUITE: le tenant B voit une formation du tenant A.");
    step("list_scoped_isolation", { tenantBFormations: listB.length });

    // 2. La recherche agent de B ne renvoie pas la formation de A
    const { getTool } = await import("../src/server/agent/tools");
    const res = await getTool("search_entities")!.execute(b, { entityType: "formation", query: "Secret A" });
    const items = (JSON.parse(res.textForLLM) as { items: { id: string }[] }).items;
    assert(!items.some((i) => i.id === fa.id), "FUITE: la recherche du tenant B trouve une formation du tenant A.");
    step("search_scoped_isolation");

    // 3. Un outil d'écriture de B ne peut pas modifier une entité de A
    let blocked = false;
    try {
      await call("update_formation", b, { id: fa.id, title: "Piratée" });
    } catch {
      blocked = true;
    }
    // Soit ça lève (introuvable), soit ça ne modifie rien : on vérifie l'état réel
    const after = await prisma.formation.findUnique({ where: { id: fa.id } });
    assert(after?.title === "Secret A", "FUITE CRITIQUE: le tenant B a modifié une formation du tenant A.");
    step("cross_tenant_write_blocked", { threw: blocked, titleIntact: after.title === "Secret A" });

    // 4. Un outil d'écriture de B ne peut pas supprimer une entité de A
    try { await call("delete_formation", b, { id: fa.id }); } catch { /* attendu */ }
    const afterDel = await prisma.formation.findUnique({ where: { id: fa.id } });
    assert(afterDel && !afterDel.deletedAt, "FUITE CRITIQUE: le tenant B a supprimé une formation du tenant A.");
    step("cross_tenant_delete_blocked");
  } finally {
    await a.cleanup();
    await b.cleanup();
    step("tenant_cleanup");
  }
});
