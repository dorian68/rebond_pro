import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { requirePlatformAdmin } from "@/lib/platform";
import { logoutAction } from "@/server/auth-actions";
import { AgentDock } from "@/components/agent/AgentDock";
import { AdminNav } from "./admin-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requirePlatformAdmin();

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "var(--bg)" }}>
      <aside style={{ width: 248, flexShrink: 0, background: "linear-gradient(180deg,#1a1830,#2a2550)", color: "#fff", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh" }}>
        <div style={{ padding: "20px 18px 8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(255,255,255,.14)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="shield" size={19} /></div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15 }}>Administration</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.55)" }}>Plateforme · réseau</div>
            </div>
          </div>
        </div>
        <AdminNav />
        <div style={{ marginTop: "auto", padding: 14, borderTop: "1px solid rgba(255,255,255,.1)" }}>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.6)", marginBottom: 8 }}>{admin.name ?? admin.email}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/dashboard" className="btn btn-secondary btn-sm" style={{ flex: 1 }}><Icon name="dashboard" size={14} /> Mon centre</Link>
            <form action={logoutAction}><button type="submit" className="btn btn-ghost btn-icon" title="Déconnexion" style={{ color: "#fff" }}><Icon name="logout" size={16} /></button></form>
          </div>
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, padding: "28px 32px" }}>{children}</main>
      <AgentDock />
    </div>
  );
}
