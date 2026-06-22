"use client";

import { useActionState, useTransition } from "react";
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
