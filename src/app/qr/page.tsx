import type { Metadata } from "next";
import Image from "next/image";
import { PrintButton } from "./qr-actions";

export const metadata: Metadata = {
  title: "Mon QR — Le Bon Rebond",
  robots: { index: false, follow: false },
};

const TARGET = "https://lebonrebond.optiquant-ia.com/decouvrir";

export default function QrPage() {
  return (
    <main
      style={{
        minHeight: "100svh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "#FAF5EC", padding: 20, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      }}
    >
      <div
        className="qr-card"
        style={{
          width: "100%", maxWidth: 440, background: "#fff", borderRadius: 24,
          boxShadow: "0 24px 60px -34px rgba(14,36,56,.55)", border: "1px solid rgba(21,49,76,.10)",
          padding: "34px 30px 30px", textAlign: "center",
        }}
      >
        <Image src="/brand/logo-le-bon-rebond.png" alt="Le Bon Rebond" width={104} height={42} preload style={{ height: 42, width: 104, objectFit: "contain", margin: "0 auto 22px" }} />

        <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".16em", textTransform: "uppercase", color: "#23756e", marginBottom: 10 }}>
          Rencontrons-nous
        </div>
        <h1 style={{ fontFamily: "'Newsreader', Georgia, serif", fontWeight: 500, fontSize: "1.9rem", color: "#15314C", letterSpacing: "-.02em", margin: "0 0 8px", lineHeight: 1.15 }}>
          Scannez ce code
        </h1>
        <p style={{ color: "#52606e", fontSize: "0.98rem", lineHeight: 1.55, margin: "0 auto 22px", maxWidth: "30ch" }}>
          Découvrez Le Bon Rebond et laissez-nous vos coordonnées en 30 secondes.
        </p>

        {/* QR */}
        <div style={{ display: "inline-block", padding: 14, background: "#fff", border: "1px solid rgba(21,49,76,.12)", borderRadius: 18 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/qr-decouvrir.svg" alt="QR code vers la page de découverte Le Bon Rebond" width={264} height={264} style={{ display: "block", width: 264, height: 264 }} />
        </div>

        <div style={{ marginTop: 16, fontSize: 13, color: "#85939d", wordBreak: "break-all" }}>
          lebonrebond.optiquant-ia.com/decouvrir
        </div>

        {/* Actions */}
        <div className="qr-noprint" style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 24 }}>
          <a
            href={TARGET}
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "15px 22px", borderRadius: 100, fontWeight: 700, fontSize: "1.02rem", background: "#E07C39", color: "#fff", textDecoration: "none" }}
          >
            Ouvrir la page →
          </a>
          <div style={{ display: "flex", gap: 10 }}>
            <a
              href="/qr-decouvrir.png"
              download="qr-le-bon-rebond.png"
              style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px 18px", borderRadius: 100, fontWeight: 700, fontSize: "1rem", border: "1.5px solid rgba(21,49,76,.22)", color: "#15314C", textDecoration: "none", background: "transparent" }}
            >
              Télécharger
            </a>
            <div style={{ flex: 1, display: "flex" }}><div style={{ flex: 1 }}><PrintButton /></div></div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          .qr-noprint { display: none !important; }
          main { background: #fff !important; }
          .qr-card { box-shadow: none !important; border: none !important; }
        }
      `}</style>
    </main>
  );
}
