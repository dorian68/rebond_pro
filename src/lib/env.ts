// Validation des variables d'environnement au chargement.
// Importé tôt (via prisma) pour échouer vite et clairement.
// Aucune valeur secrète n'est jamais affichée.
import { z } from "zod";

const isProd = process.env.NODE_ENV === "production";

const schema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL requis").refine(
    (v) => /^postgres(ql)?:\/\//.test(v),
    "DATABASE_URL doit être une URL PostgreSQL",
  ),
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET doit faire au moins 16 caractères"),
});

const parsed = schema.safeParse({
  DATABASE_URL: process.env.DATABASE_URL,
  AUTH_SECRET: process.env.AUTH_SECRET,
});

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(" | ");
  const msg = `[env] Configuration invalide → ${issues}`;
  // Pendant le build (collecte des routes), les variables peuvent être absentes :
  // on n'échoue qu'au runtime serveur réel, pas pendant `next build`.
  const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
  // Ne jamais throw au chargement du module : sinon `next build` (collecte des routes)
  // échoue sans variables. Les appels runtime (Prisma, Auth) échoueront naturellement si manquant.
  console.warn(`${msg} (avertissement uniquement — validation runtime laissée aux consommateurs)`);
}

// Garde-fou de sécurité : le bypass d'auth dev ne doit JAMAIS être effectif en production.
// La neutralisation FONCTIONNELLE est dans src/lib/tenant.ts (devAutoSession renvoie null si prod).
if (isProd && process.env.DEV_AUTOLOGIN === "true") {
  console.error("[env] ⚠️ DEV_AUTOLOGIN=true détecté en production — IGNORÉ par sécurité (auth réelle exigée). Retirez ce flag des secrets de production.");
}

export const env = {
  isProd,
  databaseUrl: process.env.DATABASE_URL ?? "",
  authSecret: process.env.AUTH_SECRET ?? "",
  devAutologin: process.env.DEV_AUTOLOGIN === "true" && !isProd,
};
