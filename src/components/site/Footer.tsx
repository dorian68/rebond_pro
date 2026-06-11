import Link from "next/link";
import { Phone, Mail, MapPin, ArrowRight, Building2 } from "lucide-react";
import { Logo } from "@/components/app/Logo";

const Footer = () => {
  return (
    <footer className="bg-foreground text-background">
      {/* Pont B2B — vers le cockpit des centres de formation */}
      <div className="bg-primary/5 border-b border-primary/10">
        <div className="container mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-center gap-x-6 gap-y-3 text-center">
          <p className="text-primary font-display font-semibold text-lg">
            <Building2 className="w-5 h-5 inline-block mr-2 -mt-1" />
            Vous êtes un organisme de formation partenaire ?
          </p>
          <Link
            href="/centres"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:gap-3 transition-all duration-300"
          >
            Découvrir l’espace partenaires
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <div className="mb-4 rounded-xl bg-white p-2 w-fit">
              <Logo size={72} />
            </div>
            <p className="text-sm opacity-60 leading-relaxed">
              La plateforme qui transforme les périodes de doute en trajectoires professionnelles claires.
            </p>
          </div>

          {/* Navigation (B2C) */}
          <div>
            <h4 className="font-display font-semibold text-lg mb-4">Navigation</h4>
            <ul className="space-y-2.5 text-sm opacity-60">
              <li><Link href="/" className="hover:text-accent transition-colors duration-300">Accueil</Link></li>
              <li><Link href="/formation" className="hover:text-accent transition-colors duration-300">Trouver une formation</Link></li>
              <li><Link href="/bilan-de-competences" className="hover:text-accent transition-colors duration-300">Bilan de compétences</Link></li>
              <li><Link href="/bilan-orientation" className="hover:text-accent transition-colors duration-300">Bilan d’orientation</Link></li>
              <li><Link href="/a-propos" className="hover:text-accent transition-colors duration-300">À propos</Link></li>
              <li><Link href="/blog" className="hover:text-accent transition-colors duration-300">Blog</Link></li>
              <li><Link href="/contact" className="hover:text-accent transition-colors duration-300">Contact</Link></li>
            </ul>
          </div>

          {/* Centres de formation (B2B) */}
          <div>
            <h4 className="font-display font-semibold text-lg mb-4">Partenaires formation</h4>
            <ul className="space-y-2.5 text-sm opacity-60">
              <li><Link href="/marketplace" className="hover:text-accent transition-colors duration-300">Catalogue des formations</Link></li>
              <li><Link href="/centres" className="hover:text-accent transition-colors duration-300">Rejoindre le réseau</Link></li>
              <li><Link href="/login" className="hover:text-accent transition-colors duration-300">Connexion partenaire</Link></li>
              <li><Link href="/register" className="hover:text-accent transition-colors duration-300">Créer mon espace partenaire</Link></li>
            </ul>
            <div className="mt-4 flex gap-2">
              <span className="text-xs bg-accent/20 text-accent px-3 py-1.5 rounded-full font-medium">Finançable CPF</span>
              <span className="text-xs bg-accent/20 text-accent px-3 py-1.5 rounded-full font-medium">Qualiopi</span>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display font-semibold text-lg mb-4">Contact</h4>
            <ul className="space-y-3 text-sm opacity-60">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 mt-0.5 text-accent flex-shrink-0" />
                <span>Pointe-à-Pitre, Guadeloupe</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-accent flex-shrink-0" />
                <span>06 90 XX XX XX</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-accent flex-shrink-0" />
                <span>contact@lebonrebond.fr</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-background/10 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm opacity-50">
          <span>© {new Date().getFullYear()} Le Bon Rebond – Orientation, formation et reconversion.</span>
          <span className="flex flex-wrap gap-x-4 gap-y-1 justify-center">
            <Link href="/legal/cgu" className="hover:text-accent transition-colors duration-300">CGU</Link>
            <Link href="/legal/confidentialite" className="hover:text-accent transition-colors duration-300">Confidentialité</Link>
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
