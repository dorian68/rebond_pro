import "./_env";
import { prisma } from "../src/lib/prisma";
import { step, assert, runner } from "./_tenant";

runner("health_smoke", async () => {
  const started = Date.now();
  const r = await prisma.$queryRaw<{ ok: number }[]>`SELECT 1 as ok`;
  assert(Array.isArray(r) && r[0]?.ok === 1, "La base n'a pas répondu à SELECT 1.");
  step("db_reachable", { latencyMs: Date.now() - started });
});
