"use client";

import { useMemo, useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { transferBeneficiaryToCenter, updatePlatformBeneficiaryStatus, updatePlatformBilanStep } from "@/server/platform-beneficiary-actions";
import type { FormActionState } from "@/server/formations-actions";

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
}: {
  beneficiaryId: string;
  step: { id: string; status: string; notes: string | null };
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [proofs, setProofs] = useState("");
  const [energy, setEnergy] = useState(3);
  const [mastery, setMastery] = useState(3);
  const [state, action, pending] = useActionState<FormActionState, FormData>(updatePlatformBilanStep, undefined);
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
      <input type="hidden" name="status" value={selected.length > 0 || proofs ? "in_progress" : step.status} />
      <input type="hidden" name="notes" value={synthesizedNotes} />

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
