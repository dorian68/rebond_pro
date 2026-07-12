import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: ".env", override: true, quiet: true });

// Smoke d'INTÉGRATION HTTP : vérifie le rendu réel des pages contre le serveur en marche.
// Précondition : serveur lancé (npm run dev). BASE par défaut http://localhost:3000.
const BASE = process.env.SMOKE_BASE_URL || "http://localhost:3000";
const databaseUrl = new URL(process.env.DATABASE_URL ?? "");
if (!["localhost", "127.0.0.1", "::1"].includes(databaseUrl.hostname)) {
  throw new Error("smoke:ui refuse de créer ses fixtures sur une base distante.");
}
const prisma = new PrismaClient();

function step(label, details) { console.log(JSON.stringify({ step: label, status: "pass", ...(details ? { details } : {}) })); }
function assert(cond, msg) { if (!cond) throw new Error(msg); }
async function get(path) {
  const r = await fetch(BASE + path, { redirect: "manual" });
  const text = await r.text();
  return { status: r.status, text };
}
const has = (t, s) => t.includes(s);

async function createMarketplaceFixtures() {
  const token = `UI${Date.now()}`;
  const organizations = [];

  for (let index = 1; index <= 3; index += 1) {
    const slug = `smoke-ui-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`;
    const name = `Centre ${token} ${index}`;
    const organization = await prisma.organization.create({
      data: {
        name,
        slug,
        city: `Ville ${index}`,
        tagline: "Centre temporaire du smoke HTTP",
        description: "Fixture revue pour vérifier le rendu public.",
        marketplaceStatus: "APPROVED",
        marketplaceReviewedAt: new Date(),
        marketplaceReviewedBy: "smoke-ui",
      },
    });
    organizations.push(organization);

    const trainer = await prisma.trainer.create({
      data: {
        organizationId: organization.id,
        firstName: `Formateur${index}`,
        lastName: token,
        initials: `F${index}`,
        active: true,
        bio: "Profil temporaire du smoke HTTP.",
      },
    });
    const formation = await prisma.formation.create({
      data: {
        organizationId: organization.id,
        title: `Formation ${token} ${index}`,
        slug: `formation-${slug}`,
        category: token,
        shortDescription: "Formation temporaire du smoke HTTP.",
        price: 70000,
        modality: "DISTANCIEL",
        level: "INTERMEDIAIRE",
        status: "PUBLIE",
        isPublic: true,
        publicSlug: `publique-${slug}`,
        eligibleTrainers: { create: [{ trainerId: trainer.id }] },
      },
    });

    if (index === 1) {
      organizations[0] = { ...organization, trainerId: trainer.id, formationId: formation.id };
    }
  }

  return {
    token,
    names: organizations.map((organization) => organization.name),
    centerSlug: organizations[0].slug,
    trainerId: organizations[0].trainerId,
    firstFormationTitle: `Formation ${token} 1`,
    cleanup: async () => {
      await prisma.organization.deleteMany({ where: { id: { in: organizations.map((organization) => organization.id) } } });
    },
  };
}

async function main() {
  const fixtures = await createMarketplaceFixtures();
  try {
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
  const mkt = await get(`/marketplace?q=${encodeURIComponent(fixtures.token)}`);
  assert(mkt.status === 200, `/marketplace statut ${mkt.status}`);
  assert(has(mkt.text, "Trouvez la formation"), "/marketplace : promesse absente");
  const present = fixtures.names.filter((name) => has(mkt.text, name));
  assert(present.length === 3, `Effet réseau insuffisant : ${present.length} centres temporaires trouvés (attendu 3).`);
  step("MKT-08_network_effect", { centers: present.length });

  // Fiche centre + profil formateur
  const center = await get(`/${fixtures.centerSlug}`);
  assert(
    center.status === 200
      && has(center.text, fixtures.names[0])
      && has(center.text, fixtures.firstFormationTitle)
      && has(center.text, "Des formateurs du terrain"),
    `Fiche centre incomplète (HTTP ${center.status}, centre=${has(center.text, fixtures.names[0])}, formation=${has(center.text, fixtures.firstFormationTitle)}, formateurs=${has(center.text, "Des formateurs du terrain")}).`,
  );
  assert(has(center.text, `/formateur/${fixtures.trainerId}`), "Aucun lien formateur sur la fiche centre");
  const trainer = await get(`/formateur/${fixtures.trainerId}`);
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
  } finally {
    await fixtures.cleanup();
    await prisma.$disconnect();
  }
}

main().catch(async (e) => {
  await prisma.$disconnect().catch(() => {});
  console.error(JSON.stringify({ step: "ui_smoke", status: "fail", error: e instanceof Error ? e.message : String(e) }));
  process.exitCode = 1;
});
