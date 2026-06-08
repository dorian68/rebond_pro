import { prisma } from "../src/lib/prisma";
import type { TenantContext } from "../src/lib/tenant";
import type { Role } from "@prisma/client";

export type TestTenant = TenantContext & { cleanup: () => Promise<void> };

/** Crée un tenant jetable (org + user OWNER) pour les smoke tests. cleanup() supprime tout (cascade). */
export async function createTestTenant(label: string, role: Role = "OWNER"): Promise<TestTenant> {
  const slug = `smoke-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const org = await prisma.organization.create({ data: { name: `Smoke ${label}`, slug, plan: "FREE" } });
  const user = await prisma.user.create({ data: { email: `${slug}@smoke.test`, name: "Smoke Owner" } });
  await prisma.membership.create({ data: { userId: user.id, organizationId: org.id, role, status: "ACTIVE" } });
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    organizationId: org.id,
    organizationName: org.name,
    organizationSlug: org.slug,
    role,
    cleanup: async () => {
      await prisma.organization.delete({ where: { id: org.id } }).catch(() => {});
      await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
    },
  };
}

export function step(label: string, details?: unknown) {
  console.log(JSON.stringify({ step: label, status: "pass", ...(details ? { details } : {}) }));
}

export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export function runner(name: string, main: () => Promise<void>) {
  main()
    .then(() => step(`${name}_complete`))
    .catch((error) => {
      console.error(JSON.stringify({ step: name, status: "fail", error: error instanceof Error ? error.message : String(error) }));
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
