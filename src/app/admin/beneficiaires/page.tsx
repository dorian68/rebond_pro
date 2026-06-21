import Link from "next/link";
import { listAllBeneficiaries } from "@/server/platform";
import { PageHeader, Card, EmptyState, Avatar } from "@/components/ui/primitives";
import { PlatformInviteBeneficiary } from "./platform-invite-beneficiary";

export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; cls: string }> = {
  active: { label: "En cours", cls: "badge-positive" },
  completed: { label: "Terminé", cls: "badge-neutral" },
  archived: { label: "Archivé", cls: "badge-neutral" },
};

export default async function AdminBeneficiairesPage() {
  const list = await listAllBeneficiaries();
  return (
    <div className="fade-up">
      <PageHeader title="Bénéficiaires (bilan de compétences)" subtitle={`${list.length} bénéficiaire${list.length > 1 ? "s" : ""} accompagné${list.length > 1 ? "s" : ""} dans le réseau.`} />
      <div style={{ marginBottom: 16 }}><PlatformInviteBeneficiary /></div>

      {list.length === 0 ? (
        <Card><EmptyState icon="smile" title="Aucun bénéficiaire" text="Créez un dossier bénéficiaire depuis l'administration plateforme." /></Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {list.map((b) => {
            const s = STATUS[b.status] ?? STATUS.active;
            return (
              <Link key={b.id} href={`/admin/beneficiaires/${b.id}`} className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Avatar size={44} color="#2f9488">{(b.firstName[0] + b.lastName[0]).toUpperCase()}</Avatar>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>{b.firstName} {b.lastName}</div>
                    <div style={{ fontSize: 12.5, color: "var(--ink-3)" }}>{b.email ?? "—"}</div>
                  </div>
                  <span className={`badge ${s.cls}`}>{s.label}</span>
                </div>
                <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>
                  Centre : <span style={{ fontWeight: 700 }}>{b.organization.name}</span>
                </div>
                <div>
                  <div style={{ height: 7, borderRadius: 99, background: "var(--surface-3)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${b.progress}%`, background: "linear-gradient(90deg,#2f9488,#2469a6)" }} />
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
