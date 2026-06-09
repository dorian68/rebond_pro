"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { formatMoney } from "@/lib/utils";
import { MODALITY_LABELS, LEVEL_LABELS } from "@/lib/labels";
import { toggleFormationInterest, requestFormationInfo } from "@/server/beneficiary-self-actions";
import { createFormationCheckout } from "@/server/finance-actions";

type F = {
  id: string; title: string; shortDescription: string | null; category: string | null; price: number;
  modality: keyof typeof MODALITY_LABELS; level: keyof typeof LEVEL_LABELS; color: string | null; coverImageUrl: string | null;
  durationDays: number | null; durationHours: number | null; center: string; centerSlug: string; publicSlug: string;
};

export function CatalogueClient({ formations, categories, savedIds, filters }: { formations: F[]; categories: string[]; savedIds: string[]; filters: { q: string; category: string; modality: string; level: string } }) {
  const [saved, setSaved] = useState<Set<string>>(() => new Set(savedIds));
  const [requested, setRequested] = useState<Set<string>>(new Set());
  const [, start] = useTransition();

  function onToggle(id: string) {
    const willSave = !saved.has(id);
    setSaved((s) => { const c = new Set(s); if (willSave) c.add(id); else c.delete(id); return c; });
    start(() => { void toggleFormationInterest(id); });
  }
  function onRequest(id: string) {
    setSaved((s) => new Set(s).add(id));
    setRequested((r) => new Set(r).add(id));
    start(() => { void requestFormationInfo(id); });
  }
  const [buying, setBuying] = useState<string | null>(null);
  async function onBuy(id: string) {
    setBuying(id);
    try { const r = await createFormationCheckout(id); if (r.url) { window.location.href = r.url; return; } alert(r.error ?? "Paiement indisponible."); }
    finally { setBuying(null); }
  }

  return (
    <div>
      <form method="get" className="card card-pad" style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
        <input className="input" type="search" name="q" placeholder="Rechercher…" defaultValue={filters.q} style={{ flex: 1, minWidth: 200 }} />
        <select className="input" name="category" defaultValue={filters.category} style={{ width: "auto" }}>
          <option value="">Toutes catégories</option>{categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="input" name="modality" defaultValue={filters.modality} style={{ width: "auto" }}>
          <option value="">Toutes modalités</option>{Object.entries(MODALITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="input" name="level" defaultValue={filters.level} style={{ width: "auto" }}>
          <option value="">Tous niveaux</option>{Object.entries(LEVEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button type="submit" className="btn btn-primary">Filtrer</button>
      </form>

      {formations.length === 0 ? (
        <p style={{ color: "var(--ink-3)", padding: "20px 0" }}>Aucune formation ne correspond à votre recherche.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {formations.map((f) => {
            const c = f.color || "#5850ec";
            const isSaved = saved.has(f.id);
            const isReq = requested.has(f.id);
            const duration = f.durationDays ? `${f.durationDays} j` : f.durationHours ? `${f.durationHours} h` : null;
            return (
              <div key={f.id} className="card" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div style={{ height: 84, background: f.coverImageUrl ? `url(${f.coverImageUrl}) center/cover` : `linear-gradient(135deg, ${c}, ${c}aa)`, display: "flex", alignItems: "flex-end", padding: 10 }}>
                  {f.category && <span className="badge" style={{ background: "rgba(255,255,255,.9)" }}>{f.category}</span>}
                </div>
                <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                  <Link href={`/${f.centerSlug}/f/${f.publicSlug}`} style={{ fontWeight: 700, fontSize: 15, color: "inherit" }}>{f.title}</Link>
                  {f.shortDescription && <p style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{f.shortDescription}</p>}
                  <div style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 600, display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {duration && <span>{duration}</span>}<span>{MODALITY_LABELS[f.modality]}</span><span>{LEVEL_LABELS[f.level]}</span>
                    <span style={{ marginLeft: "auto", color: "var(--ink)", fontWeight: 800 }}>{formatMoney(f.price)}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--ink-2)", fontWeight: 600 }}><Icon name="building" size={13} /> {f.center}</div>
                  <div style={{ display: "flex", gap: 8, marginTop: "auto", paddingTop: 8, flexWrap: "wrap" }}>
                    <button className={isSaved ? "btn btn-secondary btn-sm" : "btn btn-ghost btn-sm"} onClick={() => onToggle(f.id)} title={isSaved ? "Retirer" : "Enregistrer"}>
                      <Icon name={isSaved ? "check" : "plus"} size={14} /> {isSaved ? "Enregistrée" : "Enregistrer"}
                    </button>
                    <button className="btn btn-ghost btn-sm" disabled={isReq} onClick={() => onRequest(f.id)}>
                      {isReq ? "✓ Demandé" : "Infos"}
                    </button>
                    {f.price > 0 && (
                      <button className="btn btn-primary btn-sm" disabled={buying === f.id} onClick={() => onBuy(f.id)} style={{ marginLeft: "auto" }}>
                        <Icon name="euro" size={14} /> {buying === f.id ? "…" : "Acheter"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
