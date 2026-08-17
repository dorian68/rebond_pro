import {
  bmo2026Registry,
  bmoSignalToOccupation,
  evaluateOccupationCoverage,
  evaluateSourceFreshness,
  findActorMatchesForNeed,
  getBmoMarketContextForOccupation,
  OCCUPATION_COVERAGE_LABELS,
  sourceRegistry,
  type OrchestrationSnapshot,
} from "@/features/orchestration";
import type {
  OrchestrationUiModel,
  UiActor,
  UiBmoRegistry,
  UiCostItem,
  UiOccupation,
  UiOccupationCoverage,
  UiOutcome,
  UiReferenceSkill,
  UiSourceRegistry,
  UiStep,
} from "./ui-types";

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

function occupationView(occupation: OrchestrationSnapshot["occupations"][number]): UiOccupation {
  return {
    id: occupation.id,
    label: occupation.label,
    code: occupation.romeCode,
    fapCode: occupation.fapCode,
    fapRelation: occupation.fapMapping?.relation ?? null,
    fapMappingVerificationStatus: occupation.fapMapping?.verificationStatus ?? null,
    sector: occupation.sector,
    requiredSkills: occupation.requiredSkills.map((skill) => skill.skillLabel),
    preferredSkills: occupation.preferredSkills.map((skill) => skill.skillLabel),
    constraints: occupation.constraints,
    verificationStatus: occupation.verificationStatus,
    sourceLabel: occupation.sourceRef.label,
    sourceUrl: occupation.sourceRef.uri ?? null,
    sourceKind: occupation.sourceRef.kind,
  };
}

function occupationCoverageView(
  coverage: ReturnType<typeof evaluateOccupationCoverage>,
): UiOccupationCoverage {
  return {
    level: coverage.level,
    label: OCCUPATION_COVERAGE_LABELS[coverage.level],
    reliableForDraft: coverage.reliableForDraft,
    activatable: coverage.activatable,
    evidence: coverage.evidence,
    blockers: coverage.blockers,
  };
}

function bmoRegistryView(snapshot: OrchestrationSnapshot, assessedAt: string): UiBmoRegistry {
  const region = bmo2026Registry.aggregates.region;
  const sourceUrl = bmo2026Registry.meta.provenance.workbook.datasetPageUrl;
  const occupations = bmo2026Registry.occupations.map((signal) => {
    const canonicalCandidates = snapshot.occupations.filter((occupation) => occupation.fapCode === signal.code);
    const exactVerifiedCandidates = canonicalCandidates.filter((occupation) =>
      occupation.fapMapping?.relation === "EXACT" && occupation.fapMapping.verificationStatus === "VERIFIED",
    );
    const canonicalTarget = exactVerifiedCandidates.length === 1
      ? exactVerifiedCandidates[0]
      : canonicalCandidates.length === 1
        ? canonicalCandidates[0]
        : null;
    // Never take the first of several métier mappings: ambiguity stays explicit.
    const engineeringTarget = canonicalTarget ?? bmoSignalToOccupation(signal);
    const marketContext = getBmoMarketContextForOccupation(engineeringTarget);
    const coverage = evaluateOccupationCoverage({
      occupation: engineeringTarget,
      marketContext,
      actors: snapshot.actors,
      serviceOffers: snapshot.serviceOffers,
      opportunities: snapshot.opportunities,
      pathways: snapshot.pathways,
      outcomes: snapshot.outcomes,
      costItems: snapshot.costItems,
      assessedAt,
    });
    const completeness: UiBmoRegistry["occupations"][number]["completeness"] = signal.projects.complete
      ? "COMPLETE"
      : signal.projects.publishedCellCount === 0 && signal.projects.suppressedCellCount > 0
        ? "ONLY_SUPPRESSED"
        : signal.projects.publishedCellCount === 0
          ? "NO_PUBLISHED_VALUE"
          : "LOWER_BOUND";
    const reliabilityLabel = completeness === "COMPLETE"
      ? "Toutes les lignes publiées sont numériques."
      : completeness === "LOWER_BOUND"
        ? `Borne basse : ≥ ${signal.projects.knownSubtotal} projet(s) connu(s) + ${signal.projects.suppressedCellCount} cellule(s) masquée(s).`
        : completeness === "ONLY_SUPPRESSED"
          ? "Valeurs masquées par la source : ce n’est pas zéro."
          : "Aucune valeur numérique publiée : ne pas conclure à zéro.";
    const records = new Map(
      bmo2026Registry.records
        .filter((record) => record.occupation.code === signal.code)
        .map((record) => [record.basin.code, record]),
    );
    return {
      code: signal.code,
      label: signal.label,
      familyCode: signal.familyCode,
      familyLabel: signal.familyLabel,
      projectsKnown: signal.projects.knownSubtotal,
      difficultProjectsKnown: signal.difficultProjects.knownSubtotal,
      seasonalProjectsKnown: signal.seasonalProjects.knownSubtotal,
      projectsSuppressedCount: signal.projects.suppressedCellCount,
      difficultSuppressedCount: signal.difficultProjects.suppressedCellCount,
      seasonalSuppressedCount: signal.seasonalProjects.suppressedCellCount,
      publishedBasinCount: signal.observedBasinCount,
      completeness,
      reliabilityLabel,
      coverage: occupationCoverageView(coverage),
      basins: bmo2026Registry.basins.map((basin) => {
        const record = records.get(basin.code);
        return {
          code: basin.code,
          label: basin.label.replace(/^BASSIN\s+/i, ""),
          hasRecord: Boolean(record),
          projects: record?.projects.value ?? null,
          projectsSuppressed: record?.projects.status === "suppressed",
          difficultProjects: record?.difficultProjects.value ?? null,
          difficultProjectsSuppressed: record?.difficultProjects.status === "suppressed",
          seasonalProjects: record?.seasonalProjects.value ?? null,
          seasonalProjectsSuppressed: record?.seasonalProjects.status === "suppressed",
        };
      }),
    };
  });
  return {
    surveyYear: bmo2026Registry.meta.surveyYear,
    territory: bmo2026Registry.meta.territory.regionLabel,
    officialTotalProjects: region.officialPdfReferences.headline.projects,
    knownProjectsSubtotal: region.projects.knownSubtotal,
    occupationCount: bmo2026Registry.meta.counts.occupations,
    recordCount: bmo2026Registry.meta.counts.records,
    basinCount: bmo2026Registry.meta.counts.basins,
    suppressedProjectCells: region.projects.suppressedCellCount,
    difficultSharePercent: region.officialPdfReferences.headline.difficultSharePercent,
    seasonalSharePercent: region.officialPdfReferences.headline.seasonalSharePercent,
    sourceUrl,
    sourceLabel: "France Travail · BMO 2026 · open data Guadeloupe",
    warning: "Les 13 205 projets numériques connus forment une borne basse face aux 13 588 projets publiés. Les valeurs masquées restent inconnues. Le PDF publie 46 % difficiles / 28 % saisonniers en page 6, mais 47 % / 25 % en page 22 ; les deux versions sont conservées sans réconciliation silencieuse.",
    occupations,
  };
}

function referenceSkillsView(snapshot: OrchestrationSnapshot): UiReferenceSkill[] {
  const claims = snapshot.passports.flatMap((passport) => passport.skillClaims);
  const skills = new Map<string, {
    id: string;
    label: string;
    occupations: Set<string>;
    sources: Set<string>;
    statuses: Set<"VERIFIED" | "NEEDS_VERIFICATION">;
  }>();

  for (const occupation of snapshot.occupations) {
    for (const requirement of [...occupation.requiredSkills, ...occupation.preferredSkills]) {
      const key = requirement.skillId ?? requirement.skillLabel.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr-FR");
      const current = skills.get(key) ?? {
        id: requirement.skillId ?? `skill-${key.replace(/[^a-z0-9]+/g, "-")}`,
        label: requirement.skillLabel,
        occupations: new Set<string>(),
        sources: new Set<string>(),
        statuses: new Set<"VERIFIED" | "NEEDS_VERIFICATION">(),
      };
      current.occupations.add(occupation.label);
      current.sources.add(requirement.sourceRef.label);
      current.statuses.add(requirement.verificationStatus);
      skills.set(key, current);
    }
  }

  for (const claim of claims) {
    const key = claim.skillId ?? claim.skillLabel.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr-FR");
    if (!skills.has(key)) {
      skills.set(key, {
        id: claim.skillId ?? `skill-${key.replace(/[^a-z0-9]+/g, "-")}`,
        label: claim.skillLabel,
        occupations: new Set<string>(),
        sources: new Set([claim.sourceRef.label]),
        statuses: new Set(["NEEDS_VERIFICATION"]),
      });
    }
  }

  return Array.from(skills.values()).map((skill) => {
    const claim = claims.find((candidate) => candidate.skillId === skill.id || candidate.skillLabel.toLocaleLowerCase("fr-FR") === skill.label.toLocaleLowerCase("fr-FR"));
    return {
      id: skill.id,
      label: skill.label,
      usedByOccupations: Array.from(skill.occupations),
      participantConfidence: claim?.confidence ?? null,
      sourceLabels: Array.from(skill.sources),
      verificationStatus: skill.statuses.size === 1 && skill.statuses.has("VERIFIED") ? "VERIFIED" : "NEEDS_VERIFICATION",
    };
  });
}

function sourceRegistryView(snapshot: OrchestrationSnapshot, now = new Date().toISOString()): UiSourceRegistry {
  const actorsById = new Map(snapshot.actors.map((actor) => [actor.id, actor.displayName]));
  const sources = sourceRegistry.sources.map((source) => {
    const freshness = evaluateSourceFreshness(source, now);
    return {
      ...source,
      freshnessStatus: freshness.status,
      reviewDueAt: freshness.reviewDueAt,
      caveats: [...source.caveats],
    };
  });
  const checkedDates = sources.map((source) => source.checkedAt).filter((value) => !Number.isNaN(Date.parse(value)));
  return {
    sources,
    marketSignals: sourceRegistry.marketSignals.map((signal) => ({ ...signal })),
    fundingMechanisms: sourceRegistry.fundingMechanisms.map((mechanism) => ({
      ...mechanism,
      eligiblePublic: [...mechanism.eligiblePublic],
      conditions: [...mechanism.conditions],
      coveredCosts: [...mechanism.coveredCosts],
      funderName: mechanism.funderActorId ? actorsById.get(mechanism.funderActorId) ?? null : null,
    })),
    budgetScenarios: sourceRegistry.budgetScenarios.map((scenario) => ({ ...scenario })),
    evidenceRequirements: sourceRegistry.evidenceRequirements.map((requirement) => ({
      ...requirement,
      requiredEvidence: [...requirement.requiredEvidence],
    })),
    missingSources: [...sourceRegistry.meta.missingSources],
    latestCheckedAt: checkedDates.sort((left, right) => Date.parse(right) - Date.parse(left))[0] ?? null,
  };
}

function actorView(actor: OrchestrationSnapshot["actors"][number], snapshot: OrchestrationSnapshot, usedActorIds: Set<string>): UiActor {
  const registryActor = sourceRegistry.officialActors.find((candidate) => candidate.id === actor.id);
  const offers = snapshot.serviceOffers.filter((offer) => offer.actorId === actor.id);
  const opportunities = snapshot.opportunities.filter((opportunity) => opportunity.providerActorId === actor.id);
  const occupationsById = new Map(snapshot.occupations.map((occupation) => [occupation.id, occupation]));
  const sectors = Array.from(new Set(opportunities.flatMap((opportunity) => {
    const occupation = opportunity.occupationId ? occupationsById.get(opportunity.occupationId) : null;
    return occupation ? [occupation.sector] : [];
  })));
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
    pathwayRoles: registryActor?.pathwayRoles ?? [],
    requiredInputs: actor.requiredInputs,
    producedOutputs: actor.producedOutputs,
    mobilizationNotes: registryActor?.mobilizationNotes ?? [],
    capabilityClaims: actor.capabilities.map((entry) => ({
      capability: entry.capability,
      verificationStatus: entry.verificationStatus,
      sourceLabel: entry.sourceRef.label,
      sourceUrl: entry.sourceRef.uri ?? null,
      lastVerifiedAt: entry.lastVerifiedAt,
      notes: entry.notes,
    })),
    sectors,
    services: offers.map((offer) => offer.name),
    opportunities: opportunities.map((opportunity) => opportunity.title),
    contacts,
    sourceLabel: actor.sourceRef.label,
    sourceLocation: sourceLocation(actor.sourceRef),
    sourceUrl: actor.sourceRef.uri ?? null,
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
  const data = snapshot;
  const sourceEvaluationNow = new Date().toISOString();
  const sourceFreshnessById = Object.fromEntries(
    sourceRegistry.sources.map((source) => [source.id, evaluateSourceFreshness(source, sourceEvaluationNow).status]),
  );
  const passport = data.passports[0];
  const cohort = data.cohorts[0];
  const occupation = data.occupations.find((candidate) => candidate.id === passport.planA.occupationId) ?? data.occupations[0];
  const occupationCoverage = evaluateOccupationCoverage({
    occupation,
    marketContext: getBmoMarketContextForOccupation(occupation),
    actors: data.actors,
    serviceOffers: data.serviceOffers,
    opportunities: data.opportunities,
    pathways: data.pathways,
    outcomes: data.outcomes,
    costItems: data.costItems,
    assessedAt: sourceEvaluationNow,
  });
  const planA = data.pathways.find((pathway) => pathway.participantId === passport.participantId && pathway.planType === "A") ?? data.pathways[0];
  const planB = data.pathways.find((pathway) => pathway.participantId === passport.participantId && pathway.planType === "B");
  const allCanonicalSteps = [...planA.steps, ...(planB?.steps ?? [])];
  const actorsById = new Map(data.actors.map((actor) => [actor.id, actor]));
  const usedActorIds = new Set(allCanonicalSteps.flatMap((step) => step.assignedActorId ? [step.assignedActorId] : []));
  const actors = data.actors.map((actor) => actorView(actor, data, usedActorIds));
  const occupations = data.occupations.map(occupationView);
  const steps = [
    ...planA.steps.map((step, index) => stepView(step, "A", index, actorsById)),
    ...(planB?.steps.map((step, index) => stepView(step, "B", index, actorsById)) ?? []),
  ];
  const needs = data.needs.filter((need) => need.participantId === passport.participantId);
  const needSolutions = needs.map((need) => ({
    needId: need.id,
    needLabel: need.label,
    requiredCapability: need.requiredCapability,
    candidates: findActorMatchesForNeed({
      need,
      actors: data.actors,
      serviceOffers: data.serviceOffers,
      territory: cohort.territory,
      verifiedOnly: true,
      now: sourceEvaluationNow,
      sourceFreshnessById,
    }).slice(0, 3).map((match) => ({
      actorId: match.actor.id,
      actorName: match.actor.displayName,
      serviceId: match.serviceOffers[0]?.id ?? null,
      serviceName: match.serviceOffers[0]?.name ?? null,
      readiness: match.level,
      score: match.score,
      reasons: match.reasons,
      unknowns: match.unknowns,
    })),
  }));
  const fundingByCostId = new Map(data.fundingAllocations.map((allocation) => [allocation.costItemId, allocation]));
  const stepById = new Map(steps.map((step) => [step.id, step]));
  const costs: UiCostItem[] = data.costItems
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
  const canonicalOutcome = data.outcomes.find((candidate) => candidate.participantId === passport.participantId);
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
    demoLabel: data.meta.label,
    cohort: {
      id: cohort.id,
      name: cohort.name,
      sector: cohort.sector,
      territory: cohort.territory,
      dateLabel: formatDateRange(cohort.startsAt, cohort.endsAt),
      buyer: cohort.buyerActorId ? actorsById.get(cohort.buyerActorId)?.displayName ?? "À vérifier" : "Non renseigné",
      participants: cohort.participantIds.length,
      opportunities: cohort.opportunityIds.length,
      outcomes: data.outcomes.filter((candidate) => cohort.participantIds.includes(candidate.participantId) && ["ACTIVE", "MAINTAINED_J90"].includes(candidate.finalStatus) && candidate.type !== "PATHWAY_CONTINUES" && candidate.type !== "NO_ACTIVE_OUTCOME").length,
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
    occupation: occupationView(occupation),
    occupations,
    occupationCoverage: occupationCoverageView(occupationCoverage),
    bmoRegistry: bmoRegistryView(data, sourceEvaluationNow),
    referenceSkills: referenceSkillsView(data),
    actors,
    services: data.serviceOffers.map((offer) => {
      const actor = actorsById.get(offer.actorId);
      return {
        id: offer.id,
        actorId: offer.actorId,
        actorName: actor?.displayName ?? "Acteur à vérifier",
        name: offer.name,
        capabilityLabels: offer.capabilitiesProvided,
        needsResolved: offer.needsResolved,
        skills: offer.skillsDeveloped,
        territory: offer.territory,
        eligibilityRules: offer.eligibilityRules,
        prerequisites: offer.prerequisites,
        requiredDocuments: offer.requiredDocuments,
        expectedOutput: offer.expectedOutput,
        mobilizationStatus: serviceMobilizationStatus(offer, actor),
        duration: offer.duration,
        places: offer.places === null ? null : String(offer.places),
        cost: offer.costCents,
        verificationStatus: offer.verificationStatus,
        sourceLabel: offer.sourceRef.label,
        sourceUrl: offer.sourceRef.uri ?? null,
        caveats: [
          ...(offer.verificationStatus !== "VERIFIED" ? ["Offre à vérifier avant mobilisation."] : []),
          ...(offer.dates.length === 0 ? ["Dates non renseignées."] : []),
          ...(offer.places === null ? ["Places non renseignées."] : []),
          ...(offer.costCents === null ? ["Coût non renseigné."] : []),
          ...(offer.eligibilityRules.length > 0 || offer.prerequisites.length > 0 ? ["Éligibilité et prérequis à instruire."] : []),
        ],
      };
    }),
    needSolutions,
    opportunities: data.opportunities.map((opportunity) => ({
      id: opportunity.id,
      providerName: actorsById.get(opportunity.providerActorId)?.displayName ?? "Acteur à vérifier",
      type: opportunity.type,
      title: opportunity.title,
      location: opportunity.location ?? "Lieu non renseigné",
      vacancies: opportunity.vacancies === null ? "Non renseigné" : String(opportunity.vacancies),
      status: opportunity.status,
      verificationStatus: opportunity.verificationStatus,
      sourceLabel: opportunity.sourceRef.label,
      sourceUrl: opportunity.sourceRef.uri ?? null,
      caveats: [
        ...(opportunity.verificationStatus !== "VERIFIED" ? ["Opportunité à vérifier avant mobilisation."] : []),
        ...(opportunity.startDate === null ? ["Date de début non renseignée."] : []),
        ...(opportunity.vacancies === null ? ["Nombre de places non renseigné."] : []),
        ...(opportunity.responseDeadline === null ? ["Échéance de réponse non renseignée."] : []),
      ],
      synthetic: opportunity.demo,
    })),
    steps,
    referrals: data.referrals
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
    sourceRegistry: sourceRegistryView(data, sourceEvaluationNow),
  };
}

function serviceMobilizationStatus(
  offer: OrchestrationSnapshot["serviceOffers"][number],
  actor: OrchestrationSnapshot["actors"][number] | undefined,
): "ACTIVATABLE" | "QUALIFIED_WITH_CHECKS" | "UNAVAILABLE" | "TO_VERIFY" {
  if (offer.verificationStatus !== "VERIFIED" || actor?.verificationStatus !== "VERIFIED") return "TO_VERIFY";
  if (offer.places === 0 || actor.currentCapacity.status === "UNAVAILABLE") return "UNAVAILABLE";
  if (offer.dates.length > 0 && offer.dates.every((date) => Date.parse(date) < Date.now())) return "UNAVAILABLE";
  const availabilityConfirmed = actor.currentCapacity.status === "AVAILABLE"
    && (actor.currentCapacity.places === null || actor.currentCapacity.places > 0)
    && offer.places !== null
    && offer.places > 0;
  return availabilityConfirmed ? "ACTIVATABLE" : "QUALIFIED_WITH_CHECKS";
}
