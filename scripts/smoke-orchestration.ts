import assert from "node:assert/strict";

import {
  activatePlanBPaths,
  actorSchema,
  calculateCostSummary,
  calculateFundingSummary,
  calculateSkillGaps,
  createInMemoryOrchestrationRepository,
  createOutcomeMilestones,
  createSarahDemoSnapshot,
  demoOccupations,
  findActorsByCapability,
  generatePathwayDraft,
  recordOutcomeMilestone,
  skillGapToNeed,
  transitionReferral,
  type Actor,
  type CostItem,
  type FundingAllocation,
  type Outcome,
  type Referral,
  type SourceRef,
} from "../src/features/orchestration";

const suite = "orchestration";
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

const source: SourceRef = {
  kind: "SYNTHETIC_DEMO",
  label: "Fixture jetable smoke Orchestration",
  file: null,
  sheet: null,
  page: null,
  line: null,
  section: "scripts/smoke-orchestration.ts",
  recordId: null,
  uri: null,
};

function actor(id: string, verificationStatus: Actor["verificationStatus"]): Actor {
  return actorSchema.parse({
    id,
    workspaceId: "smoke-workspace",
    existingOrganizationId: null,
    legalName: null,
    displayName: id,
    actorTypes: [],
    territory: ["Guadeloupe"],
    employmentBasin: [],
    addresses: [],
    contacts: [],
    capabilities: [
      {
        capability: "SUPPORT_MOBILITY",
        verificationStatus,
        sourceRef: source,
        lastVerifiedAt: verificationStatus === "VERIFIED" ? at : null,
        notes: null,
      },
    ],
    eligibilityRules: [],
    requiredInputs: [],
    producedOutputs: [],
    responseSlaHours: null,
    currentCapacity: { status: "UNKNOWN", places: null, asOf: null },
    costModel: null,
    dataSharingPolicy: null,
    sourceRef: source,
    verificationStatus,
    lastVerifiedAt: verificationStatus === "VERIFIED" ? at : null,
    verificationOwner: verificationStatus === "VERIFIED" ? "smoke" : null,
    active: true,
    demo: true,
  });
}

function cost(id: string, expectedCostCents: number | null, actualCostCents: number | null): CostItem {
  return {
    id,
    participantId: "participant-smoke",
    pathwayId: "pathway-smoke",
    pathwayStepId: null,
    category: "TRAINING",
    unit: null,
    quantity: null,
    unitCostCents: null,
    expectedCostCents,
    actualCostCents,
    costOwnerActorId: null,
    source,
    verificationStatus: "VERIFIED",
  };
}

function funding(id: string, costItemId: string, approved: number | null, paid: number | null): FundingAllocation {
  return {
    id,
    costItemId,
    funderActorId: "actor-funder-smoke",
    mechanism: "Mécanisme smoke explicite",
    amountRequestedCents: approved,
    amountApprovedCents: approved,
    amountPaidCents: paid,
    status: paid === approved && paid !== null ? "PAID" : "APPROVED",
    applicationDate: at,
    decisionDate: at,
    evidence: ["Preuve smoke"],
  };
}

async function main() {
  const snapshot = createSarahDemoSnapshot();
  let sarahGaps = calculateSkillGaps(snapshot.passports[0], demoOccupations[0]);

  await runStep("01_skill_gaps", () => {
    sarahGaps = calculateSkillGaps(snapshot.passports[0], demoOccupations[0]);
    assert.equal(sarahGaps.length, 1);
    assert.equal(sarahGaps[0].requirement.skillLabel, "Anglais professionnel");
    assert.equal(sarahGaps[0].reason, "UNCONFIRMED");
  });

  await runStep("02_gap_to_need", () => {
    const need = skillGapToNeed(sarahGaps[0], { createdAt: at });
    assert.equal(need.type, "LANGUAGE");
    assert.equal(need.requiredCapability, "DELIVER_TRAINING");
    assert.equal(need.status, "DETECTED");
  });

  await runStep("03_actor_search_by_capability", () => {
    const actors = [actor("actor-verified", "VERIFIED"), actor("actor-unverified", "NEEDS_VERIFICATION")];
    const matches = findActorsByCapability(actors, "SUPPORT_MOBILITY", { territory: "Guadeloupe" });
    assert.equal(matches.length, 2);
    assert.equal(snapshot.actors.filter((candidate) => !candidate.demo).length, 47);
  });

  await runStep("04_verified_actor_filter", () => {
    const actors = [actor("actor-verified", "VERIFIED"), actor("actor-unverified", "NEEDS_VERIFICATION")];
    const matches = findActorsByCapability(actors, "SUPPORT_MOBILITY", { verifiedOnly: true });
    assert.deepEqual(matches.map((candidate) => candidate.id), ["actor-verified"]);
    assert.equal(findActorsByCapability(snapshot.actors, "SUPPORT_MOBILITY", { verifiedOnly: true }).length, 0);
  });

  let generated = generatePathwayDraft({
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
  });

  await runStep("05_generate_plan_a_draft", () => {
    generated = generatePathwayDraft({
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
    });
    assert.equal(generated.planA.planType, "A");
    assert.equal(generated.planA.status, "DRAFT");
    assert.equal(generated.humanValidationRequired, true);
    assert.ok(generated.planA.steps.some((step) => step.title === "Anglais professionnel"));
    assert.ok(generated.unknowns.some((unknown) => unknown.includes("Aucune solution vérifiée")));
  });

  await runStep("06_generate_plan_b_draft", () => {
    assert.equal(generated.planB.planType, "B");
    assert.equal(generated.planB.status, "DRAFT");
    assert.notEqual(generated.planA.id, generated.planB.id);
    assert.ok(generated.planB.steps.some((step) => step.type === "OUTCOME"));
  });

  await runStep("07_referral_status_cycle", () => {
    let referral: Referral = {
      id: "referral-smoke",
      participantId: "participant-smoke",
      pathwayStepId: "step-smoke",
      fromActorId: "actor-from",
      toActorId: "actor-to",
      reason: "Test du cycle",
      requestedAction: "Action smoke demandée",
      sentAt: null,
      acknowledgedAt: null,
      acceptedAt: null,
      completedAt: null,
      expectedResponseAt: null,
      status: "DRAFT",
      response: null,
      rejectionReason: null,
      evidence: [],
      relaunchCount: 0,
      lastRelaunchAt: null,
      history: [],
    };
    referral = transitionReferral(referral, { status: "SENT", at });
    referral = transitionReferral(referral, { status: "ACKNOWLEDGED", at });
    referral = transitionReferral(referral, { status: "ACCEPTED", at });
    referral = transitionReferral(referral, { status: "IN_PROGRESS", at });
    referral = transitionReferral(referral, { status: "COMPLETED", at, evidence: ["Preuve smoke"] });
    assert.equal(referral.status, "COMPLETED");
    assert.equal(referral.history.length, 5);
    assert.equal(referral.completedAt, at);
  });

  await runStep("08_total_cost", () => {
    const result = calculateCostSummary([cost("cost-a", 100_000, 90_000), cost("cost-b", 50_000, 45_000)]);
    assert.equal(result.expectedTotalCents, 150_000);
    assert.equal(result.actualTotalCents, 135_000);
    assert.equal(result.expectedComplete, true);
  });

  await runStep("09_remaining_funding", () => {
    const items = [cost("cost-a", 150_000, null)];
    const allocations = [funding("fund-a", "cost-a", 120_000, 120_000), funding("fund-b", "cost-a", 30_000, 30_000)];
    const result = calculateFundingSummary(items, allocations);
    assert.equal(result.costTotalCents, 150_000);
    assert.equal(result.approvedFundingCents, 150_000);
    assert.equal(result.remainingToFundCents, 0);
  });

  await runStep("10_unknown_cost_is_not_zero", () => {
    const result = calculateCostSummary([cost("cost-known", 20_000, 10_000), cost("cost-unknown", null, null)]);
    assert.equal(result.expectedTotalCents, null);
    assert.equal(result.actualTotalCents, null);
    assert.equal(result.expectedKnownSubtotalCents, 20_000);
    const fundingResult = calculateFundingSummary([cost("cost-only", 20_000, null)], []);
    assert.equal(fundingResult.approvedFundingCents, null);
    assert.equal(fundingResult.remainingToFundCents, null);
  });

  await runStep("11_activate_plan_b", () => {
    const repository = createInMemoryOrchestrationRepository(snapshot);
    const planA = repository.getPathway("demo-pathway-sarah-plan-a")!;
    const planB = repository.getPathway("demo-pathway-sarah-plan-b")!;
    const activated = repository.activatePlanB({
      planAPathwayId: planA.id,
      planBPathwayId: planB.id,
      expectedPlanAVersion: planA.version,
      expectedPlanBVersion: planB.version,
      activatedBy: "smoke-cip",
      reason: "Blocage mobilité confirmé dans le smoke",
      at,
    });
    assert.equal(activated.planA.status, "SUPERSEDED");
    assert.equal(activated.planB.status, "ACTIVE");
    assert.equal(repository.getSnapshot().pathwayVersions.length, 2);
    assert.equal(repository.getSnapshot().outcomes[0].planBActivated, true);
    const pureActivation = activatePlanBPaths({ planA, planB, reason: "Smoke pur", at });
    assert.equal(pureActivation.planB.activatedAt, at);
  });

  await runStep("12_outcome_j7_j30_j60_j90", () => {
    let outcome: Outcome = {
      id: "outcome-smoke",
      participantId: "participant-smoke",
      pathwayId: "pathway-smoke",
      type: "CDD",
      providerActorId: "actor-employer-smoke",
      startDate: "2026-08-01T09:00:00.000Z",
      evidence: ["Contrat smoke"],
      milestones: createOutcomeMilestones("2026-08-01T09:00:00.000Z"),
      ruptureReason: null,
      planBActivated: false,
      finalStatus: "PENDING",
    };
    for (const milestone of ["J7", "J30", "J60", "J90"] as const) {
      outcome = recordOutcomeMilestone(outcome, {
        milestone,
        status: "ACTIVE",
        checkedAt: at,
        evidence: [`Maintien ${milestone} smoke`],
        notes: null,
      });
    }
    assert.equal(outcome.milestones.every((milestone) => milestone.status === "ACTIVE"), true);
    assert.equal(outcome.finalStatus, "MAINTAINED_J90");
  });

  await runStep("13_human_approval_guardrails", () => {
    const blockedRepository = createInMemoryOrchestrationRepository(snapshot);
    const initialIssues = blockedRepository.getPathwayApprovalIssues("demo-pathway-sarah-plan-a");
    assert.ok(initialIssues.some((issue) => issue.code === "MISSING_OWNER"));
    assert.ok(initialIssues.some((issue) => issue.code === "BLOCKED_WITHOUT_RELAUNCH"));
    assert.throws(
      () =>
        blockedRepository.approvePathway({
          pathwayId: "demo-pathway-sarah-plan-a",
          expectedVersion: 1,
          approvedBy: "CIP smoke",
          reason: "Tentative volontairement invalide",
          at,
        }),
      /ne peut pas être validé/,
    );

    const readySnapshot = createSarahDemoSnapshot();
    const planAIndex = readySnapshot.pathways.findIndex((pathway) => pathway.id === "demo-pathway-sarah-plan-a");
    readySnapshot.pathways[planAIndex] = {
      ...readySnapshot.pathways[planAIndex],
      steps: readySnapshot.pathways[planAIndex].steps.map((step) => ({
        ...step,
        status: step.status === "BLOCKED" ? "READY" : step.status,
        assignedActorId: step.assignedActorId ?? "demo-actor-le-bon-rebond",
        dueDate: step.dueDate ?? (step.dueOffsetDays === null ? "2026-12-31T17:00:00.000Z" : null),
      })),
    };
    const readyRepository = createInMemoryOrchestrationRepository(readySnapshot);
    assert.equal(readyRepository.getPathwayApprovalIssues("demo-pathway-sarah-plan-a").length, 0);
    const approved = readyRepository.approvePathway({
      pathwayId: "demo-pathway-sarah-plan-a",
      expectedVersion: 1,
      approvedBy: "CIP smoke",
      reason: "Responsables et échéances contrôlés",
      at,
    });
    assert.equal(approved.status, "ACTIVE");
    assert.equal(approved.version, 2);
  });
}

main().catch(() => {
  process.exitCode = 1;
});
