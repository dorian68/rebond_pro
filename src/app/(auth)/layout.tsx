import Image from "next/image";
import Link from "next/link";
import { AuthSpaceProvider, AuthBrandCopy } from "./auth-space";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthSpaceProvider>
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "1.04fr 1fr",
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      }}
      className="auth-root"
    >
      {/* ── Panneau de marque (gauche) ── */}
      <aside
        style={{
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(155deg, #15314C, #23756e)",
          color: "#fff",
          padding: "60px 58px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          minHeight: "100vh",
        }}
        className="auth-brand"
      >
        {/* Arcs déco */}
        <div style={{ position: "absolute", borderRadius: "50%", border: "1.5px solid rgba(255,255,255,.13)", zIndex: 0, pointerEvents: "none", width: 520, height: 520, left: -160, top: -160 }} />
        <div style={{ position: "absolute", borderRadius: "50%", border: "1.5px solid rgba(95,177,78,.18)", zIndex: 0, pointerEvents: "none", width: 680, height: 680, right: -260, bottom: -300 }} />

        {/* Logo blanc */}
        <Link href="/" style={{ position: "relative", zIndex: 1 }}>
          <div style={{ background: "#fff", borderRadius: 10, padding: "6px 12px", display: "inline-block" }}>
            <Image
              src="/brand/logo-le-bon-rebond.png"
              alt="Le Bon Rebond"
              width={150}
              height={48}
              style={{ height: 48, width: "auto", objectFit: "contain", display: "block" }}
              priority
            />
          </div>
        </Link>

        {/* Accroche + points — varient selon l'espace sélectionné (client / centre) */}
        <AuthBrandCopy />
      </aside>

      {/* ── Panneau formulaire (droite) ── */}
      <section
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px",
          background: "#FAF5EC",
          position: "relative",
        }}
        className="auth-form-side"
      >
        <Link
          href="/"
          style={{
            position: "absolute",
            top: 30,
            right: 38,
            fontSize: ".92rem",
            fontWeight: 600,
            color: "#5d6f7c",
            textDecoration: "none",
          }}
          className="auth-back-link"
        >
          ← Retour au site
        </Link>

        {/* Logo visible seulement sur mobile */}
        <div style={{ position: "absolute", top: 30, left: 38 }} className="auth-mobile-logo">
          <Link href="/">
            <Image
              src="/brand/logo-le-bon-rebond.png"
              alt="Le Bon Rebond"
              width={130}
              height={42}
              style={{ height: 42, width: "auto", objectFit: "contain", display: "block" }}
            />
          </Link>
        </div>

        <div style={{ width: "100%", maxWidth: 430 }}>{children}</div>
      </section>

      <style>{`
        @media (max-width: 880px) {
          .auth-root { grid-template-columns: 1fr !important; }
          .auth-brand { min-height: auto !important; padding: 28px 32px !important; flex-direction: row !important; align-items: center !important; justify-content: space-between !important; gap: 24px; }
          .auth-brand h2, .auth-brand p, .auth-brand ul { display: none !important; }
          .auth-form-side { padding: 80px 28px 64px !important; }
        }
        @media (max-width: 560px) {
          .auth-brand { display: none !important; }
          .auth-mobile-logo { display: block !important; }
          .auth-back-link { top: auto !important; right: auto !important; position: static !important; display: block; margin-bottom: 24px; }
        }
        @media (min-width: 561px) {
          .auth-mobile-logo { display: none !important; }
        }
      `}</style>
    </div>
    </AuthSpaceProvider>
  );
}
