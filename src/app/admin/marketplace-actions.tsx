"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { approveCenterMarketplace, rejectCenterMarketplace } from "@/server/marketplace-moderation";

type Status = "PENDING" | "APPROVED" | "REJECTED";

export function MarketplaceStatusBadge({ status }: { status: Status }) {
  const map = {
    APPROVED: { cls: "badge-positive", label: "Publié" },
    PENDING: { cls: "badge-warn", label: "À valider" },
    REJECTED: { cls: "badge-danger", label: "Refusé" },
  } as const;
  const s = map[status] ?? map.PENDING;
  return <span className={"badge " + s.cls}>{s.label}</span>;
}

export function MarketplaceModerationButtons({ orgId, status, size = "sm" }: { orgId: string; status: Status; size?: "sm" | "md" }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const btn = size === "sm" ? "btn-sm" : "";

  const approve = () =>
    start(async () => {
      setErr(null);
      const r = await approveCenterMarketplace(orgId);
      if (!r.ok) setErr(r.error ?? "Erreur");
      else router.refresh();
    });

  const reject = () => {
    const reason = window.prompt("Motif du refus (optionnel, envoyé au centre) :") ?? undefined;
    start(async () => {
      setErr(null);
      const r = await rejectCenterMarketplace(orgId, reason);
      if (!r.ok) setErr(r.error ?? "Erreur");
      else router.refresh();
    });
  };

  return (
    <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
      {status !== "APPROVED" && (
        <button className={`btn btn-primary ${btn}`} onClick={approve} disabled={pending}>
          <Icon name="check" size={15} /> {pending ? "…" : "Valider"}
        </button>
      )}
      {status !== "REJECTED" && (
        <button className={`btn btn-secondary ${btn}`} onClick={reject} disabled={pending}>
          {status === "APPROVED" ? "Retirer" : "Refuser"}
        </button>
      )}
      {err && <span className="badge badge-danger">{err}</span>}
    </span>
  );
}
