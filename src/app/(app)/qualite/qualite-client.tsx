"use client";

import { useActionState, useTransition, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import {
  createComplaint, updateComplaintStatus,
  createImprovementAction, updateImprovementStatus,
  createFeedback,
} from "@/server/qualite-actions";
import { synthesizeFeedbacks, type AiText } from "@/server/ai-actions";
import type { QualityMetrics } from "@/server/qualite";

// ── Étoiles ──────────────────────────────────────────────────────
function Stars({ rating }: { rating: number }) {
  return (
    <span style={{ display: "flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Icon key={s} name="star" size={13} style={{ color: s <= rating ? "#f5a623" : "var(--border-strong)", fill: s <= rating ? "#f5a623" : "none" }} />
      ))}
    </span>
  );
}

// ── Formulaire Réclamation ────────────────────────────────────────
function ComplaintForm({ onDone }: { onDone: () => void }) {
  const [state, action, pending] = useActionState(createComplaint, undefined);
  if (state?.ok) { onDone(); return null; }
  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {state?.error && <div className="alert alert-danger" style={{ padding: "8px 12px", borderRadius: 8, fontSize: 13 }}>{state.error}</div>}
      <input name="subject" required className="input" placeholder="Sujet *" />
      <textarea name="description" className="input" placeholder="Description (optionnel)" rows={3} style={{ resize: "vertical" }} />
      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" disabled={pending} className="btn btn-primary btn-sm">{pending ? "…" : "Ajouter"}</button>
        <button type="button" onClick={onDone} className="btn btn-secondary btn-sm">Annuler</button>
      </div>
    </form>
  );
}

// ── Formulaire Action corrective ──────────────────────────────────
function ActionForm({ onDone }: { onDone: () => void }) {
  const [state, action, pending] = useActionState(createImprovementAction, undefined);
  if (state?.ok) { onDone(); return null; }
  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {state?.error && <div style={{ padding: "8px 12px", background: "var(--danger-bg)", borderRadius: 8, fontSize: 13, color: "var(--danger-strong)" }}>{state.error}</div>}
      <input name="title" required className="input" placeholder="Titre de l'action *" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <input name="owner" className="input" placeholder="Responsable" />
        <input name="dueDate" type="date" className="input" />
      </div>
      <textarea name="description" className="input" placeholder="Description (optionnel)" rows={2} style={{ resize: "vertical" }} />
      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" disabled={pending} className="btn btn-primary btn-sm">{pending ? "…" : "Ajouter"}</button>
        <button type="button" onClick={onDone} className="btn btn-secondary btn-sm">Annuler</button>
      </div>
    </form>
  );
}

// ── Formulaire Retour apprenant ───────────────────────────────────
function FeedbackForm({ onDone }: { onDone: () => void }) {
  const [state, action, pending] = useActionState(createFeedback, undefined);
  if (state?.ok) { onDone(); return null; }
  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {state?.error && <div style={{ padding: "8px 12px", background: "var(--danger-bg)", borderRadius: 8, fontSize: 13, color: "var(--danger-strong)" }}>{state.error}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <input name="formationTitle" className="input" placeholder="Formation concernée" />
        <select name="rating" className="select">
          {[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{r} étoile{r > 1 ? "s" : ""}</option>)}
        </select>
      </div>
      <textarea name="comment" className="input" placeholder="Commentaire (optionnel)" rows={2} style={{ resize: "vertical" }} />
      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" disabled={pending} className="btn btn-primary btn-sm">{pending ? "…" : "Ajouter"}</button>
        <button type="button" onClick={onDone} className="btn btn-secondary btn-sm">Annuler</button>
      </div>
    </form>
  );
}

// ── Synthèse IA ───────────────────────────────────────────────────
function AiSynthesis({ hasFeedbacks }: { hasFeedbacks: boolean }) {
  const [result, setResult] = useState<AiText | null>(null);
  const [pending, start] = useTransition();

  const run = () => start(async () => { setResult(await synthesizeFeedbacks()); });

  return (
    <div className="card" style={{ background: "linear-gradient(135deg,#f6f5fe,#ffffff)", border: "1px solid var(--primary-100)", padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: "linear-gradient(135deg,#6a5cf0,#5850ec)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
          <Icon name="sparkles" size={18} />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14 }}>Synthèse IA des retours</div>
          <div style={{ fontSize: 12, color: "var(--ink-3)" }}>Points forts, points faibles et actions suggérées.</div>
        </div>
      </div>
      {result ? (
        <p style={{ fontSize: 13.5, lineHeight: 1.6, whiteSpace: "pre-wrap", color: "var(--ink-2)" }}>{result.text}</p>
      ) : (
        <p className="muted-3" style={{ fontSize: 13 }}>{hasFeedbacks ? "Cliquez pour générer une synthèse intelligente de vos retours apprenants." : "Ajoutez des retours apprenants pour activer cette fonctionnalité."}</p>
      )}
      <button onClick={run} disabled={pending || !hasFeedbacks} className="btn btn-ai btn-sm" style={{ marginTop: 12 }}>
        <Icon name="sparkles" size={15} /> {pending ? "Génération…" : result ? "Régénérer" : "Synthétiser les retours"}
      </button>
    </div>
  );
}

// ── Section Réclamations ──────────────────────────────────────────
function ComplaintsSection({ complaints }: { complaints: QualityMetrics["complaints"] }) {
  const [showForm, setShowForm] = useState(false);
  const [pending, start] = useTransition();

  const STATUS_LABELS: Record<string, string> = { OUVERTE: "Ouverte", EN_COURS: "En cours", RESOLUE: "Résolue" };
  const STATUS_NEXT: Record<string, "OUVERTE" | "EN_COURS" | "RESOLUE"> = { OUVERTE: "EN_COURS", EN_COURS: "RESOLUE", RESOLUE: "OUVERTE" };
  const STATUS_COLOR: Record<string, string> = { OUVERTE: "badge-danger", EN_COURS: "badge-warn", RESOLUE: "badge-positive" };

  return (
    <div className="card card-pad">
      <div className="spread" style={{ marginBottom: 14 }}>
        <h3 style={{ fontSize: 15.5, fontWeight: 800 }}>Réclamations</h3>
        <button onClick={() => setShowForm((v) => !v)} className="btn btn-secondary btn-sm"><Icon name="plus" size={15} /> Nouvelle</button>
      </div>
      {showForm && <div style={{ marginBottom: 14 }}><ComplaintForm onDone={() => setShowForm(false)} /></div>}
      {complaints.length === 0 && !showForm && (
        <p className="muted-3" style={{ fontSize: 13 }}>Aucune réclamation enregistrée.</p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {complaints.map((c) => (
          <div key={c.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 12px", borderRadius: 10, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{c.subject}</div>
              {c.description && <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 3 }}>{c.description}</div>}
              <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 4 }}>{new Date(c.createdAt).toLocaleDateString("fr-FR")}</div>
            </div>
            <button
              onClick={() => start(async () => { await updateComplaintStatus(c.id, STATUS_NEXT[c.status]); })}
              disabled={pending}
              className={`badge ${STATUS_COLOR[c.status]}`}
              style={{ cursor: "pointer", border: "none" }}
            >
              <span className="dot" />{STATUS_LABELS[c.status]}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Section Actions correctives ───────────────────────────────────
function ActionsSection({ actions }: { actions: QualityMetrics["improvementActions"] }) {
  const [showForm, setShowForm] = useState(false);
  const [pending, start] = useTransition();

  const STATUS_LABELS: Record<string, string> = { OUVERTE: "Ouverte", EN_COURS: "En cours", FERMEE: "Fermée" };
  const STATUS_NEXT: Record<string, "OUVERTE" | "EN_COURS" | "FERMEE"> = { OUVERTE: "EN_COURS", EN_COURS: "FERMEE", FERMEE: "OUVERTE" };
  const STATUS_COLOR: Record<string, string> = { OUVERTE: "badge-danger", EN_COURS: "badge-warn", FERMEE: "badge-positive" };

  return (
    <div className="card card-pad">
      <div className="spread" style={{ marginBottom: 14 }}>
        <h3 style={{ fontSize: 15.5, fontWeight: 800 }}>Actions correctives</h3>
        <button onClick={() => setShowForm((v) => !v)} className="btn btn-secondary btn-sm"><Icon name="plus" size={15} /> Nouvelle</button>
      </div>
      {showForm && <div style={{ marginBottom: 14 }}><ActionForm onDone={() => setShowForm(false)} /></div>}
      {actions.length === 0 && !showForm && (
        <p className="muted-3" style={{ fontSize: 13 }}>Aucune action corrective enregistrée.</p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {actions.map((a) => (
          <div key={a.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 12px", borderRadius: 10, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{a.title}</div>
              {a.description && <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 3 }}>{a.description}</div>}
              <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 4, display: "flex", gap: 10 }}>
                {a.owner && <span>Resp. : {a.owner}</span>}
                {a.dueDate && <span>Échéance : {new Date(a.dueDate).toLocaleDateString("fr-FR")}</span>}
              </div>
            </div>
            <button
              onClick={() => start(async () => { await updateImprovementStatus(a.id, STATUS_NEXT[a.status]); })}
              disabled={pending}
              className={`badge ${STATUS_COLOR[a.status]}`}
              style={{ cursor: "pointer", border: "none" }}
            >
              <span className="dot" />{STATUS_LABELS[a.status]}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Section Retours apprenants ────────────────────────────────────
function FeedbacksSection({ feedbacks }: { feedbacks: QualityMetrics["feedbacks"] }) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="card card-pad">
      <div className="spread" style={{ marginBottom: 14 }}>
        <h3 style={{ fontSize: 15.5, fontWeight: 800 }}>Retours apprenants</h3>
        <button onClick={() => setShowForm((v) => !v)} className="btn btn-secondary btn-sm"><Icon name="plus" size={15} /> Ajouter</button>
      </div>
      {showForm && <div style={{ marginBottom: 14 }}><FeedbackForm onDone={() => setShowForm(false)} /></div>}
      {feedbacks.length === 0 && !showForm && (
        <p className="muted-3" style={{ fontSize: 13 }}>Aucun retour enregistré. Les retours issus des questionnaires de satisfaction apparaîtront ici.</p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {feedbacks.slice(0, 10).map((f) => (
          <div key={f.id} style={{ display: "flex", gap: 12, padding: "10px 12px", borderRadius: 10, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
            <div style={{ flex: 1 }}>
              {f.formationTitle && <div style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)", marginBottom: 3 }}>{f.formationTitle}</div>}
              {f.comment && <div style={{ fontSize: 13, color: "var(--ink-2)" }}>{f.comment}</div>}
              <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 4 }}>{new Date(f.createdAt).toLocaleDateString("fr-FR")}</div>
            </div>
            <Stars rating={f.rating} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────
export function QualiteClient({ metrics }: { metrics: QualityMetrics }) {
  return (
    <div>
      <AiSynthesis hasFeedbacks={metrics.feedbacks.length > 0} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
        <ComplaintsSection complaints={metrics.complaints} />
        <ActionsSection actions={metrics.improvementActions} />
      </div>
      <div style={{ marginTop: 16 }}>
        <FeedbacksSection feedbacks={metrics.feedbacks} />
      </div>
    </div>
  );
}
