import type { OrchestrationSnapshot } from "@/features/orchestration";
import type { OrchestrationUiModel, UiActor, UiCostItem, UiOutcome, UiStep } from "./ui-types";

const COST_LABELS: Record<string, string> = {
  LBR_ACCOMPANIMENT: "Accompagnement Le Bon Rebond",
  TRAINING: "Formation",
  MOBILITY: "Mobilité",
  CHILDCARE: "Garde d’enfant",
  EQUIPMENT: "Équipement",
  PSYCHOLOGICAL_SUPPORT: "Soutien psychologique",
  ADMINISTRATION: "Administration",
  IMMERSION: "Immersion",
  OTHER: "Autre coût",
};

function formatDateRange(start: string | null, end: string | null) {
  const formatter = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  if (!start && !end) return "Dates à confirmer";
  if (!start) return `Jusqu’au ${formatter.format(new Date(end!))}`;
  if (!end) return `À partir du ${formatter.format(new Date(start))}`;
  return `${formatter.format(new Date(start))} → ${formatter.format(new Date(end))}`;
}

function sourceLocation(source: { file?: string | null; sheet?: string | null; page?: number | null; line?: number | null; section?: string | null }) {
  const details = [
    source.file,
    source.sheet ? `onglet ${source.sheet}` : null,
    source.page ? `page ${source.page}` : null,
    source.line ? `ligne ${source.line}` : null,
    source.section ? `section ${source.section}` : null,
  ].filter(Boolean);
  return details.length ? details.join(" · ") : null;
}

function actorView(actor: OrchestrationSnapshot["actors"][number], snapshot: OrchestrationSnapshot, usedActorIds: Set<string>): UiActor {
  const offers = snapshot.serviceOffers.filter((offer) => offer.actorId === actor.id);
  const opportunities = snapshot.opportunities.filter((opportunity) => opportunity.providerActorId === actor.id);
  const contacts = actor.contacts.flatMap((contact) => [
    [contact.name, contact.role].filter(Boolean).join(" · "),
    contact.email,
    contact.phone,
  ].filter((value): value is string => Boolean(value)));

  return {
    id: actor.id,
    name: actor.displayName,
    legalName: actor.legalName,
    actorTypes: actor.actorTypes,
    territory: actor.territory.join(", ") || "Territoire non renseigné",
    employmentBasin: actor.employmentBasin.join(", ") || null,
    capabilities: actor.capabilities.map((entry) => entry.capability),
    services: offers.map((offer) => offer.name),
    opportunities: opportunities.map((opportunity) => opportunity.title),
    contacts,
    sourceLabel: actor.sourceRef.label,
    sourceLocation: sourceLocation(actor.sourceRef),
    verificationSource: null,
    verificationStatus: actor.verificationStatus,
    lastVerifiedAt: actor.lastVerifiedAt,
    verifiedBy: actor.verificationOwner,
    responseSla: actor.responseSlaHours === null ? null : `${actor.responseSlaHours} h`,
    capacity: actor.currentCapacity.status === "UNKNOWN"
      ? null
      : `${actor.currentCapacity.status}${actor.currentCapacity.places === null ? "" : ` · ${actor.currentCapacity.places} place(s)`}`,
    active: actor.active,
    usedInPathway: usedActorIds.has(actor.id),
    synthetic: actor.demo || actor.sourceRef.kind === "SYNTHETIC_DEMO",
  };
}

function stepView(
  step: OrchestrationSnapshot["pathways"][number]["steps"][number],
  planType: "A" | "B",
  index: number,
  actorsById: Map<string, OrchestrationSnapshot["actors"][number]>,
): UiStep {
  const planARowSize = 5;
  return {
    id: step.id,
    title: step.title,
    description: step.description ?? "Description non renseignée.",
    type: step.type,
    status: step.status,
    planType,
    assignedActorId: step.assignedActorId,
    assignedActorName: step.assignedActorId ? actorsById.get(step.assignedActorId)?.displayName ?? "Acteur à vérifier" : "Acteur à assigner",
    dependencies: step.dependencies,
    plannedStart: step.plannedStart,
    dueDate: step.dueDate,
    completedAt: step.completedAt,
    expectedCost: step.expectedCostCents,
    actualCost: step.actualCostCents,
    sourceReason: step.sourceReason,
    evidence: step.evidence,
    draft: step.status === "DRAFT",
    x: planType === "A" ? (index % planARowSize) * 275 : 300 + (index % 4) * 275,
    y: planType === "A" ? Math.floor(index / planARowSize) * 175 : 575 + Math.floor(index / 4) * 175,
  };
}

function emptyOutcome(pathwayId: string): UiOutcome {
  return {
    id: `outcome-empty-${pathwayId}`,
    type: "NO_ACTIVE_OUTCOME",
    providerActorId: null,
    startDate: null,
    evidence: "Aucune preuve de sortie enregistrée.",
    finalStatus: "PENDING",
    planBActivated: false,
    followups: { J7: "NOT_DUE", J30: "NOT_DUE", J60: "NOT_DUE", J90: "NOT_DUE" },
    followupEvidence: { J7: "", J30: "", J60: "", J90: "" },
    followupCheckedAt: { J7: null, J30: null, J60: null, J90: null },
  };
}

export function createOrchestrationUiModel(snapshot: OrchestrationSnapshot): OrchestrationUiModel {
  const passport = snapshot.passports[0];
  const cohort = snapshot.cohorts[0];
  const occupation = snapshot.occupations.find((candidate) => candidate.id === passport.planA.occupationId) ?? snapshot.occupations[0];
  const planA = snapshot.pathways.find((pathway) => pathway.participantId === passport.participantId && pathway.planType === "A") ?? snapshot.pathways[0];
  const planB = snapshot.pathways.find((pathway) => pathway.participantId === passport.participantId && pathway.planType === "B");
  const allCanonicalSteps = [...planA.steps, ...(planB?.steps ?? [])];
  const actorsById = new Map(snapshot.actors.map((actor) => [actor.id, actor]));
  const usedActorIds = new Set(allCanonicalSteps.flatMap((step) => step.assignedActorId ? [step.assignedActorId] : []));
  const actors = snapshot.actors.map((actor) => actorView(actor, snapshot, usedActorIds));
  const steps = [
    ...planA.steps.map((step, index) => stepView(step, "A", index, actorsById)),
    ...(planB?.steps.map((step, index) => stepView(step, "B", index, actorsById)) ?? []),
  ];
  const needs = snapshot.needs.filter((need) => need.participantId === passport.participantId);
  const fundingByCostId = new Map(snapshot.fundingAllocations.map((allocation) => [allocation.costItemId, allocation]));
  const stepById = new Map(steps.map((step) => [step.id, step]));
  const costs: UiCostItem[] = snapshot.costItems
    .filter((item) => item.participantId === passport.participantId)
    .map((item) => {
      const funding = fundingByCostId.get(item.id);
      return {
        id: item.id,
        stepId: item.pathwayStepId,
        label: item.pathwayStepId ? stepById.get(item.pathwayStepId)?.title ?? COST_LABELS[item.category] ?? item.category : COST_LABELS[item.category] ?? item.category,
        category: item.category,
        expectedCost: item.expectedCostCents,
        actualCost: item.actualCostCents,
        funderActorId: funding?.funderActorId ?? null,
        mechanism: funding?.mechanism ?? null,
        amountRequested: funding?.amountRequestedCents ?? null,
        amountApproved: funding?.amountApprovedCents ?? null,
        amountPaid: funding?.amountPaidCents ?? null,
        fundingStatus: funding?.status ?? "NOT_STARTED",
        verificationStatus: item.verificationStatus,
      };
    });
  const canonicalOutcome = snapshot.outcomes.find((candidate) => candidate.participantId === passport.participantId);
  const outcome: UiOutcome = canonicalOutcome ? {
    id: canonicalOutcome.id,
    type: canonicalOutcome.type,
    providerActorId: canonicalOutcome.providerActorId,
    startDate: canonicalOutcome.startDate,
    evidence: canonicalOutcome.evidence.join(" · ") || "Aucune preuve enregistrée.",
    finalStatus: canonicalOutcome.finalStatus,
    planBActivated: canonicalOutcome.planBActivated,
    followups: Object.fromEntries(canonicalOutcome.milestones.map((milestone) => [milestone.milestone, milestone.status])) as UiOutcome["followups"],
    followupEvidence: Object.fromEntries(canonicalOutcome.milestones.map((milestone) => [milestone.milestone, milestone.evidence.join(" · ")])) as UiOutcome["followupEvidence"],
    followupCheckedAt: Object.fromEntries(canonicalOutcome.milestones.map((milestone) => [milestone.milestone, milestone.checkedAt])) as UiOutcome["followupCheckedAt"],
  } : emptyOutcome(planA.id);

  return {
    demoLabel: snapshot.meta.label,
    cohort: {
      id: cohort.id,
      name: cohort.name,
      sector: cohort.sector,
      territory: cohort.territory,
      dateLabel: formatDateRange(cohort.startsAt, cohort.endsAt),
      buyer: cohort.buyerActorId ? actorsById.get(cohort.buyerActorId)?.displayName ?? "À vérifier" : "Non renseigné",
      participants: cohort.participantIds.length,
      opportunities: cohort.opportunityIds.length,
      outcomes: snapshot.outcomes.filter((candidate) => cohort.participantIds.includes(candidate.participantId) && ["ACTIVE", "MAINTAINED_J90"].includes(candidate.finalStatus) && candidate.type !== "PATHWAY_CONTINUES" && candidate.type !== "NO_ACTIVE_OUTCOME").length,
      status: cohort.status,
      owner: cohort.owner,
    },
    passport: {
      id: passport.id,
      participantId: passport.participantId,
      firstName: passport.identityPrivate.firstName,
      ageLabel: passport.identityPrivate.age === null ? "Âge non renseigné" : `${passport.identityPrivate.age} ans`,
      sourceLabel: passport.sourceRef.label,
      currentSituation: passport.currentSituation,
      employmentStatus: passport.employmentStatus,
      experienceSummary: passport.experiences.map((experience) => experience.title).join(" · ") || "Expérience non renseignée",
      skills: passport.skillClaims.map((skill) => ({
        id: skill.id,
        label: skill.skillLabel,
        level: skill.level ?? "Niveau non renseigné",
        confidence: skill.confidence,
        evidence: skill.evidence.join(" · ") || "Preuve non renseignée",
      })),
      tools: passport.tools,
      mobility: passport.mobility.hasVehicle === false
        ? `Sans véhicule${passport.mobility.notes ? ` · ${passport.mobility.notes}` : ""}`
        : passport.mobility.notes ?? "Mobilité non renseignée",
      availability: passport.availability.available === true ? `Disponible${passport.availability.scheduleNotes ? ` · ${passport.availability.scheduleNotes}` : ""}` : passport.availability.scheduleNotes ?? "Disponibilité non renseignée",
      planA: passport.planA.label,
      planB: passport.planB.label,
      aspirations: passport.aspirations,
      needs: needs.map((need) => ({ id: need.id, type: need.type, label: need.label, severity: need.severity, blocking: need.blocking, status: need.status, evidence: need.evidence.join(" · ") || "Preuve non renseignée" })),
      consents: passport.consents.map((consent) => ({
        label: consent.purpose,
        granted: consent.grantedAt !== null && consent.revokedAt === null,
        scope: consent.dataScope.join(", "),
      })),
      lastReviewedAt: passport.lastReviewedAt,
    },
    occupation: {
      id: occupation.id,
      label: occupation.label,
      code: occupation.romeCode,
      sector: occupation.sector,
      requiredSkills: occupation.requiredSkills.map((skill) => skill.skillLabel),
      preferredSkills: occupation.preferredSkills.map((skill) => skill.skillLabel),
      constraints: occupation.constraints,
      verificationStatus: occupation.verificationStatus,
    },
    actors,
    services: snapshot.serviceOffers.map((offer) => ({
      id: offer.id,
      actorId: offer.actorId,
      actorName: actorsById.get(offer.actorId)?.displayName ?? "Acteur à vérifier",
      name: offer.name,
      capabilityLabels: offer.capabilitiesProvided,
      skills: offer.skillsDeveloped,
      duration: offer.duration,
      places: offer.places === null ? null : String(offer.places),
      cost: offer.costCents,
      verificationStatus: offer.verificationStatus,
    })),
    opportunities: snapshot.opportunities.map((opportunity) => ({
      id: opportunity.id,
      providerName: actorsById.get(opportunity.providerActorId)?.displayName ?? "Acteur à vérifier",
      type: opportunity.type,
      title: opportunity.title,
      location: opportunity.location ?? "Lieu non renseigné",
      vacancies: opportunity.vacancies === null ? "Non renseigné" : String(opportunity.vacancies),
      status: opportunity.status,
      verificationStatus: opportunity.verificationStatus,
    })),
    steps,
    referrals: snapshot.referrals
      .filter((referral) => referral.participantId === passport.participantId)
      .map((referral) => ({
        id: referral.id,
        stepId: referral.pathwayStepId,
        title: stepById.get(referral.pathwayStepId)?.title ?? "Orientation",
        fromActorId: referral.fromActorId,
        toActorId: referral.toActorId,
        toActorName: actorsById.get(referral.toActorId)?.displayName ?? "Acteur à vérifier",
        reason: referral.reason,
        requestedAction: referral.requestedAction,
        status: referral.status,
        expectedResponseAt: referral.expectedResponseAt,
        sentAt: referral.sentAt,
        acknowledgedAt: referral.acknowledgedAt,
        acceptedAt: referral.acceptedAt,
        completedAt: referral.completedAt,
        lastRelaunchAt: referral.lastRelaunchAt,
        response: referral.response,
        rejectionReason: referral.rejectionReason,
        relaunchCount: referral.relaunchCount,
      })),
    costs,
    outcome,
    pathwayId: planA.id,
    pathwayVersion: planA.version,
    pathwayStatus: planA.status,
    planBActive: planB?.status === "ACTIVE" || canonicalOutcome?.planBActivated === true,
  };
}
