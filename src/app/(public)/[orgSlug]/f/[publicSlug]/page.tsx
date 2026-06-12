import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/public/Avatar";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicLeadForm } from "@/components/public/PublicLeadForm";
import { BuyFormationButton } from "@/components/public/BuyFormationButton";
import { getPublicFormation } from "@/server/public-conversion";
import { formatDateRange, formatMoney } from "@/lib/utils";
import { MODALITY_LABELS, LEVEL_LABELS } from "@/lib/labels";

type Params = Promise<{ orgSlug: string; publicSlug: string }>;
type Search = Promise<{ achat?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { orgSlug, publicSlug } = await params;
  const formation = await getPublicFormation(orgSlug, publicSlug);
  if (!formation) return { title: "Formation indisponible" };
  const description = formation.shortDescription || formation.organization.description || undefined;
  return {
    title: `${formation.title} | ${formation.organization.name}`,
    description,
    openGraph: { title: formation.title, description, type: "website" },
  };
}

function TextBlock({ title, value }: { title: string; value: string | null }) {
  if (!value) return null;
  return (
    <section className="public-content-block">
      <h2>{title}</h2>
      <p>{value}</p>
    </section>
  );
}

export default async function PublicFormationPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { orgSlug, publicSlug } = await params;
  const { achat } = await searchParams;
  const formation = await getPublicFormation(orgSlug, publicSlug);
  if (!formation) notFound();

  const duration = formation.durationDays
    ? `${formation.durationDays} jour${formation.durationDays > 1 ? "s" : ""}`
    : formation.durationHours
      ? `${formation.durationHours} heures`
      : "À préciser";

  return (
    <main className="public-page">
      <PublicHeader right={<Link href={`/${formation.organization.slug}`} className="btn btn-secondary btn-sm">Voir le centre</Link>} />

      {achat === "success" && (
        <div className="marketing-container" style={{ paddingTop: 16 }}>
          <div className="card" style={{ padding: "14px 18px", border: "1px solid var(--positive)", background: "var(--positive-bg, #ecfdf5)", display: "flex", gap: 12, alignItems: "center" }}>
            <Icon name="check" size={20} />
            <div style={{ fontSize: 13.5 }}>
              <strong>Paiement confirmé.</strong> Votre inscription est enregistrée auprès du centre. Vous recevrez un email de confirmation ; le centre vous contactera pour les modalités.
            </div>
          </div>
        </div>
      )}
      {achat === "cancel" && (
        <div className="marketing-container" style={{ paddingTop: 16 }}>
          <div className="card" style={{ padding: "14px 18px", border: "1px solid var(--border)", fontSize: 13.5 }}>
            Paiement annulé. Vous pouvez réessayer ou envoyer une demande d&apos;inscription ci-dessous.
          </div>
        </div>
      )}

      <section className="public-hero">
        <div className="marketing-container public-hero-grid">
          <div>
            <span className="eyebrow">{formation.category || "Formation professionnelle"}</span>
            <h1>{formation.title}</h1>
            <p className="public-lead">{formation.shortDescription || "Une formation conçue pour transformer les compétences en résultats concrets."}</p>
            <div className="public-facts">
              <span><Icon name="clock" size={17} /> {duration}</span>
              <span><Icon name="video" size={17} /> {MODALITY_LABELS[formation.modality]}</span>
              <span><Icon name="layers" size={17} /> {LEVEL_LABELS[formation.level]}</span>
              <span><Icon name="euro" size={17} /> {formatMoney(formation.price)}</span>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              {formation.price > 0 && <BuyFormationButton formationId={formation.id} price={formation.price} />}
              <a href="#demande" className="btn btn-secondary btn-lg">Demander une inscription <Icon name="arrow-right" size={17} /></a>
            </div>
          </div>
          <div className="public-hero-card">
            <span className="badge badge-positive">Page officielle du centre</span>
            <Link href={`/${formation.organization.slug}`} style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0 7px", color: "inherit" }}>
              <Avatar name={formation.organization.name} photoUrl={formation.organization.logoUrl} color="#2469a6" size={48} rounded="lg" />
              <h3 style={{ margin: 0 }}>{formation.organization.name}</h3>
            </Link>
            <p>{formation.organization.description || "Centre de formation professionnelle."}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Link href={`/${formation.organization.slug}`} className="btn btn-secondary btn-sm">Fiche du centre <Icon name="arrow-right" size={14} /></Link>
              {formation.organization.website && (
                <a href={formation.organization.website} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
                  Site <Icon name="external" size={14} />
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="marketing-container public-layout">
        <div className="public-main-content">
          <TextBlock title="Objectifs pédagogiques" value={formation.objectives} />
          <TextBlock title="Programme" value={formation.program} />
          <TextBlock title="Public concerné" value={formation.targetAudience} />
          <TextBlock title="Prérequis" value={formation.prerequisites} />
          <TextBlock title="À propos de cette formation" value={formation.longDescription} />

          <section className="public-content-block">
            <h2>Prochaines sessions</h2>
            {formation.sessions.length === 0 ? (
              <p>Les prochaines dates sont en préparation. Envoyez une demande pour être informé en priorité.</p>
            ) : (
              <div className="public-session-list">
                {formation.sessions.map((session) => {
                  const remaining = Math.max(0, session.capacity - session._count.enrollments);
                  return (
                    <div key={session.id} className="public-session-row">
                      <div>
                        <strong>{formatDateRange(session.startDate, session.endDate)}</strong>
                        <span>{session.trainer ? `${session.trainer.firstName} ${session.trainer.lastName}` : "Formateur à confirmer"}</span>
                      </div>
                      <span className={remaining > 0 ? "badge badge-positive" : "badge badge-neutral"}>
                        {remaining > 0 ? `${remaining} place${remaining > 1 ? "s" : ""}` : "Liste d'attente"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {formation.eligibleTrainers.length > 0 && (
            <section className="public-content-block">
              <h2>Vos formateurs</h2>
              <div className="mkt-grid-2" style={{ marginTop: 6 }}>
                {formation.eligibleTrainers.map(({ trainer: t }) => (
                  <Link key={t.id} href={`/formateur/${t.id}`} style={{ display: "flex", gap: 13, alignItems: "center", padding: 14, borderRadius: 14, background: "var(--surface-3)", color: "inherit" }}>
                    <Avatar name={`${t.firstName} ${t.lastName}`} photoUrl={t.photoUrl} initials={t.initials} color={t.color} size={56} />
                    <div style={{ minWidth: 0 }}>
                      <strong style={{ fontSize: 15 }}>{t.firstName} {t.lastName}</strong>
                      {t.specialities.length > 0 && <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 2 }}>{t.specialities.join(" · ")}</div>}
                      {t.bio && <p style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 5, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{t.bio}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {formation.testimonials.length > 0 && (
            <section className="public-content-block">
              <h2>Ce qu&apos;en disent les participants</h2>
              <div className="public-testimonials">
                {formation.testimonials.map((testimonial) => (
                  <blockquote key={testimonial.id}>
                    <p>« {testimonial.content} »</p>
                    <footer>{testimonial.author}{testimonial.role ? `, ${testimonial.role}` : ""}</footer>
                  </blockquote>
                ))}
              </div>
            </section>
          )}

          {formation.faqs.length > 0 && (
            <section className="public-content-block">
              <h2>Questions fréquentes</h2>
              <div className="public-faqs">
                {formation.faqs.map((faq) => (
                  <details key={faq.id}>
                    <summary>{faq.question}</summary>
                    <p>{faq.answer}</p>
                  </details>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside id="demande" className="public-lead-card">
          <span className="eyebrow">Prochaine étape</span>
          <h2>Parlons de votre besoin</h2>
          <p>Demandez une inscription ou un rappel. Votre demande arrive directement dans le suivi commercial du centre.</p>
          <PublicLeadForm orgSlug={orgSlug} publicSlug={publicSlug} />
        </aside>
      </div>

      <footer className="public-footer">
        <div className="marketing-container">
          <span>{formation.organization.name}</span>
          <span>Page propulsée par Le Bon Rebond</span>
        </div>
      </footer>
    </main>
  );
}
