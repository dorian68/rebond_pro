import type { ReactNode, CSSProperties } from "react";
import { Icon } from "./Icon";
import { clampPct } from "@/lib/utils";

export function Avatar({ children, size = 34, color }: { children: ReactNode; size?: number; color?: string }) {
  return (
    <div
      className="avatar"
      style={{ width: size, height: size, fontSize: size * 0.37, background: color ?? "linear-gradient(140deg,#2f9488,#2469a6)" }}
    >
      {children}
    </div>
  );
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="spread" style={{ marginBottom: 22, gap: 16, flexWrap: "wrap" }}>
      <div>
        <h1 style={{ fontSize: 23, fontWeight: 800 }}>{title}</h1>
        {subtitle && <p style={{ color: "var(--ink-2)", marginTop: 5, fontSize: 14 }}>{subtitle}</p>}
      </div>
      {children && <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>{children}</div>}
    </div>
  );
}

const SESSION_BADGE: Record<string, [string, string]> = {
  OUVERTE: ["badge-positive", "Ouverte"],
  COMPLETE: ["badge-primary", "Complète"],
  RISQUE: ["badge-danger", "À risque"],
  TERMINEE: ["badge-neutral", "Terminée"],
  ANNULEE: ["badge-neutral", "Annulée"],
  BROUILLON: ["badge-neutral", "Brouillon"],
};

export function SessionBadge({ statut }: { statut: string }) {
  const [cls, label] = SESSION_BADGE[statut] ?? SESSION_BADGE.OUVERTE;
  return (
    <span className={"badge " + cls}>
      <span className="dot" />
      {label}
    </span>
  );
}

export function FillBar({ value, seuil, width = 110 }: { value: number; seuil?: number | null; width?: number }) {
  const v = clampPct(value);
  const tone = v >= 70 ? "positive" : v < 40 ? "danger" : "warn";
  const toneColor = tone === "danger" ? "var(--danger-strong)" : tone === "positive" ? "var(--positive-600)" : "var(--warn-strong)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
      <div className={"progress " + tone} style={{ width, position: "relative" }}>
        <span style={{ width: v + "%" }} />
        {seuil != null && (
          <span
            style={{ position: "absolute", left: `${clampPct(seuil)}%`, top: -2, bottom: -2, width: 2, background: "var(--ink)", opacity: 0.35, borderRadius: 2 }}
            title={"Seuil " + seuil + "%"}
          />
        )}
      </div>
      <span className="tnum" style={{ fontWeight: 700, fontSize: 13, color: toneColor, minWidth: 34 }}>
        {v}%
      </span>
    </div>
  );
}

export function EmptyState({ icon = "search", title, text, action }: { icon?: string; title: string; text?: string; action?: ReactNode }) {
  return (
    <div style={{ textAlign: "center", padding: "56px 24px" }}>
      <div style={{ width: 56, height: 56, borderRadius: 14, background: "var(--surface-3)", color: "var(--ink-3)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
        <Icon name={icon} size={26} />
      </div>
      <div style={{ fontWeight: 700, fontSize: 15 }}>{title}</div>
      {text && <div style={{ color: "var(--ink-2)", fontSize: 13.5, marginTop: 5, maxWidth: 320, marginLeft: "auto", marginRight: "auto" }}>{text}</div>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}

const ALERT_TONES: Record<string, [string, string]> = {
  danger: ["var(--danger-bg)", "var(--danger)"],
  warn: ["var(--warn-bg)", "var(--warn-strong)"],
  primary: ["var(--primary-50)", "var(--primary)"],
  positive: ["var(--positive-bg)", "var(--positive-600)"],
};

export function AlertGlyph({ type, icon, size = 36 }: { type: string; icon: string; size?: number }) {
  const [bg, fg] = ALERT_TONES[type] ?? ALERT_TONES.primary;
  return (
    <div style={{ width: size, height: size, borderRadius: 9, background: bg, color: fg, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
      <Icon name={icon} size={size * 0.5} />
    </div>
  );
}

export function Card({ children, pad = true, style }: { children: ReactNode; pad?: boolean; style?: CSSProperties }) {
  return <div className={"card" + (pad ? " card-pad" : "")} style={style}>{children}</div>;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="spread" style={{ marginBottom: 16 }}>
      <h3 style={{ fontSize: 15.5, fontWeight: 800 }}>{children}</h3>
      {action}
    </div>
  );
}
