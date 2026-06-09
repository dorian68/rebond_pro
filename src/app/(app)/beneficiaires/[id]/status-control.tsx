"use client";

import { useTransition } from "react";
import { updateBeneficiaryStatus } from "@/server/beneficiary-actions";

const OPTIONS: { value: "active" | "completed" | "archived"; label: string }[] = [
  { value: "active", label: "En cours" }, { value: "completed", label: "Terminé" }, { value: "archived", label: "Archivé" },
];

export function BeneficiaryStatus({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  return (
    <select className="input" defaultValue={status} disabled={pending} style={{ width: 150, height: 38 }}
      onChange={(e) => start(() => updateBeneficiaryStatus(id, e.target.value as "active" | "completed" | "archived"))}>
      {OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
