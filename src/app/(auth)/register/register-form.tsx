"use client";

import { useState, useEffect, useActionState } from "react";
import Link from "next/link";
import { googleOAuthAction, registerAction, type ActionState } from "@/server/auth-actions";

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  border: "1.5px solid rgba(21,49,76,.18)",
  borderRadius: 12,
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: "1rem",
  background: "#fff",
  color: "#1b2b38",
  outline: "none",
  transition: "border-color .2s ease",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontSize: ".88rem",
  fontWeight: 700,
  color: "#15314C",
  display: "block",
  marginBottom: 8,
};

const pillBase: React.CSSProperties = {
  padding: "12px 22px",
  borderRadius: 100,
  border: "1.5px solid rgba(21,49,76,.18)",
  fontWeight: 700,
  fontSize: ".96rem",
  cursor: "pointer",
  background: "transparent",
  color: "#5d6f7c",
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  transition: "all .2s",
};

const pillActive: React.CSSProperties = {
  ...pillBase,
  background: "#15314C",
  color: "#fff",
  borderColor: "#15314C",
};

const googleButtonStyle: React.CSSProperties = {
  width: "100%",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 12,
  padding: "15px 20px",
  borderRadius: 100,
  border: "1.5px solid rgba(21,49,76,.18)",
  background: "#fff",
  color: "#15314C",
  fontWeight: 800,
  fontSize: "1rem",
  cursor: "pointer",
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

type RegisterAudience = "centre" | "particulier";

export function RegisterForm({
  googleEnabled,
  initialAudience = "particulier",
  oauthNotice,
}: {
  googleEnabled: boolean;
  initialAudience?: RegisterAudience;
  oauthNotice?: string | null;
}) {
  // Défaut « particulier » (maquette) ; /register#centre pré-sélectionne le centre.
  const [audience, setAudience] = useState<RegisterAudience>(initialAudience);
  const [state, action, pending] = useActionState<ActionState, FormData>(registerAction, undefined);
  const [googleState, googleAction, googlePending] = useActionState<ActionState, FormData>(googleOAuthAction, undefined);

  useEffect(() => {
    const sync = () => {
      if (window.location.hash.replace("#", "") === "centre") setAudience("centre");
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  return (
    <div>
      {/* Sélecteur d'audience */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 30 }} role="group" aria-label="Vous êtes">
        <button type="button" style={audience === "particulier" ? pillActive : pillBase} onClick={() => setAudience("particulier")}>
          Je suis un particulier
        </button>
        <button type="button" style={audience === "centre" ? pillActive : pillBase} onClick={() => setAudience("centre")}>
          Un centre de formation
        </button>
      </div>

      {/* Cas particulier → redirige vers contact */}
      {audience === "particulier" ? (
        <div style={{ background: "#F3E9D7", border: "1px solid rgba(21,49,76,.12)", borderRadius: 16, padding: "28px 28px" }}>
          <p style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "1.2rem", fontWeight: 500, color: "#15314C", marginBottom: 12, lineHeight: 1.35 }}>
            Vous êtes particulier ?
          </p>
          <p style={{ color: "#5d6f7c", fontSize: ".98rem", lineHeight: 1.65, marginBottom: 20 }}>
            Pas besoin de créer un compte pour commencer. Contactez-nous directement : nous vous accompagnons dès notre premier échange.
          </p>
          <Link
            href="/contact"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "15px 28px",
              borderRadius: 100,
              background: "#E07C39",
              color: "#fff",
              fontWeight: 700,
              fontSize: "1rem",
              textDecoration: "none",
            }}
          >
            Nous contacter <span>→</span>
          </Link>
        </div>
      ) : (
        /* Formulaire centre de formation */
        <form action={action} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {oauthNotice && (
            <div style={{ background: "rgba(224,124,57,.10)", border: "1px solid rgba(224,124,57,.28)", borderRadius: 12, padding: "12px 16px", color: "#9b5526", fontSize: ".9rem", fontWeight: 600 }}>
              {oauthNotice}
            </div>
          )}
          <input type="hidden" name="intent" value="register_center" />
          <div>
            <label htmlFor="centerName" style={labelStyle}>Nom du centre de formation</label>
            <input
              id="centerName"
              name="centerName"
              type="text"
              placeholder="Académie Horizon Formation"
              required
              style={fieldStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#2C8E86"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(21,49,76,.18)"; }}
            />
          </div>
          <div>
            <label htmlFor="name" style={labelStyle}>Votre nom</label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Camille Rivière"
              required
              style={fieldStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#2C8E86"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(21,49,76,.18)"; }}
            />
          </div>
          <div>
            <label htmlFor="email" style={labelStyle}>Email professionnel</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="vous@centre.fr"
              required
              style={fieldStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#2C8E86"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(21,49,76,.18)"; }}
            />
          </div>
          <div>
            <label htmlFor="password" style={labelStyle}>Mot de passe</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="8 caractères minimum"
              required
              minLength={8}
              style={fieldStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#2C8E86"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(21,49,76,.18)"; }}
            />
          </div>

          <label style={{ display: "flex", gap: 11, alignItems: "flex-start", fontSize: ".92rem", color: "#5d6f7c", lineHeight: 1.45, cursor: "pointer" }}>
            <input
              type="checkbox"
              name="terms"
              required
              style={{ width: 18, height: 18, marginTop: 2, accentColor: "#2C8E86", flexShrink: 0 }}
            />
            <span>
              J&apos;accepte les{" "}
              <Link href="/legal/cgu" target="_blank" style={{ color: "#23756e", fontWeight: 700, textDecoration: "none" }}>
                conditions d&apos;utilisation
              </Link>{" "}
              et la{" "}
              <Link href="/legal/confidentialite" target="_blank" style={{ color: "#23756e", fontWeight: 700, textDecoration: "none" }}>
                politique de confidentialité
              </Link>.
            </span>
          </label>

          {state?.error && (
            <div style={{ background: "rgba(220,81,71,.08)", border: "1px solid rgba(220,81,71,.25)", borderRadius: 12, padding: "12px 16px", color: "#c43d34", fontSize: ".9rem", fontWeight: 600 }}>
              {state.error}
            </div>
          )}
          {googleState?.error && (
            <div style={{ background: "rgba(220,81,71,.08)", border: "1px solid rgba(220,81,71,.25)", borderRadius: 12, padding: "12px 16px", color: "#c43d34", fontSize: ".9rem", fontWeight: 600 }}>
              {googleState.error}
            </div>
          )}

          {googleEnabled && (
            <>
              <button
                type="submit"
                formAction={googleAction}
                formNoValidate
                disabled={googlePending || pending}
                style={{ ...googleButtonStyle, cursor: googlePending || pending ? "not-allowed" : "pointer", opacity: googlePending || pending ? .72 : 1 }}
              >
                <span style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid rgba(21,49,76,.16)",
                  color: "#1a73e8",
                  fontWeight: 900,
                  fontSize: 15,
                  flex: "none",
                }}>G</span>
                {googlePending ? "Ouverture Google…" : "Créer mon compte centre avec Google"}
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 12, color: "#85939d", fontSize: ".86rem", fontWeight: 700 }}>
                <span style={{ height: 1, flex: 1, background: "rgba(21,49,76,.12)" }} />
                ou avec email
                <span style={{ height: 1, flex: 1, background: "rgba(21,49,76,.12)" }} />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={pending}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              padding: "17px 28px",
              borderRadius: 100,
              background: pending ? "#5d6f7c" : "#E07C39",
              color: "#fff",
              fontWeight: 700,
              fontSize: "1.05rem",
              border: "none",
              cursor: pending ? "not-allowed" : "pointer",
              width: "100%",
              marginTop: 6,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            {pending ? "Création…" : <>Créer mon cockpit gratuit <span>→</span></>}
          </button>
        </form>
      )}
    </div>
  );
}
