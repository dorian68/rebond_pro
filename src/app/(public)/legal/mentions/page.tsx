import Link from "next/link";
import { Logo } from "@/components/app/Logo";

export const metadata = { title: "Mentions légales — Le Bon Rebond" };

export default function LegalNoticePage() {
  return (
    <main className="public-page">
      <header className="marketing-nav public-nav"><Link href="/"><Logo size={52} priority /></Link></header>
      <article className="legal-page">
        <span className="eyebrow">Informations légales</span>
        <h1>Mentions légales</h1>
        <p style={{ color: "#6b7280", marginBottom: 32 }}>En vigueur au 12 juillet 2026</p>

        <h2>1. Éditeur</h2>
        <p><strong>Le Bon Rebond</strong> est un service édité par <strong>OPTIQUANT IA</strong>, société par actions simplifiée unipersonnelle au capital de 1 000 euros.</p>
        <ul>
          <li>Siège social : 53 secteur 32 Réduit, 53 chemin de Petit Jardin, 97114 Trois-Rivières, France.</li>
          <li>SIREN : 943 812 297.</li>
          <li>SIRET du siège : 943 812 297 00019.</li>
          <li>RCS Basse-Terre : 943 812 297.</li>
          <li>TVA intracommunautaire : FR16 943812297.</li>
          <li>Contact : <a href="mailto:contact.lebondrebond@gmail.com">contact.lebondrebond@gmail.com</a> · +33 7 83 96 01 92.</li>
        </ul>

        <h2>2. Direction de la publication</h2>
        <p>Dorian Melvyn Labry, président d&apos;OPTIQUANT IA.</p>

        <h2>3. Hébergement</h2>
        <p>Application et base de données hébergées sur une infrastructure de <strong>Hetzner Online GmbH</strong>, Industriestr. 25, 91710 Gunzenhausen, Allemagne · +49 9831 505-0 · <a href="mailto:info@hetzner.com">info@hetzner.com</a>.</p>

        <h2>4. Rôle de la plateforme</h2>
        <p>Le Bon Rebond fournit des outils d&apos;orientation, de gestion et de mise en relation. Les formations affichées sont proposées sous la responsabilité des centres identifiés sur chaque fiche. Une publication sur la plateforme ne vaut pas, à elle seule, garantie d&apos;éligibilité à un financement public ou au CPF.</p>
        <p>OPTIQUANT IA ne revendique sur ce site aucune certification Qualiopi pour ses propres prestations. Toute information de certification fournie par un centre partenaire est présentée comme une déclaration du centre et doit pouvoir être vérifiée avant contractualisation.</p>

        <h2>5. Propriété intellectuelle</h2>
        <p>Les marques, textes, interfaces et éléments graphiques du service sont protégés. Toute reproduction non autorisée est interdite, hors exceptions prévues par la loi.</p>

        <h2>6. Contact juridique</h2>
        <p>Pour toute notification : <a href="mailto:contact.lebondrebond@gmail.com">contact.lebondrebond@gmail.com</a> ou à l&apos;adresse du siège social indiquée ci-dessus.</p>
      </article>
    </main>
  );
}
