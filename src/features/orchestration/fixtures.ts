import { z } from "zod";

import rawEcosystemSeed from "../../../data/guadeloupe-ecosystem.seed.json";
import { NEED_CAPABILITY_MAP } from "./constants";
import { createOutcomeMilestones } from "./engine";
import { sourceRegistry } from "./source-registry";
import { actorSchema, opportunitySchema, orchestrationSnapshotSchema, serviceOfferSchema } from "./schemas";
import type {
  Actor,
  CostItem,
  Need,
  Occupation,
  Opportunity,
  OrchestrationSnapshot,
  Outcome,
  ParticipantPassport,
  Pathway,
  PathwayStep,
  Referral,
  SourceRef,
} from "./types";

const DEMO_NOW = "2026-08-15T09:00:00.000Z";
const WORKSPACE_ID = "platform-orchestration-demo";
const PARTICIPANT_ID = "demo-participant-sarah";
const PASSPORT_ID = "demo-passport-sarah";
const COHORT_ID = "demo-cohort-emploiton-htvs";
const PLAN_A_ID = "demo-pathway-sarah-plan-a";
const PLAN_B_ID = "demo-pathway-sarah-plan-b";
const OCCUPATION_A_ID = "demo-occupation-receptionniste-hotellerie";
const OCCUPATION_B_ID = "demo-occupation-employee-polyvalente";

const missionBriefSource: SourceRef = {
  kind: "SYNTHETIC_DEMO",
  label: "Scénario Sarah fourni dans le brief Orchestration",
  file: null,
  sheet: null,
  page: null,
  line: null,
  section: "/demo_scenario",
  recordId: null,
  uri: null,
};

const canonicalBriefSource: SourceRef = {
  kind: "MISSION_BRIEF",
  label: "Modèle canonique du brief Orchestration",
  file: null,
  sheet: null,
  page: null,
  line: null,
  section: "/canonical_model",
  recordId: null,
  uri: null,
};

const seedActorSchema = z.object({
  id: z.string().min(1),
  legal_name: z.string().nullable(),
  display_name: z.string().min(1),
  actor_types: z.array(z.string()),
  territory: z.string().nullable(),
  employment_basin: z.string().nullable(),
  addresses: z.array(z.string()),
  contacts: z.array(z.unknown()),
  capabilities: z.array(z.unknown()),
  service_offers: z.array(z.unknown()),
  source_ref: z.object({
    file: z.string(),
    sheet: z.string().nullable(),
    row_or_section: z.string(),
    excerpt: z.string(),
  }),
  verification_status: z.literal("needs_verification"),
  last_verified_at: z.string().nullable(),
  verification_owner: z.string().nullable(),
  active: z.boolean(),
});

const seedSchema = z.object({ actors: z.array(seedActorSchema) });

const registrySourcesById = new Map(sourceRegistry.sources.map((source) => [source.id, source]));

function registrySourceRef(sourceId: string): SourceRef {
  const source = registrySourcesById.get(sourceId);
  if (!source) throw new Error(`Source Orchestration introuvable : ${sourceId}`);
  return {
    kind: source.kind === "PUBLIC_OFFICIAL" ? "PUBLIC_OFFICIAL" : "SOURCE_FILE",
    label: `${source.publisher} — ${source.title}`,
    file: null,
    sheet: null,
    page: null,
    line: null,
    section: source.freshness,
    recordId: source.id,
    uri: source.url,
  };
}

function mapSeedActor(raw: z.infer<typeof seedActorSchema>): Actor {
  return actorSchema.parse({
    id: raw.id,
    workspaceId: WORKSPACE_ID,
    existingOrganizationId: null,
    legalName: raw.legal_name,
    displayName: raw.display_name,
    // The source deliberately proves no category/capability/contact/service.
    actorTypes: [],
    territory: raw.territory ? [raw.territory] : [],
    employmentBasin: raw.employment_basin ? [raw.employment_basin] : [],
    addresses: raw.addresses,
    contacts: [],
    capabilities: [],
    eligibilityRules: [],
    requiredInputs: [],
    producedOutputs: [],
    responseSlaHours: null,
    currentCapacity: { status: "UNKNOWN", places: null, asOf: null },
    costModel: null,
    dataSharingPolicy: null,
    sourceRef: {
      kind: raw.source_ref.file === "user-provided prompt" ? "MISSION_BRIEF" : "SOURCE_FILE",
      label: `${raw.source_ref.file} — ${raw.source_ref.row_or_section}`,
      file: raw.source_ref.file,
      sheet: raw.source_ref.sheet,
      page: null,
      line: null,
      section: raw.source_ref.row_or_section,
      recordId: raw.id,
      uri: null,
    },
    verificationStatus: "NEEDS_VERIFICATION",
    lastVerifiedAt: raw.last_verified_at,
    verificationOwner: raw.verification_owner,
    active: raw.active,
    demo: false,
  });
}

const candidateActors = seedSchema.parse(rawEcosystemSeed).actors.map(mapSeedActor);

const verifiedOfficialActors: Actor[] = sourceRegistry.officialActors.map((raw) => actorSchema.parse({
  id: raw.id,
  workspaceId: WORKSPACE_ID,
  existingOrganizationId: null,
  legalName: raw.legalName,
  displayName: raw.displayName,
  actorTypes: raw.actorTypes,
  territory: raw.territory,
  employmentBasin: raw.employmentBasin,
  addresses: raw.addresses,
  contacts: raw.contacts,
  capabilities: raw.capabilities.map((claim) => ({
    capability: claim.capability,
    verificationStatus: claim.verificationStatus,
    sourceRef: registrySourceRef(claim.sourceId),
    lastVerifiedAt: raw.lastVerifiedAt,
    notes: claim.notes,
  })),
  eligibilityRules: raw.eligibilityRules,
  requiredInputs: raw.requiredInputs,
  producedOutputs: raw.producedOutputs,
  responseSlaHours: null,
  currentCapacity: { status: "UNKNOWN", places: null, asOf: null },
  costModel: null,
  dataSharingPolicy: null,
  sourceRef: registrySourceRef(raw.sourceId),
  verificationStatus: raw.verificationStatus,
  lastVerifiedAt: raw.lastVerifiedAt,
  verificationOwner: raw.verificationOwner,
  active: true,
  demo: false,
}));

const officialActorsById = new Map(verifiedOfficialActors.map((actor) => [actor.id, actor]));
const candidateActorIds = new Set(candidateActors.map((actor) => actor.id));

/** Candidate identities stay untouched unless an exact stable ID has an official assertion. No fuzzy merge occurs. */
export const ecosystemActors: Actor[] = [
  ...candidateActors.map((actor) => officialActorsById.get(actor.id) ?? actor),
  ...verifiedOfficialActors.filter((actor) => !candidateActorIds.has(actor.id)),
];

export const officialServiceOffers = sourceRegistry.officialServiceOffers.map((offer) => {
  const { sourceId, ...canonicalOffer } = offer;
  return serviceOfferSchema.parse({
    ...canonicalOffer,
    sourceRef: registrySourceRef(sourceId),
  });
});

export const officialOpportunities = sourceRegistry.officialOpportunities.map((opportunity) => {
  const { sourceId, ...canonicalOpportunity } = opportunity;
  const sourceRef = registrySourceRef(sourceId);
  return opportunitySchema.parse({
    ...canonicalOpportunity,
    requiredSkills: opportunity.requiredSkills.map((skill) => ({
      ...skill,
      sourceRef,
      verificationStatus: opportunity.verificationStatus,
    })),
    preferredSkills: opportunity.preferredSkills.map((skill) => ({
      ...skill,
      sourceRef,
      verificationStatus: opportunity.verificationStatus,
    })),
    sourceRef,
    demo: false,
  });
});

function syntheticCapability(capability: Actor["capabilities"][number]["capability"], notes: string) {
  return {
    capability,
    verificationStatus: "NEEDS_VERIFICATION" as const,
    sourceRef: missionBriefSource,
    lastVerifiedAt: null,
    notes,
  };
}

/** Synthetic-only actors required to tell Sarah's demo story; never mixed into the source registry. */
export const demoSyntheticActors: Actor[] = [
  actorSchema.parse({
    id: "demo-actor-le-bon-rebond",
    workspaceId: WORKSPACE_ID,
    existingOrganizationId: null,
    legalName: null,
    displayName: "Le Bon Rebond · démonstration",
    actorTypes: ["ORCHESTRATOR"],
    territory: ["Guadeloupe"],
    employmentBasin: [],
    addresses: [],
    contacts: [],
    capabilities: [
      syntheticCapability("ASSESS_CANDIDATE", "Rôle attendu dans le prototype; à formaliser hors démonstration."),
      syntheticCapability("REFER_TO_SERVICE", "Rôle attendu dans le prototype; à formaliser hors démonstration."),
      syntheticCapability("COACH_CANDIDATE", "Rôle attendu dans le prototype; à formaliser hors démonstration."),
      syntheticCapability("FOLLOW_UP", "Rôle attendu dans le prototype; à formaliser hors démonstration."),
      syntheticCapability("REPORT_OUTCOME", "Rôle attendu dans le prototype; à formaliser hors démonstration."),
    ],
    eligibilityRules: [],
    requiredInputs: [],
    producedOutputs: [],
    responseSlaHours: null,
    currentCapacity: { status: "UNKNOWN", places: null, asOf: null },
    costModel: null,
    dataSharingPolicy: "Aperçus de partage minimisés; aucun accès partenaire réel dans ce prototype.",
    sourceRef: missionBriefSource,
    verificationStatus: "NEEDS_VERIFICATION",
    lastVerifiedAt: null,
    verificationOwner: null,
    active: true,
    demo: true,
  }),
  actorSchema.parse({
    id: "demo-actor-hotel-partenaire-a",
    workspaceId: WORKSPACE_ID,
    existingOrganizationId: null,
    legalName: null,
    displayName: "Hôtel partenaire A · acteur synthétique",
    actorTypes: ["EMPLOYER", "HOST_COMPANY"],
    territory: ["Guadeloupe"],
    employmentBasin: [],
    addresses: [],
    contacts: [],
    capabilities: [
      syntheticCapability("HOST_IMMERSION", "Hypothèse de démonstration explicitement autorisée par le brief."),
      syntheticCapability("PROVIDE_FEEDBACK", "Hypothèse de démonstration explicitement autorisée par le brief."),
      syntheticCapability("PROVIDE_JOB", "Hypothèse de démonstration; aucune opportunité réelle confirmée."),
    ],
    eligibilityRules: [],
    requiredInputs: [],
    producedOutputs: [],
    responseSlaHours: null,
    currentCapacity: { status: "UNKNOWN", places: null, asOf: null },
    costModel: null,
    dataSharingPolicy: "Vue employeur minimale simulée uniquement.",
    sourceRef: missionBriefSource,
    verificationStatus: "NEEDS_VERIFICATION",
    lastVerifiedAt: null,
    verificationOwner: null,
    active: true,
    demo: true,
  }),
];

function skillRequirement(
  skillId: string,
  skillLabel: string,
  minimumLevelRank: number | null = null,
  sourceRef: SourceRef = missionBriefSource,
  verificationStatus: "VERIFIED" | "NEEDS_VERIFICATION" = "NEEDS_VERIFICATION",
) {
  return {
    skillId,
    skillLabel,
    minimumLevel: minimumLevelRank === null ? null : "Niveau attendu à confirmer",
    minimumLevelRank,
    sourceRef,
    verificationStatus,
  };
}

const currentRomeSource = registrySourceRef("source-rome-current");

export const demoOccupations: Occupation[] = [
  {
    id: OCCUPATION_A_ID,
    label: "Réceptionniste en hôtellerie",
    romeCode: "G1703",
    sector: "Hôtellerie–Tourisme",
    requiredSkills: [
      skillRequirement("skill-accueil-client", "Accueil client", null, currentRomeSource),
      skillRequirement("skill-communication", "Communication", null, currentRomeSource),
      skillRequirement("skill-organisation", "Organisation", null, currentRomeSource),
      skillRequirement("skill-bureautique", "Bureautique", null, currentRomeSource),
      skillRequirement("skill-anglais-pro", "Anglais professionnel", 3, currentRomeSource),
    ],
    preferredSkills: [],
    prerequisites: ["Prérequis détaillés de la fiche ROME à revalider avant ingestion canonique"],
    constraints: ["Travail de nuit, le week-end et les jours fériés possible selon la fiche détaillée 2021 — à revalider et confirmer pour chaque offre"],
    typicalSchedules: ["Horaires variables selon établissement — à confirmer offre par offre"],
    relatedOccupationIds: [OCCUPATION_B_ID],
    sourceRef: currentRomeSource,
    verificationStatus: "NEEDS_VERIFICATION",
  },
  {
    id: OCCUPATION_B_ID,
    label: "Employée polyvalente en hôtellerie ou service client",
    romeCode: null,
    sector: "Hôtellerie–Services",
    requiredSkills: [
      skillRequirement("skill-accueil-client", "Accueil client"),
      skillRequirement("skill-communication", "Communication"),
      skillRequirement("skill-organisation", "Organisation"),
    ],
    preferredSkills: [skillRequirement("skill-bureautique", "Bureautique")],
    prerequisites: [],
    constraints: [],
    typicalSchedules: [],
    relatedOccupationIds: [OCCUPATION_A_ID],
    sourceRef: missionBriefSource,
    verificationStatus: "NEEDS_VERIFICATION",
  },
];

function confirmedSkill(id: string, label: string): ParticipantPassport["skillClaims"][number] {
  return {
    id,
    participantId: PARTICIPANT_ID,
    skillId: id.replace("claim", "skill"),
    skillLabel: label,
    level: null,
    levelRank: null,
    sourceType: "INTERVIEW",
    sourceRef: missionBriefSource,
    evidence: ["Compétence confirmée dans le scénario synthétique."],
    candidateConfirmed: true,
    professionalConfirmed: true,
    confidence: "CONFIRMED",
    lastVerifiedAt: DEMO_NOW,
  };
}

export const sarahDemoPassport: ParticipantPassport = {
  id: PASSPORT_ID,
  participantId: PARTICIPANT_ID,
  existingBeneficiaryId: null,
  workspaceId: WORKSPACE_ID,
  identityPrivate: { firstName: "Sarah", lastName: null, age: 22, email: null, phone: null },
  currentSituation: "En recherche d'emploi · orientation Mission Locale (scénario synthétique)",
  employmentStatus: "JOB_SEEKER",
  experiences: [
    {
      id: "demo-experience-sarah-accueil",
      title: "Expérience en accueil client",
      organization: null,
      description: "Expérience déclarée dans le scénario; employeur et dates non renseignés.",
      startedAt: null,
      endedAt: null,
      evidence: [],
    },
  ],
  qualifications: [],
  certifications: [],
  skillClaims: [
    confirmedSkill("claim-accueil-client", "Accueil client"),
    confirmedSkill("claim-bureautique", "Bureautique"),
    confirmedSkill("claim-communication", "Communication"),
    confirmedSkill("claim-organisation", "Organisation"),
    {
      id: "claim-anglais-professionnel",
      participantId: PARTICIPANT_ID,
      skillId: "skill-anglais-pro",
      skillLabel: "Anglais professionnel",
      level: "À renforcer",
      levelRank: 1,
      sourceType: "DECLARATION",
      sourceRef: missionBriefSource,
      evidence: [],
      candidateConfirmed: true,
      professionalConfirmed: false,
      confidence: "SELF_REPORTED",
      lastVerifiedAt: null,
    },
  ],
  languages: ["Français", "Anglais professionnel à renforcer"],
  tools: ["Outils bureautiques"],
  mobility: {
    hasVehicle: false,
    licence: null,
    territory: ["Guadeloupe"],
    notes: "Solution à organiser pour les horaires décalés.",
  },
  availability: { available: true, from: DEMO_NOW, scheduleNotes: null },
  constraints: ["Pas de véhicule"],
  barriers: [
    {
      id: "barrier-mobility",
      type: "MOBILITY",
      label: "Mobilité pour horaires décalés",
      details: "Sarah n'a pas de véhicule; les trajets et horaires restent à qualifier.",
      blocking: true,
      status: "VALIDATED",
      verification: { status: "NEEDS_VERIFICATION", sourceRef: missionBriefSource, lastVerifiedAt: null, verifiedBy: "CIP démo" },
    },
    {
      id: "barrier-experience",
      type: "EXPERIENCE",
      label: "Expérience métier à confirmer",
      details: "Une PMSMP est proposée comme hypothèse de validation du métier.",
      blocking: false,
      status: "DECLARED",
      verification: { status: "NEEDS_VERIFICATION", sourceRef: missionBriefSource, lastVerifiedAt: null, verifiedBy: null },
    },
  ],
  aspirations: ["Travailler dans l'hôtellerie", "Relation client"],
  targetOccupationIds: [OCCUPATION_A_ID, OCCUPATION_B_ID],
  planA: { occupationId: OCCUPATION_A_ID, label: "Réceptionniste en hôtellerie", status: "VALIDATED" },
  planB: { occupationId: OCCUPATION_B_ID, label: "Employée polyvalente en hôtellerie ou service client", status: "VALIDATED" },
  documents: [],
  consents: [
    {
      id: "demo-consent-preview-employer",
      participantId: PARTICIPANT_ID,
      purpose: "Aperçu de la future vue employeur — aucun partage réel",
      recipientActorId: null,
      recipientActorType: "EMPLOYER",
      dataScope: ["Identité utile", "Expérience", "Compétences confirmées", "CV", "Disponibilité"],
      grantedAt: null,
      revokedAt: null,
      legalBasis: null,
      notes: "Les freins et notes sociales sont exclus.",
    },
    {
      id: "demo-consent-preview-cfa",
      participantId: PARTICIPANT_ID,
      purpose: "Aperçu de la future vue CFA — aucun partage réel",
      recipientActorId: null,
      recipientActorType: "CFA",
      dataScope: ["Projet", "Compétences utiles", "Prérequis", "Formation visée"],
      grantedAt: null,
      revokedAt: null,
      legalBasis: null,
      notes: null,
    },
    {
      id: "demo-consent-preview-prescriber",
      participantId: PARTICIPANT_ID,
      purpose: "Aperçu de la future vue prescripteur — aucun partage réel",
      recipientActorId: null,
      recipientActorType: "PRESCRIBER",
      dataScope: ["Prise en charge", "Statut du parcours", "Prochaine étape", "Résultat final"],
      grantedAt: null,
      revokedAt: null,
      legalBasis: null,
      notes: null,
    },
  ],
  sourceRef: missionBriefSource,
  lastReviewedAt: DEMO_NOW,
  createdAt: DEMO_NOW,
  updatedAt: DEMO_NOW,
  demo: true,
};

export const sarahDemoNeeds: Need[] = [
  {
    id: "demo-need-anglais",
    participantId: PARTICIPANT_ID,
    type: "LANGUAGE",
    label: "Anglais professionnel",
    severity: "HIGH",
    blocking: true,
    targetId: OCCUPATION_A_ID,
    requiredCapability: NEED_CAPABILITY_MAP.LANGUAGE,
    status: "VALIDATED",
    evidence: ["Niveau déclaré comme à renforcer; évaluation professionnelle absente."],
    detectedBy: "Diagnostic synthétique",
    validatedBy: "CIP démo",
    createdAt: DEMO_NOW,
    resolvedAt: null,
  },
  {
    id: "demo-need-mobility",
    participantId: PARTICIPANT_ID,
    type: "MOBILITY",
    label: "Mobilité pour horaires décalés",
    severity: "HIGH",
    blocking: true,
    targetId: OCCUPATION_A_ID,
    requiredCapability: NEED_CAPABILITY_MAP.MOBILITY,
    status: "VALIDATED",
    evidence: ["Absence de véhicule dans le scénario; trajets à qualifier."],
    detectedBy: "Diagnostic synthétique",
    validatedBy: "CIP démo",
    createdAt: DEMO_NOW,
    resolvedAt: null,
  },
  {
    id: "demo-need-experience",
    participantId: PARTICIPANT_ID,
    type: "EXPERIENCE",
    label: "Expérience métier à confirmer",
    severity: "MEDIUM",
    blocking: false,
    targetId: OCCUPATION_A_ID,
    requiredCapability: NEED_CAPABILITY_MAP.EXPERIENCE,
    status: "DETECTED",
    evidence: ["Expérience en accueil connue, contexte hôtelier non prouvé."],
    detectedBy: "Diagnostic synthétique",
    validatedBy: null,
    createdAt: DEMO_NOW,
    resolvedAt: null,
  },
];

function demoStep(
  pathwayId: string,
  id: string,
  type: PathwayStep["type"],
  title: string,
  dependencies: string[],
  options: Partial<PathwayStep> = {},
): PathwayStep {
  return {
    id,
    pathwayId,
    type,
    title,
    description: null,
    assignedActorId: null,
    serviceOfferId: null,
    opportunityId: null,
    status: "DRAFT",
    dependencies,
    plannedStart: null,
    dueDate: null,
    dueOffsetDays: null,
    completedAt: null,
    requiredInputs: [],
    expectedOutputs: [],
    evidence: [],
    expectedCostCents: null,
    actualCostCents: null,
    payerActorId: null,
    fundingStatus: "UNKNOWN",
    successTransition: null,
    failureTransition: null,
    sourceReason: "Étape du scénario synthétique Sarah; à valider par le CIP.",
    suggestion: {
      humanValidationRequired: true,
      confidence: "LOW",
      dataUsed: ["Scénario synthétique Sarah"],
      unknowns: ["Responsable, échéance, disponibilité, coût et preuve à confirmer."],
    },
    ...options,
  };
}

const a1 = "demo-step-a-01-intake";
const a2 = "demo-step-a-02-diagnostic";
const a3 = "demo-step-a-03-project";
const a4 = "demo-step-a-04-english";
const a5 = "demo-step-a-05-mobility";
const a6 = "demo-step-a-06-cv";
const a7 = "demo-step-a-07-interview-simulation";
const a8 = "demo-step-a-08-pmsmp";
const a9 = "demo-step-a-09-employer-feedback";
const a10 = "demo-step-a-10-interview";
const a11 = "demo-step-a-11-contract";
const a12 = "demo-step-a-12-j7";
const a13 = "demo-step-a-13-j30";
const a14 = "demo-step-a-14-j60";
const a15 = "demo-step-a-15-j90";

export const sarahPlanA: Pathway = {
  id: PLAN_A_ID,
  participantId: PARTICIPANT_ID,
  cohortId: COHORT_ID,
  targetState: { occupationId: OCCUPATION_A_ID, label: "Réceptionniste en hôtellerie" },
  planType: "A",
  status: "AWAITING_HUMAN_APPROVAL",
  steps: [
    demoStep(PLAN_A_ID, a1, "REFERRAL", "Prise en charge confirmée", [], {
      assignedActorId: "actor-mission-locale-guadeloupe",
      status: "COMPLETED",
      dueDate: "2026-08-11T09:00:00.000Z",
      completedAt: "2026-08-11T09:00:00.000Z",
      evidence: ["Preuve synthétique — aucune orientation réelle envoyée."],
      sourceReason: "Le scénario désigne Mission Locale Guadeloupe comme source de l'orientation.",
    }),
    demoStep(PLAN_A_ID, a2, "DIAGNOSTIC", "Diagnostic Passeport Rebond", [a1], {
      assignedActorId: "demo-actor-le-bon-rebond",
      status: "COMPLETED",
      dueDate: "2026-08-12T09:00:00.000Z",
      completedAt: "2026-08-12T09:00:00.000Z",
      evidence: ["Passeport de démonstration validé par le CIP fictif."],
    }),
    demoStep(PLAN_A_ID, a3, "PROJECT_VALIDATION", "Validation du projet réception hôtelière", [a2], {
      assignedActorId: "demo-actor-le-bon-rebond",
      status: "COMPLETED",
      dueDate: "2026-08-13T09:00:00.000Z",
      completedAt: "2026-08-13T09:00:00.000Z",
      evidence: ["Plan A/B de démonstration validé."],
    }),
    demoStep(PLAN_A_ID, a4, "TRAINING", "Module anglais métier", [a3], {
      assignedActorId: "actor-cci-iles-guadeloupe",
      serviceOfferId: "service-cci-anglais-collectif",
      status: "READY",
      dueDate: "2026-08-28T16:00:00.000Z",
      expectedOutputs: ["Évaluation d'anglais professionnel"],
      sourceReason: "Sarah vise un métier nécessitant l'anglais. La CCI publie un cours collectif d'anglais, mais l'adéquation au contexte hôtelier, les dates, les places et le tarif doivent être confirmés par le CIP.",
      suggestion: {
        humanValidationRequired: true,
        confidence: "MEDIUM",
        dataUsed: ["SkillClaim anglais auto-déclaré", "Métier cible G1703", "Catalogue officiel CCI Formation"],
        unknowns: ["Adéquation hôtellerie, dates, places, coût, éligibilité et financement non renseignés."],
      },
    }),
    demoStep(PLAN_A_ID, a5, "MOBILITY", "Sécuriser la mobilité horaires décalés", [a3], {
      assignedActorId: "actor-mobilizy",
      serviceOfferId: "service-mobilizy-location-sociale",
      status: "BLOCKED",
      dueDate: "2026-08-22T16:00:00.000Z",
      failureTransition: "ACTIVATE_PLAN_B",
      sourceReason: "Mobil'Izy publie une solution de location sociale en Guadeloupe. Cette piste est proposée pour revue humaine ; son éligibilité, sa flotte, son prix et sa disponibilité pour les horaires de Sarah sont inconnus.",
      suggestion: {
        humanValidationRequired: true,
        confidence: "MEDIUM",
        dataUsed: ["Absence de véhicule déclarée", "Besoin horaires décalés", "Service public Mobil'Izy"],
        unknowns: ["Éligibilité, trajet, flotte disponible, coût et financement non renseignés."],
      },
    }),
    demoStep(PLAN_A_ID, a6, "LBR_ACTION", "CV ciblé réception", [a3], {
      assignedActorId: "demo-actor-le-bon-rebond",
      status: "IN_PROGRESS",
      dueDate: "2026-08-20T16:00:00.000Z",
      expectedOutputs: ["CV ciblé validé par Sarah"],
    }),
    demoStep(PLAN_A_ID, a7, "INTERVIEW", "Simulation d'entretien", [a6], {
      assignedActorId: "demo-actor-le-bon-rebond",
      status: "READY",
      dueDate: "2026-08-25T16:00:00.000Z",
    }),
    demoStep(PLAN_A_ID, a8, "IMMERSION", "PMSMP · Hôtel partenaire A", [a4, a5, a7], {
      opportunityId: "demo-opportunity-pmsmp-hotel-a",
      failureTransition: "ACTIVATE_PLAN_B",
      sourceReason: "Hôtel partenaire A est un acteur purement synthétique autorisé pour la démonstration; aucune place réelle n'est affirmée.",
    }),
    demoStep(PLAN_A_ID, a9, "REFERRAL", "Feedback employeur tracé", [a8], {
      expectedOutputs: ["Feedback et preuve"],
      failureTransition: "ACTIVATE_PLAN_B",
    }),
    demoStep(PLAN_A_ID, a10, "INTERVIEW", "Entretien", [a9], {
      failureTransition: "ACTIVATE_PLAN_B",
    }),
    demoStep(PLAN_A_ID, a11, "OUTCOME", "Contrat ou autre sortie active", [a10], {
      requiredInputs: ["Preuve de sortie"],
      failureTransition: "ACTIVATE_PLAN_B",
    }),
    demoStep(PLAN_A_ID, a12, "MILESTONE", "Suivi J+7", [a11], { assignedActorId: "demo-actor-le-bon-rebond", dueOffsetDays: 7 }),
    demoStep(PLAN_A_ID, a13, "MILESTONE", "Suivi J+30", [a12], { assignedActorId: "demo-actor-le-bon-rebond", dueOffsetDays: 30 }),
    demoStep(PLAN_A_ID, a14, "MILESTONE", "Suivi J+60", [a13], { assignedActorId: "demo-actor-le-bon-rebond", dueOffsetDays: 60 }),
    demoStep(PLAN_A_ID, a15, "MILESTONE", "Suivi J+90", [a14], { assignedActorId: "demo-actor-le-bon-rebond", dueOffsetDays: 90 }),
  ],
  currentStepId: a5,
  expectedStartDate: "2026-08-11T09:00:00.000Z",
  expectedEndDate: null,
  actualEndDate: null,
  predictedCostCents: null,
  actualCostCents: null,
  fundingGapCents: null,
  outcomeId: "demo-outcome-sarah",
  version: 1,
  approvedBy: null,
  approvedAt: null,
  activatedAt: null,
  activationReason: null,
};

const b1 = "demo-step-b-01-reassess";
const b2 = "demo-step-b-02-target";
const b3 = "demo-step-b-03-alternative";
const b4 = "demo-step-b-04-training";
const b5 = "demo-step-b-05-outcome";

export const sarahPlanB: Pathway = {
  id: PLAN_B_ID,
  participantId: PARTICIPANT_ID,
  cohortId: COHORT_ID,
  targetState: { occupationId: OCCUPATION_B_ID, label: "Employée polyvalente en hôtellerie ou service client" },
  planType: "B",
  status: "DRAFT",
  steps: [
    demoStep(PLAN_B_ID, b1, "DIAGNOSTIC", "Réévaluer les freins et acquis", []),
    demoStep(PLAN_B_ID, b2, "PROJECT_VALIDATION", "Valider le Plan B avec Sarah", [b1]),
    demoStep(PLAN_B_ID, b3, "OPPORTUNITY", "Rechercher un autre employeur", [b2], {
      sourceReason: "Aucune opportunité alternative vérifiée n'est disponible; recherche manuelle requise.",
    }),
    demoStep(PLAN_B_ID, b4, "TRAINING", "Explorer alternance ou formation adaptée", [b2], {
      sourceReason: "Aucune offre, place, date, coût ni financement n'est confirmé dans les sources disponibles.",
    }),
    demoStep(PLAN_B_ID, b5, "OUTCOME", "Enregistrer la sortie Plan B", [b3, b4], { requiredInputs: ["Preuve de sortie"] }),
  ],
  currentStepId: b1,
  expectedStartDate: null,
  expectedEndDate: null,
  actualEndDate: null,
  predictedCostCents: null,
  actualCostCents: null,
  fundingGapCents: null,
  outcomeId: null,
  version: 1,
  approvedBy: null,
  approvedAt: null,
  activatedAt: null,
  activationReason: null,
};

export const demoOpportunity: Opportunity = {
  id: "demo-opportunity-pmsmp-hotel-a",
  providerActorId: "demo-actor-hotel-partenaire-a",
  type: "PMSMP",
  title: "PMSMP · Hôtel partenaire A (démonstration)",
  occupationId: OCCUPATION_A_ID,
  location: null,
  schedule: null,
  startDate: null,
  endDate: null,
  contractType: null,
  vacancies: null,
  requiredSkills: [],
  preferredSkills: [],
  prerequisites: [],
  constraints: [],
  applicationProcess: null,
  contact: null,
  responseDeadline: null,
  status: "DRAFT",
  sourceRef: missionBriefSource,
  verificationStatus: "NEEDS_VERIFICATION",
  demo: true,
};

export const sarahDemoReferral: Referral = {
  id: "demo-referral-sarah-hotel-a",
  participantId: PARTICIPANT_ID,
  pathwayStepId: a8,
  fromActorId: "demo-actor-le-bon-rebond",
  toActorId: "demo-actor-hotel-partenaire-a",
  reason: "Valider le métier par une PMSMP (simulation)",
  requestedAction: "Étudier une possibilité d'immersion; aucune communication externe n'est envoyée.",
  sentAt: "2026-08-14T09:00:00.000Z",
  acknowledgedAt: null,
  acceptedAt: null,
  completedAt: null,
  expectedResponseAt: "2026-08-21T09:00:00.000Z",
  status: "SENT",
  response: null,
  rejectionReason: null,
  evidence: ["Simulation interne uniquement"],
  relaunchCount: 0,
  lastRelaunchAt: null,
  history: [{ from: "DRAFT", to: "SENT", at: "2026-08-14T09:00:00.000Z", note: "Orientation simulée; aucun envoi externe." }],
};

export const sarahDemoCostItems: CostItem[] = [
  {
    id: "demo-cost-lbr",
    participantId: PARTICIPANT_ID,
    pathwayId: PLAN_A_ID,
    pathwayStepId: a2,
    category: "LBR_ACCOMPANIMENT",
    unit: null,
    quantity: null,
    unitCostCents: null,
    expectedCostCents: null,
    actualCostCents: null,
    costOwnerActorId: "demo-actor-le-bon-rebond",
    source: canonicalBriefSource,
    verificationStatus: "NEEDS_VERIFICATION",
  },
  {
    id: "demo-cost-training",
    participantId: PARTICIPANT_ID,
    pathwayId: PLAN_A_ID,
    pathwayStepId: a4,
    category: "TRAINING",
    unit: null,
    quantity: null,
    unitCostCents: null,
    expectedCostCents: null,
    actualCostCents: null,
    costOwnerActorId: null,
    source: missionBriefSource,
    verificationStatus: "NEEDS_VERIFICATION",
  },
  {
    id: "demo-cost-mobility",
    participantId: PARTICIPANT_ID,
    pathwayId: PLAN_A_ID,
    pathwayStepId: a5,
    category: "MOBILITY",
    unit: null,
    quantity: null,
    unitCostCents: null,
    expectedCostCents: null,
    actualCostCents: null,
    costOwnerActorId: null,
    source: missionBriefSource,
    verificationStatus: "NEEDS_VERIFICATION",
  },
];

export const sarahDemoOutcome: Outcome = {
  id: "demo-outcome-sarah",
  participantId: PARTICIPANT_ID,
  pathwayId: PLAN_A_ID,
  type: "PATHWAY_CONTINUES",
  providerActorId: null,
  startDate: null,
  evidence: [],
  milestones: createOutcomeMilestones(null),
  ruptureReason: null,
  planBActivated: false,
  finalStatus: "PENDING",
};

export function createSarahDemoSnapshot(): OrchestrationSnapshot {
  return orchestrationSnapshotSchema.parse({
    meta: {
      mode: "SYNTHETIC_DEMO",
      label: "Sarah · démonstration synthétique Orchestration",
      generatedAt: DEMO_NOW,
      persistence: "IN_MEMORY_PROCESS_ONLY",
      warning:
        "Prototype de démonstration. Les mutations vivent uniquement dans le processus courant. Les 47 acteurs proviennent du registre candidat et restent à vérifier; les acteurs préfixés « demo- » sont synthétiques.",
    },
    cohorts: [
      {
        id: COHORT_ID,
        name: "Emploi’Ton Hôtellerie–Tourisme–Vente–Services",
        sector: "Hôtellerie–Tourisme–Vente–Services",
        territory: "Guadeloupe",
        startsAt: null,
        endsAt: null,
        buyerActorId: null,
        participantIds: [PARTICIPANT_ID],
        opportunityIds: [demoOpportunity.id],
        outcomeIds: [sarahDemoOutcome.id],
        status: "ACTIVE",
        owner: "Le Bon Rebond · équipe de démonstration",
        demo: true,
      },
    ],
    passports: [sarahDemoPassport],
    occupations: demoOccupations,
    needs: sarahDemoNeeds,
    actors: [...ecosystemActors, ...demoSyntheticActors],
    serviceOffers: officialServiceOffers,
    opportunities: [...officialOpportunities, demoOpportunity],
    pathways: [sarahPlanA, sarahPlanB],
    pathwayVersions: [],
    referrals: [sarahDemoReferral],
    costItems: sarahDemoCostItems,
    fundingAllocations: [],
    outcomes: [sarahDemoOutcome],
  });
}

/** Immutable-by-convention read model. Call `createSarahDemoSnapshot` before mutation. */
export const demoSnapshot = createSarahDemoSnapshot();
