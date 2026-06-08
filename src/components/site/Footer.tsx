import Link from "next/link";
import { Phone, Mail, MapPin, ArrowRight, Building2 } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-foreground text-background">
      {/* Pont B2B — vers le cockpit des centres de formation */}
      <div className="bg-primary/5 border-b border-primary/10">
        <div className="container mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-center gap-x-6 gap-y-3 text-center">
          <p className="text-primary font-display font-semibold text-lg">
            <Building2 className="w-5 h-5 inline-block mr-2 -mt-1" />
            Vous êtes un organisme de formation ?
          </p>
          <Link
            href="/centres"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:gap-3 transition-all duration-300"
          >
            Découvrir le cockpit RebondPro
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <span className="text-primary font-display font-bold text-xl">R</span>
              </div>
              <span className="font-display font-bold text-xl">
                Rebond <span className="text-accent">Pro</span>
              </span>
            </div>
            <p className="text-sm opacity-60 leading-relaxed">
              Le premier bilan de compétences en Guadeloupe qui crée un vrai pont entre réflexion et action.
            </p>
          </div>

          {/* Navigation (B2C) */}
          <div>
            <h4 className="font-display font-semibold text-lg mb-4">Navigation</h4>
            <ul className="space-y-2.5 text-sm opacity-60">
              <li><Link href="/" className="hover:text-accent transition-colors duration-300">Accueil</Link></li>
              <li><Link href="/methode" className="hover:text-accent transition-colors duration-300">Notre méthode</Link></li>
              <li><Link href="/deroulement" className="hover:text-accent transition-colors duration-300">Déroulement</Link></li>
              <li><Link href="/tarifs" className="hover:text-accent transition-colors duration-300">Tarifs & Financements</Link></li>
              <li><Link href="/pour-qui" className="hover:text-accent transition-colors duration-300">Pour qui ?</Link></li>
              <li><Link href="/temoignages" className="hover:text-accent transition-colors duration-300">Témoignages</Link></li>
              <li><Link href="/contact" className="hover:text-accent transition-colors duration-300">Contact</Link></li>
            </ul>
          </div>

          {/* Centres de formation (B2B) */}
          <div>
            <h4 className="font-display font-semibold text-lg mb-4">Centres de formation</h4>
            <ul className="space-y-2.5 text-sm opacity-60">
              <li><Link href="/centres" className="hover:text-accent transition-colors duration-300">Le cockpit RebondPro</Link></li>
              <li><Link href="/marketplace" className="hover:text-accent transition-colors duration-300">Catalogue des formations</Link></li>
              <li><Link href="/login" className="hover:text-accent transition-colors duration-300">Connexion centre</Link></li>
              <li><Link href="/register" className="hover:text-accent transition-colors duration-300">Créer mon espace centre</Link></li>
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
                <span>contact@rebondpro.fr</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-background/10 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm opacity-50">
          <span>© {new Date().getFullYear()} Rebond Pro – Organisme de bilan de compétences en Guadeloupe.</span>
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
