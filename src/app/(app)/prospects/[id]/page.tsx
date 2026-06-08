import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/tenant";
import { getProspect } from "@/server/prospects";
import { enrollableSessions } from "@/server/learners";
import { Card, PageHeader } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { formatMoney, formatDate } from "@/lib/utils";
import { PROSPECT_STAGE_LABELS, PROSPECT_SOURCE_LABELS, PROSPECT_TYPE_LABELS } from "@/lib/labels";
import { addProspectActivity, convertProspect } from "@/server/prospects-actions";
import { DeleteProspectButton, RelanceGenerator } from "./prospect-client";

export const dynamic = "force-dynamic";

const STAGE_BADGE: Record<string, string> = { NOUVEAU: "badge-neutral", CONTACTE: "badge-sky", DEVIS: "badge-primary", RELANCE: "badge-warn", GAGNE: "badge-positive", PERDU: "badge-danger" };

export default async function ProspectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireTenant();
  const p = await getProspect(ctx, id);
  if (!p) notFound();
  const canEdit = ["OWNER", "ADMIN", "COMMERCIAL"].includes(ctx.role);
  const won = p.stage === "GAGNE";
  const sessions = canEdit && !won ? await enrollableSessions(ctx) : [];
  const addActivity = addProspectActivity.bind(null, id);
  const convert = convertProspect.bind(null, id);

  return (
    <div className="fade-up">
      <Link href="/prospects" className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }}><Icon name="chevron-left" size={15} /> Pipeline</Link>

      <PageHeader title={p.name} subtitle={`${PROSPECT_TYPE_LABELS[p.type]} · Source : ${PROSPECT_SOURCE_LABELS[p.source]}`}>
        <span className={"badge " + (STAGE_BADGE[p.stage] ?? "badge-neutral")}>{PROSPECT_STAGE_LABELS[p.stage]}</span>
        {p.isHot && <span className="badge badge-danger"><Icon name="zap" size={12} /> Chaud</span>}
        {canEdit && (
          <>
            <RelanceGenerator prospectId={p.id} />
            <Link href={`/prospects/${p.id}/edit`} className="btn btn-secondary btn-sm"><Icon name="edit" size={15} /> Modifier</Link>
            <DeleteProspectButton id={p.id} />
          </>
        )}
      </PageHeader>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16 }}>
        <div>
          <Card style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 14 }}>Informations</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Info label="Contact" value={p.contactName ?? "—"} />
              <Info label="Email" value={p.email ?? "—"} />
              <Info label="Téléphone" value={p.phone ?? "—"} />
              <Info label="Montant potentiel" value={formatMoney(p.potentialAmount)} />
              <Info label="Formation d'intérêt" value={p.formationOfInterest?.title ?? "—"} />
              <Info label="Prochaine relance" value={formatDate(p.nextFollowUpDate)} />
              <Info label="Prochaine action" value={p.nextAction ?? "—"} />
            </div>
            {p.notes && <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border-2)" }}><div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 6 }}>Notes</div><p style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{p.notes}</p></div>}
          </Card>

          <Card>
            <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 14 }}>Historique</h3>
            {canEdit && (
              <form action={addActivity} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <select name="type" className="select" style={{ width: "auto", height: 38 }}>
                  <option value="note">Note</option><option value="appel">Appel</option><option value="email">Email</option>
                </select>
                <input className="input" name="content" placeholder="Ajouter une activité…" required style={{ height: 38 }} />
                <button type="submit" className="btn btn-secondary btn-sm"><Icon name="plus" size={15} /></button>
              </form>
            )}
            {p.activities.length === 0 ? (
              <p className="muted-3" style={{ fontSize: 13 }}>Aucune activité enregistrée.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {p.activities.map((a) => (
                  <div key={a.id} style={{ display: "flex", gap: 11, padding: "10px 0", borderBottom: "1px solid var(--border-2)" }}>
                    <span style={{ width: 26, height: 26, borderRadius: 7, background: "var(--surface-3)", color: "var(--ink-3)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                      <Icon name={a.type === "appel" ? "phone" : a.type === "email" ? "mail" : a.type === "stage_change" ? "arrow-right" : a.type === "conversion" ? "check-circle" : "message"} size={13} />
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: "var(--ink)" }}>{a.content}</div>
                      <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 2 }}>{formatDate(a.createdAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div>
          {canEdit && !won && (
            <Card style={{ background: "var(--positive-bg)", border: "1px solid var(--positive-border)" }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 6, color: "var(--positive-600)" }}><Icon name="trophy" size={15} /> Convertir en inscription</h3>
              <p style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 12 }}>Transforme ce prospect en apprenant et l&apos;inscrit (optionnellement) à une session.</p>
              <form action={convert} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <select name="sessionId" className="select">
                  <option value="">Sans inscription pour l&apos;instant</option>
                  {sessions.map((s) => <option key={s.id} value={s.id} disabled={s.enrolled >= s.capacity}>{s.label} ({s.enrolled}/{s.capacity})</option>)}
                </select>
                <button type="submit" className="btn btn-primary btn-block"><Icon name="user-check" size={16} /> Convertir le prospect</button>
              </form>
            </Card>
          )}
          {won && (
            <Card style={{ background: "var(--positive-bg)", border: "1px solid var(--positive-border)", textAlign: "center" }}>
              <Icon name="trophy" size={24} style={{ color: "var(--positive-600)" }} />
              <div style={{ fontWeight: 800, marginTop: 8 }}>Prospect gagné 🎉</div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13.5, color: "var(--ink)", fontWeight: 600 }}>{value}</div>
    </div>
  );
}
