import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/public/Avatar";
import { PublicHeader } from "@/components/public/PublicHeader";
import {
  getMarketplaceFormationsPaginated,
  getMarketplaceFacets,
  getMarketplaceCenters,
  type MarketplaceFormation,
  FORMATIONS_PAGE_SIZE,
  CENTERS_PREVIEW,
} from "@/server/marketplace";
import { formatMoney } from "@/lib/utils";
import { MODALITY_LABELS, LEVEL_LABELS } from "@/lib/labels";
import type { Modality, Level } from "@prisma/client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Trouver une formation — Le Bon Rebond",
  description: "Trouvez la formation adaptée à votre projet et entrez en relation avec un centre partenaire.",
};

type SP = Promise<{
  q?: string;
  category?: string;
  modality?: string;
  level?: string;
  city?: string;
  page?: string;
  allCenters?: string;
}>;

function formationHref(f: MarketplaceFormation) {
  return `/${f.organization.slug}/f/${f.publicSlug ?? f.slug}`;
}

function FormationCard({ f }: { f: MarketplaceFormation }) {
  const c = f.color || "#2469a6";
  const duration = f.durationDays ? `${f.durationDays} j` : f.durationHours ? `${f.durationHours} h` : null;
  // Visuel de la card : image propre à la formation, sinon photo du centre, sinon dégradé.
  const coverImage = f.coverImageUrl || f.organization.coverImageUrl;
  return (
    <Link href={formationHref(f)} className="mkt-card">
      <div className="mkt-card-cover" style={{ background: coverImage ? `url(${coverImage}) center/cover` : `linear-gradient(135deg, ${c}, ${c}aa)` }}>
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

  const page = Math.max(1, parseInt(sp.page ?? "1") || 1);
  const showAllCenters = sp.allCenters === "1";

  const filters = {
    q: sp.q || undefined,
    category: sp.category || undefined,
    modality: (sp.modality as Modality) || undefined,
    level: (sp.level as Level) || undefined,
    city: sp.city || undefined,
    page,
  };

  const [{ formations, hasMore }, facets, centers] = await Promise.all([
    getMarketplaceFormationsPaginated(filters),
    getMarketplaceFacets(),
    getMarketplaceCenters(),
  ]);

  const visibleCenters = showAllCenters ? centers : centers.slice(0, CENTERS_PREVIEW);
  const hiddenCentersCount = centers.length - CENTERS_PREVIEW;

  // Build URLs preserving active filters
  function buildUrl(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.category) params.set("category", filters.category);
    if (filters.modality) params.set("modality", filters.modality);
    if (filters.level) params.set("level", filters.level);
    if (filters.city) params.set("city", filters.city);
    if (showAllCenters) params.set("allCenters", "1");
    for (const [k, v] of Object.entries(overrides)) {
      if (v) params.set(k, v); else params.delete(k);
    }
    const str = params.toString();
    return str ? `/marketplace?${str}` : "/marketplace";
  }

  const prevPageUrl = page > 1 ? buildUrl({ page: String(page - 1) }) + "#formations" : null;
  const nextPageUrl = hasMore ? buildUrl({ page: String(page + 1) }) + "#formations" : null;
  const allCentersUrl = buildUrl({ allCenters: "1", page: undefined }) + "#centres";

  return (
    <main className="public-page">
      <PublicHeader />

      <section className="mkt-hero">
        <div className="marketing-container">
          <span className="eyebrow">Trouvez la bonne formation, pas n'importe laquelle</span>
          <h1>Trouvez la formation qui correspond à votre avenir</h1>
          <p>Explorez les formations proposées par les centres partenaires Le Bon Rebond, comparez les offres et passez à l'action.</p>

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

      {/* ─── Centres ─── */}
      <section className="mkt-section" id="centres" style={{ background: "var(--surface-2)", borderTop: "1px solid var(--border)" }}>
        <div className="marketing-container">
          <div className="mkt-section-head">
            <h2>Les centres de formation</h2>
            <span className="mkt-count">{centers.length} centre{centers.length > 1 ? "s" : ""}</span>
          </div>
          <div className="mkt-grid-2">
            {visibleCenters.map((org) => (
              <Link key={org.id} href={`/${org.slug}`} className="mkt-center-card">
                <Avatar name={org.name} photoUrl={org.logoUrl} color="#2469a6" size={62} rounded="lg" />
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

          {!showAllCenters && hiddenCentersCount > 0 && (
            <div style={{ textAlign: "center", marginTop: 32 }}>
              <Link href={allCentersUrl} className="btn btn-secondary">
                Voir les {hiddenCentersCount} autre{hiddenCentersCount > 1 ? "s" : ""} centre{hiddenCentersCount > 1 ? "s" : ""} →
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ─── Formations ─── */}
      <section className="mkt-section" id="formations">
        <div className="marketing-container">
          <div className="mkt-section-head">
            <h2>Formations</h2>
            <span className="mkt-count">
              {formations.length === 0
                ? "0 formation"
                : page === 1 && !hasMore
                ? `${formations.length} formation${formations.length > 1 ? "s" : ""}`
                : `Page ${page} · ${formations.length} par page`}
            </span>
          </div>

          {formations.length === 0 ? (
            <p style={{ color: "var(--ink-3)", padding: "30px 0" }}>Aucune formation ne correspond à votre recherche. Essayez d&apos;élargir les filtres.</p>
          ) : (
            <div className="mkt-grid">
              {formations.map((f) => <FormationCard key={f.id} f={f} />)}
            </div>
          )}

          {(prevPageUrl || nextPageUrl) && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 48 }}>
              {prevPageUrl ? (
                <Link href={prevPageUrl} className="btn btn-secondary">← Précédent</Link>
              ) : (
                <span />
              )}
              <span style={{ fontSize: ".9rem", color: "var(--ink-3)", fontWeight: 600, padding: "0 8px" }}>
                Page {page}
              </span>
              {nextPageUrl ? (
                <Link href={nextPageUrl} className="btn btn-primary">Suivant →</Link>
              ) : (
                <span />
              )}
            </div>
          )}
        </div>
      </section>

      <footer className="public-footer">
        <div className="marketing-container">
          <span>Le Bon Rebond</span>
          <span>Orientation, formation et reconversion</span>
        </div>
      </footer>
    </main>
  );
}
