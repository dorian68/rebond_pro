import { readFileSync } from "node:fs";
import { join } from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const platform = read("src/lib/platform.ts");
const authSpace = read("src/app/(auth)/auth-space.tsx");
const loginForm = read("src/app/(auth)/login/login-form.tsx");
const authActions = read("src/server/auth-actions.ts");

assert(
  platform.includes('redirect("/login?space=admin&next=/admin")'),
  "Le guard /admin doit rediriger vers le circuit de connexion admin, pas vers /dashboard.",
);
assert(!platform.includes('redirect("/dashboard")'), "Le guard /admin ne doit pas rediriger vers /dashboard.");

assert(authSpace.includes('export type AuthSpace = "client" | "centre" | "admin"'), "L'espace admin doit exister dans le provider auth.");
assert(authSpace.includes("normalizeSpace(params.get(\"space\"))"), "Le login doit supporter /login?space=admin.");
assert(authSpace.includes("Administrez la plateforme Le Bon Rebond."), "Le panneau de marque doit avoir une copie admin explicite.");

assert(loginForm.includes('name="space" value={space}'), "Le formulaire doit envoyer l'espace choisi au serveur.");
assert(loginForm.includes('name="next" value={next ?? ""}'), "Le formulaire doit préserver la destination admin demandée.");
assert(loginForm.includes("Administration"), "Le sélecteur de login doit afficher l'accès Administration.");

assert(authActions.includes('space: z.enum(["client", "centre", "admin"]).optional()'), "loginAction doit valider l'intention d'espace.");
assert(authActions.includes("function safeAdminRedirect"), "loginAction doit filtrer la redirection admin.");
assert(authActions.includes("wantsAdmin && !isAdmin"), "loginAction doit refuser un circuit admin pour un non super-admin.");
assert(authActions.includes('Identifiants admin incorrects ou accès non autorisé.'), "loginAction doit exposer une erreur admin dédiée.");

console.log("admin_auth_circuit_smoke: PASS");
