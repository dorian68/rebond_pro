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
  if (isProd) throw new Error(msg);
  console.warn(`${msg} (dev : avertissement seulement)`);
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
