import { Logo } from "@/components/app/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "var(--bg)" }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
          <Logo size={76} priority />
        </div>
        <div className="card card-pad fade-up" style={{ padding: 30 }}>
          {children}
        </div>
        <p style={{ textAlign: "center", marginTop: 20, fontSize: 12.5, color: "var(--ink-3)" }}>
          Orientation, formation et espace partenaires.
        </p>
      </div>
    </div>
  );
}
