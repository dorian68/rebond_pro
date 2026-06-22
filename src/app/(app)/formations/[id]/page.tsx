import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/tenant";
import { getFormation } from "@/server/formations";
import { Card, PageHeader, SessionBadge, FillBar, Avatar } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { formatMoney, formatDateRange, clampPct } from "@/lib/utils";
import { MODALITY_LABELS, LEVEL_LABELS, FORMATION_STATUS_LABELS, FORMATION_STATUS_BADGE } from "@/lib/labels";
import { PublishToggle, DeleteFormationButton } from "./formation-actions";
import { ImproveDescription } from "./improve-description";

export const dynamic = "force-dynamic";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{children}</div>
    </div>
  );
}

export default async function FormationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireTenant();
  const f = await getFormation(ctx, id);
  if (!f) notFound();
  const canEdit = ctx.role === "OWNER" || ctx.role === "ADMIN";

  const now = new Date();
  const upcoming = f.sessions.filter((s) => s.endDate >= now && s.status !== "TERMINEE");
  const fillRates = upcoming.map((s) => (s.capacity > 0 ? (s._count.enrollments / s.capacity) * 100 : 0));
  const avgFill = fillRates.length ? Math.round(fillRates.reduce((a, b) => a + b, 0) / fillRates.length) : 0;
  const forecast = upcoming.reduce((acc, s) => acc + s._count.enrollments * s.pricePerLearner, 0);
  const isPubliclyReachable = f.status === "PUBLIE" && f.isPublic && Boolean(f.publicSlug);

  return (
    <div className="fade-up">
      <Link href="/formations" className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }}><Icon name="chevron-left" size={15} /> Catalogue</Link>

      <div style={{ height: 5, background: f.color ?? "#2469a6", borderRadius: 99, marginBottom: 16, maxWidth: 80 }} />
      <PageHeader title={f.title} subtitle={`${f.category ?? "Sans catégorie"} · ${MODALITY_LABELS[f.modality]} · ${LEVEL_LABELS[f.level]}`}>
        <span className={"badge " + (FORMATION_STATUS_BADGE[f.status] ?? "badge-neutral")}>{FORMATION_STATUS_LABELS[f.status]}</span>
        {canEdit && (
          <>
            <Link href={`/formations/${f.id}/edit`} className="btn btn-secondary btn-sm"><Icon name="edit" size={15} /> Modifier</Link>
            <PublishToggle id={f.id} isPublic={f.isPublic} />
            {isPubliclyReachable && (
              <Link href={`/${ctx.organizationSlug}/f/${f.publicSlug}`} target="_blank" className="btn btn-secondary btn-sm"><Icon name="external" size={15} /> Voir la page</Link>
            )}
            <DeleteFormationButton id={f.id} />
          </>
        )}
      </PageHeader>

      <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: 16 }}>
        <div>
          {isPubliclyReachable ? (
            <Card style={{ marginBottom: 16, background: "var(--primary-tint)", borderColor: "var(--primary-100)" }}>
              <span className="eyebrow">Page publique active</span>
              <p style={{ fontSize: 13, color: "var(--ink-2)", margin: "8px 0 12px" }}>Chaque demande reçue depuis cette page crée ou met à jour un prospect dans votre CRM.</p>
              <Link href={`/${ctx.organizationSlug}/f/${f.publicSlug}`} target="_blank" className="btn btn-primary btn-sm"><Icon name="globe" size={15} /> Ouvrir la page publique</Link>
            </Card>
          ) : f.isPublic && f.publicSlug ? (
            <Card style={{ marginBottom: 16, background: "var(--warn-bg, #fff7ed)", borderColor: "var(--warn, #f59e0b)" }}>
              <span className="eyebrow">Page publique en attente</span>
              <p style={{ fontSize: 13, color: "var(--ink-2)", margin: "8px 0 12px" }}>
                La page publique est preparee, mais elle ne sera accessible qu'apres passage de la formation au statut <strong>Publié</strong>.
              </p>
              {canEdit && <Link href={`/formations/${f.id}/edit`} className="btn btn-secondary btn-sm"><Icon name="edit" size={15} /> Passer la formation en publié</Link>}
            </Card>
          ) : null}
          <Card style={{ marginBottom: 16 }}>
            {f.shortDescription && <p style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", marginBottom: 18, lineHeight: 1.5 }}>{f.shortDescription}</p>}
            <Field label="Objectifs pédagogiques">{f.objectives}</Field>
            <Field label="Programme">{f.program}</Field>
            <Field label="Public cible">{f.targetAudience}</Field>
            <Field label="Prérequis">{f.prerequisites}</Field>
            <Field label="Description">{f.longDescription}</Field>
            {!f.objectives && !f.program && !f.longDescription && !f.targetAudience && !f.prerequisites && (
              <p className="muted-3" style={{ fontSize: 13 }}>Aucun contenu pédagogique renseigné. {canEdit && <Link href={`/formations/${f.id}/edit`} style={{ color: "var(--primary)", fontWeight: 700 }}>Compléter</Link>}</p>
            )}
          </Card>

          {f.modules.length > 0 && (
            <Card style={{ marginBottom: 16 }}>
              <div className="spread" style={{ marginBottom: 14, gap: 10 }}>
                <h3 style={{ fontSize: 15, fontWeight: 800 }}>Modules ({f.modules.length})</h3>
                {canEdit && <Link href={`/formations/${f.id}/edit`} className="btn btn-secondary btn-sm"><Icon name="edit" size={15} /> Ajuster</Link>}
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                {f.modules.map((module, index) => (
                  <div key={module.id} style={{ padding: 12, borderRadius: 10, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                    <div className="spread" style={{ gap: 10 }}>
                      <strong style={{ fontSize: 13.5 }}>{index + 1}. {module.title}</strong>
                      <span className="muted-3" style={{ fontSize: 12 }}>
                        {module.durationDays ? `${module.durationDays} j` : module.durationHours ? `${module.durationHours} h` : "Durée non précisée"}
                      </span>
                    </div>
                    {module.description && <p className="muted-3" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 6 }}>{module.description}</p>}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                      {module.trainers.length === 0 ? (
                        <span className="badge badge-warn">Aucun formateur dédié</span>
                      ) : module.trainers.map(({ trainer }) => (
                        <span key={trainer.id} className="badge badge-neutral">{trainer.firstName} {trainer.lastName}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card>
            <div className="spread" style={{ marginBottom: 14 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800 }}>Sessions ({f.sessions.length})</h3>
              {canEdit && <Link href={`/sessions/new?formationId=${f.id}`} className="btn btn-primary btn-sm"><Icon name="plus" size={15} /> Créer une session</Link>}
            </div>
            {f.sessions.length === 0 ? (
              <p className="muted-3" style={{ fontSize: 13 }}>Aucune session programmée pour cette formation.</p>
            ) : (
              <table className="tbl">
                <thead><tr><th>Dates</th><th>Formateur</th><th>Remplissage</th><th>Statut</th></tr></thead>
                <tbody>
                  {f.sessions.map((s) => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 600 }}>{formatDateRange(s.startDate, s.endDate)}</td>
                      <td className="muted">{s.trainer ? `${s.trainer.firstName} ${s.trainer.lastName}` : <span style={{ color: "var(--warn-strong)" }}>Non assigné</span>}</td>
                      <td><FillBar value={s.capacity > 0 ? clampPct((s._count.enrollments / s.capacity) * 100) : 0} width={90} /></td>
                      <td><SessionBadge statut={s.status === "OUVERTE" && s._count.enrollments < s.breakEvenSeats && s.endDate >= now ? "RISQUE" : s.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>

        <div>
          <Card style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 14 }}>Indicateurs</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Stat label="Prix par apprenant" value={formatMoney(f.price)} />
              <Stat label="Durée" value={f.durationDays ? `${f.durationDays} jour${f.durationDays > 1 ? "s" : ""}` : f.durationHours ? `${f.durationHours} h` : "—"} />
              <Stat label="Sessions à venir" value={String(upcoming.length)} />
              <Stat label="CA prévisionnel" value={formatMoney(forecast)} />
              <div>
                <div style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 600, marginBottom: 6 }}>Remplissage moyen</div>
                {upcoming.length ? <FillBar value={avgFill} width={180} /> : <span className="muted-3" style={{ fontSize: 12.5 }}>—</span>}
              </div>
            </div>
          </Card>

          <Card style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 14 }}>Formateurs éligibles</h3>
            {f.eligibleTrainers.length === 0 ? (
              <p className="muted-3" style={{ fontSize: 13 }}>Aucun formateur associé.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {f.eligibleTrainers.map((et) => (
                  <div key={et.trainer.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar size={32} color={et.trainer.color ?? undefined}>{et.trainer.initials ?? (et.trainer.firstName[0] + et.trainer.lastName[0])}</Avatar>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{et.trainer.firstName} {et.trainer.lastName}</div>
                      <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{et.trainer.specialities.join(", ")}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <ImproveDescription formationId={f.id} canEdit={canEdit} />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="spread">
      <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{label}</span>
      <span className="tnum" style={{ fontSize: 14, fontWeight: 800 }}>{value}</span>
    </div>
  );
}
