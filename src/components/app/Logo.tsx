export function Logo({ size = 34, light = false }: { size?: number; light?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 10,
          flex: "none",
          background: light ? "#fff" : "linear-gradient(140deg,#6a5cf0,#5850ec)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: light ? "none" : "0 4px 12px rgba(88,80,236,.35)",
        }}
      >
        <svg
          width={size * 0.6}
          height={size * 0.6}
          viewBox="0 0 24 24"
          fill="none"
          stroke={light ? "#5850ec" : "#fff"}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 17l5-5 4 3 7-8" />
          <path d="M16 4h4v4" />
        </svg>
      </div>
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
        <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: "-0.025em", color: light ? "#fff" : "var(--ink)" }}>RebondPro</span>
        <span style={{ fontWeight: 700, fontSize: 10.5, letterSpacing: "0.14em", textTransform: "uppercase", color: light ? "rgba(255,255,255,.6)" : "var(--ink-3)", marginTop: 2 }}>
          Formation
        </span>
      </div>
    </div>
  );
}
