import { formatMoney } from "@/lib/utils";

/** Aire CA prévisionnel. data en k€. Les points proj=true sont dessinés en pointillé. */
export function AreaChart({ data, height = 180 }: { data: { m: string; v: number; proj?: boolean }[]; height?: number }) {
  const w = 640;
  const padX = 8;
  const padY = 18;
  const max = Math.max(1, ...data.map((d) => d.v)) * 1.15;
  const stepX = (w - padX * 2) / Math.max(1, data.length - 1);
  const x = (i: number) => padX + i * stepX;
  const y = (v: number) => height - padY - (v / max) * (height - padY * 2);

  const pts = data.map((d, i) => `${x(i)},${y(d.v)}`);
  const linePath = `M ${pts.join(" L ")}`;
  const areaPath = `${linePath} L ${x(data.length - 1)},${height - padY} L ${x(0)},${height - padY} Z`;
  const firstProj = data.findIndex((d) => d.proj);

  return (
    <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} preserveAspectRatio="none" style={{ display: "block" }}>
      <defs>
        <linearGradient id="caGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5850ec" stopOpacity="0.20" />
          <stop offset="100%" stopColor="#5850ec" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#caGrad)" />
      <path d={linePath} fill="none" stroke="#5850ec" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(d.v)} r={d.proj ? 3 : 3.5} fill={d.proj ? "#fff" : "#5850ec"} stroke="#5850ec" strokeWidth="2" />
          <text x={x(i)} y={height - 4} textAnchor="middle" fontSize="11" fill="#919aa8" fontWeight={600}>
            {d.m}
          </text>
        </g>
      ))}
      {firstProj > 0 && (
        <line x1={x(firstProj - 0.5)} y1={padY - 6} x2={x(firstProj - 0.5)} y2={height - padY} stroke="#dde0e7" strokeWidth="1" strokeDasharray="3 3" />
      )}
    </svg>
  );
}

/** Liste de barres horizontales (taux de remplissage par formation). */
export function BarList({ items }: { items: { title: string; color: string; value: number }[] }) {
  if (!items.length) return <p className="muted-3" style={{ fontSize: 13 }}>Aucune session à venir.</p>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {items.map((it, i) => (
        <div key={i}>
          <div className="spread" style={{ marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "75%" }}>{it.title}</span>
            <span className="tnum" style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-2)" }}>{it.value}%</span>
          </div>
          <div className="progress" style={{ height: 8 }}>
            <span style={{ width: it.value + "%", background: it.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Barres de pipeline commercial par étape. */
export function PipelineBars({ items }: { items: { stage: string; count: number; amount: number }[] }) {
  const labels: Record<string, string> = { NOUVEAU: "Nouveau", CONTACTE: "Contacté", DEVIS: "Devis", RELANCE: "Relance", GAGNE: "Gagné", PERDU: "Perdu" };
  const order = ["NOUVEAU", "CONTACTE", "DEVIS", "RELANCE", "GAGNE", "PERDU"];
  const map = new Map(items.map((i) => [i.stage, i]));
  const maxCount = Math.max(1, ...items.map((i) => i.count));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 150 }}>
      {order.map((st) => {
        const it = map.get(st);
        const count = it?.count ?? 0;
        const h = (count / maxCount) * 110;
        return (
          <div key={st} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <span className="tnum" style={{ fontSize: 12, fontWeight: 700 }}>{count}</span>
            <div style={{ width: "100%", maxWidth: 42, height: Math.max(4, h), borderRadius: 7, background: st === "GAGNE" ? "var(--positive)" : st === "PERDU" ? "var(--ink-4)" : "var(--primary)", opacity: st === "PERDU" ? 0.6 : 1 }} title={it ? formatMoney(it.amount) : ""} />
            <span style={{ fontSize: 10.5, color: "var(--ink-3)", fontWeight: 600, textAlign: "center" }}>{labels[st]}</span>
          </div>
        );
      })}
    </div>
  );
}
