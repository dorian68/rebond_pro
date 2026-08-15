import { NEED_CAPABILITY_MAP, OUTCOME_MILESTONES } from "./constants";
import {
  actorSearchFiltersSchema,
  costItemSchema,
  fundingAllocationSchema,
  needSchema,
  occupationSchema,
  outcomeMilestoneUpdateSchema,
  outcomeSchema,
  participantPassportSchema,
  pathwaySchema,
  referralSchema,
  referralTransitionInputSchema,
  serviceOfferSchema,
} from "./schemas";
import type {
  Actor,
  ActorMatch,
  ActorSearchFilters,
  Capability,
  CostItem,
  CostSummary,
  FundingAllocation,
  FundingSummary,
  Need,
  NeedType,
  Occupation,
  Opportunity,
  Outcome,
  OutcomeMilestoneUpdate,
  ParticipantPassport,
  Pathway,
  PathwayApprovalIssue,
  PathwayDraftResult,
  PathwayStep,
  Referral,
  ReferralTransitionInput,
  ServiceOffer,
  SkillClaim,
  SkillGap,
} from "./types";

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("fr-FR");
}

function stableId(...parts: string[]) {
  return parts
    .map((part) => normalize(part).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""))
    .filter(Boolean)
    .join("-")
    .slice(0, 150);
}

export function isConfirmedSkillClaim(claim: SkillClaim) {
  if (claim.confidence === "INFERRED" || claim.confidence === "UNKNOWN") return false;
  return claim.professionalConfirmed || (claim.candidateConfirmed && claim.confidence === "CONFIRMED");
}

function sameSkill(claim: SkillClaim, skillId: string | null, skillLabel: string) {
  if (skillId && claim.skillId) return normalize(claim.skillId) === normalize(skillId);
  return normalize(claim.skillLabel) === normalize(skillLabel);
}

/** Compares only explicit requirements against confirmed claims. Missing data remains a gap-to-confirm. */
export function calculateSkillGaps(passportInput: ParticipantPassport, occupationInput: Occupation): SkillGap[] {
  const passport = participantPassportSchema.parse(passportInput);
  const occupation = occupationSchema.parse(occupationInput);

  return occupation.requiredSkills.flatMap((requirement): SkillGap[] => {
    const candidates = passport.skillClaims.filter((claim) => sameSkill(claim, requirement.skillId, requirement.skillLabel));
    const confirmed = candidates.find(isConfirmedSkillClaim) ?? null;

    if (!confirmed) {
      const unconfirmed = candidates[0] ?? null;
      return [
        {
          participantId: passport.participantId,
          occupationId: occupation.id,
          requirement,
          matchingClaim: unconfirmed,
          reason: unconfirmed ? "UNCONFIRMED" : "MISSING",
          explanation: unconfirmed
            ? `La compétence « ${requirement.skillLabel} » est renseignée mais reste à confirmer.`
            : `Aucune compétence confirmée « ${requirement.skillLabel} » n'est présente dans le Passeport Rebond.`,
        },
      ];
    }

    if (requirement.minimumLevelRank !== null) {
      if (confirmed.levelRank === null) {
        return [
          {
            participantId: passport.participantId,
            occupationId: occupation.id,
            requirement,
            matchingClaim: confirmed,
            reason: "LEVEL_UNKNOWN",
            explanation: `La compétence « ${requirement.skillLabel} » est confirmée, mais son niveau doit être évalué.`,
          },
        ];
      }
      if (confirmed.levelRank < requirement.minimumLevelRank) {
        return [
          {
            participantId: passport.participantId,
            occupationId: occupation.id,
            requirement,
            matchingClaim: confirmed,
            reason: "LEVEL_TOO_LOW",
            explanation: `Le niveau confirmé pour « ${requirement.skillLabel} » est inférieur au niveau requis.`,
          },
        ];
      }
    }

    return [];
  });
}

function inferNeedTypeFromSkill(label: string): NeedType {
  const normalized = normalize(label);
  if (normalized.includes("anglais") || normalized.includes("langue")) return "LANGUAGE";
  return "SKILL_GAP";
}

export function skillGapToNeed(gap: SkillGap, options: { createdAt?: string; type?: NeedType } = {}): Need {
  const type = options.type ?? inferNeedTypeFromSkill(gap.requirement.skillLabel);
  return needSchema.parse({
    id: stableId("need", gap.participantId, gap.occupationId, gap.requirement.skillId ?? gap.requirement.skillLabel),
    participantId: gap.participantId,
    type,
    label: gap.requirement.skillLabel,
    severity: "HIGH",
    blocking: true,
    targetId: gap.occupationId,
    requiredCapability: NEED_CAPABILITY_MAP[type],
    status: "DETECTED",
    evidence: [gap.explanation],
    detectedBy: "Pathway Engine — règle déterministe",
    validatedBy: null,
    createdAt: options.createdAt ?? new Date().toISOString(),
    resolvedAt: null,
  });
}

export function barrierToNeed(
  passport: ParticipantPassport,
  barrier: ParticipantPassport["barriers"][number],
  createdAt = new Date().toISOString(),
): Need {
  return needSchema.parse({
    id: stableId("need", passport.participantId, barrier.id),
    participantId: passport.participantId,
    type: barrier.type,
    label: barrier.label,
    severity: barrier.blocking ? "HIGH" : "MEDIUM",
    blocking: barrier.blocking,
    targetId: passport.planA.occupationId,
    requiredCapability: NEED_CAPABILITY_MAP[barrier.type],
    status: barrier.status === "RESOLVED" ? "RESOLVED" : barrier.status === "VALIDATED" ? "VALIDATED" : "DETECTED",
    evidence: barrier.details ? [barrier.details] : [],
    detectedBy: barrier.verification.sourceRef.label,
    validatedBy: barrier.status === "VALIDATED" ? barrier.verification.verifiedBy : null,
    createdAt,
    resolvedAt: null,
  });
}

function territoryMatches(actor: Actor, territory?: string) {
  if (!territory) return true;
  const expected = normalize(territory);
  return [...actor.territory, ...actor.employmentBasin].some((value) => {
    const candidate = normalize(value);
    return candidate.includes(expected) || expected.includes(candidate);
  });
}

/** Actor-level and capability-level verification are both required by `verifiedOnly`. */
export function findActorsByCapability(
  actors: Actor[],
  capability: Capability,
  filtersInput: Omit<ActorSearchFilters, "capability"> = {},
): Actor[] {
  const filters = actorSearchFiltersSchema.parse({ ...filtersInput, capability });
  return actors
    .filter((actor) => actor.active)
    .filter((actor) => !filters.actorType || actor.actorTypes.includes(filters.actorType))
    .filter((actor) => territoryMatches(actor, filters.territory))
    .filter((actor) => !filters.availableOnly || actor.currentCapacity.status === "AVAILABLE")
    .filter((actor) => {
      const claim = actor.capabilities.find((candidate) => candidate.capability === capability);
      if (!claim) return false;
      return !filters.verifiedOnly || (actor.verificationStatus === "VERIFIED" && claim.verificationStatus === "VERIFIED");
    })
    .sort((left, right) => {
      const verificationDelta = Number(right.verificationStatus === "VERIFIED") - Number(left.verificationStatus === "VERIFIED");
      return verificationDelta || left.displayName.localeCompare(right.displayName, "fr");
    });
}

export function findActorMatchesForNeed(input: {
  need: Need;
  actors: Actor[];
  serviceOffers: ServiceOffer[];
  territory?: string;
  verifiedOnly?: boolean;
}): ActorMatch[] {
  const offers = input.serviceOffers.map((offer) => serviceOfferSchema.parse(offer));
  const actors = findActorsByCapability(input.actors, input.need.requiredCapability, {
    territory: input.territory,
    verifiedOnly: input.verifiedOnly ?? false,
  });

  return actors.map((actor) => {
    const capability = actor.capabilities.find((claim) => claim.capability === input.need.requiredCapability)!;
    const matchingOffers = offers.filter(
      (offer) =>
        offer.actorId === actor.id &&
        offer.capabilitiesProvided.includes(input.need.requiredCapability) &&
        (!input.verifiedOnly || offer.verificationStatus === "VERIFIED"),
    );
    const unknowns: string[] = [];
    if (actor.verificationStatus !== "VERIFIED" || capability.verificationStatus !== "VERIFIED") {
      unknowns.push("Capacité de l'acteur à vérifier avant orientation.");
    }
    if (actor.currentCapacity.status === "UNKNOWN") unknowns.push("Capacité d'accueil actuelle non renseignée.");
    if (matchingOffers.length === 0) unknowns.push("Aucune offre de service correspondante vérifiée n'est renseignée.");

    return {
      actor,
      capability,
      serviceOffers: matchingOffers,
      reasons: [
        capability.verificationStatus === "VERIFIED"
          ? `La capacité ${input.need.requiredCapability} est documentée pour cet acteur.`
          : `Le registre associe provisoirement ${input.need.requiredCapability} à cet acteur; cette capacité reste à vérifier.`,
        ...(input.territory && territoryMatches(actor, input.territory) ? [`Territoire compatible avec ${input.territory}.`] : []),
      ],
      unknowns,
    };
  });
}

function stepTypeForNeed(type: NeedType): PathwayStep["type"] {
  if (type === "MOBILITY") return "MOBILITY";
  if (type === "LANGUAGE" || type === "SKILL_GAP" || type === "PREREQUISITE") return "TRAINING";
  if (type === "EXPERIENCE") return "IMMERSION";
  if (type === "FUNDING") return "FUNDING";
  return "SERVICE";
}

function uniqueNeeds(needs: Need[]) {
  const seen = new Set<string>();
  return needs.filter((need) => {
    const key = `${need.type}:${normalize(need.label)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function draftPathway(input: {
  passport: ParticipantPassport;
  occupation: Occupation;
  planType: "A" | "B";
  cohortId: string;
  needs: Need[];
  actors: Actor[];
  serviceOffers: ServiceOffer[];
  opportunities: Opportunity[];
  territory?: string;
  verifiedOnly: boolean;
  now: string;
}): { pathway: Pathway; explanations: string[]; unknowns: string[] } {
  const pathwayId = stableId("pathway", input.passport.participantId, `plan-${input.planType}`, input.occupation.id);
  const diagnosticId = stableId(pathwayId, "diagnostic");
  const projectId = stableId(pathwayId, "validation-projet");
  const explanations: string[] = [];
  const unknowns: string[] = [];

  const steps: PathwayStep[] = [
    {
      id: diagnosticId,
      pathwayId,
      type: "DIAGNOSTIC",
      title: "Diagnostic partagé",
      description: "Confirmer avec la bénéficiaire les faits utiles du Passeport Rebond.",
      assignedActorId: null,
      serviceOfferId: null,
      opportunityId: null,
      status: "DRAFT",
      dependencies: [],
      plannedStart: null,
      dueDate: null,
      dueOffsetDays: null,
      completedAt: null,
      requiredInputs: ["Passeport Rebond"],
      expectedOutputs: ["Diagnostic validé humainement"],
      evidence: [],
      expectedCostCents: null,
      actualCostCents: null,
      payerActorId: null,
      fundingStatus: "UNKNOWN",
      successTransition: projectId,
      failureTransition: null,
      sourceReason: "Étape de contrôle humain obligatoire avant toute orchestration.",
      suggestion: {
        humanValidationRequired: true,
        confidence: "HIGH",
        dataUsed: ["Passeport Rebond"],
        unknowns: ["Responsable et échéance à confirmer par le CIP."],
      },
    },
    {
      id: projectId,
      pathwayId,
      type: "PROJECT_VALIDATION",
      title: `Valider le projet : ${input.occupation.label}`,
      description: "Valider l'objectif, les contraintes et le recours au Plan B avec la bénéficiaire.",
      assignedActorId: null,
      serviceOfferId: null,
      opportunityId: null,
      status: "DRAFT",
      dependencies: [diagnosticId],
      plannedStart: null,
      dueDate: null,
      dueOffsetDays: null,
      completedAt: null,
      requiredInputs: ["Diagnostic partagé"],
      expectedOutputs: ["Objectif professionnel validé"],
      evidence: [],
      expectedCostCents: null,
      actualCostCents: null,
      payerActorId: null,
      fundingStatus: "UNKNOWN",
      successTransition: null,
      failureTransition: input.planType === "A" ? "ACTIVATE_PLAN_B" : null,
      sourceReason: `Le Passeport Rebond indique ${input.occupation.label} comme Plan ${input.planType}.`,
      suggestion: {
        humanValidationRequired: true,
        confidence: "HIGH",
        dataUsed: [`Plan ${input.planType} du Passeport Rebond`],
        unknowns: [],
      },
    },
  ];

  let precedingIds = [projectId];
  for (const need of input.needs.filter((candidate) => candidate.status !== "RESOLVED")) {
    const matches = findActorMatchesForNeed({
      need,
      actors: input.actors,
      serviceOffers: input.serviceOffers,
      territory: input.territory,
      verifiedOnly: input.verifiedOnly,
    });
    const match = matches[0] ?? null;
    const offer = match?.serviceOffers[0] ?? null;
    const stepId = stableId(pathwayId, "need", need.id);
    const noVerifiedSolution = input.verifiedOnly && !match;
    const sourceReason = match
      ? `Cette étape répond au besoin « ${need.label} ». Le registre associe ${need.requiredCapability} à ${match.actor.displayName}${match.capability.verificationStatus === "VERIFIED" ? " avec une source vérifiée" : " à titre provisoire"}; l'affectation reste à valider par le CIP.`
      : `Cette étape répond au besoin « ${need.label} ». Aucune solution${input.verifiedOnly ? " vérifiée" : " compatible"} n'a été trouvée; une recherche manuelle est nécessaire.`;

    if (noVerifiedSolution) unknowns.push(`Aucune solution vérifiée trouvée pour « ${need.label} ».`);
    explanations.push(sourceReason);
    steps.push({
      id: stepId,
      pathwayId,
      type: stepTypeForNeed(need.type),
      title: need.label,
      description: offer?.description ?? `Organiser une réponse au besoin : ${need.label}.`,
      assignedActorId: match?.actor.id ?? null,
      serviceOfferId: offer?.id ?? null,
      opportunityId: null,
      status: "DRAFT",
      dependencies: precedingIds,
      plannedStart: null,
      dueDate: null,
      dueOffsetDays: null,
      completedAt: null,
      requiredInputs: [],
      expectedOutputs: [`Besoin « ${need.label} » traité ou réévalué`],
      evidence: [],
      expectedCostCents: offer?.costCents ?? null,
      actualCostCents: null,
      payerActorId: null,
      fundingStatus: offer?.costCents === null || offer === null ? "UNKNOWN" : "TO_SECURE",
      successTransition: null,
      failureTransition: input.planType === "A" ? "ACTIVATE_PLAN_B" : null,
      sourceReason,
      suggestion: {
        humanValidationRequired: true,
        confidence: match && match.unknowns.length === 0 ? "HIGH" : match ? "MEDIUM" : "LOW",
        dataUsed: [need.label, need.requiredCapability, ...(match ? [match.actor.displayName] : [])],
        unknowns: match?.unknowns ?? ["Acteur, offre, disponibilité et coût à renseigner."],
      },
    });
    precedingIds = [stepId];
  }

  const compatibleOpportunities = input.opportunities.filter(
    (opportunity) => opportunity.occupationId === input.occupation.id && (!input.verifiedOnly || opportunity.verificationStatus === "VERIFIED"),
  );
  const opportunity = compatibleOpportunities[0] ?? null;
  const opportunityStepId = stableId(pathwayId, "opportunity");
  const outcomeStepId = stableId(pathwayId, "outcome");
  if (!opportunity) unknowns.push(`Aucune opportunité vérifiée n'est rattachée au métier « ${input.occupation.label} ».`);
  steps.push({
    id: opportunityStepId,
    pathwayId,
    type: "OPPORTUNITY",
    title: opportunity?.title ?? `Rechercher une opportunité — ${input.occupation.label}`,
    description: opportunity ? "Préparer puis soumettre la candidature après validation humaine." : "Recherche manuelle nécessaire.",
    assignedActorId: opportunity?.providerActorId ?? null,
    serviceOfferId: null,
    opportunityId: opportunity?.id ?? null,
    status: "DRAFT",
    dependencies: precedingIds,
    plannedStart: null,
    dueDate: opportunity?.responseDeadline ?? null,
    dueOffsetDays: null,
    completedAt: null,
    requiredInputs: ["Étapes préparatoires terminées", "Consentement de partage vérifié"],
    expectedOutputs: ["Réponse tracée de l'acteur"],
    evidence: [],
    expectedCostCents: null,
    actualCostCents: null,
    payerActorId: null,
    fundingStatus: "UNKNOWN",
    successTransition: outcomeStepId,
    failureTransition: input.planType === "A" ? "ACTIVATE_PLAN_B" : null,
    sourceReason: opportunity
      ? `L'opportunité correspond au métier cible; sa disponibilité doit être reconfirmée.`
      : "L'absence de donnée n'est pas une conclusion négative : une recherche manuelle est requise.",
    suggestion: {
      humanValidationRequired: true,
      confidence: opportunity?.verificationStatus === "VERIFIED" ? "HIGH" : "LOW",
      dataUsed: [`Métier cible : ${input.occupation.label}`],
      unknowns: opportunity ? [] : ["Employeur, contrat, dates, places et contact non renseignés."],
    },
  });
  steps.push({
    id: outcomeStepId,
    pathwayId,
    type: "OUTCOME",
    title: "Enregistrer la sortie et ses preuves",
    description: "Créer la sortie uniquement à partir d'une preuve, puis programmer J+7, J+30, J+60 et J+90.",
    assignedActorId: null,
    serviceOfferId: null,
    opportunityId: opportunity?.id ?? null,
    status: "DRAFT",
    dependencies: [opportunityStepId],
    plannedStart: null,
    dueDate: null,
    dueOffsetDays: null,
    completedAt: null,
    requiredInputs: ["Preuve de sortie"],
    expectedOutputs: ["Outcome", "Suivis J+7/J+30/J+60/J+90"],
    evidence: [],
    expectedCostCents: null,
    actualCostCents: null,
    payerActorId: null,
    fundingStatus: "UNKNOWN",
    successTransition: null,
    failureTransition: input.planType === "A" ? "ACTIVATE_PLAN_B" : null,
    sourceReason: "Aucune sortie ne doit être enregistrée sans preuve ni suivi de maintien.",
    suggestion: {
      humanValidationRequired: true,
      confidence: "HIGH",
      dataUsed: ["Règle métier du parcours"],
      unknowns: ["Type, employeur, date et preuve de sortie à renseigner."],
    },
  });

  const pathway = pathwaySchema.parse({
    id: pathwayId,
    participantId: input.passport.participantId,
    cohortId: input.cohortId,
    targetState: { occupationId: input.occupation.id, label: input.occupation.label },
    planType: input.planType,
    status: "DRAFT",
    steps,
    currentStepId: diagnosticId,
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
  });
  return { pathway, explanations, unknowns };
}

export function generatePathwayDraft(input: {
  passport: ParticipantPassport;
  planAOccupation: Occupation;
  planBOccupation: Occupation;
  cohortId: string;
  actors: Actor[];
  serviceOffers: ServiceOffer[];
  opportunities?: Opportunity[];
  territory?: string;
  verifiedSolutionsOnly?: boolean;
  now?: string;
}): PathwayDraftResult {
  const passport = participantPassportSchema.parse(input.passport);
  const planAOccupation = occupationSchema.parse(input.planAOccupation);
  const planBOccupation = occupationSchema.parse(input.planBOccupation);
  const now = input.now ?? new Date().toISOString();
  const verifiedOnly = input.verifiedSolutionsOnly ?? true;
  const barriers = passport.barriers.map((barrier) => barrierToNeed(passport, barrier, now));
  const planAGaps = calculateSkillGaps(passport, planAOccupation).map((gap) => skillGapToNeed(gap, { createdAt: now }));
  const planBGaps = calculateSkillGaps(passport, planBOccupation).map((gap) => skillGapToNeed(gap, { createdAt: now }));
  const planANeeds = uniqueNeeds([...barriers, ...planAGaps]);
  const planBNeeds = uniqueNeeds([...barriers, ...planBGaps]);
  const common = {
    passport,
    cohortId: input.cohortId,
    actors: input.actors,
    serviceOffers: input.serviceOffers,
    opportunities: input.opportunities ?? [],
    territory: input.territory,
    verifiedOnly,
    now,
  };
  const planA = draftPathway({ ...common, occupation: planAOccupation, planType: "A", needs: planANeeds });
  const planB = draftPathway({ ...common, occupation: planBOccupation, planType: "B", needs: planBNeeds });

  return {
    planA: planA.pathway,
    planB: planB.pathway,
    needs: uniqueNeeds([...planANeeds, ...planBNeeds]),
    explanations: [...planA.explanations, ...planB.explanations],
    unknowns: [...new Set([...planA.unknowns, ...planB.unknowns])],
    humanValidationRequired: true,
  };
}

/** Returns every blocking issue; approval remains an explicit human mutation in the repository. */
export function getPathwayApprovalIssues(pathwayInput: Pathway, referralsInput: Referral[] = []): PathwayApprovalIssue[] {
  const pathway = pathwaySchema.parse(pathwayInput);
  const referrals = referralsInput.map((referral) => referralSchema.parse(referral));
  const issues: PathwayApprovalIssue[] = [];
  if (!["DRAFT", "AWAITING_HUMAN_APPROVAL"].includes(pathway.status)) {
    issues.push({ code: "INVALID_STATUS", stepId: null, message: "Seul un brouillon en attente peut être validé." });
  }

  const inputEvidenceStatuses = new Set(["READY", "ASSIGNED", "SENT", "ACKNOWLEDGED", "ACCEPTED", "IN_PROGRESS", "COMPLETED"]);
  for (const step of pathway.steps) {
    if (step.status === "CANCELLED") continue;
    if (!step.assignedActorId) {
      issues.push({ code: "MISSING_OWNER", stepId: step.id, message: `« ${step.title} » n'a pas de responsable.` });
    }
    if (!step.dueDate && step.dueOffsetDays === null) {
      issues.push({ code: "MISSING_DEADLINE", stepId: step.id, message: `« ${step.title} » n'a pas d'échéance.` });
    }
    if (step.status === "BLOCKED") {
      const hasRelaunch = referrals.some(
        (referral) => referral.pathwayStepId === step.id && referral.relaunchCount > 0 && referral.lastRelaunchAt !== null,
      );
      if (!hasRelaunch) {
        issues.push({
          code: "BLOCKED_WITHOUT_RELAUNCH",
          stepId: step.id,
          message: `« ${step.title} » est bloquée sans relance tracée.`,
        });
      }
    }
    if (step.requiredInputs.length > 0 && inputEvidenceStatuses.has(step.status) && step.evidence.length === 0) {
      issues.push({
        code: "MISSING_CRITICAL_INPUT_EVIDENCE",
        stepId: step.id,
        message: `Les entrées requises de « ${step.title} » ne sont pas étayées par une preuve.`,
      });
    }
  }
  return issues;
}

const REFERRAL_TRANSITIONS: Record<Referral["status"], readonly Referral["status"][]> = {
  DRAFT: ["SENT", "CANCELLED"],
  SENT: ["ACKNOWLEDGED", "REJECTED", "NO_RESPONSE", "CANCELLED"],
  ACKNOWLEDGED: ["ACCEPTED", "REJECTED", "NO_RESPONSE", "CANCELLED"],
  ACCEPTED: ["IN_PROGRESS", "REJECTED", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "REJECTED", "CANCELLED"],
  COMPLETED: [],
  REJECTED: [],
  NO_RESPONSE: ["SENT", "CANCELLED"],
  CANCELLED: [],
};

export class OrchestrationTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrchestrationTransitionError";
  }
}

export class OrchestrationVersionConflictError extends Error {
  constructor() {
    super("Le parcours a été modifié depuis son ouverture. Rechargez la version courante avant de réessayer.");
    this.name = "OrchestrationVersionConflictError";
  }
}

export function transitionReferral(referralInput: Referral, transitionInput: ReferralTransitionInput): Referral {
  const referral = referralSchema.parse(referralInput);
  const transition = referralTransitionInputSchema.parse(transitionInput);
  if (!REFERRAL_TRANSITIONS[referral.status].includes(transition.status)) {
    throw new OrchestrationTransitionError(`Transition d'orientation interdite : ${referral.status} → ${transition.status}.`);
  }
  if (transition.status === "REJECTED" && !transition.rejectionReason) {
    throw new OrchestrationTransitionError("Un refus exige un motif explicite.");
  }

  return referralSchema.parse({
    ...referral,
    status: transition.status,
    sentAt: transition.status === "SENT" ? transition.at : referral.sentAt,
    acknowledgedAt: transition.status === "ACKNOWLEDGED" ? transition.at : referral.acknowledgedAt,
    acceptedAt: transition.status === "ACCEPTED" ? transition.at : referral.acceptedAt,
    completedAt: transition.status === "COMPLETED" ? transition.at : referral.completedAt,
    response: transition.response === undefined ? referral.response : transition.response,
    rejectionReason: transition.rejectionReason === undefined ? referral.rejectionReason : transition.rejectionReason,
    evidence: transition.evidence === undefined ? referral.evidence : [...referral.evidence, ...transition.evidence],
    history: [...referral.history, { from: referral.status, to: transition.status, at: transition.at, note: transition.note ?? null }],
  });
}

export function relaunchReferral(referralInput: Referral, at = new Date().toISOString(), note = "Relance enregistrée."): Referral {
  const referral = referralSchema.parse(referralInput);
  if (!["SENT", "ACKNOWLEDGED", "NO_RESPONSE"].includes(referral.status)) {
    throw new OrchestrationTransitionError("Une orientation terminée, refusée ou annulée ne peut pas être relancée.");
  }
  const status = referral.status === "NO_RESPONSE" ? "SENT" : referral.status;
  return referralSchema.parse({
    ...referral,
    status,
    sentAt: status === "SENT" ? at : referral.sentAt,
    relaunchCount: referral.relaunchCount + 1,
    lastRelaunchAt: at,
    history: [...referral.history, { from: referral.status, to: status, at, note }],
  });
}

function knownOrNull(values: Array<number | null>) {
  if (values.length === 0 || values.some((value) => value === null)) return null;
  return (values as number[]).reduce((sum, value) => sum + value, 0);
}

export function calculateCostSummary(costItemsInput: CostItem[]): CostSummary {
  const items = costItemsInput.map((item) => costItemSchema.parse(item));
  const expected = items.map((item) => item.expectedCostCents);
  const actual = items.map((item) => item.actualCostCents);
  const expectedKnownSubtotalCents = expected.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  const actualKnownSubtotalCents = actual.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  const expectedUnknownCount = expected.filter((value) => value === null).length;
  const actualUnknownCount = actual.filter((value) => value === null).length;
  return {
    expectedTotalCents: knownOrNull(expected),
    actualTotalCents: knownOrNull(actual),
    expectedKnownSubtotalCents,
    actualKnownSubtotalCents,
    expectedUnknownCount,
    actualUnknownCount,
    expectedComplete: items.length > 0 && expectedUnknownCount === 0,
    actualComplete: items.length > 0 && actualUnknownCount === 0,
  };
}

export function calculateFundingSummary(costItemsInput: CostItem[], allocationsInput: FundingAllocation[]): FundingSummary {
  const items = costItemsInput.map((item) => costItemSchema.parse(item));
  const itemIds = new Set(items.map((item) => item.id));
  const allocations = allocationsInput
    .map((allocation) => fundingAllocationSchema.parse(allocation))
    .filter((allocation) => itemIds.has(allocation.costItemId));
  const costs = calculateCostSummary(items);
  const approvedFundingCents = knownOrNull(allocations.map((allocation) => allocation.amountApprovedCents));
  const paidFundingCents = knownOrNull(allocations.map((allocation) => allocation.amountPaidCents));
  return {
    costTotalCents: costs.expectedTotalCents,
    approvedFundingCents,
    paidFundingCents,
    remainingToFundCents:
      costs.expectedTotalCents === null || approvedFundingCents === null
        ? null
        : Math.max(0, costs.expectedTotalCents - approvedFundingCents),
    costUnknown: costs.expectedTotalCents === null,
    fundingUnknown: approvedFundingCents === null,
  };
}

export function activatePlanBPaths(input: { planA: Pathway; planB: Pathway; reason: string; at?: string }) {
  const planA = pathwaySchema.parse(input.planA);
  const planB = pathwaySchema.parse(input.planB);
  if (planA.participantId !== planB.participantId || planA.cohortId !== planB.cohortId) {
    throw new OrchestrationTransitionError("Les Plans A et B doivent appartenir au même participant et à la même cohorte.");
  }
  if (planA.planType !== "A" || planB.planType !== "B") {
    throw new OrchestrationTransitionError("L'activation exige un parcours Plan A et un parcours Plan B.");
  }
  if (!input.reason.trim()) throw new OrchestrationTransitionError("L'activation du Plan B exige un motif explicite.");
  const at = input.at ?? new Date().toISOString();
  return {
    planA: pathwaySchema.parse({
      ...planA,
      status: "SUPERSEDED",
      version: planA.version + 1,
      activationReason: `Plan B activé : ${input.reason}`,
    }),
    planB: pathwaySchema.parse({
      ...planB,
      status: "ACTIVE",
      version: planB.version + 1,
      activatedAt: at,
      activationReason: input.reason,
    }),
  };
}

export function recordOutcomeMilestone(outcomeInput: Outcome, updateInput: OutcomeMilestoneUpdate): Outcome {
  const outcome = outcomeSchema.parse(outcomeInput);
  const update = outcomeMilestoneUpdateSchema.parse(updateInput);
  const milestones = outcome.milestones.map((milestone) =>
    milestone.milestone === update.milestone
      ? {
          ...milestone,
          status: update.status,
          checkedAt: update.checkedAt,
          evidence: update.evidence,
          notes: update.notes,
        }
      : milestone,
  );
  const finalStatus =
    update.milestone === "J90" && update.status === "ACTIVE"
      ? "MAINTAINED_J90"
      : update.status === "INACTIVE"
        ? "RUPTURE"
        : outcome.finalStatus === "PENDING" && update.status === "ACTIVE"
          ? "ACTIVE"
          : outcome.finalStatus;
  return outcomeSchema.parse({ ...outcome, milestones, finalStatus });
}

export function createOutcomeMilestones(startDate: string | null): Outcome["milestones"] {
  const offsets: Record<(typeof OUTCOME_MILESTONES)[number], number> = { J7: 7, J30: 30, J60: 60, J90: 90 };
  const parsedStart = startDate ? new Date(startDate) : null;
  return OUTCOME_MILESTONES.map((milestone) => ({
    milestone,
    dueAt:
      parsedStart && !Number.isNaN(parsedStart.getTime())
        ? new Date(parsedStart.getTime() + offsets[milestone] * 86_400_000).toISOString()
        : null,
    checkedAt: null,
    status: startDate ? "PENDING" : "NOT_DUE",
    evidence: [],
    notes: null,
  }));
}
