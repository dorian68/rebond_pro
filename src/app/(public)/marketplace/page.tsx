import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/public/Avatar";
import { PublicHeader } from "@/components/public/PublicHeader";
import { getMarketplaceFormations, getMarketplaceFacets, getMarketplaceCenters, type MarketplaceFormation } from "@/server/marketplace";
import { formatMoney } from "@/lib/utils";
import { MODALITY_LABELS, LEVEL_LABELS } from "@/lib/labels";
import type { Modality, Level } from "@prisma/client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Catalogue des formations — RebondPro",
  description: "Découvrez les formations professionnelles proposées par les meilleurs centres et formateurs. Comparez, explorez, contactez.",
};

type SP = Promise<{ q?: string; category?: string; modality?: string; level?: string; city?: string }>;

function formationHref(f: MarketplaceFormation) {
  return `/${f.organization.slug}/f/${f.publicSlug ?? f.slug}`;
}

function FormationCard({ f }: { f: MarketplaceFormation }) {
  const c = f.color || "#5850ec";
  const duration = f.durationDays ? `${f.durationDays} j` : f.durationHours ? `${f.durationHours} h` : null;
  return (
    <Link href={formationHref(f)} className="mkt-card">
      <div className="mkt-card-cover" style={{ background: f.coverImageUrl ? `url(${f.coverImageUrl}) center/cover` : `linear-gradient(135deg, ${c}, ${c}aa)` }}>
        {f.category && <span className="badge">{f.category}</span>}
      </div>
      <div className="mkt-card-body">
        <h3>{f.title}</h3>
        {f.shortDescription && <p className="mkt-card-desc">{f.shortDescription}</p>}
        <div className="mkt-card-meta">
          {duration && <span><Icon name="clock" size={13} /> {duration}</span>}
          <span><Icon name="video" size={13} /> {MODALITY_LABELS[f.modality]}</span>
          <span><Icon name="layers" size={13} /> {LEVEL_LABELS[f.level]}</span>
          <span className="mkt-price" style={{ marginLeft: "auto" }}>{formatMoney(f.price)}</span>
        </div>
        <div className="mkt-card-center">
          <Avatar name={f.organization.name} photoUrl={f.organization.logoUrl} color={c} size={28} rounded="lg" />
          <span>{f.organization.name}</span>
          {f.eligibleTrainers.length > 0 && (
            <div className="mkt-card-trainers" style={{ marginLeft: "auto" }}>
              {f.eligibleTrainers.map((et) => (
                <Avatar key={et.trainer.id} name={`${et.trainer.firstName} ${et.trainer.lastName}`} photoUrl={et.trainer.photoUrl} initials={et.trainer.initials} color={et.trainer.color} size={26} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export default async function MarketplacePage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const filters = {
    q: sp.q || undefined,
    category: sp.category || undefined,
    modality: (sp.modality as Modality) || undefined,
    level: (sp.level as Level) || undefined,
    city: sp.city || undefined,
  };

  const [formations, facets, centers] = await Promise.all([
    getMarketplaceFormations(filters),
    getMarketplaceFacets(),
    getMarketplaceCenters(),
  ]);

  return (
    <main className="public-page">
      <PublicHeader />

      <section className="mkt-hero">
        <div className="marketing-container">
          <span className="eyebrow">Le réseau de la formation professionnelle</span>
          <h1>Trouvez la formation et le formateur qu&apos;il vous faut</h1>
          <p>Explorez les formations proposées par les centres du réseau RebondPro. Chaque formation met en avant son centre et ses formateurs.</p>

          <form className="mkt-searchbar" method="get">
            <input type="search" name="q" placeholder="Rechercher une formation, un centre, un thème…" defaultValue={filters.q} />
            <select name="category" defaultValue={filters.category ?? ""}>
              <option value="">Toutes catégories</option>
              {facets.categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select name="modality" defaultValue={filters.modality ?? ""}>
              <option value="">Toutes modalités</option>
              {Object.entries(MODALITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select name="level" defaultValue={filters.level ?? ""}>
              <option value="">Tous niveaux</option>
              {Object.entries(LEVEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            {facets.cities.length > 0 && (
              <select name="city" defaultValue={filters.city ?? ""}>
                <option value="">Toutes villes</option>
                {facets.cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
            <button type="submit" className="btn btn-primary">Rechercher</button>
          </form>
        </div>
      </section>

      <section className="mkt-section">
        <div className="marketing-container">
          <div className="mkt-section-head">
            <h2>Formations</h2>
            <span className="mkt-count">{formations.length} formation{formations.length > 1 ? "s" : ""}</span>
          </div>
          {formations.length === 0 ? (
            <p style={{ color: "var(--ink-3)", padding: "30px 0" }}>Aucune formation ne correspond à votre recherche. Essayez d&apos;élargir les filtres.</p>
          ) : (
            <div className="mkt-grid">
              {formations.map((f) => <FormationCard key={f.id} f={f} />)}
            </div>
          )}
        </div>
      </section>

      <section className="mkt-section" id="centres" style={{ background: "var(--surface-2)", borderTop: "1px solid var(--border)" }}>
        <div className="marketing-container">
          <div className="mkt-section-head">
            <h2>Les centres de formation</h2>
            <span className="mkt-count">{centers.length} centre{centers.length > 1 ? "s" : ""}</span>
          </div>
          <div className="mkt-grid-2">
            {centers.map((org) => (
              <Link key={org.id} href={`/${org.slug}`} className="mkt-center-card">
                <Avatar name={org.name} photoUrl={org.logoUrl} color="#5850ec" size={62} rounded="lg" />
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <h3>{org.name}</h3>
                    <span className="badge badge-positive" style={{ fontSize: 10.5 }}><Icon name="shield" size={11} /> Centre du réseau</span>
                  </div>
                  <p>{org.tagline || org.description || org.city || "Centre de formation professionnelle"}</p>
                  <div className="mkt-center-stats">
                    <span><Icon name="book" size={13} /> {org._count.formations} formation{org._count.formations > 1 ? "s" : ""}</span>
                    <span><Icon name="users" size={13} /> {org._count.trainers} formateur{org._count.trainers > 1 ? "s" : ""}</span>
                    {org.city && <span><Icon name="map-pin" size={13} /> {org.city}</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <footer className="public-footer">
        <div className="marketing-container">
          <span>RebondPro Formation</span>
          <span>Le réseau des centres de formation</span>
        </div>
      </footer>
    </main>
  );
}
