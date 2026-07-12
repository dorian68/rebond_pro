import Link from "next/link";
import { Logo } from "@/components/app/Logo";

export const metadata = { title: "CGU — Le Bon Rebond" };

export default function TermsPage() {
  return (
    <main className="public-page">
      <header className="marketing-nav public-nav"><Link href="/"><Logo size={52} priority /></Link></header>
      <article className="legal-page">
        <span className="eyebrow">Cadre d&apos;utilisation</span>
        <h1>Conditions Générales d&apos;Utilisation</h1>
        <p style={{ color: "#6b7280", marginBottom: 32 }}>En vigueur au 12 juillet 2026</p>

        <h2>1. Objet</h2>
        <p>Les présentes CGU régissent l&apos;accès et l&apos;utilisation de la plateforme <strong>Le Bon Rebond</strong>, incluant ses services d&apos;orientation, son réseau de formations et son espace partenaires.</p>

        <h2>2. Accès au service</h2>
        <p>Le service s&apos;adresse aux particuliers, bénéficiaires, formateurs, organismes de formation et entreprises. Certaines fonctions nécessitent un compte et l&apos;acceptation des présentes CGU. L&apos;utilisateur s&apos;engage à fournir des informations exactes.</p>

        <h2>3. Compte utilisateur</h2>
        <p>Chaque utilisateur est responsable de la confidentialité de ses identifiants. En cas de compromission suspectée, l&apos;utilisateur doit immédiatement informer Le Bon Rebond. Toute utilisation du compte reste sous la responsabilité du titulaire.</p>

        <h2>4. Données saisies</h2>
        <p>Les données métier saisies (apprenants, formations, sessions, prospects…) appartiennent à l&apos;utilisateur. Le Bon Rebond n&apos;en revendique aucun droit de propriété. En cas de résiliation, l&apos;utilisateur peut exporter ses données avant la clôture du compte.</p>

        <h2>5. Utilisation acceptable</h2>
        <p>Il est interdit d&apos;utiliser la plateforme à des fins illicites, de tenter d&apos;en compromettre la sécurité, ou de partager l&apos;accès à des tiers non autorisés. Le Bon Rebond se réserve le droit de suspendre tout compte en violation de ces règles.</p>

        <h2>6. Essai gratuit</h2>
        <p>L&apos;essai centre dure 14 jours sans carte bancaire. À expiration, le compte est basculé sur le plan gratuit avec fonctionnalités limitées. Les prix et conditions applicables sont présentés avant toute souscription.</p>

        <h2>7. Disponibilité</h2>
        <p>Le Bon Rebond s&apos;efforce de maintenir la disponibilité du service 24h/24, 7j/7 mais ne peut garantir une disponibilité ininterrompue. Des maintenances planifiées peuvent entraîner des interruptions communiquées avec un préavis raisonnable.</p>

        <h2>8. Propriété intellectuelle</h2>
        <p>La plateforme, son code, son design et ses contenus sont protégés par le droit de la propriété intellectuelle. L&apos;utilisateur bénéficie d&apos;une licence d&apos;utilisation non exclusive et non transférable, limitée à la durée de l&apos;abonnement.</p>

        <h2>9. Responsabilité</h2>
        <p>L&apos;utilisateur professionnel reste responsable des données saisies et de ses obligations réglementaires. Les recommandations d&apos;orientation ne remplacent pas un avis professionnel individualisé. L&apos;éligibilité à un financement n&apos;est jamais garantie par la seule présence d&apos;une offre sur la plateforme.</p>

        <h2>10. Résiliation</h2>
        <p>L&apos;utilisateur peut résilier son compte à tout moment depuis les Paramètres. Le Bon Rebond peut résilier un compte en cas de non-paiement ou de violation des CGU, après préavis de 15 jours.</p>

        <h2>11. Droit applicable</h2>
        <p>Les présentes CGU sont soumises au droit français. Les règles impératives de compétence et de protection des consommateurs demeurent applicables.</p>

        <h2>12. Modifications</h2>
        <p>Le Bon Rebond se réserve le droit de modifier les présentes CGU. Les utilisateurs seront informés par email avec un préavis de 30 jours. La poursuite de l&apos;utilisation vaut acceptation des nouvelles conditions.</p>

        <p style={{ marginTop: 40, padding: "16px 20px", background: "#f3f4f6", borderRadius: 10, fontSize: 14 }}>
          Éditeur et contact : <Link href="/legal/mentions">mentions légales</Link> · <a href="mailto:contact.lebondrebond@gmail.com">contact.lebondrebond@gmail.com</a>
        </p>
      </article>
    </main>
  );
}
