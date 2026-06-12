"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const navLinks = [
  { label: "Formations", to: "/formation" },
  { label: "Bilan de compétences", to: "/bilan-de-competences" },
  { label: "Centres", to: "/centres" },
  { label: "À propos", to: "/a-propos" },
  { label: "Contact", to: "/contact" },
];

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
            width={160}
            height={46}
            priority
            style={{ height: 46, width: "auto", objectFit: "contain" }}
          />
        </Link>

        {/* Nav desktop — cachée sous 1024px */}
        <nav
          className="vitrine-desktop-only"
          style={{ display: "flex", gap: 16, marginLeft: 6, flexWrap: "nowrap" }}
        >
          {navLinks.map((link) => (
            <Link
              key={link.to}
              href={link.to}
              style={{
                fontSize: ".92rem",
                fontWeight: 600,
                color: pathname === link.to ? "#15314C" : "#5d6f7c",
                padding: "6px 0",
                position: "relative",
                whiteSpace: "nowrap",
                transition: "color .2s",
                textDecoration: "none",
              }}
            >
              {link.label}
            </Link>
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
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  href={link.to}
                  onClick={() => setOpen(false)}
                  style={{
                    display: "block",
                    padding: "13px 8px",
                    fontSize: "1rem",
                    fontWeight: 600,
                    color: pathname === link.to ? "#15314C" : "#5d6f7c",
                    borderBottom: "1px solid rgba(21,49,76,.07)",
                    textDecoration: "none",
                  }}
                >
                  {link.label}
                </Link>
              ))}

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
