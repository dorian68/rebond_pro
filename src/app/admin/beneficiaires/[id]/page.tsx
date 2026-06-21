import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, Avatar } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { BILAN_PHASES, PHASE_LABEL } from "@/server/bilan";
import { getPlatformBeneficiary, listBeneficiaryTransferCenters } from "@/server/platform";
import { PlatformBeneficiaryStatus, TransferBeneficiaryForm } from "./beneficiary-admin-actions";

export const dynamic = "force-dynamic";

const STEP_ICON: Record<string, { icon: string; color: string }> = {
  done: { icon: "check-circle", color: "#137a45" },
  in_progress: { icon: "play", color: "#a86617" },
  todo: { icon: "circle", color: "var(--ink-4)" },
};

export default async function AdminBeneficiaryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const beneficiary = await getPlatformBeneficiary(id);
  if (!beneficiary) notFound();
  const centers = await listBeneficiaryTransferCenters(beneficiary.organizationId);

  const total = beneficiary.steps.length;
  const done = beneficiary.steps.filter((s) => s.status === "done").length;
  const percent = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="fade-up">
      <Link href="/admin/beneficiaires" className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }}><Icon name="chevron-left" size={15} /> Bénéficiaires</Link>

      <div className="spread" style={{ marginBottom: 22, gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Avatar size={56} color="#2f9488">{(beneficiary.firstName[0] + beneficiary.lastName[0]).toUpperCase()}</Avatar>
          <div>
            <h1 style={{ fontSize: 23, fontWeight: 800 }}>{beneficiary.firstName} {beneficiary.lastName}</h1>
            <p style={{ color: "var(--ink-2)", marginTop: 4, fontSize: 14 }}>
              {beneficiary.email ?? "—"}{beneficiary.phone ? ` · ${beneficiary.phone}` : ""}
            </p>
            <p style={{ color: "var(--ink-3)", marginTop: 4, fontSize: 12.5 }}>
              Centre accompagnateur : <Link href={`/admin/centres/${beneficiary.organization.id}`} style={{ color: "var(--primary)", fontWeight: 700 }}>{beneficiary.organization.name}</Link>
            </p>
          </div>
        </div>
        <PlatformBeneficiaryStatus id={beneficiary.id} status={beneficiary.status} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.45fr .9fr", gap: 16 }}>
        <Card>
          <div className="spread" style={{ marginBottom: 14 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800 }}>Parcours de bilan</h3>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--primary)" }}>{percent}%</span>
          </div>
          {BILAN_PHASES.map((phase) => {
            const phaseSteps = beneficiary.steps.filter((s) => s.phase === phase.id);
            if (phaseSteps.length === 0) return null;
            return (
              <div key={phase.id} style={{ marginBottom: 16 }}>
                <strong style={{ fontSize: 13, color: "var(--ink-2)" }}>{PHASE_LABEL[phase.id]}</strong>
                <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
                  {phaseSteps.map((step) => {
                    const icon = STEP_ICON[step.status] ?? STEP_ICON.todo;
                    return (
                      <div key={step.id} style={{ display: "flex", gap: 9, alignItems: "flex-start", padding: "8px 10px", borderRadius: 9, background: "var(--surface-3)" }}>
                        <Icon name={icon.icon} size={16} style={{ color: icon.color, marginTop: 1, flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{step.title}</div>
                          {step.notes && <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 3, fontStyle: "italic" }}>« {step.notes} »</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </Card>

        <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
          {beneficiary.objective && (
            <Card><h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>Projet</h3><p style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.6 }}>{beneficiary.objective}</p></Card>
          )}
          <Card>
            <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>Migrer le dossier vers un centre</h3>
            <TransferBeneficiaryForm beneficiaryId={beneficiary.id} centers={centers} />
          </Card>
          <Card>
            <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>Formations suivies ({beneficiary.interests.length})</h3>
            {beneficiary.interests.length === 0 ? <p className="muted-3" style={{ fontSize: 13 }}>Aucune pour le moment.</p> : (
              <div style={{ display: "grid", gap: 8 }}>
                {beneficiary.interests.map((interest) => (
                  <div key={interest.id} style={{ display: "grid", gap: 3, fontSize: 13 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 99, background: interest.formation.color ?? "#2469a6" }} />
                      <span style={{ flex: 1, fontWeight: 600 }}>{interest.formation.title}</span>
                      {interest.status === "requested" && <span className="badge badge-sky">Demande</span>}
                    </div>
                    <div className="muted-3" style={{ fontSize: 11.5, paddingLeft: 17 }}>{interest.formation.organization.name}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
