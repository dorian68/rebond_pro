"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import styles from "./admin-shell.module.css";

const ITEMS = [
  { href: "/admin", label: "Vue d'ensemble", icon: "gauge" },
  { href: "/admin/centres", label: "Centres", icon: "building" },
  { href: "/admin/formateurs", label: "Formateurs", icon: "presentation" },
  { href: "/admin/beneficiaires", label: "Bénéficiaires", icon: "smile" },
  { href: "/admin/documents", label: "Bibliothèque docs", icon: "file-text" },
  { href: "/admin/roadmap", label: "Roadmap", icon: "target" },
  { href: "/admin/roadmap-2", label: "Roadmap 2", icon: "layers" },
  { href: "/admin/agents", label: "Agents sandbox", icon: "sparkles" },
  { href: "/admin/finances", label: "Flux financiers", icon: "euro" },
  { href: "/admin/super-admins", label: "Super-admins", icon: "shield" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className={styles.nav} aria-label="Navigation administration">
      {ITEMS.map((it) => {
        const active = it.href === "/admin" || it.href === "/admin/roadmap"
          ? pathname === it.href
          : pathname.startsWith(it.href);
        return (
          <Link key={it.href} href={it.href} className={styles.navLink}
            style={{ fontWeight: active ? 700 : 500,
              color: active ? "#fff" : "rgba(255,255,255,.62)", background: active ? "rgba(255,255,255,.12)" : "transparent" }}>
            <Icon name={it.icon} size={18} /> {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
