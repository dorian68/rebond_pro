"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import type { Milestone, MilestonePriority, MilestoneStatus, RoadmapStats } from "@/server/roadmap";
import {
  createMilestone,
  updateMilestone,
  deleteMilestone,
  setMilestoneStatus,
  moveMilestone,
  type RoadmapActionResult,
} from "@/server/roadmap-actions";

const STATUS_META: Record<MilestoneStatus, { label: string; badge: string; icon: string; accent: string }> = {
  planned: { label: "À planifier", badge: "badge-neutral", icon: "circle", accent: "var(--border)" },
  in_progress: { label: "En cours", badge: "badge-primary", icon: "play", accent: "var(--primary)" },
  blocked: { label: "Bloqué", badge: "badge-danger", icon: "alert-circle", accent: "var(--danger)" },
  done: { label: "Terminé", badge: "badge-positive", icon: "check-circle", accent: "var(--success)" },
};

const PRIORITY_META: Record<MilestonePriority, { label: string; badge: string }> = {
  low: { label: "Basse", badge: "badge-neutral" },
  medium: { label: "Moyenne", badge: "badge-warn" },
  high: { label: "Haute", badge: "badge-danger" },
};

const STATUS_OPTIONS: MilestoneStatus[] = ["planned", "in_progress", "blocked", "done"];
const PRIORITY_OPTIONS: MilestonePriority[] = ["low", "medium", "high"];

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function isOverdue(m: Milestone) {
  return m.status !== "done" && m.deadline !== null && new Date(m.deadline) < startOfToday();
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export function RoadmapClient({ milestones, stats }: { milestones: Milestone[]; stats: RoadmapStats }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Milestone | "new" | null>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<RoadmapActionResult>) {
    setError(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error ?? "Action impossible.");
      else router.refresh();
    });
  }

  function handleDelete(m: Milestone) {
    if (!confirm(`Supprimer le jalon « ${m.title} » ? Cette action est définitive.`)) return;
    run(() => deleteMilestone(m.id));
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <StatsBar stats={stats} />

      <div className="spread" style={{ alignItems: "center" }}>
        <p className="muted-3" style={{ fontSize: 13 }}>
          {stats.total === 0 ? "Aucun jalon pour le moment." : `${stats.total} jalon${stats.total > 1 ? "s" : ""} · partagé${stats.total > 1 ? "s" : ""} avec tous les administrateurs.`}
        </p>
        {editing === null && (
          <button className="btn btn-primary" onClick={() => { setError(null); setEditing("new"); }}>
            <Icon name="plus" size={16} /> Ajouter un jalon
          </button>
        )}
      </div>

      {error && <Card style={{ borderColor: "var(--danger-border)" }}><span style={{ color: "var(--danger)", fontSize: 13 }}>{error}</span></Card>}

      {editing !== null && (
        <MilestoneForm
          milestone={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); router.refresh(); }}
        />
      )}

      {milestones.length === 0 && editing === null ? (
        <Card style={{ textAlign: "center", padding: "40px 20px" }}>
          <Icon name="target" size={28} style={{ color: "var(--ink-3)" }} />
          <h3 style={{ fontWeight: 700, fontSize: 15, marginTop: 12 }}>Construisez votre première roadmap</h3>
          <p className="muted-3" style={{ fontSize: 13, marginTop: 6, maxWidth: 460, marginInline: "auto" }}>
            Ajoutez des jalons avec un statut, une échéance, un responsable et un contact. Tout est partagé en direct avec vos associés administrateurs.
          </p>
        </Card>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {milestones.map((m, index) => (
            <MilestoneCard
              key={m.id}
              milestone={m}
              isFirst={index === 0}
              isLast={index === milestones.length - 1}
              busy={pending}
              onEdit={() => { setError(null); setEditing(m); }}
              onDelete={() => handleDelete(m)}
              onStatus={(status) => run(() => setMilestoneStatus(m.id, status))}
              onMove={(dir) => run(() => moveMilestone(m.id, dir))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StatsBar({ stats }: { stats: RoadmapStats }) {
  const tiles: { label: string; value: string | number; tone?: "danger" | "primary" | "success" }[] = [
    { label: "Total", value: stats.total },
    { label: "En cours", value: stats.inProgress, tone: "primary" },
    { label: "Bloqués", value: stats.blocked, tone: stats.blocked > 0 ? "danger" : undefined },
    { label: "Terminés", value: stats.done, tone: "success" },
    { label: "En retard", value: stats.overdue, tone: stats.overdue > 0 ? "danger" : undefined },
    { label: "Avancement moyen", value: `${stats.avgProgress}%` },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 10 }}>
      {tiles.map((t) => (
        <div key={t.label} style={{
          border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px",
          background: t.tone === "danger" ? "var(--danger-bg)" : t.tone === "primary" ? "var(--primary-50)" : "var(--surface)",
        }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: t.tone === "danger" ? "var(--danger)" : t.tone === "success" ? "var(--success)" : "var(--ink)" }}>{t.value}</div>
          <div className="muted" style={{ fontSize: 12 }}>{t.label}</div>
        </div>
      ))}
    </div>
  );
}

function MilestoneCard({ milestone: m, isFirst, isLast, busy, onEdit, onDelete, onStatus, onMove }: {
  milestone: Milestone;
  isFirst: boolean;
  isLast: boolean;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onStatus: (status: MilestoneStatus) => void;
  onMove: (dir: "up" | "down") => void;
}) {
  const meta = STATUS_META[m.status];
  const overdue = isOverdue(m);
  const progress = m.status === "done" ? 100 : m.progress;

  return (
    <Card style={{ borderLeft: `3px solid ${meta.accent}` }}>
      <div className="spread" style={{ alignItems: "flex-start", gap: 16 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
            <Icon name={meta.icon} size={16} style={{ color: meta.accent, flexShrink: 0 }} />
            <h3 style={{ fontWeight: 750, fontSize: 15.5 }}>{m.title}</h3>
            {m.category && <span className="badge badge-neutral">{m.category}</span>}
            <span className={"badge " + meta.badge}>{meta.label}</span>
            <span className={"badge " + PRIORITY_META[m.priority].badge}>Priorité {PRIORITY_META[m.priority].label.toLowerCase()}</span>
          </div>

          {m.description && <p className="muted-3" style={{ fontSize: 13, lineHeight: 1.55, marginBottom: 10, whiteSpace: "pre-wrap" }}>{m.description}</p>}

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, maxWidth: 420 }}>
            <div style={{ flex: 1, height: 7, borderRadius: 99, background: "var(--surface-3)", overflow: "hidden" }}>
              <div style={{ width: `${progress}%`, height: "100%", background: meta.accent, transition: "width .2s" }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)", minWidth: 34, textAlign: "right" }}>{progress}%</span>
          </div>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12.5, color: "var(--ink-3)" }}>
            {m.deadline && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: overdue ? "var(--danger)" : "var(--ink-3)", fontWeight: overdue ? 700 : 500 }}>
                <Icon name="calendar" size={13} /> {formatDate(m.deadline)}{overdue ? " · en retard" : ""}
              </span>
            )}
            {m.ownerName && <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="user" size={13} /> {m.ownerName}</span>}
            {m.contactName && <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="user-check" size={13} /> {m.contactName}</span>}
            {m.contactEmail && <a href={`mailto:${m.contactEmail}`} style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--primary)" }}><Icon name="mail" size={13} /> {m.contactEmail}</a>}
            {m.contactPhone && <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="phone" size={13} /> {m.contactPhone}</span>}
            {m.link && <a href={m.link} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--primary)" }}><Icon name="external" size={13} /> Ressource</a>}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
          <select
            className="input"
            value={m.status}
            disabled={busy}
            onChange={(e) => onStatus(e.target.value as MilestoneStatus)}
            style={{ width: 150, height: 34, fontSize: 13 }}
            title="Changer le statut"
          >
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
          </select>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn btn-ghost btn-icon" style={{ width: 32, height: 32 }} disabled={busy || isFirst} onClick={() => onMove("up")} title="Monter"><Icon name="chevron-up" size={15} /></button>
            <button className="btn btn-ghost btn-icon" style={{ width: 32, height: 32 }} disabled={busy || isLast} onClick={() => onMove("down")} title="Descendre"><Icon name="chevron-down" size={15} /></button>
            <button className="btn btn-ghost btn-icon" style={{ width: 32, height: 32 }} disabled={busy} onClick={onEdit} title="Modifier"><Icon name="edit" size={15} /></button>
            <button className="btn btn-danger btn-icon" style={{ width: 32, height: 32 }} disabled={busy} onClick={onDelete} title="Supprimer"><Icon name="trash-2" size={15} /></button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function MilestoneForm({ milestone, onClose, onSaved }: { milestone: Milestone | null; onClose: () => void; onSaved: () => void }) {
  const action = milestone ? updateMilestone.bind(null, milestone.id) : createMilestone;
  const [state, formAction, pending] = useActionState<RoadmapActionResult | undefined, FormData>(action, undefined);

  useEffect(() => {
    if (state?.ok) onSaved();
  }, [state, onSaved]);

  return (
    <Card style={{ borderColor: "var(--primary)", background: "var(--primary-50)" }}>
      <h3 style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>{milestone ? "Modifier le jalon" : "Nouveau jalon"}</h3>
      <form action={formAction} style={{ display: "grid", gap: 14 }}>
        <Field label="Titre du jalon *" name="title" defaultValue={milestone?.title} placeholder="Ex : Lancer la marketplace publique" required />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
          <Field label="Catégorie" name="category" defaultValue={milestone?.category ?? ""} placeholder="Produit, Tech, Commercial…" />
          <Select label="Statut" name="status" defaultValue={milestone?.status ?? "planned"} options={STATUS_OPTIONS.map((s) => ({ value: s, label: STATUS_META[s].label }))} />
          <Select label="Priorité" name="priority" defaultValue={milestone?.priority ?? "medium"} options={PRIORITY_OPTIONS.map((p) => ({ value: p, label: PRIORITY_META[p].label }))} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Avancement (%)" name="progress" type="number" defaultValue={String(milestone?.progress ?? 0)} placeholder="0" />
          <Field label="Échéance" name="deadline" type="date" defaultValue={milestone?.deadline ?? ""} />
        </div>

        <Field label="Responsable" name="ownerName" defaultValue={milestone?.ownerName ?? ""} placeholder="Qui pilote ce jalon ?" />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
          <Field label="Contact — nom" name="contactName" defaultValue={milestone?.contactName ?? ""} placeholder="Personne à contacter" />
          <Field label="Contact — email" name="contactEmail" type="email" defaultValue={milestone?.contactEmail ?? ""} placeholder="prenom@email.fr" />
          <Field label="Contact — téléphone" name="contactPhone" defaultValue={milestone?.contactPhone ?? ""} placeholder="06 12 34 56 78" />
        </div>

        <Field label="Lien (doc, ticket, ressource)" name="link" defaultValue={milestone?.link ?? ""} placeholder="https://…" />
        <Field label="Description / notes" name="description" defaultValue={milestone?.description ?? ""} textarea placeholder="Contexte, dépendances, critères de réussite…" />

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Enregistrement…" : milestone ? "Enregistrer les modifications" : "Créer le jalon"}</button>
          <button type="button" className="btn btn-secondary" disabled={pending} onClick={onClose}>Annuler</button>
          {state && !state.ok && <span style={{ color: "var(--danger)", fontSize: 13 }}>{state.error}</span>}
        </div>
      </form>
    </Card>
  );
}

function Field({ label, name, defaultValue, placeholder, type = "text", textarea, required }: {
  label: string; name: string; defaultValue?: string; placeholder?: string; type?: string; textarea?: boolean; required?: boolean;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      {textarea ? (
        <textarea name={name} className="input" rows={3} defaultValue={defaultValue} placeholder={placeholder} style={{ resize: "vertical" }} />
      ) : (
        <input name={name} type={type} className="input" defaultValue={defaultValue} placeholder={placeholder} required={required} {...(type === "number" ? { min: 0, max: 100, step: 1 } : {})} />
      )}
    </div>
  );
}

function Select({ label, name, defaultValue, options }: { label: string; name: string; defaultValue: string; options: { value: string; label: string }[] }) {
  return (
    <div>
      <label className="label">{label}</label>
      <select name={name} className="input" defaultValue={defaultValue} style={{ height: 44 }}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
