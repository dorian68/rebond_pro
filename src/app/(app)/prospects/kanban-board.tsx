"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { formatMoney, formatDateShort } from "@/lib/utils";
import { PROSPECT_STAGE_LABELS } from "@/lib/labels";
import { moveProspect } from "@/server/prospects-actions";
import type { ProspectCard } from "@/server/prospects";

const COLUMNS: { id: string; color: string }[] = [
  { id: "NOUVEAU", color: "#919aa8" },
  { id: "CONTACTE", color: "#2f7fc4" },
  { id: "DEVIS", color: "#5850ec" },
  { id: "RELANCE", color: "#d9821f" },
  { id: "GAGNE", color: "#18996b" },
  { id: "PERDU", color: "#dc5147" },
];

export function KanbanBoard({ prospects }: { prospects: ProspectCard[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [items, setItems] = useState(prospects);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);

  const move = (id: string, stage: string) => {
    const cur = items.find((p) => p.id === id);
    if (!cur || cur.stage === stage) return;
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, stage: stage as ProspectCard["stage"] } : p))); // optimiste
    startTransition(async () => {
      await moveProspect(id, stage);
      router.refresh();
    });
  };

  return (
    <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
      {COLUMNS.map((col) => {
        const cards = items.filter((p) => p.stage === col.id);
        const total = cards.reduce((a, p) => a + p.potentialAmount, 0);
        return (
          <div
            key={col.id}
            onDragOver={(e) => { e.preventDefault(); setOverCol(col.id); }}
            onDragLeave={() => setOverCol((c) => (c === col.id ? null : c))}
            onDrop={() => { if (dragId) move(dragId, col.id); setDragId(null); setOverCol(null); }}
            style={{ width: 260, flex: "none", background: overCol === col.id ? "var(--primary-50)" : "var(--surface-3)", borderRadius: 14, padding: 10, transition: "background .15s", display: "flex", flexDirection: "column" }}
          >
            <div className="spread" style={{ padding: "4px 6px 10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ width: 8, height: 8, borderRadius: 99, background: col.color }} />
                <span style={{ fontWeight: 800, fontSize: 13 }}>{PROSPECT_STAGE_LABELS[col.id]}</span>
                <span style={{ fontSize: 11.5, color: "var(--ink-3)", fontWeight: 700 }}>{cards.length}</span>
              </div>
            </div>
            <div style={{ fontSize: 11, color: "var(--ink-3)", padding: "0 6px 8px", fontWeight: 600 }}>{formatMoney(total)}</div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 40 }}>
              {cards.map((p) => (
                <div
                  key={p.id}
                  draggable
                  onDragStart={() => setDragId(p.id)}
                  onDragEnd={() => { setDragId(null); setOverCol(null); }}
                  style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 11, padding: 12, boxShadow: "var(--shadow-xs)", cursor: "grab", opacity: dragId === p.id ? 0.5 : 1 }}
                >
                  <div className="spread" style={{ marginBottom: 6, gap: 6 }}>
                    <Link href={`/prospects/${p.id}`} style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.3 }}>{p.name}</Link>
                    {p.isHot && <span title="Prospect chaud" style={{ color: "var(--danger)", flex: "none" }}><Icon name="zap" size={14} fill="var(--danger)" /></span>}
                  </div>
                  {p.formationTitle && <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginBottom: 8 }}>{p.formationTitle}</div>}
                  <div className="spread">
                    <span className="tnum" style={{ fontSize: 12.5, fontWeight: 800, color: "var(--ink)" }}>{formatMoney(p.potentialAmount)}</span>
                    {p.nextFollowUpDate && <span style={{ fontSize: 11, color: "var(--warn-strong)", fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}><Icon name="clock" size={12} /> {formatDateShort(p.nextFollowUpDate)}</span>}
                  </div>
                  {p.nextAction && <div style={{ fontSize: 11.5, color: "var(--ink-2)", marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--border-2)" }}>{p.nextAction}</div>}
                </div>
              ))}
              {cards.length === 0 && <div style={{ fontSize: 12, color: "var(--ink-4)", textAlign: "center", padding: "16px 0" }}>—</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
