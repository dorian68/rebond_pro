"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { createBilanCheckout } from "@/server/finance-actions";

export function PayBilanButton() {
  const [busy, setBusy] = useState(false);
  async function pay() {
    setBusy(true);
    try { const r = await createBilanCheckout(); if (r.url) { window.location.href = r.url; return; } alert(r.error ?? "Paiement indisponible."); }
    finally { setBusy(false); }
  }
  return (
    <button className="btn btn-secondary" onClick={pay} disabled={busy}>
      <Icon name="euro" size={16} /> {busy ? "…" : "Régler mon bilan"}
    </button>
  );
}
