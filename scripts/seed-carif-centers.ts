import "./_env";
import { prisma } from "../src/lib/prisma";

// Insère 10 centres de formation issus du catalogue CARIF/INTERCARIFOREF.
// Idempotent : identifiés par leur slug préfixé "carif-".
// Status APPROVED → visibles immédiatement sur la marketplace.

const PREFIX = "carif-";

const CENTERS = [
  {
    slug: `${PREFIX}digitalys-formation`,
    name: "Digitalys Formation",
    siret: "10035810000012",
    tagline: "La formation numérique au cœur de La Réunion",
    city: "Saint-Denis (La Réunion)",
    description:
      "Organisme de formation spécialisé dans le numérique et le digital à La Réunion. Accompagne les professionnels et les entreprises dans leur montée en compétences digitales.",
    publicEmail: "contact@digitalysformation.fr",
    publicPhone: "02 62 73 83 52",
    specialties: ["Numérique", "Digital", "Informatique", "Marketing digital"],
    modalities: ["PRESENTIEL", "DISTANCIEL"],
    certifications: ["Qualiopi"],
  },
  {
    slug: `${PREFIX}agroparistech-executive`,
    name: "AgroParisTech – Formation Continue",
    siret: "13000285000134",
    tagline: "L'excellence académique au service de votre évolution professionnelle",
    city: "Paris",
    description:
      "Institut des sciences et industries du vivant et de l'environnement. Formations d'excellence en agronomie, agroalimentaire, environnement et gestion des ressources naturelles.",
    publicEmail: "executive@agroparistech.fr",
    publicPhone: "01 89 10 02 22",
    specialties: ["Agronomie", "Environnement", "Agroalimentaire", "Sciences du vivant"],
    modalities: ["PRESENTIEL", "HYBRIDE"],
    certifications: ["Qualiopi"],
  },
  {
    slug: `${PREFIX}cci-mayotte`,
    name: "CCI Mayotte Formation",
    siret: "13000337900018",
    tagline: "Votre partenaire formation pour développer les compétences à Mayotte",
    city: "Mamoudzou (Mayotte)",
    description:
      "La Chambre de Commerce et d'Industrie de Mayotte propose une large offre de formations professionnelles adaptées aux besoins des entreprises et des salariés du territoire.",
    publicEmail: "formation@mayotte.cci.fr",
    publicPhone: "02 69 61 04 26",
    specialties: ["Commerce", "Gestion", "Management", "Entrepreneuriat"],
    modalities: ["PRESENTIEL"],
    certifications: ["Qualiopi"],
  },
  {
    slug: `${PREFIX}ehesp-formation-continue`,
    name: "EHESP – Formation Continue",
    siret: "13000362700010",
    tagline: "Former les décideurs de la santé publique de demain",
    city: "Rennes",
    description:
      "L'École des Hautes Études en Santé Publique est la référence nationale pour la formation des professionnels et dirigeants de la santé publique, du secteur médico-social et du management hospitalier.",
    publicEmail: "fc@ehesp.fr",
    publicPhone: "02 99 02 22 00",
    specialties: ["Santé publique", "Management hospitalier", "Politiques sociales", "Secteur médico-social"],
    modalities: ["PRESENTIEL", "DISTANCIEL", "HYBRIDE"],
    certifications: ["Qualiopi"],
  },
  {
    slug: `${PREFIX}cfa-sup-montpellier`,
    name: "CFA Sup – Université de Montpellier",
    siret: "13000375900011",
    tagline: "L'alternance au cœur de l'enseignement supérieur occitan",
    city: "Montpellier",
    description:
      "CFA de l'enseignement supérieur de l'Université de Montpellier – formations en alternance du BTS au Doctorat dans des domaines variés : sciences, droit, économie, management.",
    publicEmail: "cfa-ensuplr@umontpellier.fr",
    publicPhone: "04 34 43 21 30",
    specialties: ["Alternance", "Enseignement supérieur", "Sciences", "Droit", "Économie"],
    modalities: ["PRESENTIEL", "HYBRIDE"],
    certifications: ["Qualiopi"],
  },
  {
    slug: `${PREFIX}cci-maine-et-loire`,
    name: "CCI Maine-et-Loire Formation",
    siret: "13000460900017",
    tagline: "Des formations concrètes pour booster vos équipes",
    city: "Angers",
    description:
      "La CCI Maine-et-Loire accompagne les professionnels et les entreprises avec une offre de formations adaptées aux réalités du terrain : management, commerce, RH, comptabilité, communication.",
    publicEmail: "formation@maineetloire.cci.fr",
    publicPhone: "02 41 20 49 00",
    specialties: ["Management", "Commerce", "RH", "Comptabilité", "Communication"],
    modalities: ["PRESENTIEL", "DISTANCIEL"],
    certifications: ["Qualiopi"],
  },
  {
    slug: `${PREFIX}isae-supaero`,
    name: "ISAE-SUPAERO Formation Continue",
    siret: "13000427800011",
    tagline: "L'excellence aérospatiale à portée de formation",
    city: "Toulouse",
    description:
      "L'Institut Supérieur de l'Aéronautique et de l'Espace propose des programmes exécutifs et formations continues de haut niveau pour les ingénieurs et professionnels du secteur aérospatial et défense.",
    publicEmail: "catherine.duval@isae-supaero.fr",
    publicPhone: null,
    specialties: ["Aéronautique", "Spatial", "Ingénierie", "Défense", "Systèmes embarqués"],
    modalities: ["PRESENTIEL", "HYBRIDE"],
    certifications: ["Qualiopi"],
  },
  {
    slug: `${PREFIX}gip-fcip-guyane`,
    name: "GIP FCIP – Académie de Guyane",
    siret: "13000428600014",
    tagline: "Votre tremplin vers l'emploi et la formation en Guyane",
    city: "Cayenne (Guyane)",
    description:
      "Le Groupement d'Intérêt Public Formation Continue et Insertion Professionnelle de l'Académie de Guyane accompagne les adultes en formation continue, VAE et bilan de compétences sur le territoire guyanais.",
    publicEmail: "gipfcip973@ac-guyane.fr",
    publicPhone: "05 94 01 05 18",
    specialties: ["Formation continue", "Insertion professionnelle", "VAE", "Bilan de compétences"],
    modalities: ["PRESENTIEL"],
    certifications: ["Qualiopi"],
  },
  {
    slug: `${PREFIX}sfc-unistra`,
    name: "Service Formation Continue – Université de Strasbourg",
    siret: "13000545700010",
    tagline: "Le savoir universitaire au service de votre parcours professionnel",
    city: "Strasbourg",
    description:
      "Le Service de Formation Continue de l'Université de Strasbourg propose des formations diplômantes, certifiantes et qualifiantes pour les professionnels en activité dans tous les domaines disciplinaires.",
    publicEmail: "sfc-contact@unistra.fr",
    publicPhone: "03 68 85 86 61",
    specialties: ["Sciences humaines", "Droit", "Santé", "Sciences", "Langues", "Management"],
    modalities: ["PRESENTIEL", "DISTANCIEL", "HYBRIDE"],
    certifications: ["Qualiopi"],
  },
  {
    slug: `${PREFIX}cci-correze`,
    name: "CCI Corrèze Formation",
    siret: "13000770100043",
    tagline: "Des formations de qualité pour les entreprises corrèziennes",
    city: "Tulle",
    description:
      "La CCI Corrèze accompagne les professionnels et les entreprises du département avec des formations adaptées aux enjeux locaux : commerce, gestion, tourisme, management, artisanat.",
    publicEmail: "ceyrignoux@correze.cci.fr",
    publicPhone: "05 55 18 94 27",
    specialties: ["Commerce", "Gestion", "Tourisme", "Artisanat", "Management"],
    modalities: ["PRESENTIEL", "HYBRIDE"],
    certifications: ["Qualiopi"],
  },
];

async function main() {
  let created = 0;
  let skipped = 0;

  for (const c of CENTERS) {
    const existing = await prisma.organization.findUnique({ where: { slug: c.slug } });
    if (existing) {
      console.log(JSON.stringify({ step: "center_skip", status: "skip", details: { slug: c.slug, reason: "already_exists" } }));
      skipped++;
      continue;
    }

    await prisma.organization.create({
      data: {
        name: c.name,
        slug: c.slug,
        siret: c.siret,
        tagline: c.tagline,
        city: c.city,
        description: c.description,
        publicEmail: c.publicEmail,
        publicPhone: c.publicPhone ?? undefined,
        specialties: c.specialties,
        modalities: c.modalities,
        certifications: c.certifications ?? [],
        publicProfileEnabled: true,
        marketplaceStatus: "APPROVED",
        plan: "FREE",
      },
    });

    console.log(JSON.stringify({ step: "center_created", status: "pass", details: { name: c.name, slug: c.slug, city: c.city } }));
    created++;
  }

  console.log(JSON.stringify({ step: "seed_carif_complete", status: "pass", details: { created, skipped, total: CENTERS.length } }));
}

main()
  .catch((e) => {
    console.error(JSON.stringify({ step: "seed_carif_centers", status: "fail", error: e instanceof Error ? e.message : String(e) }));
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
