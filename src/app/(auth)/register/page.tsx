import Link from "next/link";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <div>
      <h1 style={{ fontSize: 21, fontWeight: 800, marginBottom: 4 }}>Créer mon espace partenaire</h1>
      <p style={{ color: "var(--ink-2)", fontSize: 13.5, marginBottom: 22 }}>Gratuit pendant 14 jours, sans carte bancaire.</p>
      <RegisterForm />
      <p style={{ marginTop: 18, fontSize: 13, color: "var(--ink-2)", textAlign: "center" }}>
        Déjà un compte ?{" "}
        <Link href="/login" style={{ color: "var(--primary)", fontWeight: 700 }}>
          Se connecter
        </Link>
      </p>
    </div>
  );
}
