import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/tenant";
import { getTrainer } from "@/server/trainers";
import { Card, Avatar, SessionBadge } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { formatDateRange, formatDate } from "@/lib/utils";
import { SLOT_LABELS } from "@/lib/labels";
import { addUnavailability } from "@/server/availability-actions";
import { DeleteTrainerButton } from "./delete-trainer";
import { RemoveUnavailButton } from "./availability";
import { InviteTrainerButton } from "./invite-trainer";

export const dynamic = "force-dynamic";

export default async function TrainerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireTenant();
  const t = await getTrainer(ctx, id);
  if (!t) notFound();
  const canEdit = ctx.role === "OWNER" || ctx.role === "ADMIN";
  const now = new Date();
  const unavailabilities = t.availabilities.filter((a) => a.type === "INDISPONIBLE" && a.date >= new Date(now.getFullYear(), now.getMonth(), now.getDate()));
  const addUnavail = addUnavailability.bind(null, t.id);

  return (
    <div className="fade-up">
      <Link href="/formateurs" className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }}><Icon name="chevron-left" size={15} /> Formateurs</Link>

      <div className="spread" style={{ marginBottom: 22, gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Avatar size={56} color={t.color ?? undefined}>{t.initials ?? (t.firstName[0] + t.lastName[0])}</Avatar>
          <div>
            <h1 style={{ fontSize: 23, fontWeight: 800 }}>{t.firstName} {t.lastName}</h1>
            <p style={{ color: "var(--ink-2)", marginTop: 4, fontSize: 14 }}>{t.specialities.join(", ") || "Aucune spécialité"}</p>
          </div>
        </div>
        {canEdit && (
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <InviteTrainerButton trainerId={t.id} linked={!!t.userId} hasEmail={!!t.email} />
            <Link href={`/formateurs/${t.id}/edit`} className="btn btn-secondary btn-sm"><Icon name="edit" size={15} /> Modifier</Link>
            <DeleteTrainerButton id={t.id} />
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16 }}>
        <Card>
          <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Sessions ({t.sessions.length})</h3>
          {t.sessions.length === 0 ? (
            <p className="muted-3" style={{ fontSize: 13 }}>Aucune session affectée.</p>
          ) : (
            <table className="tbl">
              <thead><tr><th>Formation</th><th>Dates</th><th>Inscrits</th><th>Statut</th></tr></thead>
              <tbody>
                {t.sessions.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.formation.title}</td>
                    <td className="muted">{formatDateRange(s.startDate, s.endDate)}</td>
                    <td className="tnum">{s._count.enrollments}/{s.capacity}</td>
                    <td><SessionBadge statut={s.status === "OUVERTE" && !s.trainerConfirmed && s.endDate >= now ? "RISQUE" : s.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <div>
          <Card style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 14 }}>Contact</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13.5 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}><Icon name="mail" size={15} style={{ color: "var(--ink-3)" }} /> {t.email ?? "—"}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}><Icon name="phone" size={15} style={{ color: "var(--ink-3)" }} /> {t.phone ?? "—"}</div>
            </div>
            {t.bio && <p style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6, marginTop: 14 }}>{t.bio}</p>}
          </Card>

          <Card style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 14 }}>Formations animées</h3>
            {t.formations.length === 0 ? <p className="muted-3" style={{ fontSize: 13 }}>Aucune.</p> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {t.formations.map((f) => (
                  <Link key={f.formation.id} href={`/formations/${f.formation.id}`} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, fontWeight: 600 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 99, background: f.formation.color ?? "#5850ec" }} /> {f.formation.title}
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 6 }}>Indisponibilités</h3>
            <p className="muted-3" style={{ fontSize: 12, marginBottom: 12 }}>Prises en compte dans le planning et le moteur de créneaux.</p>
            {canEdit && (
              <form action={addUnavail} style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <input className="input" type="date" name="date" required style={{ height: 36 }} />
                <select className="select" name="slot" defaultValue="JOURNEE" style={{ width: "auto", height: 36 }}>
                  {Object.entries(SLOT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <button type="submit" className="btn btn-secondary btn-sm"><Icon name="plus" size={15} /></button>
              </form>
            )}
            {unavailabilities.length === 0 ? (
              <p className="muted-3" style={{ fontSize: 13 }}>Aucune indisponibilité à venir.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {unavailabilities.map((a) => (
                  <div key={a.id} className="spread" style={{ padding: "6px 10px", borderRadius: 8, background: "var(--surface-3)" }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600 }}>{formatDate(a.date)} · {SLOT_LABELS[a.slot]}</span>
                    {canEdit && <RemoveUnavailButton id={a.id} />}
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
