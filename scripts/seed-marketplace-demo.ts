import "./_env";
import { prisma } from "../src/lib/prisma";

// Seed démo MULTI-CENTRES pour rendre l'effet réseau de la marketplace tangible.
// Idempotent : recrée uniquement les centres de démo (slug préfixé "demo-reseau-").
// N'altère AUCUNE organisation réelle.

const PREFIX = "demo-reseau-";
const EUR = (n: number) => Math.round(n * 100);

type CenterSpec = {
  slug: string; name: string; tagline: string; city: string; description: string;
  trainers: { firstName: string; lastName: string; specialities: string[]; bio: string; years: number; color: string }[];
  formations: { title: string; category: string; short: string; price: number; days: number; modality: "PRESENTIEL" | "DISTANCIEL" | "HYBRIDE"; level: "DEBUTANT" | "INTERMEDIAIRE" | "AVANCE"; color: string; trainerIdx: number[] }[];
};

const CENTERS: CenterSpec[] = [
  {
    slug: `${PREFIX}atlantique`, name: "Atlantique Compétences", tagline: "Monter en compétences sans quitter son poste.", city: "Fort-de-France",
    description: "Organisme spécialisé dans le management, la bureautique et le développement professionnel des équipes en Martinique.",
    trainers: [
      { firstName: "Nadia", lastName: "Cléon", specialities: ["Management", "Leadership"], bio: "20 ans en management d'équipes, Nadia forme les managers de proximité avec une approche très concrète.", years: 20, color: "#5850ec" },
      { firstName: "Patrick", lastName: "Hélène", specialities: ["Bureautique", "Word", "Excel"], bio: "Référent bureautique, Patrick rend les outils du quotidien enfin productifs.", years: 11, color: "#2f7fc4" },
    ],
    formations: [
      { title: "Manager une équipe au quotidien", category: "Management", short: "Les fondamentaux du manager de proximité.", price: 1200, days: 3, modality: "PRESENTIEL", level: "INTERMEDIAIRE", color: "#5850ec", trainerIdx: [0] },
      { title: "Word & Excel : niveau pro", category: "Bureautique", short: "Documents et tableaux maîtrisés de A à Z.", price: 690, days: 2, modality: "PRESENTIEL", level: "DEBUTANT", color: "#2f7fc4", trainerIdx: [1] },
    ],
  },
  {
    slug: `${PREFIX}digital`, name: "Digital Academy 972", tagline: "Le digital qui sert vraiment votre activité.", city: "Le Lamentin",
    description: "Centre dédié à la transformation digitale : web, marketing, no-code et intelligence artificielle appliquée.",
    trainers: [
      { firstName: "Yann", lastName: "Rivière", specialities: ["Marketing digital", "SEO"], bio: "Consultant marketing, Yann aide les TPE à être visibles en ligne sans budget démesuré.", years: 9, color: "#129a93" },
      { firstName: "Léa", lastName: "Madec", specialities: ["No-code", "Automatisation", "IA"], bio: "Spécialiste no-code & IA, Léa automatise les tâches répétitives des PME.", years: 6, color: "#6a5cf0" },
    ],
    formations: [
      { title: "SEO & visibilité locale", category: "Marketing digital", short: "Être trouvé sur Google par vos clients.", price: 950, days: 2, modality: "HYBRIDE", level: "DEBUTANT", color: "#129a93", trainerIdx: [0] },
      { title: "Automatiser son activité avec l'IA & le no-code", category: "Intelligence artificielle", short: "Gagner des heures chaque semaine.", price: 1100, days: 2, modality: "DISTANCIEL", level: "INTERMEDIAIRE", color: "#6a5cf0", trainerIdx: [1] },
    ],
  },
  {
    slug: `${PREFIX}langues`, name: "Institut Langues & Co", tagline: "Parler pour de vrai, vite.", city: "Schœlcher",
    description: "Formations en langues pour professionnels : anglais, espagnol et préparation aux certifications.",
    trainers: [
      { firstName: "Emma", lastName: "Wright", specialities: ["Anglais professionnel", "TOEIC"], bio: "Formatrice bilingue, Emma prépare aux échanges pro et au TOEIC avec un focus oral.", years: 14, color: "#d9821f" },
    ],
    formations: [
      { title: "Anglais professionnel + préparation TOEIC", category: "Langues", short: "Aisance à l'oral et score TOEIC visé.", price: 1400, days: 5, modality: "PRESENTIEL", level: "INTERMEDIAIRE", color: "#d9821f", trainerIdx: [0] },
    ],
  },
];

async function main() {
  // Nettoyage idempotent des centres de démo réseau (cascade)
  const existing = await prisma.organization.findMany({ where: { slug: { startsWith: PREFIX } }, select: { id: true } });
  if (existing.length) await prisma.organization.deleteMany({ where: { id: { in: existing.map((o) => o.id) } } });

  let centers = 0, formations = 0, trainers = 0;
  for (const c of CENTERS) {
    const org = await prisma.organization.create({ data: { name: c.name, slug: c.slug, tagline: c.tagline, city: c.city, description: c.description, plan: "FREE" } });
    centers++;
    const createdTrainers = [] as { id: string }[];
    for (const tr of c.trainers) {
      const t = await prisma.trainer.create({ data: { organizationId: org.id, firstName: tr.firstName, lastName: tr.lastName, initials: (tr.firstName[0] + tr.lastName[0]).toUpperCase(), specialities: tr.specialities, bio: tr.bio, yearsExperience: tr.years, color: tr.color, active: true } });
      createdTrainers.push(t);
      trainers++;
    }
    for (let i = 0; i < c.formations.length; i++) {
      const f = c.formations[i];
      await prisma.formation.create({
        data: {
          organizationId: org.id, title: f.title, slug: `${f.category}-${i}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          category: f.category, shortDescription: f.short, price: EUR(f.price), durationDays: f.days, modality: f.modality, level: f.level, color: f.color,
          status: "PUBLIE", isPublic: true, publicSlug: `${c.slug}-f${i}`,
          eligibleTrainers: { create: f.trainerIdx.map((idx) => ({ trainerId: createdTrainers[idx].id })) },
        },
      });
      formations++;
    }
    console.log(JSON.stringify({ step: "center_seeded", status: "pass", details: { name: c.name, slug: c.slug } }));
  }
  console.log(JSON.stringify({ step: "seed_marketplace_demo_complete", status: "pass", details: { centers, formations, trainers } }));
}

main()
  .catch((e) => { console.error(JSON.stringify({ step: "seed_marketplace_demo", status: "fail", error: e instanceof Error ? e.message : String(e) })); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
