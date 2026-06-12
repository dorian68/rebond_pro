import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/public/Avatar";
import { PublicHeader } from "@/components/public/PublicHeader";
import { getPublicTrainer } from "@/server/marketplace";
import { formatMoney } from "@/lib/utils";
import { MODALITY_LABELS, LEVEL_LABELS } from "@/lib/labels";

export const dynamic = "force-dynamic";

type Params = Promise<{ trainerId: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { trainerId } = await params;
  const t = await getPublicTrainer(trainerId);
  if (!t) return { title: "Formateur indisponible" };
  const name = `${t.firstName} ${t.lastName}`;
  const description = t.bio || `${name}, formateur${t.specialities.length ? ` — ${t.specialities.join(", ")}` : ""}.`;
  return { title: `${name} — Formateur`, description, openGraph: { title: name, description, type: "profile" } };
}

export default async function TrainerProfilePage({ params }: { params: Params }) {
  const { trainerId } = await params;
  const t = await getPublicTrainer(trainerId);
  if (!t) notFound();
  const name = `${t.firstName} ${t.lastName}`;
  const formations = t.formations.map((tf) => tf.formation);

  return (
    <main className="public-page">
      <PublicHeader />

      <div className="marketing-container">
        <div className="trainer-hero">
          <Avatar name={name} photoUrl={t.photoUrl} initials={t.initials} color={t.color} size={140} />
          <div style={{ flex: 1, minWidth: 260 }}>
            <span className="eyebrow">Formateur</span>
            <h1>{name}</h1>
            <div className="mkt-card-meta" style={{ marginTop: 8 }}>
              <Link href={`/${t.organization.slug}`} style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "var(--ink-2)" }}>
                <Avatar name={t.organization.name} photoUrl={t.organization.logoUrl} color="#2469a6" size={22} rounded="lg" />
                {t.organization.name}
              </Link>
              {t.organization.city && <span><Icon name="map-pin" size={13} /> {t.organization.city}</span>}
              {t.yearsExperience ? <span><Icon name="trending-up" size={13} /> {t.yearsExperience} ans d&apos;expérience</span> : null}
              <span><Icon name="presentation" size={13} /> {t._count.sessions} session{t._count.sessions > 1 ? "s" : ""} animée{t._count.sessions > 1 ? "s" : ""}</span>
            </div>
            {t.specialities.length > 0 && (
              <div className="trainer-chips">
                {t.specialities.map((sp) => <span key={sp} className="trainer-chip">{sp}</span>)}
              </div>
            )}
          </div>
        </div>

        {t.bio && (
          <section className="public-content-block" style={{ marginBottom: 40 }}>
            <h2>Biographie</h2>
            <p>{t.bio}</p>
          </section>
        )}

        <section className="mkt-section" style={{ paddingTop: 0 }}>
          <div className="mkt-section-head"><h2>Formations animées par {t.firstName}</h2><span className="mkt-count">{formations.length}</span></div>
          {formations.length === 0 ? (
            <p style={{ color: "var(--ink-3)" }}>Aucune formation publique pour le moment.</p>
          ) : (
            <div className="mkt-grid">
              {formations.map((f) => {
                const c = f.color || "#2469a6";
                return (
                  <Link key={f.id} href={`/${f.organization.slug}/f/${f.publicSlug ?? f.slug}`} className="mkt-card">
                    <div className="mkt-card-cover" style={{ background: f.coverImageUrl ? `url(${f.coverImageUrl}) center/cover` : `linear-gradient(135deg, ${c}, ${c}aa)` }}>
                      {f.category && <span className="badge">{f.category}</span>}
                    </div>
                    <div className="mkt-card-body">
                      <h3>{f.title}</h3>
                      {f.shortDescription && <p className="mkt-card-desc">{f.shortDescription}</p>}
                      <div className="mkt-card-meta">
                        <span><Icon name="video" size={13} /> {MODALITY_LABELS[f.modality]}</span>
                        <span><Icon name="layers" size={13} /> {LEVEL_LABELS[f.level]}</span>
                        <span className="mkt-price" style={{ marginLeft: "auto" }}>{formatMoney(f.price)}</span>
                      </div>
                      <div className="mkt-card-center"><span>{f.organization.name}</span></div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <footer className="public-footer">
        <div className="marketing-container">
          <span>{name}</span>
          <Link href="/marketplace">← Retour au catalogue</Link>
        </div>
      </footer>
    </main>
  );
}
