import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function pass(step, details = {}) {
  console.log(JSON.stringify({ step, status: "pass", details }));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  const loginForm = read("src/app/(auth)/login/login-form.tsx");
  const registerForm = read("src/app/(auth)/register/register-form.tsx");
  const registerPage = read("src/app/(auth)/register/page.tsx");
  const authActions = read("src/server/auth-actions.ts");
  const googleCore = read("src/server/google-oauth-core.ts");

  assert(loginForm.includes("Continuer avec Google"), "La connexion doit proposer Google quand le provider est configuré.");
  assert(registerForm.includes("Créer mon compte centre avec Google"), "L'inscription centre doit proposer Google.");
  assert(registerForm.includes('name="terms"') && authActions.includes('parsed.data.terms !== "on"'), "La création Google doit conserver l'acceptation CGU.");
  assert(authActions.includes("centerName") && googleCore.includes("missing_center_name"), "La création Google doit exiger le nom du centre.");
  assert(googleCore.includes("account_required") && registerPage.includes("Ce compte Google n'existe pas encore"), "Un compte Google inconnu en login doit basculer vers une vraie inscription.");
  assert(googleCore.includes("email_verified") && googleCore.includes("email_unverified"), "Le parcours doit refuser un email Google non vérifié.");

  pass("business_google_oauth", {
    loginVisible: true,
    signupExplicit: true,
    trustGuards: ["terms", "centerName", "verifiedEmail", "noSilentCenterCreation"],
  });
} catch (error) {
  console.error(JSON.stringify({ step: "business_google_oauth", status: "fail", error: error instanceof Error ? error.message : String(error) }));
  process.exitCode = 1;
}
