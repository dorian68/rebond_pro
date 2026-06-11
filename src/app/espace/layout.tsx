import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/app/Logo";
import { Icon } from "@/components/ui/Icon";
import { requireTenant } from "@/lib/tenant";
import { logoutAction } from "@/server/auth-actions";
import { AgentDock } from "@/components/agent/AgentDock";
import { EspaceNav } from "./espace-nav";

export default async function EspaceLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireTenant();
  if (ctx.role !== "LEARNER" && ctx.role !== "OWNER" && ctx.role !== "ADMIN") redirect("/dashboard");
  const initial = (ctx.name ?? ctx.email ?? "?").slice(0, 2).toUpperCase();

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      <header style={{ background: "#fff", borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 920, margin: "0 auto", padding: "0 20px", height: 60, display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/espace"><Logo size={44} priority /></Link>
          <span style={{ fontSize: 13, color: "var(--ink-3)", marginLeft: 4 }}>Mon espace</span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(140deg,#6a5cf0,#5850ec)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>{initial}</div>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-2)" }}>{ctx.name ?? ctx.email}</span>
            {(ctx.role === "OWNER" || ctx.role === "ADMIN") && (
              <Link href="/dashboard" className="btn btn-secondary btn-sm"><Icon name="dashboard" size={14} /> Back-office</Link>
            )}
            <form action={logoutAction}><button type="submit" className="btn btn-ghost btn-icon" title="Déconnexion"><Icon name="logout" size={17} /></button></form>
          </div>
        </div>
      </header>

      <EspaceNav />

      <main style={{ flex: 1, maxWidth: 920, margin: "0 auto", width: "100%", padding: "28px 20px" }}>{children}</main>

      <footer style={{ borderTop: "1px solid var(--border)", padding: "16px 20px", textAlign: "center" }}>
        <span style={{ fontSize: 12, color: "var(--ink-4)" }}>Le Bon Rebond · Espace personnel d&apos;accompagnement</span>
      </footer>
      <AgentDock />
    </div>
  );
}
