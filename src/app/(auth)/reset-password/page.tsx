import Link from "next/link";
import { ResetPasswordForm } from "./reset-form";

export const metadata = { title: "Réinitialiser le mot de passe — Le Bon Rebond" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div>
        <h1 style={{ fontSize: 21, fontWeight: 800, marginBottom: 4 }}>Lien invalide</h1>
        <p style={{ color: "var(--ink-2)", fontSize: 13.5, marginBottom: 22 }}>Ce lien de réinitialisation est incomplet ou expiré.</p>
        <Link href="/forgot-password" className="btn btn-primary btn-block btn-lg">Demander un nouveau lien</Link>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: 21, fontWeight: 800, marginBottom: 4 }}>Nouveau mot de passe</h1>
      <p style={{ color: "var(--ink-2)", fontSize: 13.5, marginBottom: 22 }}>Choisissez un nouveau mot de passe (8 caractères minimum).</p>
      <ResetPasswordForm token={token} />
      <p style={{ marginTop: 18, fontSize: 13, color: "var(--ink-2)", textAlign: "center" }}>
        <Link href="/login" style={{ color: "var(--primary)", fontWeight: 700 }}>Retour à la connexion</Link>
      </p>
    </div>
  );
}
