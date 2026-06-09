import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/tenant";
import { getBeneficiary } from "@/server/beneficiary";
import { Card, Avatar } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { BILAN_PHASES, PHASE_LABEL } from "@/server/bilan";
import { BeneficiaryStatus } from "./status-control";

export const dynamic = "force-dynamic";

const STEP_ICON: Record<string, { icon: string; color: string }> = {
  done: { icon: "check-circle", color: "#137a45" }, in_progress: { icon: "play", color: "#a86617" }, todo: { icon: "circle", color: "var(--ink-4)" },
};

export default async function BeneficiaryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireTenant();
  const canEdit = ["OWNER", "ADMIN", "ASSISTANT"].includes(ctx.role);
  const b = await getBeneficiary(ctx, id);
  if (!b) notFound();

  const total = b.steps.length;
  const done = b.steps.filter((s) => s.status === "done").length;
  const percent = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="fade-up">
      <Link href="/beneficiaires" className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }}><Icon name="chevron-left" size={15} /> Bénéficiaires</Link>

      <div className="spread" style={{ marginBottom: 22, gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Avatar size={56} color="#6a5cf0">{(b.firstName[0] + b.lastName[0]).toUpperCase()}</Avatar>
          <div>
            <h1 style={{ fontSize: 23, fontWeight: 800 }}>{b.firstName} {b.lastName}</h1>
            <p style={{ color: "var(--ink-2)", marginTop: 4, fontSize: 14 }}>{b.email ?? "—"}{b.phone ? ` · ${b.phone}` : ""}</p>
          </div>
        </div>
        {canEdit && <BeneficiaryStatus id={b.id} status={b.status} />}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16 }}>
        <Card>
          <div className="spread" style={{ marginBottom: 14 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800 }}>Parcours de bilan</h3>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--primary)" }}>{percent}%</span>
          </div>
          {BILAN_PHASES.map((phase) => {
            const ps = b.steps.filter((s) => s.phase === phase.id);
            if (ps.length === 0) return null;
            return (
              <div key={phase.id} style={{ marginBottom: 16 }}>
                <strong style={{ fontSize: 13, color: "var(--ink-2)" }}>{PHASE_LABEL[phase.id]}</strong>
                <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
                  {ps.map((s) => {
                    const si = STEP_ICON[s.status] ?? STEP_ICON.todo;
                    return (
                      <div key={s.id} style={{ display: "flex", gap: 9, alignItems: "flex-start", padding: "8px 10px", borderRadius: 9, background: "var(--surface-3)" }}>
                        <Icon name={si.icon} size={16} style={{ color: si.color, marginTop: 1, flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{s.title}</div>
                          {s.notes && <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 3, fontStyle: "italic" }}>« {s.notes} »</div>}
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
          {b.objective && <Card><h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>Projet</h3><p style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.6 }}>{b.objective}</p></Card>}
          <Card>
            <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>Formations suivies ({b.interests.length})</h3>
            {b.interests.length === 0 ? <p className="muted-3" style={{ fontSize: 13 }}>Aucune pour le moment.</p> : (
              <div style={{ display: "grid", gap: 8 }}>
                {b.interests.map((i) => (
                  <div key={i.id} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 99, background: i.formation.color ?? "#5850ec" }} />
                    <span style={{ flex: 1, fontWeight: 600 }}>{i.formation.title}</span>
                    {i.status === "requested" && <span className="badge badge-sky">Demande</span>}
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
