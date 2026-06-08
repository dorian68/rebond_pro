import "./_env.mjs";

// Smoke d'INTÉGRATION HTTP : vérifie le rendu réel des pages contre le serveur en marche.
// Précondition : serveur lancé (npm run dev). BASE par défaut http://localhost:3000.
const BASE = process.env.SMOKE_BASE_URL || "http://localhost:3000";

function step(label, details) { console.log(JSON.stringify({ step: label, status: "pass", ...(details ? { details } : {}) })); }
function assert(cond, msg) { if (!cond) throw new Error(msg); }
async function get(path) {
  const r = await fetch(BASE + path, { redirect: "manual" });
  const text = await r.text();
  return { status: r.status, text };
}
const has = (t, s) => t.includes(s);

async function main() {
  // AUTH-05 : login + lien mot de passe oublié
  const login = await get("/login");
  assert(login.status === 200, `/login statut ${login.status}`);
  assert(has(login.text, "Mot de passe oubli"), "/login : lien 'Mot de passe oublié' absent");
  step("AUTH-05_login_ui");

  // AUTH : pages reset
  const forgot = await get("/forgot-password");
  assert(forgot.status === 200 && has(forgot.text, "Envoyer le lien"), "/forgot-password incomplet");
  const reset = await get("/reset-password?token=abc");
  assert(reset.status === 200 && has(reset.text, "Nouveau mot de passe"), "/reset-password incomplet");
  step("AUTH_reset_pages");

  // MKT-08 : effet réseau — plusieurs centres + badge
  const mkt = await get("/marketplace");
  assert(mkt.status === 200, `/marketplace statut ${mkt.status}`);
  assert(has(mkt.text, "Trouvez la formation"), "/marketplace : promesse absente");
  const centerNames = ["Atlantique Compétences", "Digital Academy 972", "Institut Langues", "Mon Centre de Formation"];
  const present = centerNames.filter((n) => has(mkt.text, n));
  assert(present.length >= 3, `Effet réseau insuffisant : ${present.length} centres trouvés (attendu ≥3). Lancez 'npm run seed:marketplace-demo'.`);
  assert(has(mkt.text, "Centre du r"), "Badge 'Centre du réseau' absent");
  step("MKT-08_network_effect", { centers: present.length });

  // Fiche centre + profil formateur
  const center = await get("/mon-centre-de-formation");
  assert(center.status === 200 && has(center.text, "Nos formateurs") && has(center.text, "Formations propos"), "Fiche centre incomplète");
  const tid = (center.text.match(/\/formateur\/([a-z0-9]+)/) || [])[1];
  assert(tid, "Aucun lien formateur sur la fiche centre");
  const trainer = await get(`/formateur/${tid}`);
  assert(trainer.status === 200 && has(trainer.text, "Formations animées par"), "Profil formateur incomplet");
  step("MKT_center_trainer_pages");

  // BILL-06 : onglet abonnement + plans
  const params = await get("/parametres");
  assert(params.status === 200, `/parametres statut ${params.status} (auth requise — DEV_AUTOLOGIN actif ?)`);
  assert(has(params.text, "Abonnement"), "Onglet Abonnement absent");
  assert(has(params.text, "Découverte") && has(params.text, "Premium"), "Plans non affichés dans Paramètres");
  step("BILL-06_subscription_ui");

  // OBS-01 : santé
  const health = await get("/api/health");
  assert(health.status === 200 && has(health.text, '"db":"up"'), "/api/health KO");
  step("OBS-01_health");

  step("ui_smoke_complete");
}

main().catch((e) => { console.error(JSON.stringify({ step: "ui_smoke", status: "fail", error: e instanceof Error ? e.message : String(e) })); process.exitCode = 1; });
