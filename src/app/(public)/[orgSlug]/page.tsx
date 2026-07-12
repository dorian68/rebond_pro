import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
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
  return { title: `${org.name} — Centre partenaire · Le Bon Rebond`, description, openGraph: { title: org.name, description, type: "website" } };
}

const sectionPad: CSSProperties = { padding: "92px 0" };
const eyebrowStyle: CSSProperties = { fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: ".78rem", fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase", color: "#23756e", display: "inline-flex", alignItems: "center", gap: 14 };
const h2Style: CSSProperties = { fontFamily: "'Newsreader', Georgia, serif", fontSize: "clamp(2rem,3.6vw,2.9rem)", fontWeight: 400, color: "#15314C", letterSpacing: "-.025em" };

function Eyebrow({ children, center = false }: { children: React.ReactNode; center?: boolean }) {
  return (
    <span style={{ ...eyebrowStyle, justifyContent: center ? "center" : "flex-start" }}>
      <span style={{ width: 30, height: 2, background: "#5FB14E", display: "inline-block" }} />
      {children}
    </span>
  );
}

export default async function CenterProfilePage({ params }: { params: Params }) {
  const { orgSlug } = await params;
  const org = await getCenterProfile(orgSlug);
  if (!org) notFound();

  const mark = org.name.trim().charAt(0).toUpperCase();
  const year = new Date(org.createdAt).getFullYear();
  const yearsCount = new Date().getFullYear() - year;
  const modalitiesLabel = org.modalities.length > 0
    ? org.modalities.map((m) => MODALITY_LABELS[m as keyof typeof MODALITY_LABELS] ?? m).join(" & ")
    : null;
  const locLine = [org.city, modalitiesLabel].filter(Boolean).join(" · ") || "Centre de formation partenaire";

  // Faits dérivés des vraies données
  const facts: { fv: string; fl: string }[] = [];
  if (!Number.isNaN(year)) {
    facts.push({ fv: `Depuis ${year}`, fl: yearsCount >= 1 ? `Plus de ${yearsCount} an${yearsCount > 1 ? "s" : ""} d'accompagnement.` : "Un nouveau centre du réseau Le Bon Rebond." });
  }
  if (org.certifications.length > 0) {
    facts.push({ fv: org.certifications[0], fl: "Certification déclarée par le centre et examinée lors de la publication." });
  }
  if (modalitiesLabel) {
    facts.push({ fv: modalitiesLabel, fl: org.city ? `À ${org.city} ou à distance, selon votre organisation.` : "Selon votre organisation et vos contraintes." });
  }

  const sl = (org.socialLinks ?? {}) as { linkedin?: string | null; facebook?: string | null; instagram?: string | null };
  const socials = [
    { url: sl.linkedin, label: "LinkedIn" },
    { url: sl.facebook, label: "Facebook" },
    { url: sl.instagram, label: "Instagram" },
  ].filter((s) => s.url);
  const featured = org.testimonials[0];

  return (
    <div className="vitrine" style={{ background: "#FAF5EC", color: "#1b2b38", fontFamily: "'Plus Jakarta Sans', sans-serif", minHeight: "100vh" }}>

      {/* ─── Bandeau partenaire ─── */}
      <div style={{ background: "#091a29", color: "#fff", fontSize: ".88rem" }}>
        <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 32px", gap: 16 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10, fontWeight: 600, color: "rgba(255,255,255,.85)" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#5FB14E" }} />
            Centre partenaire — propulsé par Le Bon Rebond
          </span>
          <Link href="/marketplace" style={{ color: "rgba(255,255,255,.7)", textDecoration: "none", fontWeight: 600 }}>← Tous les centres</Link>
        </div>
      </div>

      {/* ─── En-tête du centre ─── */}
      <header style={{ position: "sticky", top: 0, zIndex: 40, background: "rgba(250,245,236,.86)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(21,49,76,.1)" }}>
        <div className="container" style={{ display: "flex", alignItems: "center", padding: "16px 32px", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ position: "relative", width: 46, height: 46, borderRadius: 12, background: "#15314C", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Newsreader', Georgia, serif", fontSize: "1.5rem", fontWeight: 500, overflow: "hidden" }}>
              {org.logoUrl ? <Image src={org.logoUrl} alt={`Logo de ${org.name}`} fill sizes="46px" unoptimized style={{ objectFit: "cover" }} /> : mark}
            </div>
            <div>
              <div style={{ fontWeight: 700, color: "#15314C", fontSize: "1.02rem", lineHeight: 1.2 }}>{org.name}</div>
              <div style={{ fontSize: ".84rem", color: "#5d6f7c" }}>{locLine}</div>
            </div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 18 }}>
            <a href="#formations" className="vitrine-desktop-only" style={{ color: "#15314C", textDecoration: "none", fontWeight: 600, fontSize: ".96rem" }}>Formations</a>
            <a href="#contact" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 22px", borderRadius: 100, background: "#15314C", color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: ".94rem" }}>
              Demander des infos
            </a>
          </div>
        </div>
      </header>

      {/* ─── HERO ─── */}
      <section style={{ position: "relative", overflow: "hidden", padding: "72px 0 84px" }}>
        <div style={{ position: "absolute", width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle,rgba(44,142,134,.16),transparent 70%)", top: -60, right: -50, pointerEvents: "none", zIndex: 0 }} />
        <div className="container" style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.05fr .95fr", gap: 60, alignItems: "center" }} className="ce-subhero-grid">
            <div>
              <div style={{ fontSize: ".84rem", color: "#5d6f7c", fontWeight: 600, marginBottom: 22 }}>
                <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>Accueil</Link>
                {" · "}
                <Link href="/marketplace" style={{ textDecoration: "none", color: "inherit" }}>Centres</Link>
                {" · "}
                <b style={{ color: "#23756e" }}>{org.name}</b>
              </div>
              <h1 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "clamp(2.3rem,4.6vw,3.7rem)", fontWeight: 400, letterSpacing: "-.03em", color: "#15314C", margin: 0 }}>
                {org.tagline ? org.tagline : <>Des formations concrètes pour <em style={{ fontStyle: "italic", color: "#2C8E86" }}>changer de cap.</em></>}
              </h1>
              {org.description && (
                <p style={{ marginTop: 22, fontSize: "1.18rem", color: "#5d6f7c", lineHeight: 1.65 }}>{org.description}</p>
              )}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 32 }}>
                <a href="#formations" className="btn-cta" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "19px 34px", borderRadius: 100, fontWeight: 700, fontSize: "1.05rem", textDecoration: "none", lineHeight: 1 }}>
                  Voir les formations <span>→</span>
                </a>
                <a href="#contact" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "17px 32px", borderRadius: 100, fontWeight: 700, fontSize: "1.05rem", border: "1.5px solid rgba(21,49,76,.22)", color: "#15314C", textDecoration: "none", background: "transparent", lineHeight: 1 }}>
                  Être mis en relation
                </a>
              </div>
              {(org.certifications.length > 0 || org.specialties.length > 0) && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 26px", marginTop: 34 }}>
                  {org.specialties.slice(0, 3).map((t) => (
                    <span key={t} style={{ fontSize: ".92rem", color: "#5d6f7c", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 10 }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#5FB14E", flexShrink: 0 }} />{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", zIndex: 1, width: "115%", height: "115%", left: "-7%", top: "-7%", borderRadius: "50%", background: "conic-gradient(from 200deg, #2C8E86, #5FB14E 40%, transparent 60%)", opacity: .16, filter: "blur(2px)", pointerEvents: "none" }} />
              <div style={{ position: "relative", zIndex: 2, width: "100%", height: 460, borderRadius: 26, overflow: "hidden", boxShadow: "0 24px 60px -34px rgba(14,36,56,.55)", background: "#e7ddca", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {org.coverImageUrl
                  ? <Image src={org.coverImageUrl} alt={`Locaux de ${org.name}`} fill sizes="(max-width: 980px) 100vw, 45vw" unoptimized preload style={{ objectFit: "cover" }} />
                  : <span style={{ fontSize: ".82rem", color: "rgba(21,49,76,.45)", fontWeight: 600, padding: "0 20px", textAlign: "center" }}>Photo — les locaux du centre, une salle de formation lumineuse</span>}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAITS ─── */}
      {facts.length > 0 && (
        <section className="container" style={{ paddingBottom: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${facts.length}, 1fr)`, gap: 20 }} className="ce-facts">
            {facts.map((f) => (
              <div key={f.fv} style={{ background: "#fff", border: "1.5px solid rgba(21,49,76,.08)", borderRadius: 20, padding: "26px 28px" }}>
                <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "1.5rem", fontWeight: 500, color: "#15314C", marginBottom: 6 }}>{f.fv}</div>
                <div style={{ fontSize: ".95rem", color: "#5d6f7c", lineHeight: 1.55 }}>{f.fl}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── À PROPOS ─── */}
      {org.description && (
        <section style={sectionPad}>
          <div className="container">
            <div style={{ display: "grid", gridTemplateColumns: ".8fr 1.2fr", gap: 60, alignItems: "start" }} className="ce-prose-grid">
              <div>
                <Eyebrow>Le centre</Eyebrow>
                <h2 style={{ ...h2Style, marginTop: 18 }}>Un accompagnement à taille humaine.</h2>
              </div>
              <div style={{ fontSize: "1.1rem", color: "#5d6f7c", lineHeight: 1.7 }}>
                <p style={{ margin: 0 }}>{org.description}</p>
                {org.specialties.length > 0 && (
                  <p style={{ marginTop: 18, marginBottom: 0 }}>
                    <strong style={{ color: "#15314C", fontWeight: 600 }}>Spécialités :</strong> {org.specialties.join(", ")}.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─── FORMATIONS ─── */}
      <section style={{ ...sectionPad, background: "#F3E9D7" }} id="formations">
        <div className="container">
          <div style={{ maxWidth: 680, marginBottom: 50 }}>
            <Eyebrow>Les formations</Eyebrow>
            <h2 style={{ ...h2Style, marginTop: 18 }}>Des programmes pensés pour l&apos;emploi.</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 24 }} className="ce-prog-grid">
            {org.formations.map((f) => {
              const duration = f.durationDays ? `${f.durationDays} j` : f.durationHours ? `${f.durationHours} h` : null;
              return (
                <Link key={f.id} href={`/${org.slug}/f/${f.publicSlug ?? f.slug}`}
                  style={{ display: "block", background: "#fff", border: "1.5px solid rgba(21,49,76,.08)", borderRadius: 20, padding: "30px 30px", textDecoration: "none", color: "inherit" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: ".84rem", color: "#5d6f7c", fontWeight: 600, marginBottom: 12 }}>
                    {duration && <span>{duration}</span>}
                    {duration && <span>·</span>}
                    <span>{MODALITY_LABELS[f.modality]}</span>
                    <span>·</span>
                    <span>{LEVEL_LABELS[f.level]}</span>
                    <span style={{ marginLeft: "auto", color: "#23756e", fontWeight: 700 }}>{formatMoney(f.price)}</span>
                  </div>
                  <h4 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "1.35rem", fontWeight: 500, color: "#15314C", margin: "0 0 8px", lineHeight: 1.25 }}>{f.title}</h4>
                  {f.shortDescription && <p style={{ fontSize: ".98rem", color: "#5d6f7c", lineHeight: 1.55, margin: "0 0 16px" }}>{f.shortDescription}</p>}
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#23756e", fontWeight: 700, fontSize: ".96rem" }}>
                    En savoir plus <span>→</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── INFOS PRATIQUES ─── */}
      {(org.publicEmail || org.publicPhone || org.modalities.length > 0 || org.specialties.length > 0 || socials.length > 0 || org.website) && (
        <section style={sectionPad}>
          <div className="container">
            <div style={{ maxWidth: 680, marginBottom: 50 }}>
              <Eyebrow>Informations pratiques</Eyebrow>
              <h2 style={{ ...h2Style, marginTop: 18 }}>Tout ce qu&apos;il faut savoir.</h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 24 }}>
              {org.specialties.length > 0 && <InfoCard label="Spécialités" value={org.specialties.join(" · ")} />}
              {modalitiesLabel && <InfoCard label="Modalités" value={modalitiesLabel} />}
              {org.city && <InfoCard label="Localisation" value={org.city} />}
              {org.certifications.length > 0 && <InfoCard label="Certifications déclarées" value={org.certifications.join(" · ")} />}
              {org.publicEmail && <InfoCard label="Email" value={org.publicEmail} href={`mailto:${org.publicEmail}`} />}
              {org.publicPhone && <InfoCard label="Téléphone" value={org.publicPhone} />}
              {org.website && <InfoCard label="Site web" value="Visiter le site" href={org.website} external />}
              {socials.length > 0 && (
                <div style={{ background: "#fff", border: "1.5px solid rgba(21,49,76,.08)", borderRadius: 18, padding: "22px 24px" }}>
                  <div style={{ fontSize: ".78rem", fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "#23756e", marginBottom: 8 }}>Réseaux</div>
                  <div style={{ display: "flex", gap: 14 }}>
                    {socials.map((s) => <a key={s.label} href={s.url!} target="_blank" rel="noreferrer" style={{ color: "#15314C", fontWeight: 600, textDecoration: "none" }}>{s.label}</a>)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ─── FORMATEURS ─── */}
      {org.trainers.length > 0 && (
        <section style={{ ...sectionPad, background: "#fff" }}>
          <div className="container">
            <div style={{ maxWidth: 680, marginBottom: 50 }}>
              <Eyebrow>L&apos;équipe</Eyebrow>
              <h2 style={{ ...h2Style, marginTop: 18 }}>Des formateurs du terrain.</h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
              {org.trainers.map((t) => (
                <Link key={t.id} href={`/formateur/${t.id}`}
                  style={{ display: "flex", gap: 16, alignItems: "center", background: "#FDF8F1", border: "1.5px solid rgba(21,49,76,.08)", borderRadius: 18, padding: "22px 24px", textDecoration: "none", color: "inherit" }}>
                  <div style={{ position: "relative", width: 58, height: 58, borderRadius: 14, background: t.color || "#2C8E86", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "1.1rem", flexShrink: 0, overflow: "hidden" }}>
                    {t.photoUrl ? <Image src={t.photoUrl} alt={`Portrait de ${t.firstName} ${t.lastName}`} fill sizes="58px" unoptimized style={{ objectFit: "cover" }} /> : (t.initials || `${t.firstName.charAt(0)}${t.lastName.charAt(0)}`)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: "#15314C", fontSize: "1.02rem" }}>{t.firstName} {t.lastName}</div>
                    {t.specialities.length > 0 && <div style={{ fontSize: ".9rem", color: "#5d6f7c", marginTop: 3 }}>{t.specialities.join(" · ")}</div>}
                    <div style={{ fontSize: ".84rem", color: "#85939d", marginTop: 5 }}>
                      {t.yearsExperience ? `${t.yearsExperience} ans d'expérience · ` : ""}{t._count.formations} formation{t._count.formations > 1 ? "s" : ""}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── TÉMOIGNAGE ─── */}
      {featured && (
        <section style={{ ...sectionPad, background: "#F3E9D7" }}>
          <div className="container">
            <div style={{ maxWidth: 820 }}>
              <Eyebrow>Un parcours</Eyebrow>
              <p style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "clamp(1.6rem,3vw,2.3rem)", fontWeight: 400, fontStyle: "italic", color: "#15314C", lineHeight: 1.4, margin: "24px 0 0" }}>
                « {featured.content} »
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 26 }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#2C8E86", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, flexShrink: 0 }}>
                  {featured.author.trim().charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: "#15314C" }}>{featured.author}</div>
                  {featured.role && <div style={{ fontSize: ".92rem", color: "#5d6f7c" }}>{featured.role}</div>}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─── CONTACT / MISE EN RELATION ─── */}
      <section style={{ position: "relative", overflow: "hidden", background: "#FAF5EC", padding: "108px 0 120px", textAlign: "center" }} id="contact">
        <div style={{ position: "absolute", width: 680, height: 680, borderRadius: "50%", border: "1.5px solid rgba(44,142,134,.18)", left: -160, bottom: -320, pointerEvents: "none" }} />
        <div style={{ position: "absolute", width: 520, height: 520, borderRadius: "50%", border: "1.5px solid rgba(95,177,78,.22)", right: -120, top: -220, pointerEvents: "none" }} />
        <div className="container" style={{ position: "relative", zIndex: 1 }}>
          <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "clamp(2.4rem,4.8vw,3.7rem)", fontWeight: 400, color: "#15314C", letterSpacing: "-.03em", margin: "0 0 20px" }}>
            Une formation vous <em style={{ fontStyle: "italic", color: "#2C8E86" }}>intéresse ?</em>
          </h2>
          <p style={{ fontSize: "1.18rem", color: "#5d6f7c", lineHeight: 1.65, maxWidth: "54ch", margin: "0 auto 40px" }}>
            Le Bon Rebond vous met en relation gratuitement avec {org.name}. Décrivez votre projet, on s&apos;occupe du reste.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center" }}>
            <Link href="/contact" className="btn-cta" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "19px 34px", borderRadius: 100, fontWeight: 700, fontSize: "1.05rem", textDecoration: "none", lineHeight: 1 }}>
              Être mis en relation <span>→</span>
            </Link>
            <Link href="/bilan-de-competences" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "17px 32px", borderRadius: 100, fontWeight: 700, fontSize: "1.05rem", background: "#15314C", color: "#fff", textDecoration: "none", lineHeight: 1 }}>
              J&apos;hésite, je veux un bilan
            </Link>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer style={{ background: "#091a29", color: "rgba(255,255,255,.7)" }}>
        <div className="container" style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "space-between", alignItems: "center", padding: "28px 32px" }}>
          <span style={{ fontFamily: "'Newsreader', Georgia, serif", fontStyle: "italic", color: "rgba(255,255,255,.85)" }}>Un nouveau départ, la bonne direction.</span>
          <span style={{ fontSize: ".88rem" }}>{org.name} — Centre partenaire Le Bon Rebond</span>
        </div>
      </footer>

      <style>{`
        @media (max-width: 980px) {
          .ce-subhero-grid { grid-template-columns: 1fr !important; }
          .ce-prose-grid   { grid-template-columns: 1fr !important; gap: 28px !important; }
          .ce-prog-grid    { grid-template-columns: 1fr !important; }
          .ce-facts        { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function InfoCard({ label, value, href, external }: { label: string; value: string; href?: string; external?: boolean }) {
  const inner = (
    <>
      <div style={{ fontSize: ".78rem", fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "#23756e", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: "1rem", color: "#15314C", fontWeight: 600, lineHeight: 1.45 }}>{value}</div>
    </>
  );
  const cardStyle: CSSProperties = { display: "block", background: "#fff", border: "1.5px solid rgba(21,49,76,.08)", borderRadius: 18, padding: "22px 24px", textDecoration: "none", color: "inherit" };
  if (href) {
    return <a href={href} {...(external ? { target: "_blank", rel: "noreferrer" } : {})} style={cardStyle}>{inner}</a>;
  }
  return <div style={cardStyle}>{inner}</div>;
}
