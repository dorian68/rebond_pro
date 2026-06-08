import Link from "next/link";
import { requireTenant } from "@/lib/tenant";
import { getWeekPlanning } from "@/server/planning";
import { formationOptions } from "@/server/options";
import { PageHeader, Card, Avatar } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { weekdayLabel } from "@/lib/utils";
import { BestSlotsPanel } from "./best-slots-panel";

export const dynamic = "force-dynamic";

function fmtDay(iso: string) {
  const d = new Date(iso + "T00:00:00Z");
  return { wd: weekdayLabel(d), n: d.getUTCDate() };
}
function weekLabel(iso: string) {
  const d = new Date(iso + "T00:00:00Z");
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(d);
}

export default async function PlanningPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const ctx = await requireTenant();
  const { week } = await searchParams;
  const [planning, formations] = await Promise.all([getWeekPlanning(ctx, week), formationOptions(ctx)]);
  const todayKey = new Date().toISOString().slice(0, 10);

  return (
    <div className="fade-up">
      <PageHeader title="Planning" subtitle="Coordonnez formateurs et salles, repérez les conflits.">
        <BestSlotsPanel formations={formations} />
      </PageHeader>

      {planning.conflictCount > 0 && (
        <div className="card" style={{ padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10, background: "var(--danger-bg)", border: "1px solid var(--danger-border)" }}>
          <Icon name="alert-triangle" size={18} style={{ color: "var(--danger)" }} />
          <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--danger-strong)" }}>{planning.conflictCount} conflit{planning.conflictCount > 1 ? "s" : ""} détecté{planning.conflictCount > 1 ? "s" : ""} cette semaine (formateur ou salle en double).</span>
        </div>
      )}

      {/* Navigation semaine */}
      <div className="spread" style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link href={`/planning?week=${planning.prevWeek}`} className="btn btn-secondary btn-icon"><Icon name="chevron-left" size={16} /></Link>
          <Link href="/planning" className="btn btn-secondary btn-sm">Cette semaine</Link>
          <Link href={`/planning?week=${planning.nextWeek}`} className="btn btn-secondary btn-icon"><Icon name="chevron-right" size={16} /></Link>
          <span style={{ fontWeight: 700, fontSize: 14, marginLeft: 8 }}>Semaine du {weekLabel(planning.weekStart)}</span>
        </div>
        <div style={{ display: "flex", gap: 14, fontSize: 12, color: "var(--ink-3)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--surface-3)", border: "1px solid var(--border-strong)" }} /> Indispo</span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--danger-bg)", border: "1px solid var(--danger-border)" }} /> Conflit</span>
        </div>
      </div>

      <Card pad={false} style={{ overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
          <thead>
            <tr>
              <th style={{ width: 150, textAlign: "left", padding: "12px 14px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-3)", borderBottom: "1px solid var(--border)" }}>Formateur</th>
              {planning.days.map((d) => {
                const { wd, n } = fmtDay(d);
                const isToday = d === todayKey;
                return (
                  <th key={d} style={{ padding: "10px 8px", borderBottom: "1px solid var(--border)", borderLeft: "1px solid var(--border-2)", textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: isToday ? "var(--primary)" : "var(--ink-3)", textTransform: "capitalize", fontWeight: 700 }}>{wd}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: isToday ? "var(--primary)" : "var(--ink)" }}>{n}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {planning.rows.map((row) => (
              <tr key={row.trainer.id}>
                <td style={{ padding: "10px 14px", borderBottom: "1px solid var(--border-2)", verticalAlign: "top" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <Avatar size={28} color={row.trainer.color ?? undefined}>{row.trainer.initials ?? "?"}</Avatar>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{row.trainer.firstName} {row.trainer.lastName}</span>
                  </div>
                </td>
                {row.cells.map((cell) => (
                  <td key={cell.day} style={{ padding: 5, borderBottom: "1px solid var(--border-2)", borderLeft: "1px solid var(--border-2)", verticalAlign: "top", minWidth: 110, background: cell.unavailable ? "repeating-linear-gradient(45deg, var(--surface-3), var(--surface-3) 6px, var(--surface-2) 6px, var(--surface-2) 12px)" : undefined }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, minHeight: 44 }}>
                      {cell.sessions.map((s) => (
                        <Link key={s.id + cell.day} href={`/sessions/${s.id}`}
                          style={{ display: "block", padding: "5px 7px", borderRadius: 7, background: s.conflict ? "var(--danger-bg)" : "#fff", border: `1px solid ${s.conflict ? "var(--danger-border)" : "var(--border)"}`, borderLeft: `3px solid ${s.conflict ? "var(--danger)" : s.color}` }}>
                          <div style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.2, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title}</div>
                          <div style={{ fontSize: 10, color: s.conflict ? "var(--danger-strong)" : "var(--ink-3)", marginTop: 2 }}>
                            {s.conflict ? "⚠ conflit" : `${s.enrolled}/${s.capacity}${s.room ? " · " + s.room : ""}`}
                          </div>
                        </Link>
                      ))}
                      {cell.unavailable && cell.sessions.length === 0 && <span style={{ fontSize: 10, color: "var(--ink-4)", fontWeight: 600 }}>Indispo</span>}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
            {planning.rows.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>Aucun formateur. Ajoutez des formateurs pour planifier.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
      <p className="muted-3" style={{ fontSize: 12, marginTop: 10 }}>Astuce : les créneaux barrés indiquent une indisponibilité (gérable depuis la fiche formateur). Les sessions en rouge signalent un conflit de formateur ou de salle.</p>
    </div>
  );
}
