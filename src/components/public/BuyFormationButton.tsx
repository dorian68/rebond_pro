"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { createPublicFormationCheckout } from "@/server/finance-actions";
import { formatMoney } from "@/lib/utils";

/** Bouton d'achat en ligne (checkout invité Stripe) sur la fiche formation publique. */
export function BuyFormationButton({ formationId, price }: { formationId: string; price: number }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onBuy = async () => {
    setLoading(true);
    setError(null);
    const res = await createPublicFormationCheckout(formationId);
    if (res.url) { window.location.href = res.url; return; }
    setError(res.error ?? "Le paiement est indisponible pour le moment.");
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <button onClick={onBuy} disabled={loading} className="btn btn-primary btn-lg">
        {loading ? "Redirection vers le paiement…" : `Acheter en ligne · ${formatMoney(price)}`} <Icon name="arrow-right" size={17} />
      </button>
      {error && <p style={{ fontSize: 13, color: "var(--danger-strong)", margin: 0 }}>{error}</p>}
    </div>
  );
}
