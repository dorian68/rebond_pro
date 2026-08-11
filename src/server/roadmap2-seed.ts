import type { Roadmap2Category, Roadmap2NodeType, Roadmap2Priority, Roadmap2RelationType, Roadmap2Status } from "@/lib/roadmap2";

export type Roadmap2SeedNode = {
  key: string;
  title: string;
  type: Roadmap2NodeType;
  category: Roadmap2Category;
  parentKey?: string;
  positionX: number;
  positionY: number;
  startDate: string;
  dueDate: string;
  status?: Roadmap2Status;
  priority?: Roadmap2Priority;
  progressPercent?: number;
  decisionRequired?: boolean;
  nextAction?: string;
  definitionOfDone?: string;
};

export type Roadmap2SeedEdge = {
  sourceKey: string;
  targetKey: string;
  relationType: Roadmap2RelationType;
};

type Branch = {
  key: string;
  title: string;
  category: Roadmap2Category;
  tasks: Array<{ key: string; title: string; type?: Roadmap2NodeType; status?: Roadmap2Status; priority?: Roadmap2Priority; decisionRequired?: boolean }>;
  milestone?: { key: string; title: string };
};

const branches: Branch[] = [
  {
    key: "strategie",
    title: "STRATÉGIE & GOUVERNANCE",
    category: "strategy_governance",
    tasks: [
      { key: "audit-association", title: "Audit de l’association existante", status: "completed" },
      { key: "choix-porteur-fse", title: "Choix du porteur FSE+", type: "decision", status: "review", priority: "P0", decisionRequired: true },
      { key: "montage-association-optiquant", title: "Montage Association ↔ Optiquant IA", priority: "P0" },
      { key: "gouvernance-conflits", title: "Gouvernance et conflits d’intérêts" },
      { key: "propriete-marque-tech", title: "Propriété de la marque et de la technologie" },
    ],
    milestone: { key: "m1-juridique", title: "M1 — Montage juridique validé" },
  },
  {
    key: "produit",
    title: "PRODUIT & PÉDAGOGIE",
    category: "product_pedagogy",
    tasks: [
      { key: "template-emploiton", title: "Finaliser le template général Emploi’Ton", status: "in_progress", priority: "P0" },
      { key: "parcours-six-semaines", title: "Finaliser le parcours 6 semaines + J+90" },
      { key: "equipe-pedagogique", title: "Finaliser l’équipe pédagogique" },
      { key: "budget-cohorte", title: "Finaliser le budget par cohorte", priority: "P0" },
      { key: "sorties-actives", title: "Finaliser la définition des sorties actives" },
      { key: "fiche-acheteur", title: "Produire la fiche acheteur", status: "in_progress" },
      { key: "deck-pitch", title: "Produire le deck de pitch" },
    ],
    milestone: { key: "m2-offre", title: "M2 — Offre Emploi’Ton achetable" },
  },
  {
    key: "acheteurs",
    title: "ACHETEURS & FINANCEMENTS",
    category: "buyers_funding",
    tasks: [
      { key: "prioriser-as-rup", title: "Prioriser l’appel AS-RUP", type: "decision", priority: "P0", decisionRequired: true },
      { key: "dossier-fse", title: "Préparer le dossier FSE+", status: "blocked", priority: "P0" },
      { key: "plan-tresorerie", title: "Construire le plan de trésorerie", priority: "P0" },
      { key: "cartographier-communes", title: "Cartographier les communes et EPCI" },
      { key: "offres-mission-locale", title: "Préparer les offres Mission Locale / PLIE" },
      { key: "approche-region", title: "Préparer l’approche Région" },
      { key: "approche-france-travail", title: "Préparer l’approche France Travail" },
      { key: "rdv-acheteurs", title: "Obtenir les premiers rendez-vous acheteurs", priority: "P0" },
    ],
    milestone: { key: "m3-acheteur", title: "M3 — Premier acheteur ou cofinanceur engagé" },
  },
  {
    key: "partenaires",
    title: "PARTENAIRES & MARCHÉ",
    category: "partners_market",
    tasks: [
      { key: "choisir-filiere", title: "Choisir la première filière", type: "decision", priority: "P0", decisionRequired: true },
      { key: "cartographier-entreprises", title: "Cartographier les entreprises" },
      { key: "securiser-cfa", title: "Sécuriser les CFA / centres" },
      { key: "mobiliser-prescripteurs", title: "Mobiliser les prescripteurs" },
      { key: "mobiliser-partenaires-sociaux", title: "Mobiliser les partenaires sociaux" },
      { key: "securiser-opportunites", title: "Sécuriser 25 à 30 opportunités", priority: "P0" },
      { key: "lettres-engagement", title: "Obtenir les lettres d’engagement" },
    ],
    milestone: { key: "m4-debouches", title: "M4 — Débouchés du pilote sécurisés" },
  },
  {
    key: "pilote",
    title: "PILOTE EMPLOI’TON",
    category: "pilot_execution",
    tasks: [
      { key: "public-cible", title: "Définir le public cible", priority: "P0" },
      { key: "ouvrir-sourcing", title: "Ouvrir le sourcing", priority: "P0" },
      { key: "selection-beneficiaires", title: "Sélectionner 15 à 20 bénéficiaires" },
      { key: "donnees-entree", title: "Collecter les données d’entrée" },
      { key: "pre-matcher", title: "Pré-matcher les bénéficiaires" },
      { key: "day-one", title: "Organiser le Day One" },
      { key: "executer-six-semaines", title: "Exécuter les 6 semaines", priority: "P0" },
      { key: "suivi-j90", title: "Suivre J+7, J+30, J+60, J+90" },
      { key: "bilan-financeur", title: "Produire le bilan financeur" },
    ],
    milestone: { key: "m5-cohorte", title: "M5 — Première cohorte exécutée et mesurée" },
  },
  {
    key: "operations",
    title: "OPÉRATIONS & CONFORMITÉ",
    category: "operations_compliance",
    tasks: [
      { key: "nda-qualiopi", title: "Vérifier NDA / Qualiopi", priority: "P0" },
      { key: "compta-analytique", title: "Mettre en place la comptabilité analytique" },
      { key: "suivi-temps", title: "Définir le suivi des temps" },
      { key: "conventions-beneficiaires", title: "Créer les conventions bénéficiaires" },
      { key: "conventions-partenaires", title: "Créer les conventions partenaires" },
      { key: "collecte-fse", title: "Définir la collecte FSE+", priority: "P0" },
      { key: "rgpd-participants", title: "Formaliser RGPD et information participants", priority: "P0" },
      { key: "protocole-handicap", title: "Définir le protocole handicap" },
      { key: "indicateurs-preuves", title: "Définir les indicateurs et preuves" },
    ],
  },
  {
    key: "technologie",
    title: "TECHNOLOGIE & DONNÉES",
    category: "technology_data",
    tasks: [
      { key: "cv-boost", title: "Finaliser CV Boost", status: "in_progress" },
      { key: "profil-candidat", title: "Finaliser le profil candidat" },
      { key: "suivi-parcours", title: "Construire le suivi des parcours" },
      { key: "dashboard-financeur", title: "Construire le dashboard financeur" },
      { key: "registre-opportunites", title: "Construire le registre des opportunités" },
      { key: "reporting-sectoriel", title: "Construire le reporting sectoriel" },
      { key: "securiser-acces", title: "Sécuriser les accès et données privées", priority: "P0" },
    ],
  },
];

function isoDay(offset: number) {
  const date = new Date(Date.UTC(2026, 7, 11 + offset));
  return date.toISOString().slice(0, 10);
}

export function buildRoadmap2Seed(): { nodes: Roadmap2SeedNode[]; edges: Roadmap2SeedEdge[] } {
  const nodes: Roadmap2SeedNode[] = [{
    key: "root",
    title: "LE BON REBOND",
    type: "initiative",
    category: "strategy_governance",
    positionX: 40,
    positionY: 720,
    startDate: isoDay(0),
    dueDate: isoDay(330),
    status: "in_progress",
    priority: "P0",
    progressPercent: 12,
    nextAction: "Aligner les priorités des sept chantiers.",
    definitionOfDone: "Première cohorte exécutée, mesurée et finançable.",
  }];
  const edges: Roadmap2SeedEdge[] = [];

  branches.forEach((branch, branchIndex) => {
    const x = 420 + (branchIndex % 4) * 360;
    const baseY = 80 + Math.floor(branchIndex / 4) * 1180;
    const branchStart = branchIndex * 32;
    nodes.push({
      key: branch.key,
      title: branch.title,
      type: "phase",
      category: branch.category,
      parentKey: "root",
      positionX: x,
      positionY: baseY,
      startDate: isoDay(branchStart),
      dueDate: isoDay(branchStart + 180),
      status: branchIndex < 3 ? "in_progress" : "not_started",
      priority: branchIndex < 3 ? "P0" : "P1",
      progressPercent: branchIndex === 0 ? 22 : branchIndex === 1 ? 18 : 0,
    });
    edges.push({ sourceKey: "root", targetKey: branch.key, relationType: "parent_child" });

    branch.tasks.forEach((task, taskIndex) => {
      const taskKey = `${branch.key}-${task.key}`;
      nodes.push({
        key: taskKey,
        title: task.title,
        type: task.type ?? "action",
        category: branch.category,
        parentKey: branch.key,
        positionX: x + 30 + (taskIndex % 2) * 250,
        positionY: baseY + 150 + Math.floor(taskIndex / 2) * 155,
        startDate: isoDay(branchStart + taskIndex * 10),
        dueDate: isoDay(branchStart + taskIndex * 10 + 35),
        status: task.status ?? "not_started",
        priority: task.priority ?? "P1",
        progressPercent: task.status === "completed" ? 100 : task.status === "in_progress" ? 35 : 0,
        decisionRequired: task.decisionRequired,
        nextAction: task.status === "blocked" ? "Lever le blocage documenté dans le suivi." : "Confirmer le prochain livrable et son propriétaire.",
        definitionOfDone: `Résultat validé : ${task.title}.`,
      });
      edges.push({ sourceKey: branch.key, targetKey: taskKey, relationType: "parent_child" });
    });

    if (branch.milestone) {
      const milestoneKey = `${branch.key}-${branch.milestone.key}`;
      nodes.push({
        key: milestoneKey,
        title: branch.milestone.title,
        type: "milestone",
        category: branch.category,
        parentKey: branch.key,
        positionX: x + 120,
        positionY: baseY + 870,
        startDate: isoDay(branchStart + 120),
        dueDate: isoDay(branchStart + 180),
        status: "not_started",
        priority: "P0",
        progressPercent: 0,
        definitionOfDone: `${branch.milestone.title} formellement validé et documenté.`,
      });
      edges.push({ sourceKey: branch.key, targetKey: milestoneKey, relationType: "parent_child" });
      for (const task of branch.tasks) {
        edges.push({ sourceKey: `${branch.key}-${task.key}`, targetKey: milestoneKey, relationType: "contributes_to" });
      }
    }
  });

  edges.push(
    { sourceKey: "strategie-choix-porteur-fse", targetKey: "acheteurs-dossier-fse", relationType: "dependency" },
    { sourceKey: "partenaires-choisir-filiere", targetKey: "partenaires-cartographier-entreprises", relationType: "dependency" },
    { sourceKey: "partenaires-cartographier-entreprises", targetKey: "partenaires-securiser-opportunites", relationType: "dependency" },
    { sourceKey: "partenaires-securiser-opportunites", targetKey: "pilote-ouvrir-sourcing", relationType: "dependency" },
    { sourceKey: "pilote-ouvrir-sourcing", targetKey: "pilote-selection-beneficiaires", relationType: "dependency" },
    { sourceKey: "pilote-selection-beneficiaires", targetKey: "pilote-day-one", relationType: "dependency" },
    { sourceKey: "pilote-day-one", targetKey: "pilote-executer-six-semaines", relationType: "dependency" },
    { sourceKey: "produit-template-emploiton", targetKey: "produit-fiche-acheteur", relationType: "dependency" },
    { sourceKey: "produit-fiche-acheteur", targetKey: "acheteurs-rdv-acheteurs", relationType: "dependency" },
    { sourceKey: "strategie-choix-porteur-fse", targetKey: "acheteurs-dossier-fse", relationType: "blocks" },
  );

  return { nodes, edges };
}
