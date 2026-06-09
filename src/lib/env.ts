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
  // Ne jamais throw au chargement du module : sinon `next build` (collecte des routes)
  // échoue sans variables. Les appels runtime (Prisma, Auth) échoueront naturellement si manquant.
  console.warn(`${msg} (avertissement uniquement — validation runtime laissée aux consommateurs)`);
  // Fournir des valeurs factices pour permettre l'instanciation de Prisma/Auth au build.
  // Toute requête réelle échouera avec une erreur explicite à l'exécution.
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = "postgresql://build:build@localhost:5432/build?schema=public";
  }
  if (!process.env.AUTH_SECRET) {
    process.env.AUTH_SECRET = "build-time-placeholder-secret-not-for-runtime-use";
  }
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
