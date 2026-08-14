import "./_env";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { prisma } from "../src/lib/prisma";
import {
  changePlatformAdminAccess,
  PlatformAdminAccessError,
  validatePlatformAdminTransition,
} from "../src/server/platform-admin-access";

function expectTransitionError(code: PlatformAdminAccessError["code"], run: () => void) {
  assert.throws(
    run,
    (error: unknown) => error instanceof PlatformAdminAccessError && error.code === code,
    `La transition doit être refusée avec ${code}.`,
  );
}

async function main() {
  const [actions, page, migration] = await Promise.all([
    readFile("src/server/platform-admin-access-actions.ts", "utf8"),
    readFile("src/app/admin/super-admins/page.tsx", "utf8"),
    readFile("prisma/migrations/20260814120000_manage_platform_admin_access/migration.sql", "utf8"),
  ]);
  assert.match(actions, /requirePlatformAdmin\(\)/, "Chaque mutation doit recalculer le rôle super-admin côté serveur.");
  assert.match(page, /requirePlatformAdmin\(\)/, "La page doit recalculer le rôle super-admin côté serveur.");
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/, "Le journal global ne doit pas être exposé directement à PostgREST.");

  expectTransitionError("SELF_REVOKE", () => validatePlatformAdminTransition({
    actorUserId: "same",
    targetUserId: "same",
    targetEmailVerified: true,
    targetHasDatabaseRole: true,
    targetManagedByConfiguration: false,
    enabled: false,
  }));
  expectTransitionError("UNVERIFIED", () => validatePlatformAdminTransition({
    actorUserId: "actor",
    targetUserId: "target",
    targetEmailVerified: false,
    targetHasDatabaseRole: false,
    targetManagedByConfiguration: false,
    enabled: true,
  }));
  expectTransitionError("CONFIG_MANAGED", () => validatePlatformAdminTransition({
    actorUserId: "actor",
    targetUserId: "target",
    targetEmailVerified: true,
    targetHasDatabaseRole: true,
    targetManagedByConfiguration: true,
    enabled: false,
  }));

  if (process.argv.includes("--static")) {
    console.log(JSON.stringify({ suite: "platform_admin_access", mode: "static", status: "pass" }));
    return;
  }

  assert(process.env.DATABASE_URL, "DATABASE_URL est requis pour valider la mutation et l’audit réels.");
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const actor = await prisma.user.create({
    data: {
      email: `platform-admin-actor-${stamp}@smoke.test`,
      name: "Smoke Admin Actor",
      emailVerified: new Date(),
      platformAdmin: true,
    },
  });
  const target = await prisma.user.create({
    data: {
      email: `platform-admin-target-${stamp}@smoke.test`,
      name: "Smoke Admin Target",
      emailVerified: new Date(),
    },
  });
  const unverified = await prisma.user.create({
    data: { email: `platform-admin-unverified-${stamp}@smoke.test`, name: "Smoke Unverified" },
  });
  const admin = { userId: actor.id, email: actor.email, name: actor.name };

  try {
    await changePlatformAdminAccess({ actor: admin, targetUserId: target.id, enabled: true });
    const granted = await prisma.user.findUnique({ where: { id: target.id }, select: { platformAdmin: true } });
    assert.equal(granted?.platformAdmin, true, "L’attribution doit persister dans User.platformAdmin.");
    assert.equal(
      await prisma.platformAdminAuditLog.count({
        where: { actorUserId: actor.id, targetUserId: target.id, action: "platform_admin.granted" },
      }),
      1,
      "L’attribution doit produire exactement une entrée d’audit.",
    );

    await changePlatformAdminAccess({ actor: admin, targetUserId: target.id, enabled: false });
    const revoked = await prisma.user.findUnique({ where: { id: target.id }, select: { platformAdmin: true } });
    assert.equal(revoked?.platformAdmin, false, "Le retrait doit persister dans User.platformAdmin.");
    assert.equal(
      await prisma.platformAdminAuditLog.count({
        where: { actorUserId: actor.id, targetUserId: target.id, action: "platform_admin.revoked" },
      }),
      1,
      "Le retrait doit produire exactement une entrée d’audit.",
    );

    await assert.rejects(
      changePlatformAdminAccess({ actor: admin, targetUserId: unverified.id, enabled: true }),
      (error: unknown) => error instanceof PlatformAdminAccessError && error.code === "UNVERIFIED",
      "Un compte non vérifié ne doit jamais être promu.",
    );
    await assert.rejects(
      changePlatformAdminAccess({ actor: admin, targetUserId: actor.id, enabled: false }),
      (error: unknown) => error instanceof PlatformAdminAccessError && error.code === "SELF_REVOKE",
      "L’auto-révocation doit être bloquée côté service, pas seulement dans l’UI.",
    );

    const rls = await prisma.$queryRaw<Array<{ relrowsecurity: boolean }>>`
      SELECT relrowsecurity FROM pg_class WHERE relname = 'PlatformAdminAuditLog'
    `;
    assert.equal(rls.length, 1, "Le journal d’audit doit exister.");
    assert.equal(rls[0]?.relrowsecurity, true, "RLS doit être activé sur le journal d’audit.");
  } finally {
    await prisma.platformAdminAuditLog.deleteMany({
      where: { OR: [{ actorUserId: actor.id }, { targetUserId: { in: [actor.id, target.id, unverified.id] } }] },
    }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: { in: [actor.id, target.id, unverified.id] } } }).catch(() => {});
  }

  console.log(JSON.stringify({ suite: "platform_admin_access", status: "pass" }));
}

main()
  .catch((error) => {
    console.error(JSON.stringify({
      suite: "platform_admin_access",
      status: "fail",
      error: error instanceof Error ? error.message : String(error),
    }));
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
