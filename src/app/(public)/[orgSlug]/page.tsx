import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/public/Avatar";
import { PublicHeader } from "@/components/public/PublicHeader";
import { getCenterProfile } from "@/server/marketplace";
import { formatMoney } from "@/lib/utils";
import { MODALITY_LABELS, LEVEL_LABELS } from "@/lib/labels";

export const dynamic = "force-dynamic";

type Params = Promise<{ orgSlug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { orgSlug } = await params;
  const org = await getCenterProfile(orgSlug);
  if (!org) return { title: "Centre indisponible" };
  const description = org.tagline || org.description || `Découvrez les formations de ${org.name}.`;
  return { title: `${org.name} — Centre de formation`, description, openGraph: { title: org.name, description, type: "website" } };
}

export default async function CenterProfilePage({ params }: { params: Params }) {
  const { orgSlug } = await params;
  const org = await getCenterProfile(orgSlug);
  if (!org) notFound();

  return (
    <main className="public-page">
      <PublicHeader />

      <div className="center-cover">
        {org.coverImageUrl && <img src={org.coverImageUrl} alt="" />}
      </div>

      <div className="center-header">
        <div className="center-logo-wrap">
          <Avatar name={org.name} photoUrl={org.logoUrl} color="#5850ec" size={120} rounded="lg" />
        </div>
        <div className="center-header-info">
          <span className="eyebrow">Centre de formation</span>
          <h1>{org.name}</h1>
          {org.tagline && <p className="center-tagline">{org.tagline}</p>}
          <div className="mkt-card-meta">
            <span><Icon name="book" size={13} /> {org.formations.length} formation{org.formations.length > 1 ? "s" : ""}</span>
            <span><Icon name="users" size={13} /> {org.trainers.length} formateur{org.trainers.length > 1 ? "s" : ""}</span>
            {org.city && <span><Icon name="map-pin" size={13} /> {org.city}</span>}
            {org.website && <a href={org.website} target="_blank" rel="noreferrer" style={{ color: "var(--primary)" }}><Icon name="globe" size={13} /> Site web</a>}
          </div>
          {org.certifications.length > 0 && (
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 10 }}>
              {org.certifications.map((c) => <span key={c} className="badge badge-positive"><Icon name="shield" size={12} /> {c}</span>)}
            </div>
          )}
        </div>
      </div>

      <div className="marketing-container" style={{ paddingTop: 40 }}>
        {org.description && (
          <section className="public-content-block" style={{ marginBottom: 40 }}>
            <h2>À propos du centre</h2>
            <p>{org.description}</p>
          </section>
        )}

        {(() => {
          const sl = (org.socialLinks ?? {}) as { linkedin?: string | null; facebook?: string | null; instagram?: string | null };
          const socials = [
            { url: sl.linkedin, label: "LinkedIn" },
            { url: sl.facebook, label: "Facebook" },
            { url: sl.instagram, label: "Instagram" },
          ].filter((s) => s.url);
          const hasInfo = org.publicEmail || org.publicPhone || org.modalities.length > 0 || org.specialties.length > 0 || socials.length > 0;
          if (!hasInfo) return null;
          return (
            <section className="public-content-block" style={{ marginBottom: 40 }}>
              <h2>Informations pratiques</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginTop: 8 }}>
                {org.specialties.length > 0 && <div><strong style={{ fontSize: 13 }}>Spécialités</strong><p style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 4 }}>{org.specialties.join(" · ")}</p></div>}
                {org.modalities.length > 0 && <div><strong style={{ fontSize: 13 }}>Modalités</strong><p style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 4 }}>{org.modalities.join(" · ")}</p></div>}
                {org.publicEmail && <div><strong style={{ fontSize: 13 }}>Email</strong><p style={{ fontSize: 13, marginTop: 4 }}><a href={`mailto:${org.publicEmail}`} style={{ color: "var(--primary)" }}>{org.publicEmail}</a></p></div>}
                {org.publicPhone && <div><strong style={{ fontSize: 13 }}>Téléphone</strong><p style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 4 }}>{org.publicPhone}</p></div>}
                {socials.length > 0 && <div><strong style={{ fontSize: 13 }}>Réseaux</strong><p style={{ fontSize: 13, marginTop: 4, display: "flex", gap: 10 }}>{socials.map((s) => <a key={s.label} href={s.url!} target="_blank" rel="noreferrer" style={{ color: "var(--primary)" }}>{s.label}</a>)}</p></div>}
              </div>
            </section>
          );
        })()}

        {/* FORMATEURS — mise en avant */}
        {org.trainers.length > 0 && (
          <section className="mkt-section" style={{ paddingTop: 0 }}>
            <div className="mkt-section-head"><h2>Nos formateurs</h2><span className="mkt-count">{org.trainers.length}</span></div>
            <div className="mkt-grid">
              {org.trainers.map((t) => (
                <Link key={t.id} href={`/formateur/${t.id}`} className="mkt-card" style={{ padding: 20, flexDirection: "row", alignItems: "center", gap: 14 }}>
                  <Avatar name={`${t.firstName} ${t.lastName}`} photoUrl={t.photoUrl} initials={t.initials} color={t.color} size={64} />
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{ fontSize: 16 }}>{t.firstName} {t.lastName}</h3>
                    {t.specialities.length > 0 && <p className="mkt-card-desc" style={{ marginTop: 4 }}>{t.specialities.join(" · ")}</p>}
                    <div className="mkt-center-stats" style={{ marginTop: 6 }}>
                      {t.yearsExperience ? <span><Icon name="trending-up" size={12} /> {t.yearsExperience} ans d&apos;expérience</span> : null}
                      <span><Icon name="book" size={12} /> {t._count.formations} formation{t._count.formations > 1 ? "s" : ""}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* FORMATIONS */}
        <section className="mkt-section" style={{ paddingTop: 0 }}>
          <div className="mkt-section-head"><h2>Formations proposées</h2><span className="mkt-count">{org.formations.length}</span></div>
          <div className="mkt-grid">
            {org.formations.map((f) => {
              const c = f.color || "#5850ec";
              const duration = f.durationDays ? `${f.durationDays} j` : f.durationHours ? `${f.durationHours} h` : null;
              return (
                <Link key={f.id} href={`/${org.slug}/f/${f.publicSlug ?? f.slug}`} className="mkt-card">
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
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* TÉMOIGNAGES */}
        {org.testimonials.length > 0 && (
          <section className="public-content-block" style={{ marginBottom: 50 }}>
            <h2>Ils ont suivi nos formations</h2>
            <div className="public-testimonials">
              {org.testimonials.map((t) => (
                <blockquote key={t.id}>
                  <p>« {t.content} »</p>
                  <footer>{t.author}{t.role ? `, ${t.role}` : ""}</footer>
                </blockquote>
              ))}
            </div>
          </section>
        )}
      </div>

      <footer className="public-footer">
        <div className="marketing-container">
          <span>{org.name}</span>
          <Link href="/marketplace">← Retour au catalogue</Link>
        </div>
      </footer>
    </main>
  );
}
