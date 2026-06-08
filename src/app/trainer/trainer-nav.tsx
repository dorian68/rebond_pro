"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

const ITEMS = [
  { href: "/trainer", label: "Vue d'ensemble", icon: "dashboard" },
  { href: "/trainer/disponibilites", label: "Mes disponibilités", icon: "calendar" },
  { href: "/trainer/planning", label: "Mon planning", icon: "calendar-range" },
  { href: "/trainer/demandes", label: "Mes demandes", icon: "message" },
  { href: "/trainer/profil", label: "Mon profil", icon: "user" },
];

export function TrainerNav() {
  const pathname = usePathname();
  return (
    <nav style={{ borderBottom: "1px solid var(--border)", background: "#fff", overflowX: "auto" }}>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 20px", display: "flex", gap: 4 }}>
        {ITEMS.map((it) => {
          const active = it.href === "/trainer" ? pathname === "/trainer" : pathname.startsWith(it.href);
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
