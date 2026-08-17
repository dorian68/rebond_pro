import assert from "node:assert/strict";

import {
  OCCUPATION_COVERAGE_LEVELS,
  OCCUPATION_COVERAGE_RANK,
  bmo2026Registry,
  bmoOccupationSignals,
  bmoSignalToOccupation,
  createSarahDemoSnapshot,
  demoOccupations,
  demoOpportunity,
  evaluateOccupationCoverage,
  generatePathwayDraft,
  getBmoMarketContextForOccupation,
  getPathwayApprovalIssues,
  pathwaySchema,
  sarahDemoCostItems,
  sarahDemoOutcome,
  sarahPlanA,
  type CostItem,
  type Occupation,
  type Opportunity,
  type Outcome,
  type Pathway,
} from "../src/features/orchestration";
import { createOrchestrationUiModel } from "../src/app/admin/orchestration/orchestration-adapter";

const suite = "orchestration-bmo";
const at = "2026-08-15T10:00:00.000Z";

function report(step: string, status: "pass" | "fail", details: string) {
  console.log(JSON.stringify({ suite, step, status, details }));
}

async function runStep(step: string, test: () => void | Promise<void>) {
  try {
    await test();
    report(step, "pass", "Invariant vérifié.");
  } catch (error) {
    report(step, "fail", error instanceof Error ? error.message : "Erreur inconnue.");
    throw error;
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  assert.equal(typeof value, "object");
  assert.notEqual(value, null);
  assert.equal(Array.isArray(value), false);
  return value as Record<string, unknown>;
}

async function main() {
  const snapshot = createSarahDemoSnapshot();
  const bmoTargets = bmoOccupationSignals.map(bmoSignalToOccupation);
  const bmoTargetIds = new Set(bmoTargets.map((occupation) => occupation.id));
  const planAMarketContext = getBmoMarketContextForOccupation(demoOccupations[0]);

  await runStep("01_exhaustive_guadeloupe_import", () => {
    assert.equal(bmo2026Registry.meta.datasetId, "bmo-2026-guadeloupe");
    assert.equal(bmo2026Registry.meta.surveyYear, 2026);
    assert.equal(bmo2026Registry.meta.territory.regionLabel, "Guadeloupe");
    assert.equal(bmo2026Registry.meta.counts.records, 508);
    assert.equal(bmo2026Registry.records.length, 508);
    assert.equal(new Set(bmo2026Registry.records.map((record) => record.id)).size, 508);
    assert.equal(bmo2026Registry.meta.counts.occupations, 180);
    assert.equal(bmoOccupationSignals.length, 180);
    assert.equal(new Set(bmoOccupationSignals.map((signal) => signal.code)).size, 180);
    assert.equal(bmo2026Registry.meta.counts.basins, 5);
    assert.equal(bmo2026Registry.basins.length, 5);
    assert.equal(bmo2026Registry.meta.quality.structuralChecksPassed, true);
    assert.equal(bmo2026Registry.meta.quality.sourceHashesVerified, true);
    const gardeners = bmoOccupationSignals.find((signal) => signal.code === "A1X41");
    assert.ok(gardeners);
    assert.equal(gardeners.observedBasinCount, 4);
    assert.equal(gardeners.projects.complete, false, "Un bassin absent doit conserver l’agrégat incomplet.");
    assert.equal(gardeners.projects.value, null, "Un bassin absent ne doit jamais être imputé à zéro.");
  });

  await runStep("02_suppressed_values_remain_null", () => {
    const measures = bmo2026Registry.records.flatMap((record) => [
      record.projects,
      record.difficultProjects,
      record.seasonalProjects,
    ]);
    const suppressed = measures.filter((measure) => measure.status === "suppressed");
    const published = measures.filter((measure) => measure.status === "published");

    assert.ok(suppressed.length > 0);
    assert.equal(suppressed.every((measure) => measure.raw === "*" && measure.value === null), true);
    assert.equal(published.every((measure) => measure.raw !== "*" && typeof measure.value === "number"), true);
    assert.equal(bmo2026Registry.aggregates.region.projects.suppressedCellCount, 128);
    assert.equal(bmo2026Registry.aggregates.region.difficultProjects.suppressedCellCount, 246);
    assert.equal(bmo2026Registry.aggregates.region.seasonalProjects.suppressedCellCount, 374);
    assert.equal(bmo2026Registry.aggregates.region.projects.knownSubtotal, 13_205);
    assert.equal(bmo2026Registry.aggregates.region.projects.value, null);
    assert.equal(bmo2026Registry.aggregates.region.officialPdfReferences.headline.projects, 13_588);
    assert.equal(bmo2026Registry.aggregates.region.reconciliation.projectsSuppressedRemainder, 383);
    assert.equal(bmo2026Registry.meta.quality.suppressedValuesImputed, false);
    assert.equal(
      bmoOccupationSignals.filter((signal) => signal.projects.publishedCellCount === 0 && signal.projects.suppressedCellCount > 0).length,
      25,
      "Les métiers entièrement masqués doivent rester non calculables.",
    );
  });

  await runStep("03_safe_generation_of_180_engineering_targets", () => {
    assert.equal(bmoTargets.length, 180);
    assert.equal(new Set(bmoTargets.map((occupation) => occupation.id)).size, 180);
    for (const [index, target] of bmoTargets.entries()) {
      assert.equal(target.fapCode, bmoOccupationSignals[index].code);
      assert.equal(target.romeCode, null, `${target.fapCode} ne doit pas recevoir un ROME automatique.`);
      assert.deepEqual(target.requiredSkills, []);
      assert.deepEqual(target.prerequisites, []);
      assert.deepEqual(target.constraints, []);
      assert.equal(target.verificationStatus, "NEEDS_VERIFICATION");
    }
  });

  await runStep("04_bmo_never_becomes_an_opportunity", () => {
    const opportunityOnlyKeys = [
      "providerActorId",
      "vacancies",
      "contractType",
      "applicationProcess",
      "responseDeadline",
    ];
    for (const value of [...bmo2026Registry.records, ...bmoOccupationSignals, ...bmoTargets]) {
      const record = asRecord(value);
      assert.equal(
        opportunityOnlyKeys.some((key) => Object.hasOwn(record, key)),
        false,
        "Une donnée BMO a reçu la forme d'une Opportunity.",
      );
    }
    assert.equal(snapshot.opportunities.some((opportunity) => opportunity.occupationId !== null && bmoTargetIds.has(opportunity.occupationId)), false);
    assert.ok(planAMarketContext);
    assert.match(planAMarketContext.warning, /ni une offre, ni une place disponible, ni une opportunité activable/i);
  });

  const l0Occupation = bmoTargets.find((occupation) => occupation.fapCode === "S2X60")!;
  const l0MarketContext = getBmoMarketContextForOccupation(l0Occupation);
  assert.ok(l0MarketContext);
  const l1Occupation: Occupation = {
    ...l0Occupation,
    id: "smoke-occupation-l1",
    romeCode: "G1703",
    fapMapping: {
      relation: "BROADER",
      verificationStatus: "NEEDS_VERIFICATION",
      sourceRef: l0Occupation.sourceRef,
      notes: "Rapprochement explicite de smoke à valider humainement.",
    },
  };
  const modeledOccupation: Occupation = {
    ...demoOccupations[0],
    id: "smoke-occupation-modeled",
    verificationStatus: "VERIFIED",
    fapMapping: {
      ...demoOccupations[0].fapMapping!,
      verificationStatus: "VERIFIED",
      notes: "Rapprochement validé uniquement pour le scénario technique de couverture.",
    },
    requiredSkills: demoOccupations[0].requiredSkills.map((requirement) => ({
      ...requirement,
      verificationStatus: "VERIFIED",
    })),
  };
  const verifiedActor = snapshot.actors.find((actor) => actor.id === "actor-cci-iles-guadeloupe");
  const verifiedService = snapshot.serviceOffers.find((offer) => offer.id === "service-cci-anglais-collectif");
  assert.ok(verifiedActor);
  assert.ok(verifiedService);
  const availableVerifiedActor = {
    ...verifiedActor,
    currentCapacity: { status: "AVAILABLE" as const, places: 1, asOf: at },
  };
  const liveOpportunity: Opportunity = {
    ...demoOpportunity,
    id: "smoke-opportunity-verified",
    providerActorId: availableVerifiedActor.id,
    occupationId: modeledOccupation.id,
    vacancies: 1,
    status: "OPEN",
    verificationStatus: "VERIFIED",
  };
  const provenPathway: Pathway = {
    ...sarahPlanA,
    id: "smoke-pathway-proven",
    targetState: { occupationId: modeledOccupation.id, label: modeledOccupation.label },
    occupationCoverage: evaluateOccupationCoverage({
      occupation: modeledOccupation,
      marketContext: planAMarketContext,
      assessedAt: at,
    }),
    marketContext: planAMarketContext,
  };
  const provenOutcome: Outcome = {
    ...sarahDemoOutcome,
    id: "smoke-outcome-proven",
    pathwayId: provenPathway.id,
    evidence: ["Preuve synthétique du maintien à J+90 pour le smoke test."],
    finalStatus: "MAINTAINED_J90",
  };
  const provenCost: CostItem = {
    ...sarahDemoCostItems[0],
    id: "smoke-cost-proven",
    pathwayId: provenPathway.id,
    actualCostCents: 12_345,
    verificationStatus: "VERIFIED",
  };

  const coverage = {
    L0_SIGNAL: evaluateOccupationCoverage({
      occupation: l0Occupation,
      marketContext: l0MarketContext,
      assessedAt: at,
    }),
    L1_MAPPED: evaluateOccupationCoverage({
      occupation: l1Occupation,
      marketContext: l0MarketContext,
      assessedAt: at,
    }),
    L2_MODELED: evaluateOccupationCoverage({
      occupation: modeledOccupation,
      marketContext: planAMarketContext,
      assessedAt: at,
    }),
    L3_ECOSYSTEM: evaluateOccupationCoverage({
      occupation: modeledOccupation,
      marketContext: planAMarketContext,
      actors: [availableVerifiedActor],
      serviceOffers: [verifiedService],
      assessedAt: at,
    }),
    L4_ACTIVATABLE: evaluateOccupationCoverage({
      occupation: modeledOccupation,
      marketContext: planAMarketContext,
      actors: [availableVerifiedActor],
      serviceOffers: [verifiedService],
      opportunities: [liveOpportunity],
      assessedAt: at,
    }),
    L5_PROVEN: evaluateOccupationCoverage({
      occupation: modeledOccupation,
      marketContext: planAMarketContext,
      actors: [availableVerifiedActor],
      serviceOffers: [verifiedService],
      opportunities: [liveOpportunity],
      pathways: [provenPathway],
      outcomes: [provenOutcome],
      costItems: [provenCost],
      assessedAt: at,
    }),
  } as const;

  await runStep("05_occupation_coverage_l0_to_l5", () => {
    assert.deepEqual(OCCUPATION_COVERAGE_LEVELS, [
      "L0_SIGNAL",
      "L1_MAPPED",
      "L2_MODELED",
      "L3_ECOSYSTEM",
      "L4_ACTIVATABLE",
      "L5_PROVEN",
    ]);
    for (const [rank, level] of OCCUPATION_COVERAGE_LEVELS.entries()) {
      assert.equal(OCCUPATION_COVERAGE_RANK[level], rank);
      assert.equal(coverage[level].level, level);
    }
    assert.equal(coverage.L0_SIGNAL.reliableForDraft, false);
    assert.equal(coverage.L1_MAPPED.reliableForDraft, false);
    assert.equal(coverage.L2_MODELED.reliableForDraft, true);
    assert.equal(coverage.L3_ECOSYSTEM.activatable, false);
    assert.equal(coverage.L4_ACTIVATABLE.activatable, true);
    assert.equal(coverage.L5_PROVEN.activatable, true);
  });

  await runStep("06_reliability_and_l3_approval_gates", () => {
    const l1Draft = generatePathwayDraft({
      passport: snapshot.passports[0],
      planAOccupation: l1Occupation,
      planBOccupation: demoOccupations[1],
      cohortId: snapshot.cohorts[0].id,
      actors: [],
      serviceOffers: [],
      opportunities: [],
      territory: "Guadeloupe",
      verifiedSolutionsOnly: true,
      now: at,
      planAMarketContext: l0MarketContext,
    });
    assert.equal(l1Draft.coverageAssessments.A.level, "L1_MAPPED");
    assert.equal(l1Draft.coverageAssessments.A.reliableForDraft, false);
    assert.ok(l1Draft.planA.steps.some((step) => step.title === "Compléter l’ingénierie du métier"));
    assert.ok(
      getPathwayApprovalIssues(l1Draft.planA).some((issue) => issue.code === "INSUFFICIENT_OCCUPATION_COVERAGE"),
    );

    const modeledDraft = generatePathwayDraft({
      passport: snapshot.passports[0],
      planAOccupation: modeledOccupation,
      planBOccupation: demoOccupations[1],
      cohortId: snapshot.cohorts[0].id,
      actors: [],
      serviceOffers: [],
      opportunities: [],
      territory: "Guadeloupe",
      verifiedSolutionsOnly: true,
      now: at,
      planAMarketContext,
    });
    const l2Pathway: Pathway = modeledDraft.planA;
    const l3Pathway: Pathway = pathwaySchema.parse({ ...modeledDraft.planA, occupationCoverage: coverage.L3_ECOSYSTEM });
    assert.equal(coverage.L2_MODELED.reliableForDraft, true);
    assert.ok(
      getPathwayApprovalIssues(l2Pathway).some((issue) => issue.code === "INSUFFICIENT_OCCUPATION_COVERAGE"),
      "L2 rend le brouillon fiable mais ne permet pas encore sa validation opérationnelle.",
    );
    assert.equal(
      getPathwayApprovalIssues(l3Pathway).some((issue) => issue.code === "INSUFFICIENT_OCCUPATION_COVERAGE"),
      false,
      "Le gate métier doit être levé à partir de L3.",
    );

    assert.throws(
      () => pathwaySchema.parse({ ...modeledDraft.planA, occupationCoverage: undefined }),
      /occupationCoverage/,
      "Une couverture absente doit faire échouer le parcours fermé.",
    );
    assert.throws(
      () => pathwaySchema.parse({ ...modeledDraft.planA, occupationCoverage: coverage.L1_MAPPED }),
      /exactement le métier cible/,
      "La couverture d’un autre métier ne doit jamais lever le gate.",
    );
    assert.equal(
      evaluateOccupationCoverage({
        occupation: { ...modeledOccupation, fapMapping: { ...modeledOccupation.fapMapping!, verificationStatus: "NEEDS_VERIFICATION" } },
        marketContext: planAMarketContext,
        actors: [availableVerifiedActor],
        serviceOffers: [verifiedService],
        opportunities: [liveOpportunity],
        assessedAt: at,
      }).level,
      "L1_MAPPED",
      "Un mapping FAP/ROME non vérifié doit rester sous L2 même si le reste de l’écosystème est documenté.",
    );
  });

  await runStep("07_bmo_context_is_injected_into_drafts", () => {
    assert.ok(planAMarketContext);
    assert.equal(planAMarketContext.fapCode, "S2X60");
    assert.equal(planAMarketContext.projectsKnown, 529);
    assert.equal(planAMarketContext.hasSuppressedProjects, true);
    assert.equal(planAMarketContext.basinCount, 5);

    const draft = generatePathwayDraft({
      passport: snapshot.passports[0],
      planAOccupation: demoOccupations[0],
      planBOccupation: demoOccupations[1],
      cohortId: snapshot.cohorts[0].id,
      actors: snapshot.actors,
      serviceOffers: snapshot.serviceOffers,
      opportunities: snapshot.opportunities,
      territory: "Guadeloupe",
      verifiedSolutionsOnly: true,
      now: at,
      planAMarketContext,
    });
    assert.equal(draft.marketContexts.A?.fapCode, "S2X60");
    assert.equal(draft.planA.marketContext?.projectsKnown, 529);
    assert.ok(draft.coverageAssessments.A.evidence.some((item) => /Signal BMO 2026/i.test(item)));
    const engineeringStep = draft.planA.steps.find((step) => step.title === "Compléter l’ingénierie du métier");
    assert.ok(engineeringStep);
    assert.match(engineeringStep.sourceReason, /BMO 2026/);
    assert.match(engineeringStep.sourceReason, /ni .*opportunité réelle/i);
    assert.ok(engineeringStep.suggestion?.dataUsed.some((item) => item.includes("BMO 2026")));
  });

  await runStep("08_every_bmo_occupation_can_generate_a_safe_engineering_draft", () => {
    for (const target of bmoTargets) {
      const draft = generatePathwayDraft({
        passport: snapshot.passports[0],
        planAOccupation: target,
        planBOccupation: target,
        cohortId: snapshot.cohorts[0].id,
        actors: snapshot.actors,
        serviceOffers: snapshot.serviceOffers,
        opportunities: snapshot.opportunities,
        territory: "Guadeloupe",
        verifiedSolutionsOnly: true,
        now: at,
      });
      assert.equal(draft.planA.targetState.occupationId, target.id);
      assert.equal(draft.marketContexts.A?.fapCode, target.fapCode);
      assert.equal(draft.coverageAssessments.A.level, "L0_SIGNAL");
      assert.equal(draft.coverageAssessments.A.reliableForDraft, false);
      assert.ok(draft.planA.steps.some((step) => step.title === "Compléter l’ingénierie du métier"));
      assert.ok(getPathwayApprovalIssues(draft.planA).some((issue) => issue.code === "INSUFFICIENT_OCCUPATION_COVERAGE"));
      assert.equal(draft.planA.steps.some((step) => step.opportunityId?.startsWith("bmo-2026-")), false);
    }
  });

  await runStep("09_admin_read_model_exposes_the_complete_catalog", () => {
    const model = createOrchestrationUiModel(snapshot);
    assert.equal(model.bmoRegistry.occupations.length, 180);
    assert.equal(model.bmoRegistry.recordCount, 508);
    assert.equal(model.bmoRegistry.basinCount, 5);
    const reception = model.bmoRegistry.occupations.find((occupation) => occupation.code === "S2X60");
    assert.ok(reception);
    assert.equal(reception.projectsKnown, 529);
    assert.equal(reception.completeness, "LOWER_BOUND");
    assert.equal(reception.coverage.level, "L1_MAPPED");
    assert.equal(model.occupation.fapRelation, "BROADER");
    assert.equal(model.occupationCoverage.level, "L1_MAPPED");
  });
}

main().catch(() => {
  process.exitCode = 1;
});
