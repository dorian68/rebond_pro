import "./_env";
import { prisma } from "../src/lib/prisma";

type Status = "pass" | "fail" | "warn";

function emit(step: string, status: Status, details: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ step, status, details }));
}

function argValue(name: string) {
  const prefixed = `${name}=`;
  const found = process.argv.slice(2).find((arg) => arg.startsWith(prefixed));
  return found ? found.slice(prefixed.length).trim() : undefined;
}

async function main() {
  const email = (argValue("--email") ?? process.env.DEBUG_EMAIL ?? "").toLowerCase();
  emit("debug_input", email ? "pass" : "fail", { email: email || null });
  if (!email) {
    process.exitCode = 1;
    return;
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      emailVerified: true,
      platformAdmin: true,
      memberships: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          role: true,
          status: true,
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              deletedAt: true,
              nbFormationsDeclarees: true,
              nbFormateursDeclares: true,
              nbSessionsMois: true,
              objectifPrincipal: true,
              _count: { select: { formations: { where: { deletedAt: null } }, trainers: { where: { deletedAt: null } }, sessions: { where: { deletedAt: null } } } },
            },
          },
        },
      },
    },
  });

  if (!user) {
    emit("user_lookup", "fail", { diagnosis: "Aucun utilisateur avec cet email." });
    process.exitCode = 1;
    return;
  }

  emit("user_lookup", "pass", {
    id: user.id,
    email: user.email,
    emailVerified: Boolean(user.emailVerified),
    platformAdmin: user.platformAdmin,
    activeMemberships: user.memberships.length,
  });

  const membership = user.memberships.find((m) => m.organization.deletedAt === null) ?? null;
  if (!membership) {
    emit("tenant_resolution", "fail", {
      diagnosis: "Utilisateur sans centre actif. Les pages cockpit/onboarding ne peuvent pas fonctionner correctement.",
      next: "Créer ou restaurer une organisation + membership ACTIVE, ou rediriger vers inscription centre.",
    });
    process.exitCode = 1;
    return;
  }

  emit("tenant_resolution", "pass", {
    role: membership.role,
    organization: {
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug,
    },
  });

  const org = membership.organization;
  const needsOnboarding =
    org.nbFormationsDeclarees == null &&
    org.nbFormateursDeclares == null &&
    org.nbSessionsMois == null &&
    org.objectifPrincipal == null;
  emit("onboarding_gate", needsOnboarding ? "warn" : "pass", {
    needsOnboarding,
    fields: {
      nbFormationsDeclarees: org.nbFormationsDeclarees,
      nbFormateursDeclares: org.nbFormateursDeclares,
      nbSessionsMois: org.nbSessionsMois,
      objectifPrincipal: org.objectifPrincipal,
    },
  });

  emit("onboarding_permissions", membership.role === "OWNER" || membership.role === "ADMIN" ? "pass" : "fail", {
    role: membership.role,
    expected: "OWNER ou ADMIN",
  });

  emit("cockpit_seed_state", "pass", {
    formations: org._count.formations,
    trainers: org._count.trainers,
    sessions: org._count.sessions,
  });
}

main()
  .catch((error) => {
    emit("debug_onboarding", "fail", { error: error instanceof Error ? error.message : String(error) });
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
