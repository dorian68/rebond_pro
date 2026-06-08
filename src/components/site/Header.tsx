"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/site/ui/button";
import { Menu, X, Phone, Building2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { label: "Accueil", to: "/" },
  { label: "Notre méthode", to: "/methode" },
  { label: "Déroulement", to: "/deroulement" },
  { label: "Tarifs", to: "/tarifs" },
  { label: "Pour qui ?", to: "/pour-qui" },
  { label: "Témoignages", to: "/temoignages" },
  { label: "Contact", to: "/contact" },
];

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-lg border-b border-border/40">
      <div className="container mx-auto flex items-center justify-between h-18 px-4 lg:px-8 py-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-turquoise">
            <span className="text-primary-foreground font-display font-bold text-xl">R</span>
          </div>
          <div className="flex flex-col">
            <span className="font-display font-bold text-xl text-foreground leading-tight">
              Rebond <span className="text-primary">Pro</span>
            </span>
            <span className="text-[10px] text-muted-foreground tracking-wider uppercase">Bilan de compétences</span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-0.5">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              href={link.to}
              className={`relative px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                pathname === link.to
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {link.label}
              {pathname === link.to && (
                <motion.div layoutId="nav-underline" className="absolute bottom-0 left-3 right-3 h-0.5 bg-primary rounded-full" />
              )}
            </Link>
          ))}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden lg:flex items-center gap-3">
          <Link
            href="/centres"
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors duration-300"
          >
            <Building2 className="w-3.5 h-3.5" />
            Espace centres de formation
          </Link>
          <Link href="/contact#eligibilite">
            <Button variant="outline" size="sm" className="border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground">
              Éligibilité CPF
            </Button>
          </Link>
          <Link href="/contact">
            <Button size="sm" className="btn-cta font-semibold h-auto py-1.5 px-4 flex flex-col items-center">
              <span className="flex items-center gap-1">
                <Phone className="w-4 h-4" />
                RDV gratuit 45 min
              </span>
              <span className="text-[10px] opacity-80 font-normal">Sans engagement</span>
            </Button>
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="lg:hidden p-2 rounded-xl hover:bg-muted transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menu"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:hidden overflow-hidden border-t border-border/40 bg-background/95 backdrop-blur-lg"
          >
            <nav className="flex flex-col p-4 gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  href={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={`px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                    pathname === link.to
                      ? "text-primary bg-primary/5"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-border/40">
                <Link href="/contact#eligibilite" onClick={() => setMobileOpen(false)}>
                  <Button variant="outline" className="w-full border-primary/40 text-primary">
                    Vérifier mon éligibilité CPF
                  </Button>
                </Link>
                <Link href="/contact" onClick={() => setMobileOpen(false)}>
                  <Button className="w-full btn-cta font-semibold h-14 text-base flex flex-col items-center">
                    <span className="flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      Prendre RDV gratuit 45 min
                    </span>
                    <span className="text-xs opacity-80 font-normal">Sans engagement</span>
                  </Button>
                </Link>
                <Link
                  href="/centres"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center gap-1.5 mt-1 px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-primary hover:bg-muted/50 transition-colors"
                >
                  <Building2 className="w-4 h-4" />
                  Vous êtes un centre de formation ?
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
