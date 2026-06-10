import Link from "next/link";
import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ verified?: string; verification?: string; reset?: string }> }) {
  const params = await searchParams;
  return (
    <div>
      <h1 style={{ fontSize: 21, fontWeight: 800, marginBottom: 4 }}>Connexion</h1>
      <p style={{ color: "var(--ink-2)", fontSize: 13.5, marginBottom: 22 }}>Accédez à votre espace RebondPro (centre, bénéficiaire ou formateur).</p>
      {params.verified === "1" && <div className="badge badge-positive public-form-error" style={{ marginBottom: 14 }}>Email confirmé. Vous pouvez vous connecter.</div>}
      {params.reset === "ok" && <div className="badge badge-positive public-form-error" style={{ marginBottom: 14 }}>Mot de passe réinitialisé. Connectez-vous avec votre nouveau mot de passe.</div>}
      {params.verification === "invalid" && <div className="badge badge-danger public-form-error" style={{ marginBottom: 14 }}>Lien invalide ou expiré. Renvoyez un lien depuis l&apos;écran de confirmation.</div>}
      <LoginForm />
      <p style={{ marginTop: 14, fontSize: 13, textAlign: "center" }}>
        <Link href="/forgot-password" style={{ color: "var(--primary)", fontWeight: 700 }}>Mot de passe oublié ?</Link>
      </p>
      <p style={{ marginTop: 8, fontSize: 13, color: "var(--ink-2)", textAlign: "center" }}>
        Vous gérez un centre de formation ?{" "}
        <Link href="/register" style={{ color: "var(--primary)", fontWeight: 700 }}>
          Créer mon cockpit
        </Link>
      </p>
      <p style={{ marginTop: 6, fontSize: 12, color: "var(--ink-3)", textAlign: "center" }}>
        Bénéficiaire d&apos;un bilan ? Votre centre vous a envoyé un accès par email.
      </p>
    </div>
  );
}
