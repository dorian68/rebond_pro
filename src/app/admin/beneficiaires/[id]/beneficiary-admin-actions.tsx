"use client";

import { useMemo, useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { transferBeneficiaryToCenter, updatePlatformBeneficiaryStatus, updatePlatformBilanStep, savePlatformBilanArtifact } from "@/server/platform-beneficiary-actions";
import type { FormActionState } from "@/server/formations-actions";
import type { BilanWorkspace } from "@/lib/bilan-workspaces";

export function PlatformBeneficiaryStatus({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <select
      className="select"
      style={{ width: 170 }}
      disabled={pending}
      value={status}
      onChange={(e) => start(async () => {
        await updatePlatformBeneficiaryStatus(id, e.target.value as "active" | "completed" | "archived");
        router.refresh();
      })}
    >
      <option value="active">En cours</option>
      <option value="completed">Terminé</option>
      <option value="archived">Archivé</option>
    </select>
  );
}

export function TransferBeneficiaryForm({
  beneficiaryId,
  centers,
}: {
  beneficiaryId: string;
  centers: { id: string; name: string; city: string | null }[];
}) {
  const transfer = transferBeneficiaryToCenter.bind(null, beneficiaryId);
  const [state, action, pending] = useActionState<FormActionState, FormData>(transfer, undefined);
  const router = useRouter();

  return (
    <form action={async (formData) => {
      await action(formData);
      router.refresh();
    }} style={{ display: "grid", gap: 10 }}>
      <select className="select" name="targetOrganizationId" required defaultValue="">
        <option value="" disabled>Choisir un centre cible</option>
        {centers.map((center) => <option key={center.id} value={center.id}>{center.name}{center.city ? ` · ${center.city}` : ""}</option>)}
      </select>
      <p className="muted-3" style={{ fontSize: 12.5, lineHeight: 1.5 }}>
        Transfère le dossier bilan, ajuste l'accès bénéficiaire et crée/met à jour un prospect chaud dans le centre cible.
      </p>
      {state?.ok && <div className="badge badge-positive" style={{ height: "auto", padding: "8px 10px" }}>Dossier transféré.</div>}
      {state?.error && <div className="badge badge-danger" style={{ height: "auto", padding: "8px 10px", whiteSpace: "normal" }}>{state.error}</div>}
      <button type="submit" className="btn btn-primary" disabled={pending}>
        <Icon name="arrow-right" size={15} /> {pending ? "Transfert…" : "Migrer vers ce centre"}
      </button>
    </form>
  );
}

export function BilanStepEditor({
  beneficiaryId,
  step,
}: {
  beneficiaryId: string;
  step: { id: string; status: string; notes: string | null };
}) {
  const [state, action, pending] = useActionState<FormActionState, FormData>(updatePlatformBilanStep, undefined);
  const router = useRouter();
  return (
    <form action={async (formData) => {
      await action(formData);
      router.refresh();
    }} style={{ display: "grid", gap: 10 }}>
      <input type="hidden" name="beneficiaryId" value={beneficiaryId} />
      <input type="hidden" name="stepId" value={step.id} />
      <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 10 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span className="field-label">Statut</span>
          <select className="select" name="status" defaultValue={step.status}>
            <option value="todo">À faire</option>
            <option value="in_progress">En cours</option>
            <option value="done">Terminé</option>
          </select>
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span className="field-label">Notes conseiller / dossier</span>
          <textarea className="input" name="notes" rows={4} defaultValue={step.notes ?? ""} placeholder="Constats, décisions, éléments partageables, points à revoir..." />
        </label>
      </div>
      {state?.ok && <span style={{ color: "var(--success)", fontSize: 13 }}>Étape enregistrée.</span>}
      {state?.error && <span style={{ color: "var(--danger)", fontSize: 13 }}>{state.error}</span>}
      <button type="submit" className="btn btn-primary" disabled={pending} style={{ justifySelf: "end" }}>
        <Icon name="check" size={15} /> {pending ? "Enregistrement…" : "Enregistrer la page"}
      </button>
    </form>
  );
}

type ArtifactPayload = {
  id: string;
  status: string;
  shareable: boolean;
  content: unknown;
} | null;

function parseInitialContent(artifact: ArtifactPayload): Record<string, unknown> {
  if (!artifact || typeof artifact.content !== "object" || artifact.content === null) return {};
  return artifact.content as Record<string, unknown>;
}

function summarizeWorkspace(workspace: BilanWorkspace, values: Record<string, unknown>) {
  const lines = [`${workspace.title}::`];
  for (const section of workspace.sections) {
    lines.push("", section.title);
    for (const field of section.fields) {
      const raw = values[field.name];
      const value = Array.isArray(raw) ? raw.join(", ") : String(raw ?? "").trim();
      if (value) lines.push(`- ${field.label}: ${value}`);
    }
  }
  return lines.join("\n").slice(0, 8000);
}

export function BilanWorkspaceEditor({
  beneficiaryId,
  step,
  workspace,
  artifact,
}: {
  beneficiaryId: string;
  step: { id: string; status: string };
  workspace: BilanWorkspace;
  artifact: ArtifactPayload;
}) {
  const initial = parseInitialContent(artifact);
  const [values, setValues] = useState<Record<string, unknown>>(initial);
  const [status, setStatus] = useState(artifact?.status ?? "draft");
  const [shareable, setShareable] = useState(artifact?.shareable ?? false);
  const [state, action, pending] = useActionState<FormActionState, FormData>(savePlatformBilanArtifact, undefined);
  const router = useRouter();

  const notes = useMemo(() => summarizeWorkspace(workspace, values), [values, workspace]);
  const filled = useMemo(() => Object.values(values).filter((value) => Array.isArray(value) ? value.length > 0 : String(value ?? "").trim().length > 0).length, [values]);
  const total = workspace.sections.reduce((sum, section) => sum + section.fields.length, 0);
  const percent = total ? Math.round((filled / total) * 100) : 0;

  function toggle(name: string, option: string) {
    setValues((current) => {
      const items = Array.isArray(current[name]) ? current[name] as string[] : [];
      return { ...current, [name]: items.includes(option) ? items.filter((item) => item !== option) : [...items, option] };
    });
  }

  function setValue(name: string, value: unknown) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  return (
    <form action={async (formData) => {
      await action(formData);
      router.refresh();
    }} style={{ display: "grid", gap: 14 }}>
      <input type="hidden" name="beneficiaryId" value={beneficiaryId} />
      <input type="hidden" name="stepId" value={step.id} />
      <input type="hidden" name="key" value={workspace.key} />
      <input type="hidden" name="kind" value={workspace.kind} />
      <input type="hidden" name="title" value={workspace.title} />
      <input type="hidden" name="content" value={JSON.stringify({ ...values, progress: percent, updatedAt: new Date().toISOString() })} />
      <input type="hidden" name="notes" value={notes} />
      <input type="hidden" name="shareable" value={shareable ? "true" : "false"} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 14, alignItems: "start", padding: 14, border: "1px solid var(--border)", borderRadius: 14, background: "linear-gradient(180deg,#fff,#f8fafc)" }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 850 }}>{workspace.title}</h3>
          <p className="muted" style={{ fontSize: 13, lineHeight: 1.55 }}>{workspace.promise}</p>
        </div>
        <div style={{ display: "grid", gap: 8, minWidth: 150 }}>
          <span className="badge badge-primary" style={{ justifySelf: "end" }}>{percent}% documenté</span>
          <div style={{ height: 7, borderRadius: 999, background: "var(--surface-3)", overflow: "hidden" }}>
            <div style={{ width: `${percent}%`, height: "100%", background: "linear-gradient(90deg,#2f9488,#2469a6)" }} />
          </div>
        </div>
      </div>

      {workspace.sections.map((section) => (
        <section key={section.title} style={{ border: "1px solid var(--border)", borderRadius: 14, padding: 14, background: "#fff" }}>
          <div style={{ marginBottom: 12 }}>
            <h4 style={{ fontSize: 14.5, fontWeight: 850 }}>{section.title}</h4>
            <p className="muted-3" style={{ fontSize: 12.5 }}>{section.intent}</p>
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            {section.fields.map((field) => {
              if (field.type === "chips") {
                const selected = Array.isArray(values[field.name]) ? values[field.name] as string[] : [];
                return (
                  <div key={field.name} style={{ display: "grid", gap: 8 }}>
                    <span className="field-label">{field.label}</span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {field.options.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => toggle(field.name, option)}
                          style={{
                            border: selected.includes(option) ? "1px solid #2469a6" : "1px solid var(--border-2)",
                            background: selected.includes(option) ? "rgba(36,105,166,.1)" : "var(--surface-2)",
                            color: selected.includes(option) ? "#174d80" : "var(--ink-2)",
                            borderRadius: 999,
                            padding: "8px 11px",
                            fontSize: 12.5,
                            fontWeight: 750,
                          }}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              }
              if (field.type === "scale") {
                const value = Number(values[field.name] ?? 3);
                return (
                  <label key={field.name} style={{ display: "grid", gap: 7 }}>
                    <span className="field-label">{field.label} : {value}/5</span>
                    <input type="range" min={1} max={5} value={value} onChange={(event) => setValue(field.name, Number(event.target.value))} />
                    <div className="spread muted-3" style={{ fontSize: 11.5 }}><span>{field.minLabel}</span><span>{field.maxLabel}</span></div>
                  </label>
                );
              }
              if (field.type === "textarea") {
                return (
                  <label key={field.name} style={{ display: "grid", gap: 7 }}>
                    <span className="field-label">{field.label}</span>
                    <textarea className="input" rows={field.rows ?? 3} value={String(values[field.name] ?? "")} onChange={(event) => setValue(field.name, event.target.value)} placeholder={field.placeholder} />
                  </label>
                );
              }
              return (
                <label key={field.name} style={{ display: "grid", gap: 7 }}>
                  <span className="field-label">{field.label}</span>
                  <input className="input" value={String(values[field.name] ?? "")} onChange={(event) => setValue(field.name, event.target.value)} placeholder={field.placeholder} />
                </label>
              );
            })}
          </div>
        </section>
      ))}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 170px 160px", gap: 10, alignItems: "end" }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span className="field-label">Statut dossier</span>
          <select className="select" name="status" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="draft">Brouillon</option>
            <option value="validated">Validé conseiller</option>
            <option value="shareable">Partageable</option>
            <option value="archived">Archivé</option>
          </select>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 12px", border: "1px solid var(--border)", borderRadius: 10 }}>
          <input type="checkbox" checked={shareable} onChange={(event) => setShareable(event.target.checked)} />
          <span style={{ fontSize: 12.5, fontWeight: 750 }}>Partager</span>
        </label>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          <Icon name="check" size={15} /> {pending ? "Sauvegarde…" : "Sauvegarder"}
        </button>
      </div>

      <div style={{ padding: 12, borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
        <div style={{ fontSize: 12, fontWeight: 850, marginBottom: 6 }}>Synthèse automatique</div>
        <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.5 }}>{notes.replace(`${workspace.title}::\n`, "")}</pre>
      </div>

      {state?.ok && <span style={{ color: "var(--success)", fontSize: 13 }}>Bloc de dossier enregistré.</span>}
      {state?.error && <span style={{ color: "var(--danger)", fontSize: 13 }}>{state.error}</span>}
    </form>
  );
}

const COMPETENCE_CARDS = [
  "Analyser une situation",
  "Communiquer clairement",
  "Organiser un projet",
  "Former ou transmettre",
  "Écouter et reformuler",
  "Gérer une relation client",
  "Résoudre un problème",
  "Coordonner une équipe",
  "Utiliser des outils numériques",
  "Sécuriser un processus",
  "Vendre ou convaincre",
  "Rédiger et synthétiser",
];

export function CompetenceCanvasEditor({
  beneficiaryId,
  step,
  artifact,
}: {
  beneficiaryId: string;
  step: { id: string; status: string; notes: string | null };
  artifact: ArtifactPayload;
}) {
  const initial = parseInitialContent(artifact);
  const [selected, setSelected] = useState<string[]>(Array.isArray(initial.selected) ? initial.selected as string[] : []);
  const [proofs, setProofs] = useState(String(initial.proofs ?? ""));
  const [energy, setEnergy] = useState(Number(initial.energy ?? 3));
  const [mastery, setMastery] = useState(Number(initial.mastery ?? 3));
  const [state, action, pending] = useActionState<FormActionState, FormData>(savePlatformBilanArtifact, undefined);
  const router = useRouter();
  const synthesizedNotes = useMemo(() => {
    const lines = [
      "CARTOGRAPHIE_COMPETENCES::",
      `Compétences repérées: ${selected.length ? selected.join(", ") : "à compléter"}`,
      `Niveau de maîtrise perçu: ${mastery}/5`,
      `Énergie associée: ${energy}/5`,
      proofs ? `Preuves / situations réelles:\n${proofs}` : "Preuves / situations réelles: à documenter",
      "",
      "Lecture conseiller:",
      mastery >= 4 && energy >= 4 ? "- Zone forte à transformer en piste métier ou formation courte." : "- Zone à approfondir en entretien.",
      selected.length >= 4 ? "- Matière suffisante pour identifier des compétences transférables." : "- Ajouter des exemples vécus avant conclusion.",
    ];
    return lines.join("\n");
  }, [energy, mastery, proofs, selected]);

  function toggle(card: string) {
    setSelected((current) => current.includes(card) ? current.filter((item) => item !== card) : [...current, card]);
  }

  return (
    <form action={async (formData) => {
      await action(formData);
      router.refresh();
    }} style={{ display: "grid", gap: 14 }}>
      <input type="hidden" name="beneficiaryId" value={beneficiaryId} />
      <input type="hidden" name="stepId" value={step.id} />
      <input type="hidden" name="key" value="competence-map" />
      <input type="hidden" name="kind" value="competence_canvas" />
      <input type="hidden" name="title" value="Cartographie compétences et talents" />
      <input type="hidden" name="status" value={selected.length > 0 || proofs ? "validated" : "draft"} />
      <input type="hidden" name="content" value={JSON.stringify({ selected, proofs, energy, mastery, updatedAt: new Date().toISOString() })} />
      <input type="hidden" name="notes" value={synthesizedNotes} />
      <input type="hidden" name="shareable" value="true" />

      <div style={{ border: "1px solid var(--border)", borderRadius: 14, padding: 14, background: "linear-gradient(180deg,#fff,#f8fafc)" }}>
        <div className="spread" style={{ gap: 12, marginBottom: 12 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 850 }}>Atelier compétences transférables</h3>
            <p className="muted-3" style={{ fontSize: 12.5 }}>Sélectionnez les cartes observées, puis rattachez-les à des preuves concrètes.</p>
          </div>
          <span className="badge badge-primary">{selected.length} carte{selected.length > 1 ? "s" : ""}</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {COMPETENCE_CARDS.map((card) => {
            const active = selected.includes(card);
            return (
              <button
                key={card}
                type="button"
                onClick={() => toggle(card)}
                style={{
                  border: active ? "1px solid #2469a6" : "1px solid var(--border-2)",
                  background: active ? "rgba(36,105,166,.1)" : "#fff",
                  color: active ? "#174d80" : "var(--ink-2)",
                  borderRadius: 999,
                  padding: "8px 11px",
                  fontSize: 12.5,
                  fontWeight: 750,
                }}
              >
                {card}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label style={{ display: "grid", gap: 8, padding: 14, border: "1px solid var(--border)", borderRadius: 12 }}>
          <span className="field-label">Maîtrise perçue : {mastery}/5</span>
          <input type="range" min={1} max={5} value={mastery} onChange={(event) => setMastery(Number(event.target.value))} />
        </label>
        <label style={{ display: "grid", gap: 8, padding: 14, border: "1px solid var(--border)", borderRadius: 12 }}>
          <span className="field-label">Énergie / envie : {energy}/5</span>
          <input type="range" min={1} max={5} value={energy} onChange={(event) => setEnergy(Number(event.target.value))} />
        </label>
      </div>

      <label style={{ display: "grid", gap: 7 }}>
        <span className="field-label">Preuves concrètes</span>
        <textarea
          className="input"
          rows={4}
          value={proofs}
          onChange={(event) => setProofs(event.target.value)}
          placeholder="Exemples vécus, réalisations, feedbacks reçus, situations où la compétence a été utile..."
        />
      </label>

      <div style={{ padding: 12, borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
        <div style={{ fontSize: 12, fontWeight: 850, marginBottom: 6 }}>Synthèse qui sera enregistrée</div>
        <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.5 }}>{synthesizedNotes.replace("CARTOGRAPHIE_COMPETENCES::\n", "")}</pre>
      </div>

      {step.notes && (
        <details style={{ fontSize: 12.5, color: "var(--ink-3)" }}>
          <summary style={{ cursor: "pointer", fontWeight: 800 }}>Voir les notes déjà enregistrées</summary>
          <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", marginTop: 8 }}>{step.notes}</pre>
        </details>
      )}
      {state?.ok && <span style={{ color: "var(--success)", fontSize: 13 }}>Cartographie enregistrée.</span>}
      {state?.error && <span style={{ color: "var(--danger)", fontSize: 13 }}>{state.error}</span>}
      <button type="submit" className="btn btn-primary" disabled={pending} style={{ justifySelf: "end" }}>
        <Icon name="check" size={15} /> {pending ? "Enregistrement…" : "Enregistrer la cartographie"}
      </button>
    </form>
  );
}

export function CopyShareLink({ url }: { url: string }) {
  const [copied, start] = useTransition();
  return (
    <button
      type="button"
      className="btn btn-secondary btn-sm"
      disabled={copied}
      onClick={() => start(async () => { await navigator.clipboard.writeText(url); })}
    >
      <Icon name="copy" size={14} /> {copied ? "Copié" : "Copier le lien"}
    </button>
  );
}
