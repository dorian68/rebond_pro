import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Charge des données de démonstration dans une organisation existante.
 * Idempotent : supprime les données existantes avant d'insérer.
 */
export async function loadDemoData(organizationId: string): Promise<void> {
  // Supprime les données existantes (sauf membres/users)
  await prisma.$transaction([
    prisma.enrollment.deleteMany({ where: { organizationId } }),
    prisma.session.deleteMany({ where: { organizationId } }),
    prisma.prospect.deleteMany({ where: { organizationId } }),
    prisma.learner.deleteMany({ where: { organizationId } }),
    prisma.trainerAvailability.deleteMany({ where: { trainer: { organizationId } } }),
    prisma.trainerFormation.deleteMany({ where: { trainer: { organizationId } } }),
    prisma.trainer.deleteMany({ where: { organizationId } }),
    prisma.formation.deleteMany({ where: { organizationId } }),
    prisma.room.deleteMany({ where: { organizationId } }),
    prisma.feedback.deleteMany({ where: { organizationId } }),
    prisma.complaint.deleteMany({ where: { organizationId } }),
    prisma.improvementAction.deleteMany({ where: { organizationId } }),
    prisma.testimonial.deleteMany({ where: { organizationId } }),
  ]);

  // Vitrine du centre (marketplace)
  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      tagline: "La formation professionnelle qui transforme les compétences en résultats.",
      city: "Fort-de-France",
      description: "Centre de formation certifié spécialisé dans la montée en compétences des PME : bureautique, data, intelligence artificielle et finance. Des formateurs experts, des sessions concrètes et un accompagnement sur-mesure.",
    },
  });

  const now = new Date();
  const d = (offsetDays: number, h = 8): Date => {
    const date = new Date(now);
    date.setDate(date.getDate() + offsetDays);
    date.setHours(h, 0, 0, 0);
    return date;
  };
  const EUR = (n: number) => Math.round(n * 100);

  // Salles
  const [salleA, visio] = await Promise.all([
    prisma.room.create({ data: { organizationId, name: "Salle Alizé", type: "SALLE", capacity: 14, location: "Rez-de-chaussée" } }),
    prisma.room.create({ data: { organizationId, name: "Visio Zoom", type: "VISIO", capacity: 30, url: "https://zoom.us/j/horizon" } }),
  ]);

  // Formateurs
  const [claire, julien, sarah, thomas] = await Promise.all([
    prisma.trainer.create({ data: { organizationId, firstName: "Claire", lastName: "Martin", initials: "CM", specialities: ["Excel", "Power BI", "Tableaux de bord"], color: "#2469a6", email: "claire.martin@demo.local", yearsExperience: 12, bio: "Experte bureautique et data-visualisation, Claire accompagne depuis 12 ans les équipes administratives et financières des PME pour automatiser leurs reportings et gagner un temps précieux au quotidien." } }),
    prisma.trainer.create({ data: { organizationId, firstName: "Julien", lastName: "Moreau", initials: "JM", specialities: ["Intelligence artificielle", "Automatisation", "ChatGPT"], color: "#129a93", email: "julien.moreau@demo.local", yearsExperience: 8, bio: "Passionné d'IA générative, Julien démystifie les outils d'intelligence artificielle pour les rendre immédiatement utiles aux fonctions support. Formateur reconnu pour sa pédagogie concrète et bienveillante." } }),
    prisma.trainer.create({ data: { organizationId, firstName: "Sarah", lastName: "Benali", initials: "SB", specialities: ["Finance d'entreprise", "Gestion", "Contrôle de gestion"], color: "#d9821f", email: "sarah.benali@demo.local", yearsExperience: 15, bio: "Ancienne directrice financière, Sarah rend la finance accessible aux non-financiers. Ses formations allient rigueur et exemples tirés du terrain pour des décisions éclairées." } }),
    prisma.trainer.create({ data: { organizationId, firstName: "Thomas", lastName: "Girard", initials: "TG", specialities: ["Transformation digitale", "Bureautique"], color: "#2f7fc4", email: "thomas.girard@demo.local", yearsExperience: 6, bio: "Thomas accompagne la transformation digitale des organisations, de la prise en main des outils collaboratifs à l'optimisation des process. Dynamique et orienté résultats." } }),
  ]);

  // Formations
  const excel = await prisma.formation.create({
    data: { organizationId, title: "Excel Avancé pour PME", slug: "excel-avance", category: "Bureautique", shortDescription: "Maîtrisez Excel pour gagner du temps au quotidien.", durationDays: 2, durationHours: 14, price: EUR(690), modality: "PRESENTIEL", level: "INTERMEDIAIRE", color: "#2f7fc4", status: "PUBLIE", isPublic: true, publicSlug: `demo-excel-${organizationId.slice(0, 8)}`, eligibleTrainers: { create: [{ trainerId: claire.id }, { trainerId: thomas.id }] } },
  });
  const powerbi = await prisma.formation.create({
    data: { organizationId, title: "Power BI & Visualisation de données", slug: "power-bi", category: "Data & BI", shortDescription: "Créez des tableaux de bord percutants avec Power BI.", durationDays: 3, durationHours: 21, price: EUR(990), modality: "PRESENTIEL", level: "INTERMEDIAIRE", color: "#129a93", status: "PUBLIE", isPublic: true, publicSlug: `demo-powerbi-${organizationId.slice(0, 8)}`, eligibleTrainers: { create: [{ trainerId: claire.id }, { trainerId: julien.id }] } },
  });
  const ia = await prisma.formation.create({
    data: { organizationId, title: "IA pour fonctions administratives", slug: "ia-admin", category: "Intelligence artificielle", shortDescription: "Utilisez l'IA pour automatiser vos tâches admin.", durationDays: 1, durationHours: 7, price: EUR(450), modality: "DISTANCIEL", level: "DEBUTANT", color: "#2f9488", status: "PUBLIE", isPublic: true, publicSlug: `demo-ia-${organizationId.slice(0, 8)}`, eligibleTrainers: { create: [{ trainerId: julien.id }] } },
  });
  const finance = await prisma.formation.create({
    data: { organizationId, title: "Finance d'entreprise pour non-financiers", slug: "finance-entreprise", category: "Finance & Gestion", shortDescription: "Comprenez les états financiers pour mieux décider.", durationDays: 2, durationHours: 14, price: EUR(790), modality: "HYBRIDE", level: "DEBUTANT", color: "#d9821f", status: "PUBLIE", isPublic: true, publicSlug: `demo-finance-${organizationId.slice(0, 8)}`, eligibleTrainers: { create: [{ trainerId: sarah.id }] } },
  });

  // Sessions
  const [s1, s2, s3, s4, s5] = await Promise.all([
    prisma.session.create({ data: { organizationId, formationId: excel.id, trainerId: claire.id, roomId: salleA.id, startDate: d(14), endDate: d(15), capacity: 12, pricePerLearner: EUR(690), breakEvenSeats: 6, status: "OUVERTE", trainerConfirmed: true } }),
    prisma.session.create({ data: { organizationId, formationId: powerbi.id, trainerId: claire.id, roomId: salleA.id, startDate: d(21), endDate: d(23), capacity: 10, pricePerLearner: EUR(990), breakEvenSeats: 5, status: "OUVERTE", trainerConfirmed: true } }),
    prisma.session.create({ data: { organizationId, formationId: ia.id, trainerId: julien.id, roomId: visio.id, startDate: d(7), endDate: d(7), capacity: 20, pricePerLearner: EUR(450), breakEvenSeats: 8, status: "OUVERTE", trainerConfirmed: false } }),
    prisma.session.create({ data: { organizationId, formationId: finance.id, trainerId: sarah.id, roomId: salleA.id, startDate: d(-10), endDate: d(-9), capacity: 8, pricePerLearner: EUR(790), breakEvenSeats: 4, status: "TERMINEE", trainerConfirmed: true } }),
    prisma.session.create({ data: { organizationId, formationId: excel.id, trainerId: thomas.id, roomId: visio.id, startDate: d(35), endDate: d(36), capacity: 15, pricePerLearner: EUR(690), breakEvenSeats: 7, status: "BROUILLON" } }),
  ]);

  // Apprenants + inscriptions
  const learnerData = [
    { firstName: "Marie", lastName: "Dupont", email: "marie.dupont@acme.fr", company: "Acme SA" },
    { firstName: "Paul", lastName: "Martin", email: "paul.martin@pme-soleil.fr", company: "PME Soleil" },
    { firstName: "Lucie", lastName: "Bernard", email: "lucie.bernard@innov.fr", company: "Innov Corp" },
    { firstName: "Antoine", lastName: "Lefèvre", email: "antoine.l@techstart.fr", company: "TechStart" },
    { firstName: "Sarah", lastName: "Girard", email: "sarah.g@artisan.fr", company: "Artisan & Co" },
    { firstName: "Marc", lastName: "Rousseau", email: "marc.rousseau@btp.fr", company: "BTP Plus" },
    { firstName: "Emma", lastName: "Petit", email: "emma.petit@rh.fr", company: "RH Conseil" },
    { firstName: "Thomas", lastName: "Blanc", email: "thomas.blanc@agri.fr", company: "Agri Bio" },
  ];

  for (let i = 0; i < learnerData.length; i++) {
    const l = await prisma.learner.create({ data: { organizationId, ...learnerData[i] } });
    const sessionId = [s1, s1, s2, s3, s3, s4, s4, s5][i].id;
    const status = i < 5 ? "INSCRIT" : i < 6 ? "PRESENT" : "TERMINE";
    await prisma.enrollment.create({ data: { organizationId, learnerId: l.id, sessionId, status } });
  }

  // Prospects
  const prospectData = [
    { name: "TechStart", contactName: "Julien Renard", type: "ENTREPRISE" as const, email: "j.renard@techstart.fr", stage: "DEVIS" as const, potentialAmount: EUR(2070), formationOfInterestId: excel.id, source: "SITE_WEB" as const, isHot: true },
    { name: "Mairie de Ducos", contactName: "Hélène Fort", type: "ORGANISME" as const, email: "h.fort@mairie-ducos.fr", stage: "CONTACTE" as const, potentialAmount: EUR(4950), formationOfInterestId: powerbi.id, source: "APPEL" as const },
    { name: "Béton Express", contactName: "Rémi Cazal", type: "ENTREPRISE" as const, email: "r.cazal@beton-express.fr", stage: "NOUVEAU" as const, potentialAmount: EUR(1380), formationOfInterestId: ia.id, source: "LINKEDIN" as const },
    { name: "Cabinet Durand", contactName: "Élodie Saurel", type: "ENTREPRISE" as const, email: "e.saurel@cabinet-durand.fr", stage: "RELANCE" as const, potentialAmount: EUR(1580), formationOfInterestId: finance.id, source: "RECOMMANDATION" as const, isHot: true, nextFollowUpDate: new Date() },
    { name: "Lycée Schœlcher", contactName: "Dir. Formation", type: "ORGANISME" as const, email: "formation@lyc-schoelcher.fr", stage: "NOUVEAU" as const, potentialAmount: EUR(3300), formationOfInterestId: excel.id, source: "CAMPAGNE_EMAIL" as const },
    { name: "Pierre Martin", contactName: "Pierre Martin", type: "PARTICULIER" as const, email: "p.martin@email.fr", stage: "GAGNE" as const, potentialAmount: EUR(690), formationOfInterestId: excel.id, source: "PAGE_PUBLIQUE" as const },
    { name: "AXA Martinique", contactName: "Sophie Luce", type: "ENTREPRISE" as const, email: "s.luce@axa.fr", stage: "DEVIS" as const, potentialAmount: EUR(5940), formationOfInterestId: powerbi.id, source: "SALON" as const },
    { name: "CHU Fort-de-France", contactName: "Dr. Fabre", type: "ORGANISME" as const, email: "formation@chu-fdf.fr", stage: "PERDU" as const, potentialAmount: EUR(2250), formationOfInterestId: ia.id, source: "APPEL" as const },
    { name: "Transdev Antilles", contactName: "Marc Valmy", type: "ENTREPRISE" as const, email: "m.valmy@transdev.fr", stage: "CONTACTE" as const, potentialAmount: EUR(4740), formationOfInterestId: finance.id, source: "RECOMMANDATION" as const },
    { name: "Groupe COLAS", contactName: "L. Picard", type: "ENTREPRISE" as const, email: "l.picard@colas.fr", stage: "NOUVEAU" as const, potentialAmount: EUR(2370), formationOfInterestId: excel.id, source: "LINKEDIN" as const, nextFollowUpDate: new Date() },
  ];

  for (const p of prospectData) {
    await prisma.prospect.create({ data: { organizationId, ...p, nextFollowUpDate: p.nextFollowUpDate ?? null } });
  }

  // Feedbacks qualité
  const feedbackData = [
    { rating: 5, comment: "Formation très complète, formateur excellent. Je recommande vivement.", formationTitle: "Excel Avancé pour PME" },
    { rating: 4, comment: "Bonne formation, quelques exercices pourraient être plus pratiques.", formationTitle: "Excel Avancé pour PME" },
    { rating: 5, comment: "Julien est un formateur passionné. J'ai appris en 1 jour ce que je cherchais depuis des mois.", formationTitle: "IA pour fonctions administratives" },
    { rating: 3, comment: "Contenu correct mais rythme trop rapide pour des débutants.", formationTitle: "Finance d'entreprise" },
    { rating: 5, comment: "Parfait pour notre équipe. On repart avec des outils directement applicables.", formationTitle: "Power BI" },
  ];
  for (const f of feedbackData) {
    await prisma.feedback.create({ data: { organizationId, ...f } });
  }

  // Réclamation et action corrective démo
  await prisma.complaint.create({ data: { organizationId, subject: "Salle de formation mal climatisée", description: "Session du 12/05 — chaleur excessive, inconfort pour les participants.", status: "EN_COURS" } });
  await prisma.improvementAction.create({ data: { organizationId, title: "Vérifier la climatisation salle Alizé avant chaque session", owner: "Équipe logistique", status: "EN_COURS" } });

  // Témoignages (vitrine marketplace)
  const testimonials = [
    { author: "Nathalie R.", role: "Responsable RH, Acme SA", content: "Une formation Excel qui a vraiment changé notre façon de travailler. Claire est une formidable pédagogue.", rating: 5, formationId: excel.id },
    { author: "Karim B.", role: "Dirigeant, TechStart", content: "Julien a rendu l'IA concrète et applicable dès le lendemain. Bluffant.", rating: 5, formationId: ia.id },
    { author: "Sophie L.", role: "DAF, AXA Martinique", content: "Enfin une formation finance compréhensible pour mes équipes opérationnelles. Sarah maîtrise son sujet.", rating: 5, formationId: finance.id },
    { author: "Marc V.", role: "Chef de projet, Transdev", content: "Power BI n'a plus de secret pour nous. Des tableaux de bord pro en 3 jours.", rating: 4, formationId: powerbi.id },
    { author: "Émilie D.", role: "Assistante de direction", content: "Centre très professionnel, accueil au top et formateurs disponibles. Je recommande.", rating: 5, formationId: null },
  ];
  for (const t of testimonials) {
    await prisma.testimonial.create({ data: { organizationId, author: t.author, role: t.role, content: t.content, rating: t.rating, formationId: t.formationId } });
  }
}
