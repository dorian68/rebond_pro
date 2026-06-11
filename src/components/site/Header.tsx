"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/site/ui/button";
import { Logo } from "@/components/app/Logo";
import { Menu, X, Building2, UserRound } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { label: "Accueil", to: "/" },
  { label: "Formations", to: "/formation" },
  { label: "Bilan de compétences", to: "/bilan-de-competences" },
  { label: "Bilan d’orientation", to: "/bilan-orientation" },
  { label: "À propos", to: "/a-propos" },
  { label: "Blog", to: "/blog" },
  { label: "Contact", to: "/contact" },
];

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-lg border-b border-border/40">
      <div className="container mx-auto flex items-center justify-between h-18 px-4 lg:px-8 py-3">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Logo size={54} priority />
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
        <div className="hidden lg:flex items-center gap-2.5">
          <Link href="/espace">
            <Button variant="outline" size="sm" className="gap-1.5 border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground">
              <UserRound className="w-3.5 h-3.5" />
              Espace client
            </Button>
          </Link>
          <Link href="/marketplace">
            <Button size="sm" className="btn-cta font-semibold px-4">
              Trouver une formation
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
                <Link href="/marketplace" onClick={() => setMobileOpen(false)}>
                  <Button variant="outline" className="w-full border-primary/40 text-primary">
                    Trouver une formation
                  </Button>
                </Link>
                <Link href="/bilan-de-competences" onClick={() => setMobileOpen(false)}>
                  <Button className="w-full btn-cta font-semibold h-14 text-base">
                    Faire un bilan de compétences
                  </Button>
                </Link>
                <Link href="/espace" onClick={() => setMobileOpen(false)} className="mt-1">
                  <Button variant="outline" className="w-full gap-1.5 border-primary/40 text-primary">
                    <UserRound className="w-4 h-4" />
                    Espace client
                  </Button>
                </Link>
                <Link
                  href="/centres"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-primary hover:bg-muted/50 transition-colors"
                >
                  <Building2 className="w-4 h-4" />
                  Espace partenaires
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
