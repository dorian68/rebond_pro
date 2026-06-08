import "./_env";
import { prisma } from "../src/lib/prisma";
import { createTestTenant, step, assert, runner } from "./_tenant";
import { quotaUsage, enforceQuota } from "../src/server/quota";

runner("quota_smoke", async () => {
  const t = await createTestTenant("quota"); // plan FREE par défaut
  try {
    // 1. Limites du plan FREE exposées
    const trainers0 = await quotaUsage(t, "trainers");
    const sessions0 = await quotaUsage(t, "sessions");
    const ai0 = await quotaUsage(t, "ai");
    assert(trainers0.limit === 2, `Limite formateurs FREE attendue 2, obtenu ${trainers0.limit}.`);
    assert(sessions0.limit === 5, `Limite sessions FREE attendue 5, obtenu ${sessions0.limit}.`);
    assert(ai0.limit === 50, `Limite IA FREE attendue 50, obtenu ${ai0.limit}.`);
    step("free_limits", { trainers: trainers0.limit, sessions: sessions0.limit, ai: ai0.limit });

    // 2. Sous la limite → enforce ne lève pas
    await enforceQuota(t, "trainers");
    step("under_limit_ok");

    // 3. Atteint la limite formateurs (2) → enforce lève
    await prisma.trainer.create({ data: { organizationId: t.organizationId, firstName: "A", lastName: "Un", active: true } });
    await prisma.trainer.create({ data: { organizationId: t.organizationId, firstName: "B", lastName: "Deux", active: true } });
    const usage = await quotaUsage(t, "trainers");
    assert(usage.used === 2, `Usage formateurs attendu 2, obtenu ${usage.used}.`);
    let blocked = false;
    try { await enforceQuota(t, "trainers"); } catch { blocked = true; }
    assert(blocked, "Le quota formateurs FREE aurait dû bloquer au-delà de 2.");
    step("limit_reached_blocks", { used: usage.used, limit: usage.limit });

    // 4. Upgrade PRO → la limite saute
    await prisma.organization.update({ where: { id: t.organizationId }, data: { plan: "PRO" } });
    await enforceQuota(t, "trainers"); // ne doit plus lever
    const upgraded = await quotaUsage(t, "trainers");
    assert(upgraded.limit > 1000, "Le plan PRO doit lever la limite formateurs.");
    step("upgrade_lifts_limit", { limit: upgraded.limit });
  } finally {
    await t.cleanup();
    step("tenant_cleanup");
  }
});
