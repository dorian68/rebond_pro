import "./_env";
import { prisma } from "../src/lib/prisma";
import { createTestTenant, step, assert, runner } from "./_tenant";
import {
  getMarketplaceFormationsUncached,
  getMarketplaceCentersUncached,
  getMarketplaceFacetsUncached,
  getCenterProfileUncached,
  getPublicTrainerUncached,
} from "../src/server/marketplace";

runner("marketplace_smoke", async () => {
  const t = await createTestTenant("mkt");
  const tag = `SmokeCat-${Date.now()}`;
  try {
    await prisma.organization.update({ where: { id: t.organizationId }, data: { tagline: "Accroche smoke", city: "VilleSmoke", description: "Centre de test marketplace.", marketplaceStatus: "APPROVED" } });
    const trainer = await prisma.trainer.create({ data: { organizationId: t.organizationId, firstName: "Marco", lastName: "Polo", initials: "MP", specialities: ["SmokeSkill"], bio: "Bio smoke", yearsExperience: 9, active: true } });
    const pubSlug = `smoke-mkt-${Date.now()}`;
    const formation = await prisma.formation.create({
      data: { organizationId: t.organizationId, title: "Formation Marketplace Smoke", slug: `f-${Date.now()}`, category: tag, shortDescription: "Visible en marketplace", price: 70000, modality: "DISTANCIEL", level: "INTERMEDIAIRE", status: "PUBLIE", isPublic: true, publicSlug: pubSlug, eligibleTrainers: { create: [{ trainerId: trainer.id }] } },
    });

    // Un statut APPROVED injecté sans preuve de revue humaine ne doit rien exposer.
    const beforeReview = await getMarketplaceFormationsUncached({ q: "Marketplace Smoke" });
    assert(!beforeReview.some((f) => f.id === formation.id), "Un centre non revu fuit dans la marketplace.");
    assert(await getCenterProfileUncached(t.organizationSlug!) === null, "La fiche d'un centre non revu doit rester masquée.");
    await prisma.organization.update({
      where: { id: t.organizationId },
      data: { marketplaceReviewedAt: new Date(), marketplaceReviewedBy: t.userId },
    });
    step("human_review_required");

    // 1. Apparaît dans le catalogue cross-centres
    const all = await getMarketplaceFormationsUncached({});
    assert(all.some((f) => f.id === formation.id), "La formation publiée n'apparaît pas dans la marketplace.");
    step("formation_listed", { total: all.length });

    // 2. Filtres (catégorie + recherche + ville)
    const byCat = await getMarketplaceFormationsUncached({ category: tag });
    assert(byCat.length === 1 && byCat[0].id === formation.id, "Filtre catégorie KO.");
    const byQuery = await getMarketplaceFormationsUncached({ q: "Marketplace Smoke" });
    assert(byQuery.some((f) => f.id === formation.id), "Filtre recherche KO.");
    const byCity = await getMarketplaceFormationsUncached({ city: "VilleSmoke" });
    assert(byCity.some((f) => f.id === formation.id), "Filtre ville KO.");
    step("filters_work", { byCat: byCat.length });

    // 3. Facettes
    const facets = await getMarketplaceFacetsUncached();
    assert(facets.categories.includes(tag), "Catégorie absente des facettes.");
    assert(facets.cities.includes("VilleSmoke"), "Ville absente des facettes.");
    step("facets", { categories: facets.categories.length, cities: facets.cities.length });

    // 4. Annuaire des centres
    const centers = await getMarketplaceCentersUncached();
    assert(centers.some((c) => c.id === t.organizationId), "Le centre n'apparaît pas dans l'annuaire.");
    step("center_in_directory");

    // 5. Fiche centre (mise en avant) avec formateurs + formations
    const profile = await getCenterProfileUncached(t.organizationSlug!);
    assert(profile, "Fiche centre introuvable.");
    assert(profile.formations.some((f) => f.id === formation.id), "Formation absente de la fiche centre.");
    assert(profile.trainers.some((tr) => tr.id === trainer.id), "Formateur absent de la fiche centre.");
    assert(profile.tagline === "Accroche smoke", "Tagline non exposée.");
    step("center_profile", { formations: profile.formations.length, trainers: profile.trainers.length });

    // 6. Profil formateur public (visibilité auto)
    const tprofile = await getPublicTrainerUncached(trainer.id);
    assert(tprofile, "Profil formateur introuvable.");
    assert(tprofile.formations.some((tf) => tf.formation.id === formation.id), "Formation absente du profil formateur.");
    assert(tprofile.yearsExperience === 9, "Expérience formateur non exposée.");
    step("trainer_profile", { formations: tprofile.formations.length });

    // 7. Une formation NON publiée ne doit PAS apparaître
    const draft = await prisma.formation.create({ data: { organizationId: t.organizationId, title: "Brouillon Smoke", slug: `d-${Date.now()}`, price: 0, modality: "PRESENTIEL", level: "DEBUTANT", status: "BROUILLON", isPublic: false } });
    const afterDraft = await getMarketplaceFormationsUncached({ q: "Brouillon Smoke" });
    assert(!afterDraft.some((f) => f.id === draft.id), "Une formation non publiée fuit dans la marketplace !");
    step("draft_not_leaked");
  } finally {
    await t.cleanup();
    step("tenant_cleanup");
  }
});
