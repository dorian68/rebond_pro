"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

const ITEMS = [
  { href: "/admin", label: "Vue d'ensemble", icon: "gauge" },
  { href: "/admin/centres", label: "Centres", icon: "building" },
  { href: "/admin/formateurs", label: "Formateurs", icon: "presentation" },
  { href: "/admin/beneficiaires", label: "Bénéficiaires", icon: "smile" },
  { href: "/admin/documents", label: "Bibliothèque docs", icon: "file-text" },
  { href: "/admin/roadmap", label: "Roadmap", icon: "target" },
  { href: "/admin/agents", label: "Agents sandbox", icon: "sparkles" },
  { href: "/admin/finances", label: "Flux financiers", icon: "euro" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav style={{ display: "flex", flexDirection: "column", gap: 4, padding: 12 }}>
      {ITEMS.map((it) => {
        const active = it.href === "/admin" ? pathname === "/admin" : pathname.startsWith(it.href);
        return (
          <Link key={it.href} href={it.href}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, fontSize: 14, fontWeight: active ? 700 : 500,
              color: active ? "#fff" : "rgba(255,255,255,.62)", background: active ? "rgba(255,255,255,.12)" : "transparent" }}>
            <Icon name={it.icon} size={18} /> {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
