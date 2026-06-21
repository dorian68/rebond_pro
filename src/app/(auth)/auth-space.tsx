"use client";

// Espaces de connexion (design validé) : client, centre, administration.
// Le sélecteur pilote les textes du panneau de marque et du formulaire.
// Deep links : /login?space=admin, /login?space=centre ou /login#centre.
// Le backend ne change pas : un seul loginAction, le rôle route ensuite chacun
// vers son espace (LEARNER→/espace, TRAINER→/trainer, OWNER/ADMIN→/dashboard).

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type AuthSpace = "client" | "centre" | "admin";

export const SPACE_COPY = {
  client: {
    title: "Reprenez le contrôle de votre avenir professionnel.",
    sub: "Retrouvez votre espace : vos formations, votre bilan et votre plan d'action, au même endroit.",
    points: ["Votre parcours, suivi pas à pas", "Vos échanges avec nos conseillers", "Vos documents et votre feuille de route"],
    emailLabel: "Email",
    emailPlaceholder: "vous@email.fr",
    btn: "Se connecter",
  },
  centre: {
    title: "Pilotez votre centre depuis un seul tableau de bord.",
    sub: "Accédez à votre espace partenaire : vos formations publiées, vos demandes de mise en relation et vos sessions.",
    points: ["Vos demandes entrantes qualifiées", "Vos formations et sessions en un coup d'œil", "Votre visibilité auprès des candidats"],
    emailLabel: "Email professionnel",
    emailPlaceholder: "contact@votre-centre.fr",
    btn: "Accéder à mon espace centre",
  },
  admin: {
    title: "Administrez la plateforme Le Bon Rebond.",
    sub: "Accès réservé aux super-admins plateforme : validation, supervision et pilotage global.",
    points: ["Vue consolidée de l'écosystème", "Validation marketplace et conformité", "Agents sandbox et contrôles d'audit"],
    emailLabel: "Email super-admin",
    emailPlaceholder: "admin@lebonrebond.fr",
    btn: "Accéder à l'administration",
  },
} as const;

const AUTH_SPACES: AuthSpace[] = ["client", "centre", "admin"];

function normalizeSpace(value: string | null): AuthSpace | null {
  return AUTH_SPACES.includes(value as AuthSpace) ? (value as AuthSpace) : null;
}

const Ctx = createContext<{ space: AuthSpace; setSpace: (s: AuthSpace) => void }>({
  space: "client",
  setSpace: () => {},
});

export function AuthSpaceProvider({ children }: { children: ReactNode }) {
  const [space, setSpace] = useState<AuthSpace>("client");

  // Pré-sélection via ?space=... ou #... dans l'URL.
  useEffect(() => {
    const sync = () => {
      const params = new URLSearchParams(window.location.search);
      const fromQuery = normalizeSpace(params.get("space"));
      const fromHash = normalizeSpace(window.location.hash.replace("#", ""));
      const nextSpace = fromQuery ?? fromHash;
      if (nextSpace) setSpace(nextSpace);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  return <Ctx.Provider value={{ space, setSpace }}>{children}</Ctx.Provider>;
}

export function useAuthSpace() {
  return useContext(Ctx);
}

/** Accroche + points du panneau de marque, dépendants de l'espace sélectionné. */
export function AuthBrandCopy() {
  const { space } = useAuthSpace();
  const copy = SPACE_COPY[space];
  return (
    <>
      {/* Accroche */}
      <div style={{ position: "relative", zIndex: 1, maxWidth: "24ch" }}>
        <h2
          style={{
            fontFamily: "'Newsreader', Georgia, serif",
            color: "#fff",
            fontStyle: "italic",
            fontWeight: 400,
            fontSize: "clamp(2rem, 2.8vw, 2.7rem)",
            lineHeight: 1.2,
            letterSpacing: "-.01em",
            margin: 0,
          }}
        >
          {copy.title}
        </h2>
        <p style={{ color: "rgba(255,255,255,.78)", marginTop: 20, fontSize: "1.08rem", lineHeight: 1.6, maxWidth: "38ch" }}>
          {copy.sub}
        </p>
      </div>

      {/* Points rassurants */}
      <ul style={{ position: "relative", zIndex: 1, listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 14 }}>
        {copy.points.map((p) => (
          <li key={p} style={{ display: "flex", alignItems: "center", gap: 14, fontWeight: 600, color: "rgba(255,255,255,.92)", fontSize: "1rem" }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#5FB14E", flexShrink: 0 }} />
            {p}
          </li>
        ))}
      </ul>
    </>
  );
}
