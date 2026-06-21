"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { isAllowedUIBlock, type UIBlock } from "@/lib/ag-ui/types";
import { connectExternalConnector } from "@/server/connectors-actions";
import type { ConnectorKey, ConnectorScope } from "@/lib/connectors";

type Props = {
  block: UIBlock;
  onSuggestion?: (prompt: string) => void;
  onApprove?: () => void;
  onReject?: () => void;
};

const TONE_COLOR: Record<string, string> = { positive: "var(--positive-600)", warn: "var(--warn-strong)", danger: "var(--danger-strong)", default: "var(--ink)" };

export function AgentUIBlockRenderer({ block, onSuggestion, onApprove, onReject }: Props) {
  if (!isAllowedUIBlock(block)) return null; // jamais de rendu de bloc non autorisé

  switch (block.type) {
    case "metric_grid":
      return (
        <div className="card" style={{ padding: 12, marginTop: 8 }}>
          {block.title && <div style={{ fontSize: 12, fontWeight: 800, color: "var(--ink-2)", marginBottom: 8 }}>{block.title}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
            {block.metrics.map((m, i) => (
              <div key={i} style={{ background: "var(--surface-3)", borderRadius: 9, padding: "8px 10px" }}>
                <div style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600 }}>{m.label}</div>
                <div className="tnum" style={{ fontSize: 15, fontWeight: 800, color: TONE_COLOR[m.tone ?? "default"] }}>{m.value}</div>
              </div>
            ))}
          </div>
        </div>
      );

    case "entity_card": {
      const inner = (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: block.fields?.length ? 8 : 0 }}>
            <span style={{ width: 8, height: 8, borderRadius: 99, background: block.color ?? "var(--primary)", flex: "none" }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{block.title}</div>
              {block.subtitle && <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{block.subtitle}</div>}
            </div>
            {block.href && <Icon name="arrow-up-right" size={15} style={{ marginLeft: "auto", color: "var(--ink-4)" }} />}
          </div>
          {block.fields && block.fields.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px" }}>
              {block.fields.map((f, i) => (
                <span key={i} style={{ fontSize: 12 }}><span style={{ color: "var(--ink-3)" }}>{f.label}: </span><strong>{f.value}</strong></span>
              ))}
            </div>
          )}
        </>
      );
      return block.href ? (
        <Link href={block.href} className="card" style={{ display: "block", padding: 12, marginTop: 8 }}>{inner}</Link>
      ) : (
        <div className="card" style={{ padding: 12, marginTop: 8 }}>{inner}</div>
      );
    }

    case "data_table":
      return (
        <div className="card" style={{ padding: 0, marginTop: 8, overflow: "hidden" }}>
          {block.title && <div style={{ fontSize: 12, fontWeight: 800, color: "var(--ink-2)", padding: "10px 12px 0" }}>{block.title}</div>}
          {block.rows.length === 0 ? (
            <div className="muted-3" style={{ fontSize: 12.5, padding: 12 }}>{block.emptyText ?? "Aucun résultat."}</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="tbl" style={{ fontSize: 12.5 }}>
                <thead><tr>{block.columns.map((c, i) => <th key={i} style={{ padding: "8px 12px" }}>{c}</th>)}</tr></thead>
                <tbody>{block.rows.slice(0, 12).map((r, i) => <tr key={i}>{r.map((cell, j) => <td key={j} style={{ padding: "8px 12px" }}>{cell}</td>)}</tr>)}</tbody>
              </table>
            </div>
          )}
        </div>
      );

    case "suggestion_chips":
      return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 8 }}>
          {block.chips.map((c, i) => (
            <button key={i} className="btn btn-secondary btn-sm" onClick={() => onSuggestion?.(c.prompt)}>{c.label}</button>
          ))}
        </div>
      );

    case "progress_steps":
      return (
        <div className="card" style={{ padding: 12, marginTop: 8 }}>
          {block.title && <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 8 }}>{block.title}</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {block.steps.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
                <Icon name={s.status === "done" ? "check-circle" : s.status === "active" ? "refresh" : "circle"} size={14} style={{ color: s.status === "done" ? "var(--positive-600)" : s.status === "active" ? "var(--primary)" : "var(--ink-4)" }} />
                <span style={{ color: s.status === "pending" ? "var(--ink-3)" : "var(--ink)" }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      );

    case "confirmation_card":
      return (
        <div className="card" style={{ padding: 14, marginTop: 8, border: "1px solid var(--warn-border)", background: "var(--warn-bg)" }}>
          <div style={{ display: "flex", gap: 9, alignItems: "flex-start", marginBottom: 10 }}>
            <Icon name="alert-triangle" size={18} style={{ color: "var(--warn-strong)", flex: "none" }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 13.5 }}>{block.title}</div>
              {block.description && <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 2 }}>{block.description}</div>}
              {block.impact && <div style={{ fontSize: 11.5, color: "var(--warn-strong)", marginTop: 4 }}>{block.impact}</div>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="btn btn-ghost btn-sm" onClick={onReject}>Annuler</button>
            <button className="btn btn-primary btn-sm" onClick={onApprove}><Icon name="check" size={15} /> Valider</button>
          </div>
        </div>
      );

    case "connector_oauth_card":
      return <ConnectorOAuthCard block={block} />;

    case "error_card":
      return (
        <div className="card" style={{ padding: 12, marginTop: 8, border: "1px solid var(--danger-border)", background: "var(--danger-bg)" }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "var(--danger-strong)" }}>{block.title}</div>
          <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 2 }}>{block.message}</div>
        </div>
      );

    default:
      return null;
  }
}

function ConnectorOAuthCard({ block }: { block: Extract<UIBlock, { type: "connector_oauth_card" }> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function connect() {
    setBusy(true);
    setError(null);
    try {
      const returnTo = typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : "/assistant";
      const result = await connectExternalConnector(block.connector as ConnectorKey, block.scope as ConnectorScope, returnTo);
      if (result.url) {
        window.location.assign(result.url);
        return;
      }
      setError(result.error ?? "Connexion impossible.");
    } catch {
      setError("Connexion impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ padding: 14, marginTop: 8, border: "1px solid var(--border)", background: "var(--surface)" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <span style={{ width: 30, height: 30, borderRadius: 8, background: "var(--primary-50)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
          <Icon name="external" size={16} />
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginBottom: 3 }}>
            <div style={{ fontWeight: 800, fontSize: 13.5 }}>{block.title}</div>
            <span className="badge">{block.scope === "organization" ? "Centre" : "Personnel"}</span>
            <span className="badge">{block.policy === "READ_ONLY" ? "Lecture seule" : "Brouillon uniquement"}</span>
          </div>
          {block.description && <div style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.5 }}>{block.description}</div>}
          <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 6 }}>
            Le Bon Rebond ne reçoit pas votre mot de passe. L'autorisation et les tokens sont gérés par Composio.
          </div>
          {error && <div style={{ fontSize: 12, color: "var(--danger-strong)", marginTop: 8 }}>{error}</div>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
            <Link href="/parametres" className="btn btn-ghost btn-sm">Paramètres</Link>
            {block.canConnect ? (
              <button className="btn btn-primary btn-sm" onClick={connect} disabled={busy}>
                <Icon name="external" size={14} /> {busy ? "Ouverture..." : `Connecter ${block.label}`}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
