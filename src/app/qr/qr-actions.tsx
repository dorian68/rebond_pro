"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="qr-noprint"
      style={{
        width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
        padding: "14px 18px", borderRadius: 100, fontWeight: 700, fontSize: "1rem",
        border: "1.5px solid rgba(21,49,76,.22)", color: "#15314C", background: "transparent", cursor: "pointer",
      }}
    >
      Imprimer
    </button>
  );
}
