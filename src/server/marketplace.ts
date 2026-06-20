import "server-only";
import { unstable_cache, updateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Modality, Level } from "@prisma/client";

/**
 * Couche de données de la MARKETPLACE publique (cross-centres).
 * ⚠️ Volontairement SANS requireTenant : ne lit QUE du contenu publié
 * (formations isPublic + PUBLIE, centres associés, formateurs actifs).
 *
 * PERFORMANCE : toutes les lectures publiques sont mises en cache (Next.js Data Cache)
 * et taguées "marketplace". La base étant distante (latence ~110ms/requête), le cache
 * sert les visiteurs concurrents sans toucher la DB. Le cache est invalidé via
 * revalidateMarketplace() (appelé quand une formation/profil public change).
 */

export const MARKETPLACE_TAG = "marketplace";

export type MarketplaceFilters = {
  q?: string;
  category?: string;
  modality?: Modality;
  level?: Level;
  city?: string;
};

const PUBLIC_FORMATION_WHERE = {
  isPublic: true,
  status: "PUBLIE" as const,
  deletedAt: null,
};

// Gate de modération : seuls les centres validés par l'admin plateforme sont publics.
const APPROVED_ORG = { marketplaceStatus: "APPROVED" as const };

export async function getMarketplaceFormationsUncached(filters: MarketplaceFilters = {}) {
  const q = filters.q?.trim();
  return prisma.formation.findMany({
    where: {
      ...PUBLIC_FORMATION_WHERE,
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.modality ? { modality: filters.modality } : {}),
      ...(filters.level ? { level: filters.level } : {}),
      // Centre validé (+ filtre ville optionnel) — fusionnés dans une seule clé `organization`.
      organization: { ...APPROVED_ORG, ...(filters.city ? { city: filters.city } : {}) },
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { shortDescription: { contains: q, mode: "insensitive" } },
              { category: { contains: q, mode: "insensitive" } },
              { organization: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    select: {
      id: true, title: true, publicSlug: true, slug: true, category: true, shortDescription: true,
      durationDays: true, durationHours: true, price: true, modality: true, level: true,
      color: true, coverImageUrl: true,
      organization: { select: { name: true, slug: true, logoUrl: true, city: true } },
      eligibleTrainers: {
        take: 4,
        select: { trainer: { select: { id: true, firstName: true, lastName: true, initials: true, color: true, photoUrl: true } } },
      },
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 60,
  });
}

export const getMarketplaceFormations = unstable_cache(
  getMarketplaceFormationsUncached,
  ["mkt-formations"],
  { revalidate: 60, tags: [MARKETPLACE_TAG] },
);

export type MarketplaceFormation = Awaited<ReturnType<typeof getMarketplaceFormations>>[number];

/** Facettes (catégories, villes) pour les filtres, calculées sur les formations publiques. */
export async function getMarketplaceFacetsUncached() {
  const formations = await prisma.formation.findMany({
    where: { ...PUBLIC_FORMATION_WHERE, organization: APPROVED_ORG },
    select: { category: true, organization: { select: { city: true } } },
    take: 2000,
  });
  const categories = [...new Set(formations.map((f) => f.category).filter(Boolean))].sort() as string[];
  const cities = [...new Set(formations.map((f) => f.organization.city).filter(Boolean))].sort() as string[];
  return { categories, cities };
}

export const getMarketplaceFacets = unstable_cache(
  getMarketplaceFacetsUncached,
  ["mkt-facets"],
  { revalidate: 60, tags: [MARKETPLACE_TAG] },
);

/** Annuaire des centres ayant au moins une formation publiée. */
export async function getMarketplaceCentersUncached() {
  const orgs = await prisma.organization.findMany({
    where: { deletedAt: null, marketplaceStatus: "APPROVED", formations: { some: PUBLIC_FORMATION_WHERE } },
    select: {
      id: true, name: true, slug: true, logoUrl: true, tagline: true, description: true, city: true,
      _count: { select: { formations: { where: PUBLIC_FORMATION_WHERE }, trainers: { where: { active: true, deletedAt: null } } } },
    },
    orderBy: { name: "asc" },
    take: 200,
  });
  return orgs;
}

export const getMarketplaceCenters = unstable_cache(
  getMarketplaceCentersUncached,
  ["mkt-centers"],
  { revalidate: 60, tags: [MARKETPLACE_TAG] },
);

/** Fiche publique d'un centre de formation (mise en avant). */
export async function getCenterProfileUncached(slug: string) {
  const org = await prisma.organization.findFirst({
    where: { slug, deletedAt: null, marketplaceStatus: "APPROVED" },
    select: {
      id: true, name: true, slug: true, description: true, tagline: true, website: true,
      logoUrl: true, coverImageUrl: true, city: true, createdAt: true,
      publicProfileEnabled: true, publicEmail: true, publicPhone: true, socialLinks: true,
      specialties: true, modalities: true, certifications: true,
      formations: {
        where: PUBLIC_FORMATION_WHERE,
        select: {
          id: true, title: true, publicSlug: true, slug: true, category: true, shortDescription: true,
          durationDays: true, durationHours: true, price: true, modality: true, level: true, color: true, coverImageUrl: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 48,
      },
      trainers: {
        where: { active: true, deletedAt: null },
        select: {
          id: true, firstName: true, lastName: true, initials: true, color: true, photoUrl: true,
          specialities: true, bio: true, yearsExperience: true,
          _count: { select: { formations: true } },
        },
        orderBy: { lastName: "asc" },
        take: 24,
      },
      testimonials: { take: 8, orderBy: { createdAt: "desc" }, select: { id: true, author: true, role: true, content: true, rating: true } },
    },
  });
  if (!org) return null;
  // N'expose le centre que si le profil public est activé ET qu'il a au moins une formation publiée
  if (org.publicProfileEnabled === false) return null;
  if (org.formations.length === 0) return null;
  return org;
}

export const getCenterProfile = unstable_cache(
  getCenterProfileUncached,
  ["center-profile"],
  { revalidate: 120, tags: [MARKETPLACE_TAG] },
);

/** Profil public d'un formateur (visibilité — "Facebook de la formation"). */
export async function getPublicTrainerUncached(trainerId: string) {
  const trainer = await prisma.trainer.findFirst({
    where: { id: trainerId, active: true, deletedAt: null },
    select: {
      id: true, firstName: true, lastName: true, initials: true, color: true, photoUrl: true,
      specialities: true, bio: true, yearsExperience: true, email: true,
      organization: { select: { name: true, slug: true, logoUrl: true, city: true } },
      formations: {
        where: { formation: PUBLIC_FORMATION_WHERE },
        take: 48,
        select: {
          formation: {
            select: {
              id: true, title: true, publicSlug: true, slug: true, category: true, shortDescription: true,
              durationDays: true, price: true, modality: true, level: true, color: true, coverImageUrl: true,
              organization: { select: { name: true, slug: true } },
            },
          },
        },
      },
      _count: { select: { sessions: true } },
    },
  });
  if (!trainer) return null;
  return trainer;
}

export const getPublicTrainer = unstable_cache(
  getPublicTrainerUncached,
  ["public-trainer"],
  { revalidate: 120, tags: [MARKETPLACE_TAG] },
);

/** Invalide immédiatement le cache marketplace après une mutation depuis une Server Action. */
export function revalidateMarketplace() {
  updateTag(MARKETPLACE_TAG);
}
