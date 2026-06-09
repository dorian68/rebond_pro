import Link from "next/link";
import { requireTenant } from "@/lib/tenant";
import { listBeneficiaries } from "@/server/beneficiary";
import { PageHeader, Card, EmptyState, Avatar } from "@/components/ui/primitives";
import { InviteBeneficiary } from "./invite-beneficiary";

export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; cls: string }> = {
  active: { label: "En cours", cls: "badge-positive" }, completed: { label: "Terminé", cls: "badge-neutral" }, archived: { label: "Archivé", cls: "badge-neutral" },
};

export default async function BeneficiairesPage() {
  const ctx = await requireTenant();
  const canEdit = ["OWNER", "ADMIN", "ASSISTANT"].includes(ctx.role);
  const beneficiaries = await listBeneficiaries(ctx);

  return (
    <div className="fade-up">
      <PageHeader title="Bénéficiaires" subtitle="Les personnes que vous accompagnez en bilan de compétences." />

      {canEdit && <div style={{ marginBottom: 16 }}><InviteBeneficiary /></div>}

      {beneficiaries.length === 0 ? (
        <Card><EmptyState icon="smile" title="Aucun bénéficiaire" text="Invitez une personne pour lui ouvrir son espace personnel d'accompagnement." /></Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {beneficiaries.map((b) => {
            const s = STATUS[b.status] ?? STATUS.active;
            return (
              <Link key={b.id} href={`/beneficiaires/${b.id}`} className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Avatar size={44} color="#6a5cf0">{(b.firstName[0] + b.lastName[0]).toUpperCase()}</Avatar>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>{b.firstName} {b.lastName}</div>
                    <div style={{ fontSize: 12.5, color: "var(--ink-3)" }}>{b.email ?? "—"}</div>
                  </div>
                  <span className={`badge ${s.cls}`}>{s.label}</span>
                </div>
                <div>
                  <div style={{ height: 7, borderRadius: 99, background: "var(--surface-3)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${b.progress}%`, background: "linear-gradient(90deg,#6a5cf0,#5850ec)" }} />
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 5 }}>{b.progress}% · {b.stepsDone}/{b.stepsTotal} étapes · {b._count.interests} formation{b._count.interests > 1 ? "s" : ""} suivie{b._count.interests > 1 ? "s" : ""}</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
