import { Icon } from "@/components/ui/Icon";
import { requirePlatformAdmin } from "@/lib/platform";
import { logoutAction } from "@/server/auth-actions";
import { AgentDock } from "@/components/agent/AgentDock";
import { AdminNav } from "./admin-nav";
import styles from "./admin-shell.module.css";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requirePlatformAdmin();

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(255,255,255,.14)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="shield" size={19} /></div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15 }}>Administration</div>
              <div className={styles.brandSubtitle} style={{ fontSize: 11, color: "rgba(255,255,255,.55)" }}>Plateforme · réseau</div>
            </div>
          </div>
        </div>
        <AdminNav />
        <div className={styles.sidebarFooter}>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.6)", marginBottom: 8 }}>{admin.name ?? admin.email}</div>
          <form action={logoutAction}>
            <button type="submit" className="btn btn-ghost btn-sm" title="Déconnexion" style={{ color: "#fff", width: "100%", justifyContent: "center" }}>
              <Icon name="logout" size={16} /> Déconnexion
            </button>
          </form>
        </div>
      </aside>

      <main className={styles.main}>{children}</main>
      <AgentDock />
    </div>
  );
}
