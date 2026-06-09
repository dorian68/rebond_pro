import "server-only";
import { prisma } from "@/lib/prisma";

export const COMMISSION_PCT = Number(process.env.PLATFORM_COMMISSION_PCT ?? "10");

export function commissionFor(amount: number): number {
  return Math.round((amount * COMMISSION_PCT) / 100);
}

export type TxType = "FORMATION_PURCHASE" | "SUBSCRIPTION" | "BILAN";

/**
 * Enregistre une transaction (idempotent via stripeRef).
 * Renvoie l'id de la transaction créée, ou null si elle existait déjà (doublon webhook).
 * payoutStatus : FORMATION_PURCHASE → "pending" (net dû au centre) ; abo/bilan → "not_applicable".
 */
export async function recordTransaction(data: {
  organizationId: string; type: TxType; amount: number; commission?: number; stripeRef?: string | null;
  payerEmail?: string | null; payerName?: string | null; formationId?: string | null; beneficiaryId?: string | null; description?: string | null; status?: string;
}): Promise<string | null> {
  if (data.stripeRef) {
    const exists = await prisma.transaction.findUnique({ where: { stripeRef: data.stripeRef }, select: { id: true } });
    if (exists) return null; // déjà enregistrée
  }
  const tx = await prisma.transaction.create({
    data: {
      organizationId: data.organizationId, type: data.type, amount: data.amount,
      commission: data.commission ?? (data.type === "FORMATION_PURCHASE" ? commissionFor(data.amount) : 0),
      stripeRef: data.stripeRef ?? null, payerEmail: data.payerEmail ?? null, payerName: data.payerName ?? null,
      formationId: data.formationId ?? null, beneficiaryId: data.beneficiaryId ?? null,
      description: data.description ?? null, status: data.status ?? "paid",
      payoutStatus: data.type === "FORMATION_PURCHASE" ? "pending" : "not_applicable",
    },
    select: { id: true },
  });
  return tx.id;
}

/** Marque le reversement d'une transaction d'achat de formation comme effectué. */
export async function settleTransaction(id: string): Promise<void> {
  await prisma.transaction.update({ where: { id }, data: { payoutStatus: "settled", settledAt: new Date() } });
}

/** Liste des transactions (cross-tenant) pour le super-admin. */
export async function listTransactions(limit = 200) {
  try {
    return await prisma.transaction.findMany({
      where: { status: "paid" },
      include: { organization: { select: { name: true, slug: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  } catch {
    return []; // table pas encore migrée
  }
}

/** Synthèse financière consolidée de la plateforme. */
export async function getFinanceSummary() {
  let txs: { type: string; amount: number; commission: number; payoutStatus: string }[] = [];
  try {
    txs = await prisma.transaction.findMany({ where: { status: "paid" }, select: { type: true, amount: true, commission: true, payoutStatus: true } });
  } catch {
    txs = []; // table pas encore migrée
  }
  const sum = (arr: { amount: number; commission: number }[]) => arr.reduce((a, t) => ({ amount: a.amount + t.amount, commission: a.commission + t.commission }), { amount: 0, commission: 0 });
  const byType = {
    FORMATION_PURCHASE: sum(txs.filter((t) => t.type === "FORMATION_PURCHASE")),
    SUBSCRIPTION: sum(txs.filter((t) => t.type === "SUBSCRIPTION")),
    BILAN: sum(txs.filter((t) => t.type === "BILAN")),
  };
  const total = sum(txs);
  // Net encore dû aux centres (achats de formation non reversés).
  const pendingPayout = txs
    .filter((t) => t.type === "FORMATION_PURCHASE" && t.payoutStatus === "pending")
    .reduce((a, t) => a + (t.amount - t.commission), 0);
  return { count: txs.length, totalGross: total.amount, totalCommission: total.commission, byType, pendingPayout };
}
