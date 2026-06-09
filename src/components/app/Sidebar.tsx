"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
import { Icon } from "@/components/ui/Icon";
import { NAV } from "@/lib/nav";
import { logoutAction } from "@/server/auth-actions";

type Badges = { prospects?: number; documents?: number };

export function Sidebar({
  user,
  badges = {},
  platformAdmin = false,
}: {
  user: { name: string; initials: string; orgName: string };
  badges?: Badges;
  platformAdmin?: boolean;
}) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <aside
      style={{
        width: "var(--sidebar-w)",
        flex: "none",
        height: "100vh",
        position: "sticky",
        top: 0,
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        zIndex: 30,
      }}
    >
      <div style={{ height: "var(--topbar-h)", display: "flex", alignItems: "center", padding: "0 20px", borderBottom: "1px solid var(--border-2)" }}>
        <Logo />
      </div>

      <nav style={{ flex: 1, overflowY: "auto", padding: "14px 12px" }}>
        <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-4)", padding: "6px 12px 8px" }}>
          Pilotage
        </div>
        {NAV.map((n) => {
          const active = isActive(n.href);
          const badge = n.badgeKey ? badges[n.badgeKey] : undefined;
          return (
            <Link
              key={n.id}
              href={n.href}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 11,
                padding: "9px 12px",
                borderRadius: 10,
                marginBottom: 2,
                background: active ? "var(--primary-50)" : "transparent",
                color: active ? "var(--primary-700)" : "var(--ink-2)",
                fontWeight: active ? 700 : 600,
                fontSize: 13.5,
                position: "relative",
              }}
            >
              {active && <span style={{ position: "absolute", left: 0, top: 8, bottom: 8, width: 3, borderRadius: 99, background: "var(--primary)" }} />}
              <Icon name={n.icon} size={18} stroke={active ? 2.2 : 2} />
              <span style={{ flex: 1, textAlign: "left" }}>{n.label}</span>
              {badge ? (
                <span
                  style={{
                    minWidth: 19,
                    height: 19,
                    padding: "0 5px",
                    borderRadius: 99,
                    background: active ? "var(--primary)" : "var(--surface-3)",
                    color: active ? "#fff" : "var(--ink-3)",
                    fontSize: 11,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: 12, borderTop: "1px solid var(--border-2)" }}>
        {platformAdmin && (
          <Link
            href="/admin"
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 11, padding: "9px 12px", borderRadius: 10, marginBottom: 6,
              color: "#fff", background: "linear-gradient(135deg,#2a2550,#5850ec)", fontWeight: 700, fontSize: 13.5 }}
          >
            <Icon name="shield" size={18} /> Administration plateforme
          </Link>
        )}
        <Link
          href="/parametres"
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 11,
            padding: "9px 12px",
            borderRadius: 10,
            color: isActive("/parametres") ? "var(--primary-700)" : "var(--ink-2)",
            background: isActive("/parametres") ? "var(--primary-50)" : "transparent",
            fontWeight: 600,
            fontSize: 13.5,
          }}
        >
          <Icon name="settings" size={18} /> Paramètres
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 10px 4px", marginTop: 6 }}>
          <div className="avatar" style={{ width: 34, height: 34, background: "linear-gradient(140deg,#6a5cf0,#5850ec)" }}>{user.initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 12.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</div>
            <div style={{ fontSize: 11, color: "var(--ink-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.orgName}</div>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="btn-ghost"
              style={{ width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-3)", border: "none", background: "transparent" }}
              title="Déconnexion"
            >
              <Icon name="logout" size={16} />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
