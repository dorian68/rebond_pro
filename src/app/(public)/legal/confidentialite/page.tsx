import Link from "next/link";
import { Logo } from "@/components/app/Logo";

export const metadata = { title: "Politique de confidentialité — RebondPro Formation" };

export default function PrivacyPage() {
  return (
    <main className="public-page">
      <header className="marketing-nav public-nav"><Link href="/"><Logo size={34} /></Link></header>
      <article className="legal-page">
        <span className="eyebrow">Vie privée & RGPD</span>
        <h1>Politique de confidentialité</h1>
        <p style={{ color: "#6b7280", marginBottom: 32 }}>En vigueur au 1er juin 2026 — conforme au RGPD</p>

        <h2>1. Responsable du traitement</h2>
        <p><strong>RebondPro Formation</strong>, SAS dont le siège social est situé en Martinique (97200). Contact DPO : <a href="mailto:dpo@rebondpro.fr">dpo@rebondpro.fr</a>.</p>

        <h2>2. Données collectées</h2>
        <ul>
          <li><strong>Données de compte :</strong> nom, email, mot de passe haché, rôle.</li>
          <li><strong>Données métier :</strong> informations sur les formations, sessions, apprenants, formateurs, prospects — saisies par l&apos;utilisateur dans le cadre de son activité professionnelle.</li>
          <li><strong>Données de navigation :</strong> logs d&apos;accès (IP, user-agent, timestamp) à des fins de sécurité.</li>
          <li><strong>Données de facturation :</strong> coordonnées de facturation, historique des paiements (via Stripe — certifié PCI-DSS).</li>
        </ul>

        <h2>3. Finalités du traitement</h2>
        <ul>
          <li>Fournir et améliorer le service RebondPro Formation.</li>
          <li>Assurer la sécurité et l&apos;intégrité de la plateforme.</li>
          <li>Gérer la relation contractuelle et la facturation.</li>
          <li>Envoyer des communications relatives au service (mises à jour, alertes).</li>
        </ul>

        <h2>4. Base légale</h2>
        <p>Les traitements reposent sur : (a) l&apos;exécution du contrat d&apos;abonnement, (b) nos intérêts légitimes (sécurité, amélioration du service), (c) le consentement pour les communications marketing.</p>

        <h2>5. Durée de conservation</h2>
        <p>Données de compte et métier : durée de l&apos;abonnement + 30 jours après résiliation (délai d&apos;export). Données de facturation : 10 ans (obligations légales). Logs de sécurité : 12 mois.</p>

        <h2>6. Sous-traitants</h2>
        <ul>
          <li><strong>Hébergement & base de données :</strong> Supabase (PostgreSQL, Europe).</li>
          <li><strong>Paiement :</strong> Stripe (PCI-DSS).</li>
          <li><strong>Email transactionnel :</strong> Resend.</li>
          <li><strong>IA :</strong> Anthropic (Claude) — données traitées pour les fonctionnalités IA uniquement, sans conservation à des fins d&apos;entraînement.</li>
        </ul>

        <h2>7. Vos droits</h2>
        <p>Conformément au RGPD, vous disposez des droits d&apos;accès, de rectification, d&apos;effacement, de portabilité, d&apos;opposition et de limitation. L&apos;export CSV de vos données est disponible directement dans Paramètres &gt; Avancé.</p>
        <p>Pour exercer vos droits : <a href="mailto:dpo@rebondpro.fr">dpo@rebondpro.fr</a>. Vous pouvez également introduire une réclamation auprès de la <strong>CNIL</strong>.</p>

        <h2>8. Cookies</h2>
        <p>Nous utilisons uniquement des cookies strictement nécessaires au fonctionnement du service (session d&apos;authentification). Aucun cookie publicitaire ou de tracking tiers n&apos;est utilisé.</p>

        <h2>9. Sécurité</h2>
        <p>Mesures en place : chiffrement TLS en transit, mots de passe hashés (bcrypt), isolation multi-tenant des données, journalisation des accès, sauvegardes quotidiennes chiffrées.</p>

        <h2>10. Modifications</h2>
        <p>Toute modification substantielle sera communiquée par email avec un préavis de 30 jours. La version en vigueur est toujours accessible sur cette page.</p>

        <p style={{ marginTop: 40, padding: "16px 20px", background: "#f3f4f6", borderRadius: 10, fontSize: 14 }}>
          Contact DPO : <a href="mailto:dpo@rebondpro.fr">dpo@rebondpro.fr</a> — Délai de réponse : 30 jours.
        </p>
      </article>
    </main>
  );
}
