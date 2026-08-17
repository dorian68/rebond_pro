import { OCCUPATION_COVERAGE_RANK } from "./constants";
import { occupationCoverageSchema } from "./schemas";
import type {
  Actor,
  CostItem,
  Occupation,
  OccupationCoverage,
  OccupationCoverageLevel,
  OccupationMarketContext,
  Opportunity,
  Outcome,
  Pathway,
  ServiceOffer,
} from "./types";

const normalize = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("fr-FR")
  .trim();

function includesAny(haystack: string[], needles: string[]) {
  const normalized = haystack.map(normalize);
  return needles.some((needle) => normalized.some((candidate) => candidate.includes(normalize(needle)) || normalize(needle).includes(candidate)));
}

export type OccupationCoverageInput = {
  occupation: Occupation;
  marketContext?: OccupationMarketContext | null;
  actors?: Actor[];
  serviceOffers?: ServiceOffer[];
  opportunities?: Opportunity[];
  pathways?: Pathway[];
  outcomes?: Outcome[];
  costItems?: CostItem[];
  assessedAt?: string;
};

/**
 * Computes the highest evidence level reached by an occupation.
 * Levels are deliberately cumulative: an open opportunity cannot compensate for
 * an undocumented métier model, and a BMO signal can never become a job offer.
 */
export function evaluateOccupationCoverage(input: OccupationCoverageInput): OccupationCoverage {
  const occupation = input.occupation;
  const actors = input.actors ?? [];
  const serviceOffers = input.serviceOffers ?? [];
  const opportunities = input.opportunities ?? [];
  const pathways = input.pathways ?? [];
  const outcomes = input.outcomes ?? [];
  const costItems = input.costItems ?? [];
  const evidence: string[] = [];
  const blockers: string[] = [];

  const hasSignal = input.marketContext !== null && input.marketContext !== undefined;
  if (hasSignal) evidence.push(`Signal BMO 2026 documenté (${input.marketContext!.projectsKnown} projet(s) connu(s)).`);
  else blockers.push("Aucun signal de marché BMO 2026 rattaché au métier.");

  const mappingDocumented = Boolean(occupation.fapCode && occupation.romeCode && occupation.fapMapping && occupation.fapMapping.relation !== "UNMAPPED");
  const mappingVerified = mappingDocumented && occupation.fapMapping!.verificationStatus === "VERIFIED";
  if (mappingDocumented) {
    evidence.push(`Correspondance FAP ${occupation.fapCode} ↔ ROME ${occupation.romeCode} renseignée (${occupation.fapMapping!.relation}).`);
    if (!mappingVerified) blockers.push("Correspondance FAP/ROME renseignée mais validation humaine encore requise.");
  }
  else blockers.push("Correspondance FAP/ROME non validée.");

  const requirementsVerified = occupation.requiredSkills.length > 0
    && occupation.requiredSkills.every((requirement) => requirement.verificationStatus === "VERIFIED")
    && occupation.verificationStatus === "VERIFIED";
  const modeled = mappingVerified && requirementsVerified && occupation.constraints.length > 0;
  if (modeled) evidence.push("Compétences requises et contraintes métier documentées avec des sources vérifiées.");
  else blockers.push("Compétences, tâches, prérequis ou contraintes métier à documenter et vérifier.");

  const requiredSkillLabels = occupation.requiredSkills.map((requirement) => requirement.skillLabel);
  const occupationOpportunityActorIds = new Set(
    opportunities
      .filter((opportunity) => opportunity.occupationId === occupation.id && opportunity.verificationStatus === "VERIFIED")
      .map((opportunity) => opportunity.providerActorId),
  );
  const verifiedOffers = serviceOffers.filter((offer) =>
    offer.verificationStatus === "VERIFIED"
    && (includesAny(offer.skillsDeveloped, requiredSkillLabels) || occupationOpportunityActorIds.has(offer.actorId)),
  );
  const verifiedActorIds = new Set(
    actors
      .filter((actor) => actor.active && actor.verificationStatus === "VERIFIED")
      .map((actor) => actor.id),
  );
  const actorsById = new Map(actors.map((actor) => [actor.id, actor]));
  const ecosystemDocumented = modeled && verifiedOffers.some((offer) => verifiedActorIds.has(offer.actorId));
  if (ecosystemDocumented) evidence.push("Au moins un acteur et un service local vérifiés sont reliés aux exigences du métier.");
  else blockers.push("Écosystème local vérifié incomplet pour ce métier.");

  const liveOpportunities = opportunities.filter((opportunity) =>
    opportunity.occupationId === occupation.id
    && opportunity.verificationStatus === "VERIFIED"
    && opportunity.status === "OPEN"
    && opportunity.vacancies !== null
    && opportunity.vacancies > 0
    && verifiedActorIds.has(opportunity.providerActorId)
    && actorsById.get(opportunity.providerActorId)?.currentCapacity.status === "AVAILABLE"
    && actorsById.get(opportunity.providerActorId)?.currentCapacity.places !== null
    && (actorsById.get(opportunity.providerActorId)?.currentCapacity.places ?? 0) > 0,
  );
  const activatable = ecosystemDocumented && liveOpportunities.length > 0;
  if (activatable) evidence.push(`${liveOpportunities.length} opportunité(s) vérifiée(s), ouverte(s) et dotée(s) de place(s).`);
  else blockers.push("Aucune opportunité actuelle vérifiée avec capacité disponible.");

  const occupationPathwayIds = new Set(pathways.filter((pathway) => pathway.targetState.occupationId === occupation.id).map((pathway) => pathway.id));
  const maintainedOutcomes = outcomes.filter((outcome) =>
    occupationPathwayIds.has(outcome.pathwayId)
    && outcome.finalStatus === "MAINTAINED_J90"
    && outcome.evidence.length > 0,
  );
  const hasMeasuredActualCost = costItems.some((item) =>
    occupationPathwayIds.has(item.pathwayId)
    && item.actualCostCents !== null
    && item.verificationStatus === "VERIFIED",
  );
  const proven = activatable && maintainedOutcomes.length > 0 && hasMeasuredActualCost;
  if (proven) evidence.push("Au moins une sortie maintenue à J+90 avec preuve et coût réel vérifié.");
  else blockers.push("Aucun parcours J+90 avec résultat et coût réel vérifiés.");

  let level: OccupationCoverageLevel = "L0_SIGNAL";
  if (mappingDocumented) level = "L1_MAPPED";
  if (modeled) level = "L2_MODELED";
  if (ecosystemDocumented) level = "L3_ECOSYSTEM";
  if (activatable) level = "L4_ACTIVATABLE";
  if (proven) level = "L5_PROVEN";

  return occupationCoverageSchema.parse({
    occupationId: occupation.id,
    level,
    mappingVerified,
    reliableForDraft: OCCUPATION_COVERAGE_RANK[level] >= OCCUPATION_COVERAGE_RANK.L2_MODELED,
    activatable: OCCUPATION_COVERAGE_RANK[level] >= OCCUPATION_COVERAGE_RANK.L4_ACTIVATABLE,
    evidence,
    blockers,
    assessedAt: input.assessedAt ?? new Date().toISOString(),
  });
}

export function isOccupationCoverageAtLeast(
  coverage: OccupationCoverage,
  minimum: OccupationCoverageLevel,
) {
  return OCCUPATION_COVERAGE_RANK[coverage.level] >= OCCUPATION_COVERAGE_RANK[minimum];
}
