import "./_env";
import { prisma } from "../src/lib/prisma";
import { getPublicFormationUncached } from "../src/server/public-conversion";
import { getCenterProfileUncached, getMarketplaceFormationsUncached } from "../src/server/marketplace";

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
  const formationId = argValue("--formation-id") ?? process.env.FORMATION_ID;
  const orgSlug = argValue("--org-slug") ?? process.env.ORG_SLUG;
  const orgName = argValue("--org-name") ?? process.env.ORG_NAME;

  emit("debug_input", "pass", {
    formationId: formationId ?? null,
    orgSlug: orgSlug ?? null,
    orgName: orgName ?? null,
  });

  const organizationWhere = orgSlug
    ? { slug: orgSlug }
    : orgName
      ? { name: { contains: orgName, mode: "insensitive" as const } }
      : undefined;

  const formation = formationId
    ? await prisma.formation.findUnique({
        where: { id: formationId },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              marketplaceStatus: true,
              publicProfileEnabled: true,
              deletedAt: true,
            },
          },
        },
      })
    : await prisma.formation.findFirst({
        where: { deletedAt: null, ...(organizationWhere ? { organization: organizationWhere } : {}) },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              marketplaceStatus: true,
              publicProfileEnabled: true,
              deletedAt: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      });

  if (!formation) {
    emit("formation_lookup", "fail", { message: "Formation introuvable avec les critères fournis." });
    process.exitCode = 1;
    return;
  }

  const publicUrl = formation.publicSlug ? `/${formation.organization.slug}/f/${formation.publicSlug}` : null;
  emit("formation_lookup", "pass", {
    id: formation.id,
    title: formation.title,
    status: formation.status,
    isPublic: formation.isPublic,
    publicSlug: formation.publicSlug,
    deletedAt: formation.deletedAt,
    publicUrl,
    organization: formation.organization,
  });

  const publicGate = {
    hasPublicSlug: Boolean(formation.publicSlug),
    isPublic: formation.isPublic,
    statusPublished: formation.status === "PUBLIE",
    formationNotDeleted: formation.deletedAt === null,
    organizationNotDeleted: formation.organization.deletedAt === null,
  };
  const publicReady = Object.values(publicGate).every(Boolean);
  emit("public_formation_gate", publicReady ? "pass" : "fail", {
    ...publicGate,
    expected: "publicSlug + isPublic=true + status=PUBLIE + non supprimée",
  });

  if (formation.publicSlug) {
    const resolved = await getPublicFormationUncached(formation.organization.slug, formation.publicSlug);
    emit("public_route_resolution", resolved ? "pass" : "fail", {
      publicUrl,
      resolvedFormationId: resolved?.id ?? null,
      diagnosis: resolved
        ? "La route publique peut charger cette formation."
        : "La route publique renverra 404 tant que le gate public n'est pas satisfait.",
    });
  } else {
    emit("public_route_resolution", "fail", {
      publicUrl: null,
      diagnosis: "Aucun publicSlug : aucune URL publique stable n'est disponible.",
    });
  }

  const publicFormationCount = await prisma.formation.count({
    where: {
      organizationId: formation.organizationId,
      deletedAt: null,
      isPublic: true,
      status: "PUBLIE",
    },
  });
  const adminApprovalGate = {
    publicProfileEnabled: formation.organization.publicProfileEnabled,
    publicPublishedFormationCount: publicFormationCount,
  };
  emit(publicFormationCount > 0 && formation.organization.publicProfileEnabled ? "admin_approval_gate" : "admin_approval_gate", publicFormationCount > 0 && formation.organization.publicProfileEnabled ? "pass" : "fail", {
    ...adminApprovalGate,
    expected: "profil public centre activé + au moins une formation isPublic=true et PUBLIE",
  });

  const centerProfile = await getCenterProfileUncached(formation.organization.slug);
  emit("center_public_profile_resolution", centerProfile ? "pass" : "fail", {
    orgSlug: formation.organization.slug,
    resolved: Boolean(centerProfile),
    diagnosis: centerProfile
      ? "La fiche centre publique peut être chargée."
      : "La fiche centre publique restera masquée tant que le centre n'est pas approuvé avec au moins une formation publique publiée.",
  });

  const marketplaceItems = await getMarketplaceFormationsUncached({ q: formation.title });
  const appearsInMarketplace = marketplaceItems.some((item) => item.id === formation.id);
  emit("marketplace_listing", appearsInMarketplace ? "pass" : "fail", {
    appearsInMarketplace,
    organizationMarketplaceStatus: formation.organization.marketplaceStatus,
    expected: "centre APPROVED + formation isPublic=true et PUBLIE",
  });

  if (!publicReady || publicFormationCount === 0 || formation.organization.marketplaceStatus !== "APPROVED") {
    emit("final_diagnosis", "warn", {
      missing: {
        publishFormationStatus: formation.status !== "PUBLIE" ? "Passer la formation au statut PUBLIE." : null,
        activatePublicPage: !formation.isPublic ? "Activer la page publique de la formation." : null,
        approveCenter: formation.organization.marketplaceStatus !== "APPROVED" ? "Valider le centre côté admin après publication effective." : null,
      },
    });
  } else {
    emit("final_diagnosis", "pass", { message: "Le parcours backend est cohérent pour cette formation." });
  }
}

main()
  .catch((error) => {
    emit("debug_center_publication", "fail", { error: error instanceof Error ? error.message : String(error) });
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
