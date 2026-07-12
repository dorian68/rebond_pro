// ============================================================
// Seed — Académie Horizon Formation (données de démonstration)
// Source : projet_formation/app/data.jsx converti en données réelles.
// Exécution : npx prisma db seed
// ============================================================
import { PrismaClient, Modality, Level, FormationStatus, SessionStatus, Slot, ProspectStage, ProspectType, ProspectSource, EnrollmentStatus, Role, RoomType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function d(y: number, m: number, day: number, h = 8): Date {
  // m : mois humain (1-12)
  return new Date(Date.UTC(y, m - 1, day, h, 0, 0));
}
const EUR = (n: number) => Math.round(n * 100); // euros -> centimes

async function main() {
  console.log("🌱 Seed RebondPro — Académie Horizon Formation");

  // Nettoyage de l'org démo si elle existe (réexécution idempotente)
  const existing = await prisma.organization.findUnique({ where: { slug: "academie-horizon" } });
  if (existing) {
    await prisma.organization.delete({ where: { id: existing.id } });
    console.log("  ↺ ancienne org démo supprimée");
  }
  // Le compte propriétaire démo n'est pas supprimé en cascade par l'org → on le retire
  // explicitement pour que le seed reste rejouable (sinon conflit email à la recréation).
  await prisma.user.deleteMany({ where: { email: "demo@rebondpro.local" } });

  // --- Organisation (tenant) ---
  const org = await prisma.organization.create({
    data: {
      name: "Académie Horizon Formation",
      slug: "academie-horizon",
      description:
        "Centre de formation spécialisé en bureautique, IA, finance d'entreprise et compétences digitales pour PME.",
      legalName: "Académie Horizon Formation SAS",
      legalAddress: "12 rue des Lauriers, 97200 Fort-de-France",
      nda: "12 97 00000 97",
      legalRep: "Camille Rivière",
      timezone: "Europe/Paris",
      currency: "EUR",
      plan: "PRO",
      billingStatus: "active",
      publicProfileEnabled: false,
      marketplaceStatus: "PENDING",
      nbFormationsDeclarees: 4,
      nbFormateursDeclares: 4,
      nbSessionsMois: 6,
      objectifPrincipal: "CENTRALISER",
    },
  });

  // --- Utilisateurs + memberships ---
  const pwd = await bcrypt.hash("demo1234", 10);
  const owner = await prisma.user.create({
    data: { email: "demo@rebondpro.local", name: "Camille Rivière", passwordHash: pwd, emailVerified: new Date() },
  });
  await prisma.membership.create({
    data: { userId: owner.id, organizationId: org.id, role: Role.OWNER, status: "ACTIVE", acceptedAt: new Date() },
  });

  // --- Salles / ressources ---
  const salleA = await prisma.room.create({ data: { organizationId: org.id, name: "Salle Alizé", type: RoomType.SALLE, capacity: 14, location: "Rez-de-chaussée" } });
  const salleB = await prisma.room.create({ data: { organizationId: org.id, name: "Salle Trade", type: RoomType.SALLE, capacity: 12, location: "1er étage" } });
  const visio = await prisma.room.create({ data: { organizationId: org.id, name: "Visio Zoom", type: RoomType.VISIO, capacity: 30, url: "https://zoom.us/j/horizon" } });

  // --- Formateurs ---
  const trainersData = [
    { key: "claire", firstName: "Claire", lastName: "Martin", initials: "CM", specialities: ["Excel", "Power BI"], color: "#2469a6", email: "claire.martin@horizon-formation.fr", phone: "06 12 34 56 78" },
    { key: "julien", firstName: "Julien", lastName: "Moreau", initials: "JM", specialities: ["IA", "Automatisation"], color: "#129a93", email: "julien.moreau@horizon-formation.fr", phone: "06 23 45 67 89" },
    { key: "sarah", firstName: "Sarah", lastName: "Benali", initials: "SB", specialities: ["Finance", "Gestion"], color: "#d9821f", email: "sarah.benali@horizon-formation.fr", phone: "06 34 56 78 90" },
    { key: "thomas", firstName: "Thomas", lastName: "Girard", initials: "TG", specialities: ["Digital", "No-code"], color: "#2f7fc4", email: "thomas.girard@horizon-formation.fr", phone: "06 45 67 89 01" },
  ];
  const trainers: Record<string, string> = {};
  for (const t of trainersData) {
    const created = await prisma.trainer.create({
      data: { organizationId: org.id, firstName: t.firstName, lastName: t.lastName, initials: t.initials, specialities: t.specialities, color: t.color, email: t.email, phone: t.phone },
    });
    trainers[t.key] = created.id;
  }

  // --- Formations ---
  const formationsData = [
    { key: "excel", title: "Excel Avancé pour PME", slug: "excel-avance-pme", category: "Bureautique", durationDays: 2, durationHours: 14, price: EUR(690), modality: Modality.PRESENTIEL, level: Level.INTERMEDIAIRE, color: "#2f7fc4", eligible: ["claire", "thomas"],
      shortDescription: "Maîtrisez Excel pour gagner du temps et fiabiliser vos analyses en PME.",
      objectives: "Automatiser ses tableaux ; maîtriser les formules avancées ; construire des tableaux croisés dynamiques.",
      program: "Jour 1 : formules avancées, mise en forme conditionnelle. Jour 2 : TCD, graphiques, automatisations." },
    { key: "powerbi", title: "Power BI — Construire un tableau de bord", slug: "power-bi-tableau-de-bord", category: "Data & BI", durationDays: 3, durationHours: 21, price: EUR(990), modality: Modality.HYBRIDE, level: Level.INTERMEDIAIRE, color: "#2469a6", eligible: ["claire"],
      shortDescription: "Transformez vos données en tableaux de bord clairs et actionnables avec Power BI.",
      objectives: "Connecter des sources ; modéliser ; créer des visualisations ; publier un rapport.",
      program: "Jour 1 : Power Query. Jour 2 : modèle de données & DAX. Jour 3 : visualisations & publication." },
    { key: "ia", title: "Initiation à l'IA pour fonctions administratives", slug: "initiation-ia-fonctions-admin", category: "Intelligence artificielle", durationDays: 1, durationHours: 7, price: EUR(390), modality: Modality.DISTANCIEL, level: Level.DEBUTANT, color: "#129a93", eligible: ["julien"],
      shortDescription: "Utilisez l'IA générative au quotidien pour gagner du temps sur vos tâches administratives.",
      objectives: "Comprendre l'IA générative ; rédiger de bons prompts ; automatiser des tâches courantes.",
      program: "Matin : fondamentaux & prompting. Après-midi : cas pratiques bureautiques." },
    { key: "finance", title: "Finance d'entreprise pour dirigeants", slug: "finance-entreprise-dirigeants", category: "Finance & Gestion", durationDays: 2, durationHours: 14, price: EUR(850), modality: Modality.PRESENTIEL, level: Level.AVANCE, color: "#d9821f", eligible: ["sarah"],
      shortDescription: "Pilotez la santé financière de votre entreprise avec les bons indicateurs.",
      objectives: "Lire un bilan ; suivre la trésorerie ; construire un prévisionnel.",
      program: "Jour 1 : bilan & compte de résultat. Jour 2 : trésorerie & prévisionnel." },
  ];
  const formations: Record<string, { id: string; price: number }> = {};
  for (const f of formationsData) {
    const created = await prisma.formation.create({
      data: {
        organizationId: org.id, title: f.title, slug: f.slug, category: f.category,
        shortDescription: f.shortDescription, objectives: f.objectives, program: f.program,
        durationDays: f.durationDays, durationHours: f.durationHours, price: f.price,
        modality: f.modality, level: f.level, color: f.color,
        status: FormationStatus.PUBLIE, isPublic: true, publicSlug: f.slug,
        eligibleTrainers: { create: f.eligible.map((k) => ({ trainerId: trainers[k] })) },
      },
    });
    formations[f.key] = { id: created.id, price: f.price };
  }

  // --- Sessions ---
  const sessionsData = [
    { key: "s1", f: "powerbi", start: d(2026, 6, 12), end: d(2026, 6, 14, 17), trainer: "claire", room: salleB.id, cap: 12, seuil: 6, inscrits: 9, status: SessionStatus.OUVERTE, confirmed: true },
    { key: "s2", f: "excel", start: d(2026, 6, 16), end: d(2026, 6, 17, 17), trainer: null, room: salleA.id, cap: 12, seuil: 6, inscrits: 5, status: SessionStatus.OUVERTE, confirmed: false },
    { key: "s3", f: "ia", start: d(2026, 6, 21), end: d(2026, 6, 21, 17), trainer: "julien", room: visio.id, cap: 14, seuil: 10, inscrits: 4, status: SessionStatus.OUVERTE, confirmed: true },
    { key: "s4", f: "finance", start: d(2026, 6, 24), end: d(2026, 6, 25, 17), trainer: "sarah", room: salleA.id, cap: 10, seuil: 5, inscrits: 8, status: SessionStatus.OUVERTE, confirmed: true },
    { key: "s5", f: "powerbi", start: d(2026, 6, 30), end: d(2026, 7, 2, 17), trainer: "claire", room: salleB.id, cap: 12, seuil: 6, inscrits: 12, status: SessionStatus.COMPLETE, confirmed: true },
    { key: "s6", f: "excel", start: d(2026, 5, 5), end: d(2026, 5, 6, 17), trainer: "claire", room: salleA.id, cap: 12, seuil: 6, inscrits: 11, status: SessionStatus.TERMINEE, confirmed: true },
    { key: "s7", f: "ia", start: d(2026, 7, 9), end: d(2026, 7, 9, 17), trainer: "julien", room: visio.id, cap: 14, seuil: 10, inscrits: 6, status: SessionStatus.OUVERTE, confirmed: true },
  ];
  const sessions: Record<string, string> = {};
  for (const s of sessionsData) {
    const created = await prisma.session.create({
      data: {
        organizationId: org.id, formationId: formations[s.f].id,
        trainerId: s.trainer ? trainers[s.trainer] : null, roomId: s.room,
        startDate: s.start, endDate: s.end, slots: [Slot.JOURNEE],
        capacity: s.cap, breakEvenSeats: s.seuil, pricePerLearner: formations[s.f].price,
        status: s.status, trainerConfirmed: s.confirmed,
      },
    });
    sessions[s.key] = created.id;
  }

  // --- Apprenants nommés (data.jsx) + inscriptions ---
  type Named = { first: string; last: string; company: string; session: string; status: EnrollmentStatus; satisfaction?: number };
  const named: Named[] = [
    { first: "Antoine", last: "Berger", company: "Soleil PME", session: "s1", status: EnrollmentStatus.INSCRIT },
    { first: "Fatou", last: "Camara", company: "Nova RH", session: "s3", status: EnrollmentStatus.INSCRIT },
    { first: "Lucas", last: "Henry", company: "Delta Conseil", session: "s1", status: EnrollmentStatus.CONFIRME },
    { first: "Émilie", last: "Roux", company: "Caraïbes Services", session: "s4", status: EnrollmentStatus.CONFIRME },
    { first: "Karim", last: "Saïdi", company: "Méridien", session: "s6", status: EnrollmentStatus.PRESENT, satisfaction: 5 },
    { first: "Chloé", last: "Marchand", company: "Lagon Digital", session: "s6", status: EnrollmentStatus.PRESENT, satisfaction: 4 },
    { first: "Yann", last: "Le Goff", company: "Vertige", session: "s6", status: EnrollmentStatus.ABSENT },
    { first: "Sabrina", last: "Ndiaye", company: "Aurore", session: "s5", status: EnrollmentStatus.INSCRIT },
  ];

  const perSessionCount: Record<string, number> = {};
  for (const n of named) {
    const learner = await prisma.learner.create({
      data: { organizationId: org.id, firstName: n.first, lastName: n.last, company: n.company, email: `${n.first.toLowerCase()}.${n.last.toLowerCase().replace(/[^a-z]/g, "")}@example.com` },
    });
    await prisma.enrollment.create({
      data: {
        organizationId: org.id, learnerId: learner.id, sessionId: sessions[n.session], status: n.status,
        satisfactionRating: n.satisfaction ?? null,
      },
    });
    if (n.satisfaction) {
      await prisma.feedback.create({ data: { organizationId: org.id, learnerId: learner.id, rating: n.satisfaction, formationTitle: "Excel Avancé pour PME", comment: n.satisfaction >= 5 ? "Formation très concrète, formatrice au top." : "Bon contenu, rythme soutenu." } });
    }
    perSessionCount[n.session] = (perSessionCount[n.session] ?? 0) + 1;
  }

  // --- Compléter les inscriptions pour atteindre les compteurs cibles ---
  const firstNames = ["Léa", "Hugo", "Inès", "Tom", "Nadia", "Éric", "Sophie", "Marc", "Paul", "Nora", "Yanis", "Manon"];
  const lastNames = ["Petit", "Roy", "Mercier", "Sloan", "Lemoine", "Reyes", "Dubois", "Fontaine", "Lopez", "Nguyen", "Faure", "Da Silva"];
  const companies = ["Soleil PME", "Nova RH", "Delta Conseil", "Caraïbes Services", "Méridien", "Lagon Digital", "Horizon Bleu", "Aurore"];
  let fi = 0;
  for (const s of sessionsData) {
    const already = perSessionCount[s.key] ?? 0;
    for (let i = already; i < s.inscrits; i++) {
      const fn = firstNames[fi % firstNames.length];
      const ln = lastNames[(fi + 3) % lastNames.length];
      const co = companies[fi % companies.length];
      fi++;
      const learner = await prisma.learner.create({
        data: { organizationId: org.id, firstName: fn, lastName: ln, company: co, email: `${fn.toLowerCase()}.${ln.toLowerCase().replace(/[^a-z]/g, "")}${fi}@example.com` },
      });
      const status = s.status === SessionStatus.TERMINEE ? EnrollmentStatus.TERMINE : EnrollmentStatus.INSCRIT;
      await prisma.enrollment.create({ data: { organizationId: org.id, learnerId: learner.id, sessionId: sessions[s.key], status } });
    }
  }

  // --- Prospects (CRM) ---
  const prospectsData = [
    { name: "Cabinet Nova RH", contact: "Léa Fontaine", f: "ia", montant: 2730, action: "Envoyer programme détaillé", relance: d(2026, 6, 5), stage: ProspectStage.NOUVEAU, hot: true, type: ProspectType.ENTREPRISE, source: ProspectSource.LINKEDIN },
    { name: "Groupe Soleil PME", contact: "Marc Dubois", f: "powerbi", montant: 5940, action: "Appeler le décideur", relance: d(2026, 6, 6), stage: ProspectStage.CONTACTE, hot: true, type: ProspectType.ENTREPRISE, source: ProspectSource.SITE_WEB },
    { name: "Marie Lambert", contact: "Marie Lambert", f: "excel", montant: 690, action: "Relancer par email", relance: d(2026, 6, 5), stage: ProspectStage.RELANCE, hot: false, type: ProspectType.PARTICULIER, source: ProspectSource.PAGE_PUBLIQUE },
    { name: "BTP Caraïbes Services", contact: "Patrick Adèle", f: "finance", montant: 3400, action: "Envoyer devis", relance: d(2026, 6, 8), stage: ProspectStage.DEVIS, hot: true, type: ProspectType.ENTREPRISE, source: ProspectSource.RECOMMANDATION },
    { name: "Cabinet Delta Conseil", contact: "Sophie Reyes", f: "powerbi", montant: 2970, action: "Relancer devis envoyé", relance: d(2026, 6, 9), stage: ProspectStage.RELANCE, hot: false, type: ProspectType.ENTREPRISE, source: ProspectSource.SALON },
    { name: "Atelier Méridien", contact: "Hugo Petit", f: "excel", montant: 1380, action: "Programmer session", relance: null, stage: ProspectStage.GAGNE, hot: false, type: ProspectType.ENTREPRISE, source: ProspectSource.APPEL },
    { name: "Studio Lagon Digital", contact: "Inès Roy", f: "ia", montant: 1560, action: "Confirmer dates", relance: null, stage: ProspectStage.GAGNE, hot: false, type: ProspectType.ENTREPRISE, source: ProspectSource.CAMPAGNE_EMAIL },
    { name: "Cabinet Vertige", contact: "Tom Mercier", f: "finance", montant: 1700, action: null, relance: null, stage: ProspectStage.CONTACTE, hot: false, type: ProspectType.ORGANISME, source: ProspectSource.LINKEDIN },
    { name: "PME Horizon Bleu", contact: "Nadia Sloan", f: "powerbi", montant: 990, action: "Budget non validé", relance: null, stage: ProspectStage.PERDU, hot: false, type: ProspectType.ENTREPRISE, source: ProspectSource.SITE_WEB },
    { name: "Cabinet Aurore", contact: "Éric Lemoine", f: "excel", montant: 690, action: "Premier contact", relance: d(2026, 6, 7), stage: ProspectStage.NOUVEAU, hot: false, type: ProspectType.ENTREPRISE, source: ProspectSource.AUTRE },
  ];
  for (const p of prospectsData) {
    await prisma.prospect.create({
      data: {
        organizationId: org.id, name: p.name, contactName: p.contact, type: p.type, source: p.source,
        formationOfInterestId: formations[p.f].id, stage: p.stage, potentialAmount: EUR(p.montant),
        nextAction: p.action, nextFollowUpDate: p.relance, isHot: p.hot, ownerId: owner.id,
        email: p.contact.toLowerCase().replace(/[^a-z]/g, ".") + "@example.com",
      },
    });
  }

  // --- Qualité : réclamations, actions correctives, feedbacks additionnels ---
  await prisma.complaint.create({ data: { organizationId: org.id, subject: "Salle trop chaude (session Excel mai)", description: "Un apprenant a signalé une climatisation défaillante.", status: "RESOLUE" } });
  await prisma.improvementAction.create({ data: { organizationId: org.id, title: "Mettre à jour les supports Power BI (nouvelle interface)", owner: "Claire Martin", dueDate: d(2026, 6, 20), status: "EN_COURS" } });
  await prisma.improvementAction.create({ data: { organizationId: org.id, title: "Ajouter un quiz d'évaluation à chaud", owner: "Camille Rivière", dueDate: d(2026, 6, 30), status: "OUVERTE" } });
  await prisma.feedback.create({ data: { organizationId: org.id, rating: 5, formationTitle: "Power BI — Tableau de bord", comment: "Excellente pédagogie, exemples concrets." } });
  await prisma.feedback.create({ data: { organizationId: org.id, rating: 4, formationTitle: "Finance d'entreprise", comment: "Très utile pour piloter ma trésorerie." } });

  // --- Page publique : FAQ pour Power BI ---
  await prisma.faq.create({ data: { organizationId: org.id, formationId: formations.powerbi.id, question: "Faut-il connaître Excel ?", answer: "Une pratique de base d'Excel suffit, nous partons des fondamentaux Power BI.", position: 1 } });
  await prisma.faq.create({ data: { organizationId: org.id, formationId: formations.powerbi.id, question: "La formation est-elle finançable ?", answer: "Elle peut entrer dans votre plan de développement des compétences. Contactez-nous.", position: 2 } });

  const counts = {
    formations: await prisma.formation.count({ where: { organizationId: org.id } }),
    sessions: await prisma.session.count({ where: { organizationId: org.id } }),
    trainers: await prisma.trainer.count({ where: { organizationId: org.id } }),
    learners: await prisma.learner.count({ where: { organizationId: org.id } }),
    enrollments: await prisma.enrollment.count({ where: { organizationId: org.id } }),
    prospects: await prisma.prospect.count({ where: { organizationId: org.id } }),
  };
  console.log("✅ Seed terminé :", counts);
  console.log("   Connexion démo → demo@rebondpro.local / demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
