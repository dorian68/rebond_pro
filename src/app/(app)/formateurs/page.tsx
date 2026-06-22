import Link from "next/link";
import { requireTenant } from "@/lib/tenant";
import { listTrainers } from "@/server/trainers";
import { countPendingChangeRequests } from "@/server/change-requests";
import { PageHeader, EmptyState, Card, Avatar } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";

export const dynamic = "force-dynamic";

export default async function FormateursPage() {
  const ctx = await requireTenant();
  const [trainers, pendingRequests] = await Promise.all([listTrainers(ctx), countPendingChangeRequests(ctx)]);
  const canEdit = ctx.role === "OWNER" || ctx.role === "ADMIN";

  return (
    <div className="fade-up">
      <PageHeader title="Formateurs" subtitle="Vos formateurs, leurs spécialités et leur charge.">
        {canEdit && <Link href="/formateurs/disponibilites" className="btn btn-secondary"><Icon name="calendar" size={16} /> Disponibilités</Link>}
        <Link href="/formateurs/demandes" className="btn btn-secondary">
          <Icon name="message" size={16} /> Demandes{pendingRequests > 0 && <span className="badge badge-warn" style={{ marginLeft: 6 }}>{pendingRequests}</span>}
        </Link>
        {canEdit && <Link href="/formateurs/new" className="btn btn-primary"><Icon name="plus" size={17} /> Ajouter un formateur</Link>}
      </PageHeader>

      {trainers.length === 0 ? (
        <Card><EmptyState icon="presentation" title="Aucun formateur" text="Ajoutez vos formateurs pour les affecter aux sessions."
          action={canEdit ? <Link href="/formateurs/new" className="btn btn-primary"><Icon name="plus" size={16} /> Ajouter</Link> : undefined} /></Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {trainers.map((t) => (
            <Link key={t.id} href={`/formateurs/${t.id}`} className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Avatar size={46} color={t.color}>{t.initials}</Avatar>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{t.firstName} {t.lastName}</div>
                  <div style={{ fontSize: 12.5, color: "var(--ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.specialities.join(", ") || "—"}</div>
                </div>
              </div>
              <div className="spread">
                <span className={"badge " + t.statusTone}><span className="dot" />{t.status}</span>
                <span style={{ fontSize: 12.5, color: "var(--ink-2)", fontWeight: 600 }}>{t.upcomingSessions} session{t.upcomingSessions > 1 ? "s" : ""} à venir</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
