import { listTransactions, getFinanceSummary, COMMISSION_PCT } from "@/server/finance";
import { markTransactionSettled } from "@/server/finance-actions";
import { PageHeader, Card } from "@/components/ui/primitives";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PAYOUT_LABEL: Record<string, string> = { pending: "À reverser", settled: "Reversé", not_applicable: "—" };
const PAYOUT_CLS: Record<string, string> = { pending: "badge-warn", settled: "badge-positive", not_applicable: "badge-neutral" };

async function settleAction(formData: FormData) {
  "use server";
  const id = formData.get("id");
  if (typeof id === "string") await markTransactionSettled(id);
}

const TYPE_LABEL: Record<string, string> = { FORMATION_PURCHASE: "Achat formation", SUBSCRIPTION: "Abonnement centre", BILAN: "Bilan de compétences" };
const TYPE_CLS: Record<string, string> = { FORMATION_PURCHASE: "badge-primary", SUBSCRIPTION: "badge-positive", BILAN: "badge-sky" };

export default async function AdminFinancesPage() {
  const [txs, summary] = await Promise.all([listTransactions(300), getFinanceSummary()]);

  // Modèle « tout encaisser + reverser » : la plateforme encaisse le brut des achats de formation
  // puis doit reverser au centre vendeur le net (montant − commission). Abonnements et bilans sont
  // des revenus propres à la plateforme (rien à reverser).
  const aReverser = summary.byType.FORMATION_PURCHASE.amount - summary.byType.FORMATION_PURCHASE.commission;
  const revenusPlateforme = summary.totalCommission + summary.byType.SUBSCRIPTION.amount + summary.byType.BILAN.amount;

  const cards = [
    { label: "Volume réseau (brut)", value: formatMoney(summary.totalGross) },
    { label: "Revenus plateforme (commissions + abos + bilans)", value: formatMoney(revenusPlateforme), tone: true },
    { label: "Net à reverser (total formations)", value: formatMoney(aReverser) },
    { label: "Reste à reverser (non réglé)", value: formatMoney(summary.pendingPayout) },
    { label: `Commissions formation (${COMMISSION_PCT}%)`, value: formatMoney(summary.byType.FORMATION_PURCHASE.commission) },
    { label: "Abonnements + Bilans", value: formatMoney(summary.byType.SUBSCRIPTION.amount + summary.byType.BILAN.amount) },
  ];

  return (
    <div className="fade-up">
      <PageHeader title="Flux financiers" subtitle="Traçabilité de chaque transaction de l'écosystème : achats de formation, abonnements centres, bilans." />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
        {cards.map((c) => (
          <div key={c.label} style={{ padding: "16px 18px", border: "1px solid var(--border)", borderRadius: 14, background: c.tone ? "linear-gradient(135deg,#2469a6,#2f9488)" : "#fff", color: c.tone ? "#fff" : undefined }}>
            <div style={{ fontSize: 12, opacity: c.tone ? .85 : 1, color: c.tone ? "#fff" : "var(--ink-3)", fontWeight: 600 }}>{c.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>{c.value}</div>
          </div>
        ))}
      </div>

      <Card>
        <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Transactions ({txs.length})</h3>
        {txs.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--ink-3)" }}>Aucune transaction pour le moment. Les paiements (formations, abonnements, bilans) apparaîtront ici en temps réel.</p>
        ) : (
          <table className="tbl">
            <thead><tr><th>Date</th><th>Type</th><th>Centre</th><th>Payeur</th><th>Montant</th><th>Commission</th><th>Net centre</th><th>Reversement</th></tr></thead>
            <tbody>
              {txs.map((t) => (
                <tr key={t.id}>
                  <td className="muted">{new Date(t.createdAt).toLocaleDateString("fr-FR")}</td>
                  <td><span className={"badge " + (TYPE_CLS[t.type] ?? "badge-neutral")}>{TYPE_LABEL[t.type] ?? t.type}</span></td>
                  <td style={{ fontWeight: 600 }}>{t.organization.name}</td>
                  <td className="muted">{t.payerName ?? t.payerEmail ?? "—"}</td>
                  <td className="tnum" style={{ fontWeight: 700 }}>{formatMoney(t.amount)}</td>
                  <td className="tnum">{t.commission > 0 ? formatMoney(t.commission) : "—"}</td>
                  <td className="tnum">{t.type === "FORMATION_PURCHASE" ? formatMoney(t.amount - t.commission) : "—"}</td>
                  <td>
                    {t.payoutStatus === "pending" ? (
                      <form action={settleAction}>
                        <input type="hidden" name="id" value={t.id} />
                        <button type="submit" className="badge badge-warn" style={{ cursor: "pointer", border: "none" }} title="Marquer comme reversé au centre">À reverser ✓</button>
                      </form>
                    ) : (
                      <span className={"badge " + (PAYOUT_CLS[t.payoutStatus] ?? "badge-neutral")}>{PAYOUT_LABEL[t.payoutStatus] ?? t.payoutStatus}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
