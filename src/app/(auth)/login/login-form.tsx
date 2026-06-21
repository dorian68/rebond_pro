"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type ActionState } from "@/server/auth-actions";
import { useAuthSpace, SPACE_COPY } from "../auth-space";

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

export function LoginForm({ next }: { next?: string }) {
  const { space, setSpace } = useAuthSpace();
  const copy = SPACE_COPY[space];
  const [state, action, pending] = useActionState<ActionState, FormData>(loginAction, undefined);

  return (
    <div>
      {/* Sélecteur d'espace — le backend route ensuite par rôle, le choix est purement UX */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 26 }} role="group" aria-label="Type d'espace">
        <button type="button" style={space === "client" ? pillActive : pillBase} onClick={() => setSpace("client")}>
          Espace client
        </button>
        <button type="button" style={space === "centre" ? pillActive : pillBase} onClick={() => setSpace("centre")}>
          Espace centre
        </button>
        <button type="button" style={space === "admin" ? pillActive : pillBase} onClick={() => setSpace("admin")}>
          Administration
        </button>
      </div>

      <form action={action} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <input type="hidden" name="space" value={space} />
        <input type="hidden" name="next" value={next ?? ""} />

        <div>
          <label htmlFor="email" style={labelStyle}>{copy.emailLabel}</label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder={copy.emailPlaceholder}
            required
            style={fieldStyle}
            onFocus={(e) => { e.currentTarget.style.borderColor = "#2C8E86"; e.currentTarget.style.background = "#fff"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(21,49,76,.18)"; }}
          />
        </div>

        <div>
          <label htmlFor="password" style={labelStyle}>Mot de passe</label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            required
            style={fieldStyle}
            onFocus={(e) => { e.currentTarget.style.borderColor = "#2C8E86"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(21,49,76,.18)"; }}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, fontSize: ".92rem" }}>
          <label style={{ display: "flex", gap: 10, alignItems: "center", color: "#5d6f7c", cursor: "pointer" }}>
            <input type="checkbox" name="remember" style={{ width: 18, height: 18, accentColor: "#2C8E86" }} />
            Se souvenir de moi
          </label>
          <Link href="/forgot-password" style={{ color: "#23756e", fontWeight: 700, textDecoration: "none" }}>
            Mot de passe oublié ?
          </Link>
        </div>

        {state?.error && (
          <div style={{ background: "rgba(220,81,71,.08)", border: "1px solid rgba(220,81,71,.25)", borderRadius: 12, padding: "12px 16px", color: "#c43d34", fontSize: ".9rem", fontWeight: 600 }}>
            {state.error}
          </div>
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
            transition: "background .2s",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          {pending ? "Connexion…" : <>{copy.btn} <span>→</span></>}
        </button>
      </form>

      {/* Ligne de bascule — dépend de l'espace */}
      <p style={{ textAlign: "center", marginTop: 26, color: "#5d6f7c", fontSize: ".98rem" }}>
        {space === "admin" ? (
          <>Accès réservé aux super-admins plateforme.</>
        ) : space === "centre" ? (
          <>
            Pas encore partenaire ?{" "}
            <Link href="/centres" style={{ color: "#23756e", fontWeight: 700, textDecoration: "none" }}>
              Rejoindre le réseau
            </Link>
          </>
        ) : (
          <>
            Pas encore de compte ?{" "}
            <Link href="/register" style={{ color: "#23756e", fontWeight: 700, textDecoration: "none" }}>
              Créer un compte
            </Link>
          </>
        )}
      </p>
      {space === "client" && (
        <p style={{ textAlign: "center", marginTop: 10, color: "#85939d", fontSize: ".88rem" }}>
          Bénéficiaire d&apos;un bilan ? Votre centre vous a envoyé un accès par email.
        </p>
      )}
    </div>
  );
}
