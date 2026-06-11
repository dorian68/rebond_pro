import Link from "next/link";
import { ForgotPasswordForm } from "./forgot-form";

export const metadata = { title: "Mot de passe oublié — Le Bon Rebond" };

export default function ForgotPasswordPage() {
  return (
    <div>
      <h1 style={{ fontSize: 21, fontWeight: 800, marginBottom: 4 }}>Mot de passe oublié</h1>
      <p style={{ color: "var(--ink-2)", fontSize: 13.5, marginBottom: 22 }}>Indiquez votre email : nous vous enverrons un lien de réinitialisation.</p>
      <ForgotPasswordForm />
      <p style={{ marginTop: 18, fontSize: 13, color: "var(--ink-2)", textAlign: "center" }}>
        <Link href="/login" style={{ color: "var(--primary)", fontWeight: 700 }}>Retour à la connexion</Link>
      </p>
    </div>
  );
}
