import Link from "next/link";
import { getBeneficiaryContext, getMyProgress, getMyBilanSteps, getMyInterests } from "@/server/beneficiary-self";
import { Card, EmptyState } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { PHASE_LABEL } from "@/server/bilan";
import { PayBilanButton } from "./pay-bilan-button";

export const dynamic = "force-dynamic";

export default async function EspaceHomePage() {
  const { beneficiary } = await getBeneficiaryContext();
  if (!beneficiary) {
    return (
      <div className="fade-up">
        <Card><EmptyState icon="smile" title="Bienvenue sur votre espace" text="Votre compte n'est pas encore relié à un accompagnement. Votre conseiller activera votre parcours très prochainement." /></Card>
      </div>
    );
  }

  const [progress, steps, interests] = await Promise.all([
    getMyProgress(beneficiary.id), getMyBilanSteps(beneficiary.id), getMyInterests(beneficiary.id),
  ]);
  const nextStep = steps.find((s) => s.status !== "done");

  return (
    <div className="fade-up">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>Bonjour, {beneficiary.firstName} 👋</h1>
        <p style={{ color: "var(--ink-2)", marginTop: 6, fontSize: 14 }}>Suivez votre bilan de compétences et explorez les formations qui correspondent à votre projet.</p>
      </div>

      {/* Progression */}
      <Card style={{ marginBottom: 16 }}>
        <div className="spread" style={{ marginBottom: 10 }}>
          <strong style={{ fontSize: 15 }}>Ma progression</strong>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--primary)" }}>{progress.percent}%</span>
        </div>
        <div style={{ height: 10, borderRadius: 99, background: "var(--surface-3)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress.percent}%`, background: "linear-gradient(90deg,#6a5cf0,#5850ec)", borderRadius: 99 }} />
        </div>
        <p style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 8 }}>{progress.done} étape{progress.done > 1 ? "s" : ""} sur {progress.total} complétée{progress.done > 1 ? "s" : ""}.</p>
      </Card>

      {/* Prochaine étape */}
      {nextStep && (
        <Card style={{ marginBottom: 16, borderLeft: "4px solid var(--primary)" }}>
          <span className="eyebrow">Prochaine étape · {PHASE_LABEL[nextStep.phase]}</span>
          <h3 style={{ fontSize: 16, margin: "6px 0 4px" }}>{nextStep.title}</h3>
          {nextStep.description && <p style={{ fontSize: 13.5, color: "var(--ink-2)" }}>{nextStep.description}</p>}
          <Link href="/espace/parcours" className="btn btn-primary" style={{ marginTop: 12 }}>Continuer mon parcours <Icon name="arrow-right" size={16} /></Link>
        </Card>
      )}

      {/* CTA catalogue */}
      <Card style={{ marginBottom: 16, background: "linear-gradient(150deg,#f3f6ff,#fff)" }}>
        <div className="spread" style={{ flexWrap: "wrap", gap: 12 }}>
          <div>
            <h3 style={{ fontSize: 16, marginBottom: 4 }}>Explorez le catalogue de formations</h3>
            <p style={{ fontSize: 13.5, color: "var(--ink-2)" }}>Toutes les formations des centres du réseau, pour construire votre projet.</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <PayBilanButton />
            <Link href="/espace/catalogue" className="btn btn-primary"><Icon name="book" size={16} /> Voir le catalogue</Link>
          </div>
        </div>
      </Card>

      {/* Mes formations enregistrées */}
      {interests.length > 0 && (
        <Card>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Mes formations enregistrées ({interests.length})</h3>
          <div style={{ display: "grid", gap: 8 }}>
            {interests.slice(0, 5).map((i) => (
              <Link key={i.id} href={`/${i.formation.organization.slug}/f/${i.formation.publicSlug ?? i.formation.slug}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, background: "var(--surface-3)", color: "inherit" }}>
                <span style={{ width: 4, height: 30, borderRadius: 4, background: i.formation.color ?? "#5850ec" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{i.formation.title}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{i.formation.organization.name}</div>
                </div>
                {i.status === "requested" && <span className="badge badge-sky">Demande envoyée</span>}
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
