export const ROADMAP2_WORKSPACE_KEY = "le-bon-rebond";

export const ROADMAP2_NODE_TYPES = ["phase", "milestone", "initiative", "action", "decision"] as const;
export type Roadmap2NodeType = (typeof ROADMAP2_NODE_TYPES)[number];

export const ROADMAP2_CATEGORIES = [
  "strategy_governance",
  "product_pedagogy",
  "buyers_funding",
  "partners_market",
  "operations_compliance",
  "technology_data",
  "pilot_execution",
] as const;
export type Roadmap2Category = (typeof ROADMAP2_CATEGORIES)[number];

export const ROADMAP2_STATUSES = ["not_started", "in_progress", "blocked", "review", "completed", "archived"] as const;
export type Roadmap2Status = (typeof ROADMAP2_STATUSES)[number];

export const ROADMAP2_PRIORITIES = ["P0", "P1", "P2"] as const;
export type Roadmap2Priority = (typeof ROADMAP2_PRIORITIES)[number];

export const ROADMAP2_RELATION_TYPES = ["dependency", "parent_child", "blocks", "contributes_to"] as const;
export type Roadmap2RelationType = (typeof ROADMAP2_RELATION_TYPES)[number];

export const ROADMAP2_UPDATE_TYPES = ["progress", "decision", "blocker", "note", "validation"] as const;
export type Roadmap2UpdateType = (typeof ROADMAP2_UPDATE_TYPES)[number];

export const ROADMAP2_TYPE_LABELS: Record<Roadmap2NodeType, string> = {
  phase: "Phase",
  milestone: "Jalon",
  initiative: "Projet / initiative",
  action: "Action structurante",
  decision: "Décision",
};

export const ROADMAP2_CATEGORY_LABELS: Record<Roadmap2Category, string> = {
  strategy_governance: "Stratégie & gouvernance",
  product_pedagogy: "Produit & pédagogie",
  buyers_funding: "Acheteurs & financements",
  partners_market: "Partenaires & marché",
  operations_compliance: "Opérations & conformité",
  technology_data: "Technologie & données",
  pilot_execution: "Pilote & exécution",
};

export const ROADMAP2_STATUS_LABELS: Record<Roadmap2Status, string> = {
  not_started: "À faire",
  in_progress: "En cours",
  blocked: "Bloqué",
  review: "À valider",
  completed: "Terminé",
  archived: "Archivé",
};

export const ROADMAP2_PRIORITY_LABELS: Record<Roadmap2Priority, string> = {
  P0: "Critique",
  P1: "Importante",
  P2: "Secondaire",
};

export const ROADMAP2_RELATION_LABELS: Record<Roadmap2RelationType, string> = {
  dependency: "Prérequis pour",
  parent_child: "Parent → enfant",
  blocks: "Bloque",
  contributes_to: "Contribue à",
};

export const ROADMAP2_UPDATE_LABELS: Record<Roadmap2UpdateType, string> = {
  progress: "Progression",
  decision: "Décision",
  blocker: "Blocage",
  note: "Note",
  validation: "Validation",
};

export type Roadmap2Owner = {
  id: string;
  name: string;
  email: string;
};

export type Roadmap2UpdateDto = {
  id: string;
  nodeId: string;
  updateType: Roadmap2UpdateType;
  body: string;
  author: Roadmap2Owner | null;
  createdAt: string;
  editedAt: string | null;
};

export type Roadmap2NodeDto = {
  id: string;
  title: string;
  description: string | null;
  expectedOutcome: string | null;
  type: Roadmap2NodeType;
  category: Roadmap2Category;
  status: Roadmap2Status;
  priority: Roadmap2Priority;
  progressPercent: number;
  ownerUserId: string | null;
  owner: Roadmap2Owner | null;
  startDate: string | null;
  dueDate: string | null;
  nextAction: string | null;
  decisionRequired: boolean;
  definitionOfDone: string | null;
  driveFolderUrl: string | null;
  trackingDocUrl: string | null;
  parentId: string | null;
  positionX: number;
  positionY: number;
  width: number | null;
  archivedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  updatedBy: Roadmap2Owner | null;
  updates: Roadmap2UpdateDto[];
};

export type Roadmap2EdgeDto = {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationType: Roadmap2RelationType;
  createdAt: string;
};

export type Roadmap2Stats = {
  activeInitiatives: number;
  blocked: number;
  dueSoon: number;
  globalProgress: number;
  pendingDecisions: number;
  lastUpdatedAt: string | null;
  lastUpdatedBy: string | null;
};

export type Roadmap2WorkspaceSummary = {
  key: string;
  name: string;
  nodeCount: number;
  updatedAt: string;
};

export type Roadmap2Data = {
  workspace: {
    key: string;
    name: string;
    rootDriveUrl: string | null;
    updatedAt: string;
  };
  workspaces: Roadmap2WorkspaceSummary[];
  nodes: Roadmap2NodeDto[];
  edges: Roadmap2EdgeDto[];
  owners: Roadmap2Owner[];
  stats: Roadmap2Stats;
};

export const ROADMAP2_DRIVE_HELP = `LE BON REBOND
├── 00_ROADMAP
│   ├── Roadmap_Le_Bon_Rebond
│   └── 00_Suivi_Global
├── 01_Strategie_Gouvernance
├── 02_Juridique_Association_Optiquant
├── 03_Offres_Produits
│   ├── EmploiTon
│   ├── Diagnostic_Rebond
│   └── Rebond_Securise_90
├── 04_Financements_FSE
├── 05_Acheteurs_Publics
├── 06_Partenaires
│   ├── Entreprises
│   ├── CFA
│   ├── SIAE_GEIQ
│   └── Prescripteurs
├── 07_Pilote_EmploiTon
├── 08_Technologie_Data
├── 09_Communication_Decks
└── 10_Archives`;

export const ROADMAP2_TRACKING_DOC_TEMPLATE = `00 - SUIVI & DÉCISIONS

OBJECTIF
Décrire le résultat précis à atteindre.

RESPONSABLE
Nom de la personne responsable.

STATUT
À faire / En cours / Bloqué / À valider / Terminé.

NEXT STEPS
- Action 1
- Action 2
- Action 3

DÉCISIONS
Date — décision prise — justification.

QUESTIONS OUVERTES
- Question 1
- Question 2

NOTES DORIAN
...

NOTES MATHURIN
...`;
