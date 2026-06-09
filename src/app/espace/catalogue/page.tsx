import { getBeneficiaryContext, getMySavedFormationIds } from "@/server/beneficiary-self";
import { getMarketplaceFormations, getMarketplaceFacets } from "@/server/marketplace";
import { PageHeader, Card, EmptyState } from "@/components/ui/primitives";
import { CatalogueClient } from "./catalogue-client";
import type { Modality, Level } from "@prisma/client";

export const dynamic = "force-dynamic";

type SP = Promise<{ q?: string; category?: string; modality?: string; level?: string }>;

export default async function EspaceCataloguePage({ searchParams }: { searchParams: SP }) {
  const { beneficiary } = await getBeneficiaryContext();
  if (!beneficiary) {
    return <div className="fade-up"><PageHeader title="Catalogue de formations" /><Card><EmptyState icon="book" title="Bientôt disponible" text="Votre espace sera activé par votre conseiller." /></Card></div>;
  }
  const sp = await searchParams;
  const filters = { q: sp.q || undefined, category: sp.category || undefined, modality: (sp.modality as Modality) || undefined, level: (sp.level as Level) || undefined };

  const [formations, facets, saved] = await Promise.all([
    getMarketplaceFormations(filters),
    getMarketplaceFacets(),
    getMySavedFormationIds(beneficiary.id),
  ]);

  return (
    <div className="fade-up">
      <PageHeader title="Catalogue de formations" subtitle="Toutes les formations des centres du réseau. Enregistrez celles qui vous intéressent et demandez des informations." />
      <CatalogueClient
        formations={formations.map((f) => ({
          id: f.id, title: f.title, shortDescription: f.shortDescription, category: f.category,
          price: f.price, modality: f.modality, level: f.level, color: f.color, coverImageUrl: f.coverImageUrl,
          durationDays: f.durationDays, durationHours: f.durationHours,
          center: f.organization.name, centerSlug: f.organization.slug, publicSlug: f.publicSlug ?? f.slug,
        }))}
        categories={facets.categories}
        savedIds={[...saved]}
        filters={{ q: filters.q ?? "", category: filters.category ?? "", modality: filters.modality ?? "", level: filters.level ?? "" }}
      />
    </div>
  );
}
