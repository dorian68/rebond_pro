import {
  activatePlanBPaths,
  calculateCostSummary,
  calculateFundingSummary,
  findActorsByCapability,
  getPathwayApprovalIssues as inspectPathwayApprovalIssues,
  OrchestrationVersionConflictError,
  recordOutcomeMilestone as applyOutcomeMilestone,
  relaunchReferral as applyReferralRelaunch,
  transitionReferral as applyReferralTransition,
} from "./engine";
import { createSarahDemoSnapshot } from "./fixtures";
import {
  actorCapabilitySchema,
  actorSchema,
  actorSearchFiltersSchema,
  costItemSchema,
  fundingAllocationSchema,
  orchestrationSnapshotSchema,
  outcomeMilestoneUpdateSchema,
  outcomeSchema,
  pathwaySchema,
  pathwayStepPatchSchema,
  referralSchema,
  referralTransitionInputSchema,
} from "./schemas";
import type {
  Actor,
  ActorCapability,
  ActorSearchFilters,
  CostItem,
  FundingAllocation,
  OrchestrationRepository,
  OrchestrationSnapshot,
  Outcome,
  OutcomeMilestoneUpdate,
  ParticipantPassport,
  Pathway,
  PathwayApprovalIssue,
  PathwayStepPatch,
  Referral,
  ReferralTransitionInput,
} from "./types";

function clone<T>(value: T): T {
  return structuredClone(value);
}

function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr-FR");
}

export class OrchestrationNotFoundError extends Error {
  constructor(entity: string) {
    super(`${entity} introuvable dans le repository Orchestration.`);
    this.name = "OrchestrationNotFoundError";
  }
}

export class OrchestrationIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrchestrationIntegrityError";
  }
}

function assertReason(reason: string) {
  if (!reason.trim()) throw new OrchestrationIntegrityError("Toute modification versionnée exige un motif.");
  if (reason.length > 300) throw new OrchestrationIntegrityError("Le motif de modification dépasse 300 caractères.");
}

function assertAcyclic(pathway: Pathway) {
  const ids = new Set(pathway.steps.map((step) => step.id));
  const dependencies = new Map(pathway.steps.map((step) => [step.id, step.dependencies]));
  for (const step of pathway.steps) {
    if (step.dependencies.includes(step.id)) throw new OrchestrationIntegrityError("Une étape ne peut pas dépendre d'elle-même.");
    for (const dependency of step.dependencies) {
      if (!ids.has(dependency)) throw new OrchestrationIntegrityError(`Dépendance inconnue : ${dependency}.`);
    }
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  function visit(id: string) {
    if (visiting.has(id)) throw new OrchestrationIntegrityError("Les dépendances du parcours doivent former un graphe acyclique.");
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of dependencies.get(id) ?? []) visit(dependency);
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of ids) visit(id);
}

function assertOperationalStep(step: Pathway["steps"][number]) {
  const operationalStatuses = new Set(["ASSIGNED", "SENT", "ACKNOWLEDGED", "ACCEPTED", "IN_PROGRESS", "COMPLETED"]);
  if (step.assignedActorId && !step.dueDate && step.dueOffsetDays === null && step.status !== "CANCELLED") {
    throw new OrchestrationIntegrityError("Un responsable ne peut pas être assigné sans échéance.");
  }
  if (operationalStatuses.has(step.status) && (!step.assignedActorId || (!step.dueDate && step.dueOffsetDays === null))) {
    throw new OrchestrationIntegrityError("Une étape opérationnelle exige un responsable et une échéance.");
  }
  if (step.status === "COMPLETED" && (!step.completedAt || step.evidence.length === 0)) {
    throw new OrchestrationIntegrityError("Une étape terminée exige une date de réalisation et au moins une preuve.");
  }
}

function actorMatchesFilters(actor: Actor, filters: ReturnType<typeof actorSearchFiltersSchema.parse>) {
  if (filters.actorType && !actor.actorTypes.includes(filters.actorType)) return false;
  if (filters.verifiedOnly && actor.verificationStatus !== "VERIFIED") return false;
  if (filters.availableOnly && actor.currentCapacity.status !== "AVAILABLE") return false;
  if (filters.territory) {
    const territory = normalized(filters.territory);
    const values = [...actor.territory, ...actor.employmentBasin].map(normalized);
    if (!values.some((value) => value.includes(territory) || territory.includes(value))) return false;
  }
  return actor.active;
}

export function createInMemoryOrchestrationRepository(
  initialSnapshot: OrchestrationSnapshot = createSarahDemoSnapshot(),
): OrchestrationRepository {
  const baseline = orchestrationSnapshotSchema.parse(initialSnapshot);
  let state = clone(baseline);

  function findPathwayIndex(pathwayId: string) {
    const index = state.pathways.findIndex((pathway) => pathway.id === pathwayId);
    if (index < 0) throw new OrchestrationNotFoundError("Parcours");
    return index;
  }

  function archivePathway(pathway: Pathway, changedBy: string, reason: string, at: string) {
    state.pathwayVersions.push({
      pathwayId: pathway.id,
      version: pathway.version,
      snapshot: clone(pathway),
      changedAt: at,
      changedBy,
      reason,
    });
  }

  function refreshPathwayLedger(pathwayId: string, at: string, reason: string) {
    const index = findPathwayIndex(pathwayId);
    const pathway = state.pathways[index];
    const items = state.costItems.filter((item) => item.pathwayId === pathwayId);
    const itemIds = new Set(items.map((item) => item.id));
    const allocations = state.fundingAllocations.filter((allocation) => itemIds.has(allocation.costItemId));
    const costs = calculateCostSummary(items);
    const funding = calculateFundingSummary(items, allocations);
    archivePathway(pathway, "demo-repository", reason, at);
    state.pathways[index] = pathwaySchema.parse({
      ...pathway,
      predictedCostCents: costs.expectedTotalCents,
      actualCostCents: costs.actualTotalCents,
      fundingGapCents: funding.remainingToFundCents,
      version: pathway.version + 1,
    });
  }

  return {
    getSnapshot(): OrchestrationSnapshot {
      return clone(state);
    },

    getPassport(passportId: string): ParticipantPassport | null {
      const passport = state.passports.find((candidate) => candidate.id === passportId);
      return passport ? clone(passport) : null;
    },

    getPathway(pathwayId: string): Pathway | null {
      const pathway = state.pathways.find((candidate) => candidate.id === pathwayId);
      return pathway ? clone(pathway) : null;
    },

    getPathwayApprovalIssues(pathwayId: string): PathwayApprovalIssue[] {
      const pathway = state.pathways.find((candidate) => candidate.id === pathwayId);
      if (!pathway) throw new OrchestrationNotFoundError("Parcours");
      return clone(inspectPathwayApprovalIssues(pathway, state.referrals));
    },

    listActors(filtersInput: ActorSearchFilters = {}): Actor[] {
      const filters = actorSearchFiltersSchema.parse(filtersInput);
      const actors = filters.capability
        ? findActorsByCapability(state.actors, filters.capability, filters)
        : state.actors.filter((actor) => actorMatchesFilters(actor, filters));
      return clone(actors);
    },

    upsertActorCapability(actorId: string, capabilityInput: ActorCapability): Actor {
      const capability = actorCapabilitySchema.parse(capabilityInput);
      const index = state.actors.findIndex((actor) => actor.id === actorId);
      if (index < 0) throw new OrchestrationNotFoundError("Acteur");
      const actor = state.actors[index];
      const capabilities = actor.capabilities.filter((candidate) => candidate.capability !== capability.capability);
      const next = actorSchema.parse({ ...actor, capabilities: [...capabilities, capability] });
      state.actors[index] = next;
      return clone(next);
    },

    updatePathwayStep(input: {
      pathwayId: string;
      stepId: string;
      expectedVersion: number;
      patch: PathwayStepPatch;
      changedBy: string;
      reason: string;
      at?: string;
    }): Pathway {
      assertReason(input.reason);
      const index = findPathwayIndex(input.pathwayId);
      const current = state.pathways[index];
      if (current.version !== input.expectedVersion) throw new OrchestrationVersionConflictError();
      const patch = pathwayStepPatchSchema.parse(input.patch);
      const stepIndex = current.steps.findIndex((step) => step.id === input.stepId);
      if (stepIndex < 0) throw new OrchestrationNotFoundError("Étape");
      if (patch.assignedActorId && !state.actors.some((actor) => actor.id === patch.assignedActorId)) {
        throw new OrchestrationIntegrityError("L'acteur assigné n'appartient pas au registre courant.");
      }
      if (patch.serviceOfferId && !state.serviceOffers.some((offer) => offer.id === patch.serviceOfferId)) {
        throw new OrchestrationIntegrityError("L'offre de service n'appartient pas au registre courant.");
      }
      if (patch.opportunityId && !state.opportunities.some((opportunity) => opportunity.id === patch.opportunityId)) {
        throw new OrchestrationIntegrityError("L'opportunité n'appartient pas au registre courant.");
      }
      const steps = clone(current.steps);
      steps[stepIndex] = { ...steps[stepIndex], ...patch };
      assertOperationalStep(steps[stepIndex]);
      if (steps[stepIndex].serviceOfferId && steps[stepIndex].assignedActorId) {
        const offer = state.serviceOffers.find((candidate) => candidate.id === steps[stepIndex].serviceOfferId);
        if (offer && offer.actorId !== steps[stepIndex].assignedActorId) {
          throw new OrchestrationIntegrityError("L'offre de service doit appartenir à l'acteur assigné.");
        }
      }
      const next = pathwaySchema.parse({ ...current, steps, version: current.version + 1 });
      assertAcyclic(next);
      const at = input.at ?? new Date().toISOString();
      archivePathway(current, input.changedBy, input.reason, at);
      state.pathways[index] = next;
      return clone(next);
    },

    approvePathway(input: {
      pathwayId: string;
      expectedVersion: number;
      approvedBy: string;
      reason: string;
      at?: string;
    }): Pathway {
      assertReason(input.reason);
      if (!input.approvedBy.trim()) throw new OrchestrationIntegrityError("La validation exige l'identité du valideur humain.");
      const index = findPathwayIndex(input.pathwayId);
      const current = state.pathways[index];
      if (current.version !== input.expectedVersion) throw new OrchestrationVersionConflictError();
      if (!["DRAFT", "AWAITING_HUMAN_APPROVAL"].includes(current.status)) {
        throw new OrchestrationIntegrityError("Seul un brouillon en attente peut être validé.");
      }
      const approvalIssues = inspectPathwayApprovalIssues(current, state.referrals);
      if (approvalIssues.length > 0) {
        throw new OrchestrationIntegrityError(
          `Le parcours ne peut pas être validé : ${approvalIssues.map((issue) => issue.message).join(" ")}`,
        );
      }
      const at = input.at ?? new Date().toISOString();
      archivePathway(current, input.approvedBy, input.reason, at);
      const next = pathwaySchema.parse({
        ...current,
        status: "ACTIVE",
        version: current.version + 1,
        approvedBy: input.approvedBy,
        approvedAt: at,
        activatedAt: at,
        activationReason: input.reason,
      });
      state.pathways[index] = next;
      return clone(next);
    },

    transitionReferral(referralId: string, input: ReferralTransitionInput): Referral {
      const parsed = referralTransitionInputSchema.parse(input);
      const index = state.referrals.findIndex((referral) => referral.id === referralId);
      if (index < 0) throw new OrchestrationNotFoundError("Orientation");
      const next = applyReferralTransition(state.referrals[index], parsed);
      state.referrals[index] = next;
      return clone(next);
    },

    createReferral(referralInput: Referral): Referral {
      const referral = referralSchema.parse(referralInput);
      if (referral.status !== "DRAFT" || referral.sentAt !== null || referral.history.length !== 0) {
        throw new OrchestrationIntegrityError("Une nouvelle orientation doit commencer en brouillon sans envoi implicite.");
      }
      if (state.referrals.some((candidate) => candidate.id === referral.id)) {
        throw new OrchestrationIntegrityError("Cet identifiant d'orientation existe déjà.");
      }
      if (referral.fromActorId === referral.toActorId) {
        throw new OrchestrationIntegrityError("Une orientation exige deux acteurs distincts.");
      }
      if (!state.actors.some((actor) => actor.id === referral.fromActorId) || !state.actors.some((actor) => actor.id === referral.toActorId)) {
        throw new OrchestrationIntegrityError("Les acteurs de l'orientation doivent appartenir au registre courant.");
      }
      const pathway = state.pathways.find((candidate) =>
        candidate.participantId === referral.participantId && candidate.steps.some((step) => step.id === referral.pathwayStepId),
      );
      if (!pathway) throw new OrchestrationIntegrityError("L'orientation référence une étape étrangère au participant.");
      state.referrals.push(referral);
      return clone(referral);
    },

    relaunchReferral(referralId: string, input: { at?: string; note?: string } = {}): Referral {
      const index = state.referrals.findIndex((referral) => referral.id === referralId);
      if (index < 0) throw new OrchestrationNotFoundError("Orientation");
      const next = applyReferralRelaunch(state.referrals[index], input.at, input.note);
      state.referrals[index] = next;
      return clone(next);
    },

    activatePlanB(input: {
      planAPathwayId: string;
      planBPathwayId: string;
      expectedPlanAVersion: number;
      expectedPlanBVersion: number;
      activatedBy: string;
      reason: string;
      at?: string;
    }): { planA: Pathway; planB: Pathway } {
      assertReason(input.reason);
      const planAIndex = findPathwayIndex(input.planAPathwayId);
      const planBIndex = findPathwayIndex(input.planBPathwayId);
      const currentA = state.pathways[planAIndex];
      const currentB = state.pathways[planBIndex];
      if (currentA.version !== input.expectedPlanAVersion || currentB.version !== input.expectedPlanBVersion) {
        throw new OrchestrationVersionConflictError();
      }
      const at = input.at ?? new Date().toISOString();
      const next = activatePlanBPaths({ planA: currentA, planB: currentB, reason: input.reason, at });
      archivePathway(currentA, input.activatedBy, `Activation du Plan B : ${input.reason}`, at);
      archivePathway(currentB, input.activatedBy, `Activation du Plan B : ${input.reason}`, at);
      state.pathways[planAIndex] = next.planA;
      state.pathways[planBIndex] = next.planB;
      state.outcomes = state.outcomes.map((outcome) =>
        outcome.participantId === currentA.participantId ? outcomeSchemaWithPlanB(outcome) : outcome,
      );
      return clone(next);
    },

    recordOutcomeMilestone(outcomeId: string, updateInput: OutcomeMilestoneUpdate): Outcome {
      const update = outcomeMilestoneUpdateSchema.parse(updateInput);
      const index = state.outcomes.findIndex((outcome) => outcome.id === outcomeId);
      if (index < 0) throw new OrchestrationNotFoundError("Sortie");
      const next = applyOutcomeMilestone(state.outcomes[index], update);
      state.outcomes[index] = next;
      return clone(next);
    },

    recordOutcome(outcomeInput: Outcome, input: { recordedBy: string; reason: string; at?: string }): Outcome {
      assertReason(input.reason);
      if (!input.recordedBy.trim()) throw new OrchestrationIntegrityError("L'enregistrement d'une sortie exige un responsable.");
      const outcome = outcomeSchema.parse(outcomeInput);
      if (state.outcomes.some((candidate) => candidate.id === outcome.id)) {
        throw new OrchestrationIntegrityError("Cet identifiant de sortie existe déjà.");
      }
      const pathwayIndex = findPathwayIndex(outcome.pathwayId);
      const pathway = state.pathways[pathwayIndex];
      if (pathway.participantId !== outcome.participantId) {
        throw new OrchestrationIntegrityError("La sortie et le parcours doivent appartenir au même participant.");
      }
      const isActiveOutcome = !["PATHWAY_CONTINUES", "NO_ACTIVE_OUTCOME"].includes(outcome.type);
      if (isActiveOutcome && (outcome.evidence.length === 0 || !outcome.startDate || !outcome.providerActorId)) {
        throw new OrchestrationIntegrityError("Une sortie active exige un acteur, une date de début et au moins une preuve.");
      }
      if (outcome.providerActorId && !state.actors.some((actor) => actor.id === outcome.providerActorId)) {
        throw new OrchestrationIntegrityError("L'acteur de sortie n'appartient pas au registre courant.");
      }
      const at = input.at ?? new Date().toISOString();
      archivePathway(pathway, input.recordedBy, input.reason, at);
      state.outcomes.push(outcome);
      state.pathways[pathwayIndex] = pathwaySchema.parse({
        ...pathway,
        outcomeId: outcome.id,
        version: pathway.version + 1,
      });
      return clone(outcome);
    },

    addCostItem(itemInput: CostItem): CostItem {
      const item = costItemSchema.parse(itemInput);
      if (state.costItems.some((candidate) => candidate.id === item.id)) {
        throw new OrchestrationIntegrityError("Cet identifiant de coût existe déjà.");
      }
      findPathwayIndex(item.pathwayId);
      if (item.pathwayStepId) {
        const pathway = state.pathways.find((candidate) => candidate.id === item.pathwayId)!;
        if (!pathway.steps.some((step) => step.id === item.pathwayStepId)) {
          throw new OrchestrationIntegrityError("Le coût référence une étape étrangère au parcours.");
        }
      }
      state.costItems.push(item);
      refreshPathwayLedger(item.pathwayId, new Date().toISOString(), "Ajout d'un poste de coût.");
      return clone(item);
    },

    addFundingAllocation(allocationInput: FundingAllocation): FundingAllocation {
      const allocation = fundingAllocationSchema.parse(allocationInput);
      if (state.fundingAllocations.some((candidate) => candidate.id === allocation.id)) {
        throw new OrchestrationIntegrityError("Cet identifiant de financement existe déjà.");
      }
      const costItem = state.costItems.find((item) => item.id === allocation.costItemId);
      if (!costItem) throw new OrchestrationNotFoundError("Poste de coût");
      if (!state.actors.some((actor) => actor.id === allocation.funderActorId)) {
        throw new OrchestrationIntegrityError("Le financeur n'appartient pas au registre courant.");
      }
      state.fundingAllocations.push(allocation);
      refreshPathwayLedger(costItem.pathwayId, new Date().toISOString(), "Ajout d'une affectation de financement.");
      return clone(allocation);
    },

    reset(): OrchestrationSnapshot {
      state = clone(baseline);
      return clone(state);
    },
  };
}

function outcomeSchemaWithPlanB(outcome: Outcome): Outcome {
  return { ...outcome, planBActivated: true };
}

/** Process-local demo singleton. It is intentionally not a production persistence adapter. */
export const orchestrationDemoRepository = createInMemoryOrchestrationRepository();
