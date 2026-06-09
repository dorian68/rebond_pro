"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

const ITEMS = [
  { href: "/espace", label: "Vue d'ensemble", icon: "dashboard" },
  { href: "/espace/parcours", label: "Mon parcours", icon: "list-checks" },
  { href: "/espace/catalogue", label: "Catalogue de formations", icon: "book" },
  { href: "/espace/profil", label: "Mon profil", icon: "user" },
];

export function EspaceNav() {
  const pathname = usePathname();
  return (
    <nav style={{ borderBottom: "1px solid var(--border)", background: "#fff", overflowX: "auto" }}>
      <div style={{ maxWidth: 920, margin: "0 auto", padding: "0 20px", display: "flex", gap: 4 }}>
        {ITEMS.map((it) => {
          const active = it.href === "/espace" ? pathname === "/espace" : pathname.startsWith(it.href);
          return (
            <Link key={it.href} href={it.href}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "12px 12px", fontSize: 13.5, fontWeight: active ? 700 : 500, whiteSpace: "nowrap",
                color: active ? "var(--primary)" : "var(--ink-2)", borderBottom: `2px solid ${active ? "var(--primary)" : "transparent"}`, marginBottom: -1 }}>
              <Icon name={it.icon} size={15} /> {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
