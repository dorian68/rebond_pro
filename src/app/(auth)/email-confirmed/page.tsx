import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function EmailConfirmedPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const invalid = status === "invalid";

  if (invalid) {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--danger-bg, #fef2f2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--danger, #dc2626)" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </div>
        <h1 style={{ fontSize: 21, fontWeight: 800, marginBottom: 6 }}>Lien invalide ou expiré</h1>
        <p style={{ color: "var(--ink-2)", fontSize: 13.5, lineHeight: 1.65, marginBottom: 20 }}>
          Ce lien de confirmation n&apos;est plus valable (déjà utilisé ou expiré). Connectez-vous pour en demander un nouveau.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Link href="/login" className="btn btn-primary btn-block">Aller à la connexion</Link>
          <Link href="/" className="btn btn-secondary btn-block">Retour à l&apos;accueil</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--positive-bg, #ecfdf5)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--positive, #16a34a)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
      </div>
      <h1 style={{ fontSize: 21, fontWeight: 800, marginBottom: 6 }}>Email confirmé 🎉</h1>
      <p style={{ color: "var(--ink-2)", fontSize: 13.5, lineHeight: 1.65, marginBottom: 20 }}>
        Votre adresse email est vérifiée et votre compte est <strong>activé</strong>. Vous pouvez maintenant vous connecter et accéder à votre espace.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Link href="/login" className="btn btn-primary btn-block">Se connecter</Link>
        <Link href="/" className="btn btn-secondary btn-block">Retour à l&apos;accueil</Link>
      </div>
    </div>
  );
}
