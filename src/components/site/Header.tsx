"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Menu, X, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

type NavChild = { label: string; to: string };
type NavItem = { label: string; to?: string; children?: NavChild[] };

const navItems: NavItem[] = [
  {
    label: "Nos bilans",
    children: [
      { label: "Bilan de compétences", to: "/bilan-de-competences" },
      { label: "Bilan d'orientation", to: "/bilan-orientation" },
    ],
  },
  { label: "Trouver une formation", to: "/formation" },
  { label: "Pour les centres", to: "/centres" },
  {
    label: "À propos",
    children: [
      { label: "Qui sommes-nous ?", to: "/a-propos" },
      { label: "Blog et actus", to: "/blog" },
    ],
  },
  { label: "Contact", to: "/contact" },
];

const linkStyle = (active: boolean): React.CSSProperties => ({
  fontSize: ".92rem",
  fontWeight: 600,
  color: active ? "#15314C" : "#5d6f7c",
  padding: "6px 0",
  whiteSpace: "nowrap",
  transition: "color .2s",
  textDecoration: "none",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  background: "none",
  border: "none",
});

/** Onglet desktop : lien simple ou menu déroulant (au survol). */
function DesktopNavItem({ item, pathname }: { item: NavItem; pathname: string }) {
  const [hover, setHover] = useState(false);

  if (!item.children) {
    return (
      <Link href={item.to!} style={linkStyle(pathname === item.to)}>
        {item.label}
      </Link>
    );
  }

  const active = item.children.some((c) => pathname === c.to);

  return (
    <div style={{ position: "relative" }} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <span style={linkStyle(active)}>
        {item.label}
        <ChevronDown size={15} style={{ transition: "transform .2s", transform: hover ? "rotate(180deg)" : "none" }} />
      </span>
      <AnimatePresence>
        {hover && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            // paddingTop garde la zone de survol continue (pas de "trou" qui referme le menu)
            style={{ position: "absolute", top: "100%", left: 0, paddingTop: 10, minWidth: 234, zIndex: 70 }}
          >
            <div
              style={{
                background: "rgba(250,245,236,.99)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(21,49,76,.12)",
                borderRadius: 14,
                boxShadow: "0 16px 40px rgba(21,49,76,.14)",
                padding: 8,
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              {item.children.map((c) => (
                <Link
                  key={c.to}
                  href={c.to}
                  style={{
                    display: "block",
                    padding: "10px 14px",
                    borderRadius: 9,
                    fontSize: ".9rem",
                    fontWeight: 600,
                    color: pathname === c.to ? "#15314C" : "#5d6f7c",
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                    background: pathname === c.to ? "rgba(21,49,76,.06)" : "transparent",
                  }}
                >
                  {c.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const Header = () => {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 60,
        background: "rgba(250,245,236,.88)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(21,49,76,.10)",
      }}
    >
      <div
        className="container"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 22,
          height: 84,
          flexWrap: "nowrap",
        }}
      >
        {/* Logo */}
        <Link href="/" style={{ height: 46, flexShrink: 0 }} aria-label="Le Bon Rebond — accueil">
          <Image
            src="/brand/logo-le-bon-rebond.png"
            alt="Le Bon Rebond"
            width={114}
            height={46}
            loading="eager"
            style={{ height: 46, width: 114, objectFit: "contain" }}
          />
        </Link>

        {/* Nav desktop — cachée sous 1024px */}
        <nav
          className="vitrine-desktop-only"
          style={{ display: "flex", gap: 24, marginLeft: 10, flexWrap: "nowrap" }}
        >
          {navItems.map((item) => (
            <DesktopNavItem key={item.label} item={item} pathname={pathname} />
          ))}
        </nav>

        {/* CTAs droite */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
          {/* Connexion unifiée (double espace client/centre sur /login) ; caché sous 1220px */}
          <Link
            href="/login"
            className="vitrine-nav-wide"
            style={{ fontWeight: 600, color: "#5d6f7c", fontSize: ".93rem", whiteSpace: "nowrap", textDecoration: "none" }}
          >
            Connexion
          </Link>

          {/* Bouton RDV — visible desktop uniquement */}
          <Link href="/contact" className="vitrine-desktop-only" style={{ textDecoration: "none" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "#15314C",
                color: "#fff",
                padding: "12px 24px",
                borderRadius: 100,
                fontWeight: 700,
                fontSize: ".93rem",
                whiteSpace: "nowrap",
                transition: "background .2s, transform .2s",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "#0E2438";
                (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "#15314C";
                (e.currentTarget as HTMLElement).style.transform = "none";
              }}
            >
              Prendre rendez-vous
            </span>
          </Link>

          {/* Hamburger — mobile uniquement */}
          <button
            className="vitrine-mobile-only"
            onClick={() => setOpen(!open)}
            style={{ padding: 8, background: "none", border: "none", cursor: "pointer", display: "flex" }}
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          >
            {open ? <X size={24} color="#15314C" /> : <Menu size={24} color="#15314C" />}
          </button>
        </div>
      </div>

      {/* Menu mobile */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            style={{
              overflow: "hidden",
              borderTop: "1px solid rgba(21,49,76,.10)",
              background: "rgba(250,245,236,.98)",
            }}
          >
            <nav style={{ padding: "16px 24px 24px" }}>
              {navItems.map((item) =>
                item.children ? (
                  <div key={item.label} style={{ borderBottom: "1px solid rgba(21,49,76,.07)", paddingBottom: 6 }}>
                    <div
                      style={{
                        padding: "13px 8px 4px",
                        fontSize: ".76rem",
                        fontWeight: 700,
                        letterSpacing: ".09em",
                        textTransform: "uppercase",
                        color: "rgba(21,49,76,.45)",
                      }}
                    >
                      {item.label}
                    </div>
                    {item.children.map((c) => (
                      <Link
                        key={c.to}
                        href={c.to}
                        onClick={() => setOpen(false)}
                        style={{
                          display: "block",
                          padding: "10px 16px",
                          fontSize: ".98rem",
                          fontWeight: 600,
                          color: pathname === c.to ? "#15314C" : "#5d6f7c",
                          textDecoration: "none",
                        }}
                      >
                        {c.label}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <Link
                    key={item.to}
                    href={item.to!}
                    onClick={() => setOpen(false)}
                    style={{
                      display: "block",
                      padding: "13px 8px",
                      fontSize: "1rem",
                      fontWeight: 600,
                      color: pathname === item.to ? "#15314C" : "#5d6f7c",
                      borderBottom: "1px solid rgba(21,49,76,.07)",
                      textDecoration: "none",
                    }}
                  >
                    {item.label}
                  </Link>
                ),
              )}

              <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
                <Link
                  href="/contact"
                  onClick={() => setOpen(false)}
                  style={{
                    display: "block",
                    textAlign: "center",
                    background: "#15314C",
                    color: "#fff",
                    padding: "15px 28px",
                    borderRadius: 100,
                    fontWeight: 700,
                    fontSize: "1rem",
                    textDecoration: "none",
                  }}
                >
                  Prendre rendez-vous
                </Link>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  style={{
                    display: "block",
                    textAlign: "center",
                    border: "1.5px solid rgba(21,49,76,.25)",
                    color: "#15314C",
                    padding: "14px 28px",
                    borderRadius: 100,
                    fontWeight: 700,
                    fontSize: ".95rem",
                    textDecoration: "none",
                    background: "transparent",
                  }}
                >
                  Connexion
                </Link>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
