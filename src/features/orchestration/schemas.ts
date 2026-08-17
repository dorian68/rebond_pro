import { z } from "zod";

import {
  ACTOR_TYPES,
  CAPABILITIES,
  COST_CATEGORIES,
  FUNDING_STATUSES,
  MILESTONE_STATUSES,
  NEED_TYPES,
  OCCUPATION_COVERAGE_LEVELS,
  OPPORTUNITY_TYPES,
  OUTCOME_MILESTONES,
  OUTCOME_TYPES,
  PATHWAY_STATUSES,
  PATHWAY_STEP_STATUSES,
  PATHWAY_STEP_TYPES,
  REFERRAL_STATUSES,
  SKILL_CONFIDENCE_LEVELS,
  VERIFICATION_STATUSES,
} from "./constants";

const identifierSchema = z.string().trim().min(1).max(160);
const shortTextSchema = z.string().trim().min(1).max(300);
const longTextSchema = z.string().trim().min(1).max(8_000);
const nullableShortTextSchema = z.string().trim().min(1).max(300).nullable();
const nullableLongTextSchema = z.string().trim().min(1).max(8_000).nullable();
const isoDateTimeSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Date ISO invalide.");
const nullableIsoDateTimeSchema = isoDateTimeSchema.nullable();

/** Monetary values are integer euro cents. `null` always means unknown, never zero. */
export const moneyCentsSchema = z.number().int().nonnegative().safe().nullable();

export const verificationStatusSchema = z.enum(VERIFICATION_STATUSES);
export const capabilitySchema = z.enum(CAPABILITIES);
export const actorTypeSchema = z.enum(ACTOR_TYPES);
export const pathwayStepStatusSchema = z.enum(PATHWAY_STEP_STATUSES);
export const referralStatusSchema = z.enum(REFERRAL_STATUSES);

export const sourceRefSchema = z
  .object({
    kind: z.enum(["SOURCE_FILE", "PUBLIC_OFFICIAL", "EXISTING_RECORD", "MISSION_BRIEF", "SYNTHETIC_DEMO", "MANUAL"]),
    label: shortTextSchema,
    file: nullableShortTextSchema.optional(),
    sheet: nullableShortTextSchema.optional(),
    page: z.number().int().positive().nullable().optional(),
    line: z.number().int().positive().nullable().optional(),
    section: nullableShortTextSchema.optional(),
    recordId: nullableShortTextSchema.optional(),
    uri: nullableShortTextSchema.optional(),
  })
  .strict();

export const verificationSchema = z
  .object({
    status: verificationStatusSchema,
    sourceRef: sourceRefSchema,
    lastVerifiedAt: nullableIsoDateTimeSchema,
    verifiedBy: nullableShortTextSchema,
  })
  .strict();

export const skillClaimSchema = z
  .object({
    id: identifierSchema,
    participantId: identifierSchema,
    skillId: nullableShortTextSchema,
    skillLabel: shortTextSchema,
    level: nullableShortTextSchema,
    levelRank: z.number().int().min(0).max(10).nullable(),
    sourceType: z.enum(["CV", "INTERVIEW", "ASSESSMENT", "OBSERVATION", "DECLARATION", "OTHER"]),
    sourceRef: sourceRefSchema,
    evidence: z.array(shortTextSchema).max(30),
    candidateConfirmed: z.boolean(),
    professionalConfirmed: z.boolean(),
    confidence: z.enum(SKILL_CONFIDENCE_LEVELS),
    lastVerifiedAt: nullableIsoDateTimeSchema,
  })
  .strict();

export const consentGrantSchema = z
  .object({
    id: identifierSchema,
    participantId: identifierSchema,
    purpose: shortTextSchema,
    recipientActorId: nullableShortTextSchema,
    recipientActorType: actorTypeSchema.nullable(),
    dataScope: z.array(shortTextSchema).min(1).max(50),
    grantedAt: nullableIsoDateTimeSchema,
    revokedAt: nullableIsoDateTimeSchema,
    legalBasis: nullableShortTextSchema,
    notes: nullableLongTextSchema,
  })
  .strict();

const participantIdentitySchema = z
  .object({
    firstName: shortTextSchema,
    lastName: nullableShortTextSchema,
    age: z.number().int().min(16).max(100).nullable(),
    email: z.string().email().nullable(),
    phone: nullableShortTextSchema,
  })
  .strict();

const experienceSchema = z
  .object({
    id: identifierSchema,
    title: shortTextSchema,
    organization: nullableShortTextSchema,
    description: nullableLongTextSchema,
    startedAt: nullableIsoDateTimeSchema,
    endedAt: nullableIsoDateTimeSchema,
    evidence: z.array(shortTextSchema).max(20),
  })
  .strict();

const barrierSchema = z
  .object({
    id: identifierSchema,
    type: z.enum(NEED_TYPES),
    label: shortTextSchema,
    details: nullableLongTextSchema,
    blocking: z.boolean(),
    status: z.enum(["DECLARED", "VALIDATED", "RESOLVED", "UNKNOWN"]),
    verification: verificationSchema,
  })
  .strict();

export const participantPassportSchema = z
  .object({
    id: identifierSchema,
    participantId: identifierSchema,
    existingBeneficiaryId: nullableShortTextSchema,
    workspaceId: identifierSchema,
    identityPrivate: participantIdentitySchema,
    currentSituation: shortTextSchema,
    employmentStatus: z.enum(["EMPLOYED", "JOB_SEEKER", "TRAINING", "STUDENT", "OTHER", "UNKNOWN"]),
    experiences: z.array(experienceSchema).max(100),
    qualifications: z.array(shortTextSchema).max(100),
    certifications: z.array(shortTextSchema).max(100),
    skillClaims: z.array(skillClaimSchema).max(500),
    languages: z.array(shortTextSchema).max(50),
    tools: z.array(shortTextSchema).max(100),
    mobility: z
      .object({
        hasVehicle: z.boolean().nullable(),
        licence: nullableShortTextSchema,
        territory: z.array(shortTextSchema).max(30),
        notes: nullableLongTextSchema,
      })
      .strict(),
    availability: z
      .object({
        available: z.boolean().nullable(),
        from: nullableIsoDateTimeSchema,
        scheduleNotes: nullableLongTextSchema,
      })
      .strict(),
    constraints: z.array(shortTextSchema).max(100),
    barriers: z.array(barrierSchema).max(100),
    aspirations: z.array(shortTextSchema).max(100),
    targetOccupationIds: z.array(identifierSchema).max(20),
    planA: z
      .object({ occupationId: identifierSchema, label: shortTextSchema, status: z.enum(["DRAFT", "VALIDATED"]) })
      .strict(),
    planB: z
      .object({ occupationId: identifierSchema, label: shortTextSchema, status: z.enum(["DRAFT", "VALIDATED"]) })
      .strict(),
    documents: z.array(z.object({ id: identifierSchema, label: shortTextSchema, type: shortTextSchema }).strict()).max(100),
    consents: z.array(consentGrantSchema).max(100),
    sourceRef: sourceRefSchema,
    lastReviewedAt: nullableIsoDateTimeSchema,
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
    demo: z.boolean(),
  })
  .strict();

export const skillRequirementSchema = z
  .object({
    skillId: nullableShortTextSchema,
    skillLabel: shortTextSchema,
    minimumLevel: nullableShortTextSchema,
    minimumLevelRank: z.number().int().min(0).max(10).nullable(),
    sourceRef: sourceRefSchema,
    verificationStatus: verificationStatusSchema,
  })
  .strict();

export const occupationSchema = z
  .object({
    id: identifierSchema,
    label: shortTextSchema,
    romeCode: nullableShortTextSchema,
    /** FAP2021/BMO code when an explicit mapping exists. */
    fapCode: nullableShortTextSchema.optional().default(null),
    /** Explicit, reviewable relationship between a broad FAP group and the canonical métier. */
    fapMapping: z.object({
      relation: z.enum(["EXACT", "BROADER", "RELATED", "UNMAPPED"]),
      verificationStatus: verificationStatusSchema,
      sourceRef: sourceRefSchema,
      notes: nullableLongTextSchema,
    }).strict().nullable().optional().default(null),
    sector: shortTextSchema,
    requiredSkills: z.array(skillRequirementSchema).max(200),
    preferredSkills: z.array(skillRequirementSchema).max(200),
    prerequisites: z.array(shortTextSchema).max(100),
    constraints: z.array(shortTextSchema).max(100),
    typicalSchedules: z.array(shortTextSchema).max(50),
    relatedOccupationIds: z.array(identifierSchema).max(100),
    sourceRef: sourceRefSchema,
    verificationStatus: verificationStatusSchema,
  })
  .strict();

export const occupationCoverageSchema = z
  .object({
    occupationId: identifierSchema,
    level: z.enum(OCCUPATION_COVERAGE_LEVELS),
    mappingVerified: z.boolean(),
    reliableForDraft: z.boolean(),
    activatable: z.boolean(),
    evidence: z.array(shortTextSchema).max(100),
    blockers: z.array(shortTextSchema).max(100),
    assessedAt: isoDateTimeSchema,
  })
  .strict()
  .superRefine((coverage, context) => {
    const rank = OCCUPATION_COVERAGE_LEVELS.indexOf(coverage.level);
    const modeledRank = OCCUPATION_COVERAGE_LEVELS.indexOf("L2_MODELED");
    const activatableRank = OCCUPATION_COVERAGE_LEVELS.indexOf("L4_ACTIVATABLE");
    if (rank >= modeledRank && !coverage.mappingVerified) {
      context.addIssue({
        code: "custom",
        path: ["mappingVerified"],
        message: "Une couverture L2 ou supérieure exige un rapprochement FAP/ROME vérifié.",
      });
    }
    if (coverage.reliableForDraft !== (rank >= modeledRank)) {
      context.addIssue({
        code: "custom",
        path: ["reliableForDraft"],
        message: "La fiabilité du brouillon doit être cohérente avec le niveau de couverture.",
      });
    }
    if (coverage.activatable !== (rank >= activatableRank)) {
      context.addIssue({
        code: "custom",
        path: ["activatable"],
        message: "Le statut activable doit être cohérent avec le niveau de couverture.",
      });
    }
  });

export const occupationMarketContextSchema = z
  .object({
    fapCode: shortTextSchema,
    label: shortTextSchema,
    familyCode: shortTextSchema,
    familyLabel: shortTextSchema,
    territory: shortTextSchema,
    projectsKnown: z.number().int().nonnegative(),
    hasSuppressedProjects: z.boolean(),
    basinCount: z.number().int().nonnegative(),
    sourceRef: sourceRefSchema,
    warning: longTextSchema,
  })
  .strict();

export const actorCapabilitySchema = z
  .object({
    capability: capabilitySchema,
    verificationStatus: verificationStatusSchema,
    sourceRef: sourceRefSchema,
    lastVerifiedAt: nullableIsoDateTimeSchema,
    notes: nullableLongTextSchema,
  })
  .strict();

export const actorSchema = z
  .object({
    id: identifierSchema,
    workspaceId: identifierSchema,
    existingOrganizationId: nullableShortTextSchema,
    legalName: nullableShortTextSchema,
    displayName: shortTextSchema,
    // An empty list is intentional when the source does not prove a category yet.
    actorTypes: z.array(actorTypeSchema).max(20),
    territory: z.array(shortTextSchema).max(30),
    employmentBasin: z.array(shortTextSchema).max(30),
    addresses: z.array(shortTextSchema).max(20),
    contacts: z
      .array(
        z
          .object({
            name: nullableShortTextSchema,
            role: nullableShortTextSchema,
            email: z.string().email().nullable(),
            phone: nullableShortTextSchema,
          })
          .strict(),
      )
      .max(30),
    capabilities: z.array(actorCapabilitySchema).max(CAPABILITIES.length),
    eligibilityRules: z.array(shortTextSchema).max(100),
    requiredInputs: z.array(shortTextSchema).max(100),
    producedOutputs: z.array(shortTextSchema).max(100),
    responseSlaHours: z.number().int().positive().nullable(),
    currentCapacity: z
      .object({
        status: z.enum(["AVAILABLE", "LIMITED", "UNAVAILABLE", "UNKNOWN"]),
        places: z.number().int().nonnegative().nullable(),
        asOf: nullableIsoDateTimeSchema,
      })
      .strict(),
    costModel: nullableLongTextSchema,
    dataSharingPolicy: nullableLongTextSchema,
    sourceRef: sourceRefSchema,
    verificationStatus: verificationStatusSchema,
    lastVerifiedAt: nullableIsoDateTimeSchema,
    verificationOwner: nullableShortTextSchema,
    active: z.boolean(),
    demo: z.boolean(),
  })
  .strict();

export const serviceOfferSchema = z
  .object({
    id: identifierSchema,
    actorId: identifierSchema,
    name: shortTextSchema,
    description: nullableLongTextSchema,
    capabilitiesProvided: z.array(capabilitySchema).min(1).max(CAPABILITIES.length),
    skillsDeveloped: z.array(shortTextSchema).max(100),
    needsResolved: z.array(z.enum(NEED_TYPES)).max(30),
    targetPublic: z.array(shortTextSchema).max(100),
    territory: z.array(shortTextSchema).max(30),
    eligibilityRules: z.array(shortTextSchema).max(100),
    prerequisites: z.array(shortTextSchema).max(100),
    duration: nullableShortTextSchema,
    dates: z.array(isoDateTimeSchema).max(100),
    places: z.number().int().nonnegative().nullable(),
    costCents: moneyCentsSchema,
    possibleFunderActorIds: z.array(identifierSchema).max(100),
    requiredDocuments: z.array(shortTextSchema).max(100),
    expectedOutput: nullableLongTextSchema,
    verificationStatus: verificationStatusSchema,
    sourceRef: sourceRefSchema,
  })
  .strict();

export const opportunitySchema = z
  .object({
    id: identifierSchema,
    providerActorId: identifierSchema,
    type: z.enum(OPPORTUNITY_TYPES),
    title: shortTextSchema,
    occupationId: nullableShortTextSchema,
    location: nullableShortTextSchema,
    schedule: nullableLongTextSchema,
    startDate: nullableIsoDateTimeSchema,
    endDate: nullableIsoDateTimeSchema,
    contractType: nullableShortTextSchema,
    vacancies: z.number().int().nonnegative().nullable(),
    requiredSkills: z.array(skillRequirementSchema).max(200),
    preferredSkills: z.array(skillRequirementSchema).max(200),
    prerequisites: z.array(shortTextSchema).max(100),
    constraints: z.array(shortTextSchema).max(100),
    applicationProcess: nullableLongTextSchema,
    contact: nullableLongTextSchema,
    responseDeadline: nullableIsoDateTimeSchema,
    status: z.enum(["DRAFT", "OPEN", "PAUSED", "FILLED", "CLOSED", "UNKNOWN"]),
    sourceRef: sourceRefSchema,
    verificationStatus: verificationStatusSchema,
    demo: z.boolean(),
  })
  .strict();

export const needSchema = z
  .object({
    id: identifierSchema,
    participantId: identifierSchema,
    type: z.enum(NEED_TYPES),
    label: shortTextSchema,
    severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL", "UNKNOWN"]),
    blocking: z.boolean(),
    targetId: nullableShortTextSchema,
    requiredCapability: capabilitySchema,
    status: z.enum(["DETECTED", "VALIDATED", "IN_PROGRESS", "RESOLVED", "DISMISSED"]),
    evidence: z.array(shortTextSchema).max(100),
    detectedBy: shortTextSchema,
    validatedBy: nullableShortTextSchema,
    createdAt: isoDateTimeSchema,
    resolvedAt: nullableIsoDateTimeSchema,
  })
  .strict();

export const pathwayStepSchema = z
  .object({
    id: identifierSchema,
    pathwayId: identifierSchema,
    type: z.enum(PATHWAY_STEP_TYPES),
    title: shortTextSchema,
    description: nullableLongTextSchema,
    assignedActorId: nullableShortTextSchema,
    serviceOfferId: nullableShortTextSchema,
    opportunityId: nullableShortTextSchema,
    status: pathwayStepStatusSchema,
    dependencies: z.array(identifierSchema).max(100),
    plannedStart: nullableIsoDateTimeSchema,
    dueDate: nullableIsoDateTimeSchema,
    /** Relative deadline used for outcome follow-ups whose calendar date is unknowable before the outcome starts. */
    dueOffsetDays: z.number().int().positive().nullable(),
    completedAt: nullableIsoDateTimeSchema,
    requiredInputs: z.array(shortTextSchema).max(100),
    expectedOutputs: z.array(shortTextSchema).max(100),
    evidence: z.array(shortTextSchema).max(100),
    expectedCostCents: moneyCentsSchema,
    actualCostCents: moneyCentsSchema,
    payerActorId: nullableShortTextSchema,
    fundingStatus: z.enum(["NOT_REQUIRED", "UNKNOWN", "TO_SECURE", "REQUESTED", "PARTIAL", "SECURED"]),
    successTransition: nullableShortTextSchema,
    failureTransition: nullableShortTextSchema,
    sourceReason: longTextSchema,
    suggestion: z
      .object({
        humanValidationRequired: z.literal(true),
        confidence: z.enum(["HIGH", "MEDIUM", "LOW", "UNKNOWN"]),
        dataUsed: z.array(shortTextSchema).max(100),
        unknowns: z.array(shortTextSchema).max(100),
      })
      .strict(),
  })
  .strict();

export const pathwaySchema = z
  .object({
    id: identifierSchema,
    participantId: identifierSchema,
    cohortId: identifierSchema,
    targetState: z.object({ occupationId: identifierSchema, label: shortTextSchema }).strict(),
    planType: z.enum(["A", "B"]),
    status: z.enum(PATHWAY_STATUSES),
    steps: z.array(pathwayStepSchema).max(300),
    currentStepId: nullableShortTextSchema,
    expectedStartDate: nullableIsoDateTimeSchema,
    expectedEndDate: nullableIsoDateTimeSchema,
    actualEndDate: nullableIsoDateTimeSchema,
    predictedCostCents: moneyCentsSchema,
    actualCostCents: moneyCentsSchema,
    fundingGapCents: moneyCentsSchema,
    outcomeId: nullableShortTextSchema,
    version: z.number().int().positive(),
    approvedBy: nullableShortTextSchema,
    approvedAt: nullableIsoDateTimeSchema,
    activatedAt: nullableIsoDateTimeSchema,
    activationReason: nullableLongTextSchema,
    /** Required and bound to the target: an operational draft must fail closed. */
    occupationCoverage: occupationCoverageSchema,
    /** BMO context is a market signal, never an Opportunity. */
    marketContext: occupationMarketContextSchema.nullable(),
  })
  .strict()
  .superRefine((pathway, context) => {
    if (pathway.occupationCoverage.occupationId !== pathway.targetState.occupationId) {
      context.addIssue({
        code: "custom",
        path: ["occupationCoverage", "occupationId"],
        message: "La couverture métier doit concerner exactement le métier cible du parcours.",
      });
    }
  });

export const pathwayVersionSchema = z
  .object({
    pathwayId: identifierSchema,
    version: z.number().int().positive(),
    snapshot: pathwaySchema,
    changedAt: isoDateTimeSchema,
    changedBy: shortTextSchema,
    reason: shortTextSchema,
  })
  .strict();

export const referralSchema = z
  .object({
    id: identifierSchema,
    participantId: identifierSchema,
    pathwayStepId: identifierSchema,
    fromActorId: identifierSchema,
    toActorId: identifierSchema,
    reason: shortTextSchema,
    requestedAction: longTextSchema,
    sentAt: nullableIsoDateTimeSchema,
    acknowledgedAt: nullableIsoDateTimeSchema,
    acceptedAt: nullableIsoDateTimeSchema,
    completedAt: nullableIsoDateTimeSchema,
    expectedResponseAt: nullableIsoDateTimeSchema,
    status: referralStatusSchema,
    response: nullableLongTextSchema,
    rejectionReason: nullableLongTextSchema,
    evidence: z.array(shortTextSchema).max(100),
    relaunchCount: z.number().int().nonnegative(),
    lastRelaunchAt: nullableIsoDateTimeSchema,
    history: z
      .array(
        z.object({ from: referralStatusSchema.nullable(), to: referralStatusSchema, at: isoDateTimeSchema, note: nullableLongTextSchema }).strict(),
      )
      .max(500),
  })
  .strict();

export const costItemSchema = z
  .object({
    id: identifierSchema,
    participantId: identifierSchema,
    pathwayId: identifierSchema,
    pathwayStepId: nullableShortTextSchema,
    category: z.enum(COST_CATEGORIES),
    unit: nullableShortTextSchema,
    quantity: z.number().positive().finite().nullable(),
    unitCostCents: moneyCentsSchema,
    expectedCostCents: moneyCentsSchema,
    actualCostCents: moneyCentsSchema,
    costOwnerActorId: nullableShortTextSchema,
    source: sourceRefSchema,
    verificationStatus: verificationStatusSchema,
  })
  .strict();

export const fundingAllocationSchema = z
  .object({
    id: identifierSchema,
    costItemId: identifierSchema,
    funderActorId: identifierSchema,
    mechanism: nullableShortTextSchema,
    amountRequestedCents: moneyCentsSchema,
    amountApprovedCents: moneyCentsSchema,
    amountPaidCents: moneyCentsSchema,
    status: z.enum(FUNDING_STATUSES),
    applicationDate: nullableIsoDateTimeSchema,
    decisionDate: nullableIsoDateTimeSchema,
    evidence: z.array(shortTextSchema).max(100),
  })
  .strict();

export const outcomeMilestoneSchema = z
  .object({
    milestone: z.enum(OUTCOME_MILESTONES),
    dueAt: nullableIsoDateTimeSchema,
    checkedAt: nullableIsoDateTimeSchema,
    status: z.enum(MILESTONE_STATUSES),
    evidence: z.array(shortTextSchema).max(100),
    notes: nullableLongTextSchema,
  })
  .strict();

export const outcomeSchema = z
  .object({
    id: identifierSchema,
    participantId: identifierSchema,
    pathwayId: identifierSchema,
    type: z.enum(OUTCOME_TYPES),
    providerActorId: nullableShortTextSchema,
    startDate: nullableIsoDateTimeSchema,
    evidence: z.array(shortTextSchema).max(100),
    milestones: z.array(outcomeMilestoneSchema).length(OUTCOME_MILESTONES.length),
    ruptureReason: nullableLongTextSchema,
    planBActivated: z.boolean(),
    finalStatus: z.enum(["PENDING", "ACTIVE", "MAINTAINED_J90", "RUPTURE", "CLOSED"]),
  })
  .strict();

export const cohortSchema = z
  .object({
    id: identifierSchema,
    name: shortTextSchema,
    sector: shortTextSchema,
    territory: shortTextSchema,
    startsAt: nullableIsoDateTimeSchema,
    endsAt: nullableIsoDateTimeSchema,
    buyerActorId: nullableShortTextSchema,
    participantIds: z.array(identifierSchema).max(1_000),
    opportunityIds: z.array(identifierSchema).max(1_000),
    outcomeIds: z.array(identifierSchema).max(1_000),
    status: z.enum(["DRAFT", "ACTIVE", "COMPLETED", "ARCHIVED"]),
    owner: shortTextSchema,
    demo: z.boolean(),
  })
  .strict();

export const orchestrationSnapshotSchema = z
  .object({
    meta: z
      .object({
        mode: z.literal("SYNTHETIC_DEMO"),
        label: shortTextSchema,
        generatedAt: isoDateTimeSchema,
        persistence: z.literal("IN_MEMORY_PROCESS_ONLY"),
        warning: longTextSchema,
      })
      .strict(),
    cohorts: z.array(cohortSchema),
    passports: z.array(participantPassportSchema),
    occupations: z.array(occupationSchema),
    needs: z.array(needSchema),
    actors: z.array(actorSchema),
    serviceOffers: z.array(serviceOfferSchema),
    opportunities: z.array(opportunitySchema),
    pathways: z.array(pathwaySchema),
    pathwayVersions: z.array(pathwayVersionSchema),
    referrals: z.array(referralSchema),
    costItems: z.array(costItemSchema),
    fundingAllocations: z.array(fundingAllocationSchema),
    outcomes: z.array(outcomeSchema),
  })
  .strict();

export const actorSearchFiltersSchema = z
  .object({
    capability: capabilitySchema.optional(),
    territory: z.string().trim().min(1).max(300).optional(),
    actorType: actorTypeSchema.optional(),
    verifiedOnly: z.boolean().default(false),
    availableOnly: z.boolean().default(false),
  })
  .strict();

export const pathwayStepPatchSchema = pathwayStepSchema
  .pick({
    title: true,
    description: true,
    assignedActorId: true,
    serviceOfferId: true,
    opportunityId: true,
    status: true,
    dependencies: true,
    plannedStart: true,
    dueDate: true,
    dueOffsetDays: true,
    completedAt: true,
    requiredInputs: true,
    expectedOutputs: true,
    evidence: true,
    expectedCostCents: true,
    actualCostCents: true,
    payerActorId: true,
    fundingStatus: true,
    successTransition: true,
    failureTransition: true,
  })
  .partial()
  .strict();

export const referralTransitionInputSchema = z
  .object({
    status: referralStatusSchema,
    at: isoDateTimeSchema,
    response: nullableLongTextSchema.optional(),
    rejectionReason: nullableLongTextSchema.optional(),
    evidence: z.array(shortTextSchema).max(100).optional(),
    note: nullableLongTextSchema.optional(),
  })
  .strict();

export const outcomeMilestoneUpdateSchema = z
  .object({
    milestone: z.enum(OUTCOME_MILESTONES),
    status: z.enum(MILESTONE_STATUSES),
    checkedAt: isoDateTimeSchema,
    evidence: z.array(shortTextSchema).max(100).default([]),
    notes: nullableLongTextSchema.default(null),
  })
  .strict();
