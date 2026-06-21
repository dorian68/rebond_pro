"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { transferBeneficiaryToCenter, updatePlatformBeneficiaryStatus } from "@/server/platform-beneficiary-actions";
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
