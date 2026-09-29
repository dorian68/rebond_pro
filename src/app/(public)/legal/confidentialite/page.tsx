import Link from "next/link";
import { Logo } from "@/components/app/Logo";

export const metadata = { title: "Politique de confidentialité, Le Bon Rebond" };

export default function PrivacyPage() {
  return (
    <main className="public-page">
      <header className="marketing-nav public-nav"><Link href="/"><Logo size={52} priority /></Link></header>
      <article className="legal-page">
        <span className="eyebrow">Vie privée & RGPD</span>
        <h1>Politique de confidentialité</h1>
        <p style={{ color: "#6b7280", marginBottom: 32 }}>En vigueur au 29 septembre 2026</p>

        <h2>1. Responsable du traitement</h2>
        <p><strong>OPTIQUANT IA</strong>, SASU, SIREN 943 812 297, 53 secteur 32 Réduit, 53 chemin de Petit Jardin, 97114 Trois-Rivières, est responsable du traitement pour le service Le Bon Rebond. Contact vie privée : <a href="mailto:contact.lebonrebond@gmail.com">contact.lebonrebond@gmail.com</a>.</p>

        <h2>2. Données collectées</h2>
        <ul>
          <li><strong>Données de compte :</strong> nom, email, mot de passe haché, rôle.</li>
          <li><strong>Données métier :</strong> informations sur les formations, sessions, apprenants, formateurs, prospects, saisies par l&apos;utilisateur dans le cadre de son activité professionnelle.</li>
          <li><strong>Données de navigation :</strong> logs d&apos;accès (IP, user-agent, timestamp) à des fins de sécurité.</li>
          <li><strong>Demandes de rappel pour l&apos;offre Sainte-Lucie :</strong> identité, âge, commune, coordonnées, niveau d&apos;anglais, disponibilité, motivation et choix de mise en relation transmis à l&apos;équipe Le Bon Rebond.</li>
          <li><strong>CV facultatif pour l&apos;offre Sainte-Lucie :</strong> fichier PDF ou DOCX joint à la demande, transmis à l&apos;équipe Le Bon Rebond pour étudier la demande d&apos;accompagnement.</li>
          <li><strong>Données de facturation :</strong> coordonnées de facturation, historique des paiements (via Stripe, certifié PCI-DSS).</li>
        </ul>

        <h2>3. Finalités du traitement</h2>
        <ul>
          <li>Fournir et améliorer le service Le Bon Rebond.</li>
          <li>Assurer la sécurité et l&apos;intégrité de la plateforme.</li>
          <li>Gérer la relation contractuelle et la facturation.</li>
          <li>Envoyer des communications relatives au service (mises à jour, alertes).</li>
          <li>Répondre aux demandes d&apos;accompagnement pour l&apos;offre Sainte-Lucie et, si la personne le demande, faciliter sa mise en relation avec la CARL.</li>
        </ul>

        <h2>4. Base légale</h2>
        <p>Les traitements reposent sur : (a) l&apos;exécution du contrat d&apos;abonnement, (b) nos intérêts légitimes (sécurité, amélioration du service), (c) l&apos;accord donné via le formulaire pour traiter la demande de rappel et le CV facultatif de l&apos;offre Sainte-Lucie, (d) le consentement pour les communications marketing et, lorsqu&apos;il est donné séparément, pour la transmission de l&apos;adresse e-mail à la CARL dans le cadre de la mise en relation relative à cette offre.</p>

        <h2>5. Durée de conservation</h2>
        <p>Les données de compte et métier sont conservées pendant la relation contractuelle, puis le temps nécessaire à l&apos;export, au traitement d&apos;une demande de suppression et aux obligations légales applicables. Les CV reçus pour l&apos;offre Sainte-Lucie restent dans la messagerie de contact pendant le traitement de la demande et l&apos;accompagnement, puis sont supprimés lorsqu&apos;ils ne sont plus nécessaires, sous réserve des obligations applicables. Les pièces et données de facturation sont conservées 10 ans. Les journaux techniques sont conservés pour une durée proportionnée aux besoins de sécurité.</p>

        <h2>6. Sous-traitants</h2>
        <ul>
          <li><strong>Application & base de données :</strong> Hetzner Online GmbH (Allemagne).</li>
          <li><strong>Stockage de fichiers :</strong> Supabase.</li>
          <li><strong>Paiement :</strong> Stripe (PCI-DSS).</li>
          <li><strong>Email transactionnel :</strong> Resend.</li>
          <li><strong>IA :</strong> Anthropic ou OpenAI, selon la fonctionnalité et la configuration active.</li>
          <li><strong>Connecteurs optionnels :</strong> Composio, uniquement lorsqu&apos;un utilisateur autorise une connexion externe.</li>
        </ul>

        <p>Pour cette offre, les demandes et les CV facultatifs sont adressés à contact.lebonrebond@gmail.com via Resend. Le CV est traité par l&apos;équipe Le Bon Rebond et n&apos;est pas transmis à la CARL. Seule l&apos;adresse e-mail peut ensuite être communiquée par l&apos;équipe à la CARL lorsque la personne a autorisé séparément cette mise en relation. Une demande de rappel reste possible sans cette autorisation.</p>

        <h2>7. Vos droits</h2>
        <p>Conformément au RGPD, vous disposez des droits d&apos;accès, de rectification, d&apos;effacement, de portabilité, d&apos;opposition et de limitation. L&apos;export CSV de vos données est disponible directement dans Paramètres &gt; Avancé.</p>
        <p>Pour exercer vos droits : <a href="mailto:contact.lebonrebond@gmail.com">contact.lebonrebond@gmail.com</a>. Vous pouvez également introduire une réclamation auprès de la <strong>CNIL</strong>.</p>

        <h2>8. Cookies</h2>
        <p>Nous utilisons uniquement des cookies strictement nécessaires au fonctionnement du service (session d&apos;authentification). Aucun cookie publicitaire ou de tracking tiers n&apos;est utilisé.</p>

        <h2>9. Sécurité</h2>
        <p>Mesures en place : chiffrement TLS en transit, mots de passe hachés avec bcrypt, isolation multi-tenant, contrôle des rôles, journalisation technique et sauvegardes d&apos;exploitation.</p>

        <h2>10. Modifications</h2>
        <p>Toute modification substantielle sera communiquée par email avec un préavis de 30 jours. La version en vigueur est toujours accessible sur cette page.</p>

        <p style={{ marginTop: 40, padding: "16px 20px", background: "#f3f4f6", borderRadius: 10, fontSize: 14 }}>
          Contact vie privée : <a href="mailto:contact.lebonrebond@gmail.com">contact.lebonrebond@gmail.com</a>, réponse dans le délai légal applicable.
        </p>
      </article>
    </main>
  );
}
