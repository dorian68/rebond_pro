import { LoginForm } from "./login-form";
import { isGoogleOAuthConfigured } from "@/server/google-oauth-core";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string; verification?: string; reset?: string; space?: string; next?: string; oauth?: string; error?: string }>;
}) {
  const params = await searchParams;
  const googleEnabled = isGoogleOAuthConfigured();

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <h1
        style={{
          fontFamily: "'Newsreader', Georgia, serif",
          fontSize: "clamp(1.9rem, 3vw, 2.3rem)",
          fontWeight: 500,
          color: "#15314C",
          margin: "0 0 10px",
          letterSpacing: "-.02em",
        }}
      >
        Content de vous revoir.
      </h1>
      <p style={{ color: "#5d6f7c", fontSize: "1.05rem", margin: "0 0 26px", lineHeight: 1.5 }}>
        Choisissez votre espace, puis connectez-vous.
      </p>

      {params.verified === "1" && (
        <div style={{ background: "rgba(95,177,78,.10)", border: "1px solid rgba(95,177,78,.3)", borderRadius: 12, padding: "12px 16px", color: "#3d8c45", fontSize: ".9rem", fontWeight: 600, marginBottom: 14 }}>
          Email confirmé — vous pouvez vous connecter.
        </div>
      )}
      {params.reset === "ok" && (
        <div style={{ background: "rgba(95,177,78,.10)", border: "1px solid rgba(95,177,78,.3)", borderRadius: 12, padding: "12px 16px", color: "#3d8c45", fontSize: ".9rem", fontWeight: 600, marginBottom: 14 }}>
          Mot de passe réinitialisé. Connectez-vous avec votre nouveau mot de passe.
        </div>
      )}
      {params.verification === "invalid" && (
        <div style={{ background: "rgba(220,81,71,.08)", border: "1px solid rgba(220,81,71,.25)", borderRadius: 12, padding: "12px 16px", color: "#c43d34", fontSize: ".9rem", fontWeight: 600, marginBottom: 14 }}>
          Lien invalide ou expiré. Renvoyez un lien depuis l&apos;écran de confirmation.
        </div>
      )}
      {params.oauth === "email_unverified" && (
        <div style={{ background: "rgba(220,81,71,.08)", border: "1px solid rgba(220,81,71,.25)", borderRadius: 12, padding: "12px 16px", color: "#c43d34", fontSize: ".9rem", fontWeight: 600, marginBottom: 14 }}>
          Google n&apos;a pas confirmé cette adresse email. Utilisez une adresse vérifiée.
        </div>
      )}
      {params.oauth === "admin_denied" && (
        <div style={{ background: "rgba(220,81,71,.08)", border: "1px solid rgba(220,81,71,.25)", borderRadius: 12, padding: "12px 16px", color: "#c43d34", fontSize: ".9rem", fontWeight: 600, marginBottom: 14 }}>
          Ce compte Google n&apos;est pas autorisé pour l&apos;administration plateforme.
        </div>
      )}
      {(params.oauth === "no_membership" || params.error === "AccessDenied") && (
        <div style={{ background: "rgba(220,81,71,.08)", border: "1px solid rgba(220,81,71,.25)", borderRadius: 12, padding: "12px 16px", color: "#c43d34", fontSize: ".9rem", fontWeight: 600, marginBottom: 14 }}>
          Aucun espace actif n&apos;est rattaché à ce compte.
        </div>
      )}

      <LoginForm next={params.next} googleEnabled={googleEnabled} />
    </div>
  );
}
