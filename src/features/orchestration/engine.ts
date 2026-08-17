import { NEED_CAPABILITY_MAP, OCCUPATION_COVERAGE_RANK, OUTCOME_MILESTONES } from "./constants";
import { getBmoMarketContextForOccupation } from "./bmo-registry";
import { evaluateOccupationCoverage } from "./coverage";
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
  OccupationCoverage,
  OccupationMarketContext,
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
  SourceRef,
} from "./types";

type SourceFreshnessById = Record<string, "CURRENT" | "REVIEW_DUE" | "NEEDS_VERIFICATION">;

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

function territoryValuesMatch(values: string[], territory?: string) {
  if (!territory) return true;
  const expected = normalize(territory);
  return values.some((value) => {
    const candidate = normalize(value);
    return candidate.includes(expected) || expected.includes(candidate);
  });
}

function meaningfulTokens(value: string) {
  const ignored = new Set(["avec", "dans", "pour", "niveau", "contexte", "confirmer", "professionnelle"]);
  return normalize(value)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4 && !ignored.has(token));
}

function serviceDevelopsNeedSkill(offer: ServiceOffer, need: Need) {
  if (!(["LANGUAGE", "SKILL_GAP"] as NeedType[]).includes(need.type)) return true;
  const expectedTokens = meaningfulTokens(need.label);
  if (expectedTokens.length === 0) return false;
  return offer.skillsDeveloped.some((skill) => {
    const offeredTokens = new Set(meaningfulTokens(skill));
    return expectedTokens.some((token) => offeredTokens.has(token));
  });
}

function deduplicate(values: string[]) {
  return [...new Set(values)];
}

function sourceFreshness(sourceRef: SourceRef, statuses?: SourceFreshnessById) {
  if (!statuses || !sourceRef.recordId) return "CURRENT" as const;
  return statuses[sourceRef.recordId] ?? "NEEDS_VERIFICATION";
}

type ServiceAssessment = {
  offer: ServiceOffer;
  exact: boolean;
  score: number;
  unknowns: string[];
  hardStops: string[];
};

function assessServiceForNeed(input: {
  offer: ServiceOffer;
  need: Need;
  territory?: string;
  now: string;
  sourceFreshnessById?: SourceFreshnessById;
}): ServiceAssessment {
  const { offer, need } = input;
  const exact =
    offer.capabilitiesProvided.includes(need.requiredCapability) &&
    offer.needsResolved.includes(need.type) &&
    serviceDevelopsNeedSkill(offer, need);
  if (!exact) return { offer, exact: false, score: 0, unknowns: [], hardStops: [] };

  const unknowns: string[] = [];
  const hardStops: string[] = [];
  let score = 50;
  const offerSourceFreshness = sourceFreshness(offer.sourceRef, input.sourceFreshnessById);
  if (offer.verificationStatus === "VERIFIED" && offerSourceFreshness === "CURRENT") score += 10;
  else if (offerSourceFreshness === "REVIEW_DUE") unknowns.push("Source du service arrivée à échéance de revue ; rafraîchissement requis.");
  else unknowns.push("Offre de service à vérifier avant mobilisation.");

  if (input.territory) {
    if (offer.territory.length === 0) {
      unknowns.push(`Territoire du service non renseigné pour ${input.territory}.`);
    } else if (!territoryValuesMatch(offer.territory, input.territory)) {
      hardStops.push(`Le service ne couvre pas le territoire ${input.territory}.`);
    } else {
      score += 10;
    }
  }

  if (offer.places === 0) {
    hardStops.push("Le service indique zéro place disponible.");
  } else if (offer.places === null) {
    unknowns.push("Nombre de places du service non renseigné.");
  } else {
    score += 5;
  }

  const now = new Date(input.now).getTime();
  const datedSessions = offer.dates.map((date) => new Date(date).getTime());
  if (datedSessions.length === 0) {
    unknowns.push("Calendrier du service non renseigné.");
  } else if (datedSessions.every((date) => date < now)) {
    hardStops.push("Le service ne comporte que des dates passées.");
  } else {
    score += 5;
  }

  const textualChecks = [
    ...offer.targetPublic,
    ...offer.eligibilityRules,
    ...offer.prerequisites,
    ...offer.requiredDocuments,
  ];
  if (textualChecks.length > 0) {
    unknowns.push("Éligibilité, prérequis ou documents du service à instruire humainement.");
  } else {
    score += 5;
  }

  return { offer, exact: true, score, unknowns: deduplicate(unknowns), hardStops: deduplicate(hardStops) };
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
  includeExcluded?: boolean;
  now?: string;
  sourceFreshnessById?: SourceFreshnessById;
}): ActorMatch[] {
  const offers = input.serviceOffers.map((offer) => serviceOfferSchema.parse(offer));
  const actors = findActorsByCapability(input.actors, input.need.requiredCapability, {
    territory: input.territory,
    verifiedOnly: input.verifiedOnly ?? false,
  });

  const now = input.now ?? new Date().toISOString();
  const matches = actors.map((actor): ActorMatch => {
    const capability = actor.capabilities.find((claim) => claim.capability === input.need.requiredCapability)!;
    const actorOffers = offers.filter(
      (offer) => offer.actorId === actor.id && (!input.verifiedOnly || offer.verificationStatus === "VERIFIED"),
    );
    const assessedOffers = actorOffers.map((offer) => assessServiceForNeed({
      offer,
      need: input.need,
      territory: input.territory,
      now,
      sourceFreshnessById: input.sourceFreshnessById,
    }));
    const exactOffers = assessedOffers.filter((assessment) => assessment.exact);
    const usableOffers = exactOffers
      .filter((assessment) => assessment.hardStops.length === 0)
      .sort((left, right) => right.score - left.score || left.offer.name.localeCompare(right.offer.name, "fr"));
    const bestOffer = usableOffers[0] ?? null;
    const unknowns: string[] = [];
    const hardStops: string[] = [];
    const actorSourceFreshness = sourceFreshness(actor.sourceRef, input.sourceFreshnessById);
    const capabilitySourceFreshness = sourceFreshness(capability.sourceRef, input.sourceFreshnessById);
    const actorEvidenceCurrent = actor.verificationStatus === "VERIFIED" && actorSourceFreshness === "CURRENT";
    const capabilityEvidenceCurrent = capability.verificationStatus === "VERIFIED" && capabilitySourceFreshness === "CURRENT";
    if (!actorEvidenceCurrent || !capabilityEvidenceCurrent) {
      unknowns.push("Capacité de l'acteur à vérifier avant orientation.");
    }
    if (actorSourceFreshness === "REVIEW_DUE" || capabilitySourceFreshness === "REVIEW_DUE") {
      unknowns.push("Source de l'acteur ou de sa capacité arrivée à échéance de revue.");
    }
    if (actor.currentCapacity.status === "UNAVAILABLE" || actor.currentCapacity.places === 0) {
      hardStops.push("L'acteur est indisponible ou indique zéro place.");
    } else if (actor.currentCapacity.status === "UNKNOWN") {
      unknowns.push("Capacité d'accueil actuelle non renseignée.");
    } else if (actor.currentCapacity.status === "LIMITED") {
      unknowns.push("Capacité d'accueil limitée à reconfirmer.");
    }
    if (actor.eligibilityRules.length > 0) unknowns.push("Règles d'éligibilité de l'acteur à instruire humainement.");

    if (exactOffers.length > 0 && usableOffers.length === 0) {
      hardStops.push(...exactOffers.flatMap((assessment) => assessment.hardStops));
    }
    if (bestOffer) unknowns.push(...bestOffer.unknowns);
    if (exactOffers.length === 0) unknowns.push("Aucune offre de service concrète ne répond exactement au besoin.");

    const level: ActorMatch["level"] = hardStops.length > 0
      ? "EXCLUDED"
      : !bestOffer
        ? "DISCOVERY_ONLY"
        : unknowns.length > 0
          ? "QUALIFIED_WITH_CHECKS"
          : "ACTIVATABLE";

    const scoreBreakdown: ActorMatch["scoreBreakdown"] = [
      {
        criterion: "CAPABILITY",
        points: capabilityEvidenceCurrent ? 20 : 8,
        maximum: 20,
        explanation: capabilityEvidenceCurrent ? "Capacité documentée par une source fraîche." : "Capacité ou source encore à vérifier.",
      },
      {
        criterion: "ACTOR_VERIFICATION",
        points: actorEvidenceCurrent ? 10 : 4,
        maximum: 10,
        explanation: actorEvidenceCurrent ? "Identité acteur vérifiée par une source fraîche." : "Identité acteur ou source à vérifier.",
      },
      {
        criterion: "TERRITORY",
        points: input.territory && territoryMatches(actor, input.territory) ? 10 : input.territory ? 0 : 10,
        maximum: 10,
        explanation: input.territory ? `Implantation acteur compatible avec ${input.territory}.` : "Aucun territoire imposé.",
      },
      {
        criterion: "SERVICE_FIT",
        points: bestOffer ? 30 : 0,
        maximum: 30,
        explanation: bestOffer ? "Service concret relié au besoin et à la compétence." : "Aucun service concret exact mobilisable.",
      },
      {
        criterion: "SERVICE_VERIFICATION",
        points: bestOffer?.offer.verificationStatus === "VERIFIED" && sourceFreshness(bestOffer.offer.sourceRef, input.sourceFreshnessById) === "CURRENT" ? 10 : bestOffer ? 3 : 0,
        maximum: 10,
        explanation: bestOffer?.offer.verificationStatus === "VERIFIED" && sourceFreshness(bestOffer.offer.sourceRef, input.sourceFreshnessById) === "CURRENT" ? "Service sourcé, vérifié et frais." : "Service absent, à vérifier ou à rafraîchir.",
      },
      {
        criterion: "AVAILABILITY",
        points:
          bestOffer && actor.currentCapacity.status === "AVAILABLE" && bestOffer.offer.places !== null && bestOffer.offer.places > 0 && bestOffer.offer.dates.length > 0
            ? 15
            : bestOffer && hardStops.length === 0
              ? 5
              : 0,
        maximum: 15,
        explanation: hardStops.length > 0 ? "Disponibilité incompatible." : unknowns.some((unknown) => /place|calendrier|capacité d'accueil/i.test(unknown)) ? "Disponibilité à confirmer." : "Disponibilité documentée.",
      },
      {
        criterion: "PREREQUISITES",
        points: bestOffer && !unknowns.some((unknown) => /éligibilité|prérequis|documents/i.test(unknown)) ? 5 : 0,
        maximum: 5,
        explanation: unknowns.some((unknown) => /éligibilité|prérequis|documents/i.test(unknown)) ? "Contrôles humains requis." : "Aucun prérequis textuel non instruit.",
      },
    ];
    const score = scoreBreakdown.reduce((total, component) => total + component.points, 0);

    return {
      actor,
      capability,
      serviceOffers: usableOffers.map((assessment) => assessment.offer),
      level,
      score,
      scoreBreakdown,
      reasons: [
        capabilityEvidenceCurrent
          ? `La capacité ${input.need.requiredCapability} est documentée par une source fraîche pour cet acteur.`
          : `Le registre associe provisoirement ${input.need.requiredCapability} à cet acteur ; la capacité ou sa source reste à vérifier.`,
        ...(input.territory && territoryMatches(actor, input.territory) ? [`Territoire compatible avec ${input.territory}.`] : []),
        ...(bestOffer ? [`Le service « ${bestOffer.offer.name} » répond directement au besoin « ${input.need.label} ».`] : []),
      ],
      unknowns: deduplicate(unknowns),
      hardStops: deduplicate(hardStops),
    };
  });

  const levelPriority: Record<ActorMatch["level"], number> = {
    ACTIVATABLE: 4,
    QUALIFIED_WITH_CHECKS: 3,
    DISCOVERY_ONLY: 2,
    EXCLUDED: 1,
  };
  return matches
    .filter((match) => input.includeExcluded || match.level !== "EXCLUDED")
    .sort((left, right) =>
      levelPriority[right.level] - levelPriority[left.level] ||
      right.score - left.score ||
      left.actor.displayName.localeCompare(right.actor.displayName, "fr"),
    );
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
  sourceFreshnessById?: SourceFreshnessById;
  occupationCoverage: OccupationCoverage;
  marketContext: OccupationMarketContext | null;
}): { pathway: Pathway; matchSuggestions: PathwayDraftResult["matchSuggestions"]; explanations: string[]; unknowns: string[] } {
  const pathwayId = stableId("pathway", input.passport.participantId, `plan-${input.planType}`, input.occupation.id);
  const diagnosticId = stableId(pathwayId, "diagnostic");
  const projectId = stableId(pathwayId, "validation-projet");
  const explanations: string[] = [];
  const unknowns: string[] = [];
  const matchSuggestions: PathwayDraftResult["matchSuggestions"] = [];

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
  if (OCCUPATION_COVERAGE_RANK[input.occupationCoverage.level] < OCCUPATION_COVERAGE_RANK.L2_MODELED) {
    const engineeringStepId = stableId(pathwayId, "ingenierie-metier");
    const sourceReason = input.marketContext
      ? `Le métier apparaît dans la BMO 2026 (FAP ${input.marketContext.fapCode}), mais le signal de marché ne décrit ni les compétences, ni les prérequis, ni une opportunité réelle. Le modèle métier doit être documenté et validé avant de présenter ce parcours comme fiable.`
      : "Le modèle métier ne dispose pas encore d'un niveau de preuve suffisant. Une ingénierie métier manuelle est obligatoire avant toute activation.";
    steps.push({
      id: engineeringStepId,
      pathwayId,
      type: "PROJECT_VALIDATION",
      title: "Compléter l’ingénierie du métier",
      description: "Valider le crosswalk ROME/FAP, les tâches, compétences, prérequis, contraintes et passerelles avant de rechercher des solutions locales.",
      assignedActorId: null,
      serviceOfferId: null,
      opportunityId: null,
      status: "DRAFT",
      dependencies: [projectId],
      plannedStart: null,
      dueDate: null,
      dueOffsetDays: null,
      completedAt: null,
      requiredInputs: ["Source métier officielle", "Validation du crosswalk ROME/FAP", "Exigences réelles d'au moins une cible employeur"],
      expectedOutputs: ["Métier couvert au niveau L2 — Modélisé"],
      evidence: [],
      expectedCostCents: null,
      actualCostCents: null,
      payerActorId: null,
      fundingStatus: "UNKNOWN",
      successTransition: null,
      failureTransition: input.planType === "A" ? "ACTIVATE_PLAN_B" : null,
      sourceReason,
      suggestion: {
        humanValidationRequired: true,
        confidence: "HIGH",
        dataUsed: [
          `Couverture ${input.occupationCoverage.level}`,
          ...(input.marketContext ? [`BMO 2026 · FAP ${input.marketContext.fapCode}`] : []),
        ],
        unknowns: input.occupationCoverage.blockers,
      },
    });
    explanations.push(sourceReason);
    unknowns.push(...input.occupationCoverage.blockers);
    precedingIds = [engineeringStepId];
  }
  for (const need of input.needs.filter((candidate) => candidate.status !== "RESOLVED")) {
    const matches = findActorMatchesForNeed({
      need,
      actors: input.actors,
      serviceOffers: input.serviceOffers,
      territory: input.territory,
      verifiedOnly: input.verifiedOnly,
      now: input.now,
      sourceFreshnessById: input.sourceFreshnessById,
    });
    const suggestedMatches = matches.slice(0, 3);
    matchSuggestions.push({
      planType: input.planType,
      needId: need.id,
      needLabel: need.label,
      matches: suggestedMatches,
    });
    const match = suggestedMatches.find((candidate) => candidate.level === "ACTIVATABLE") ?? null;
    const bestCandidate = suggestedMatches[0] ?? null;
    const offer = match?.serviceOffers[0] ?? null;
    const suggestedOffer = bestCandidate?.serviceOffers[0] ?? null;
    const stepId = stableId(pathwayId, "need", need.id);
    const sourceReason = match
      ? `Cette étape répond au besoin « ${need.label} ». Le service « ${offer?.name ?? "à confirmer"} » de ${match.actor.displayName} est classé ACTIVATABLE avec un score explicable de ${match.score}/100; l'affectation reste à valider par le CIP.`
      : bestCandidate
        ? `Cette étape répond au besoin « ${need.label} ». ${bestCandidate.actor.displayName} est une piste ${bestCandidate.level} classée ${bestCandidate.score}/100, mais des contrôles restent nécessaires : aucune affectation automatique, solution à instruire par le CIP.`
        : `Cette étape répond au besoin « ${need.label} ». Aucune solution${input.verifiedOnly ? " vérifiée" : " compatible"} n'a été trouvée; une recherche manuelle est nécessaire.`;

    if (!match) unknowns.push(`Aucune solution vérifiée et activable trouvée pour « ${need.label} »; la meilleure piste reste à instruire.`);
    explanations.push(sourceReason);
    steps.push({
      id: stepId,
      pathwayId,
      type: stepTypeForNeed(need.type),
      title: need.label,
      description: suggestedOffer?.description ?? `Organiser une réponse au besoin : ${need.label}.`,
      assignedActorId: match?.actor.id ?? null,
      serviceOfferId: offer?.id ?? null,
      opportunityId: null,
      status: "DRAFT",
      dependencies: precedingIds,
      plannedStart: null,
      dueDate: null,
      dueOffsetDays: null,
      completedAt: null,
      requiredInputs: suggestedOffer
        ? deduplicate([...suggestedOffer.prerequisites, ...suggestedOffer.requiredDocuments])
        : [],
      expectedOutputs: suggestedOffer?.expectedOutput
        ? [suggestedOffer.expectedOutput]
        : [`Besoin « ${need.label} » traité ou réévalué`],
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
        confidence: match ? "HIGH" : bestCandidate?.level === "QUALIFIED_WITH_CHECKS" ? "MEDIUM" : "LOW",
        dataUsed: [
          need.label,
          need.requiredCapability,
          ...(bestCandidate ? [`${bestCandidate.actor.displayName} · ${bestCandidate.level} · ${bestCandidate.score}/100`] : []),
          ...(suggestedOffer ? [`Service : ${suggestedOffer.name}`] : []),
        ],
        unknowns: match
          ? []
          : bestCandidate
            ? deduplicate([...bestCandidate.unknowns, "Affectation acteur/service à instruire et valider par le CIP."])
            : ["Acteur, offre, disponibilité et coût à renseigner."],
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
    occupationCoverage: input.occupationCoverage,
    marketContext: input.marketContext,
  });
  return { pathway, matchSuggestions, explanations, unknowns };
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
  sourceFreshnessById?: SourceFreshnessById;
  planAMarketContext?: OccupationMarketContext | null;
  planBMarketContext?: OccupationMarketContext | null;
}): PathwayDraftResult {
  const passport = participantPassportSchema.parse(input.passport);
  const planAOccupation = occupationSchema.parse(input.planAOccupation);
  const planBOccupation = occupationSchema.parse(input.planBOccupation);
  const now = input.now ?? new Date().toISOString();
  const verifiedOnly = input.verifiedSolutionsOnly ?? true;
  const planAMarketContext = input.planAMarketContext === undefined
    ? getBmoMarketContextForOccupation(planAOccupation)
    : input.planAMarketContext;
  const planBMarketContext = input.planBMarketContext === undefined
    ? getBmoMarketContextForOccupation(planBOccupation)
    : input.planBMarketContext;
  const barriers = passport.barriers.map((barrier) => barrierToNeed(passport, barrier, now));
  const planAGaps = calculateSkillGaps(passport, planAOccupation).map((gap) => skillGapToNeed(gap, { createdAt: now }));
  const planBGaps = calculateSkillGaps(passport, planBOccupation).map((gap) => skillGapToNeed(gap, { createdAt: now }));
  const planANeeds = uniqueNeeds([...barriers, ...planAGaps]);
  const planBNeeds = uniqueNeeds([...barriers, ...planBGaps]);
  const planACoverage = evaluateOccupationCoverage({
    occupation: planAOccupation,
    marketContext: planAMarketContext,
    actors: input.actors,
    serviceOffers: input.serviceOffers,
    opportunities: input.opportunities,
    assessedAt: now,
  });
  const planBCoverage = evaluateOccupationCoverage({
    occupation: planBOccupation,
    marketContext: planBMarketContext,
    actors: input.actors,
    serviceOffers: input.serviceOffers,
    opportunities: input.opportunities,
    assessedAt: now,
  });
  const common = {
    passport,
    cohortId: input.cohortId,
    actors: input.actors,
    serviceOffers: input.serviceOffers,
    opportunities: input.opportunities ?? [],
    territory: input.territory,
    verifiedOnly,
    now,
    sourceFreshnessById: input.sourceFreshnessById,
  };
  const planA = draftPathway({
    ...common,
    occupation: planAOccupation,
    planType: "A",
    needs: planANeeds,
    occupationCoverage: planACoverage,
    marketContext: planAMarketContext,
  });
  const planB = draftPathway({
    ...common,
    occupation: planBOccupation,
    planType: "B",
    needs: planBNeeds,
    occupationCoverage: planBCoverage,
    marketContext: planBMarketContext,
  });

  return {
    planA: planA.pathway,
    planB: planB.pathway,
    coverageAssessments: { A: planACoverage, B: planBCoverage },
    marketContexts: { A: planAMarketContext, B: planBMarketContext },
    needs: uniqueNeeds([...planANeeds, ...planBNeeds]),
    matchSuggestions: [...planA.matchSuggestions, ...planB.matchSuggestions],
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
  if (OCCUPATION_COVERAGE_RANK[pathway.occupationCoverage.level] < OCCUPATION_COVERAGE_RANK.L3_ECOSYSTEM) {
    issues.push({
      code: "INSUFFICIENT_OCCUPATION_COVERAGE",
      stepId: null,
      message: `Le métier est couvert au niveau ${pathway.occupationCoverage.level}; le niveau L3 — Écosystème est requis avant validation opérationnelle.`,
    });
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
