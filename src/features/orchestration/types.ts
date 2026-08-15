import type { z } from "zod";

import type { CAPABILITIES, NEED_TYPES, OUTCOME_MILESTONES } from "./constants";
import type {
  actorCapabilitySchema,
  actorSchema,
  actorSearchFiltersSchema,
  cohortSchema,
  consentGrantSchema,
  costItemSchema,
  fundingAllocationSchema,
  needSchema,
  occupationSchema,
  opportunitySchema,
  orchestrationSnapshotSchema,
  outcomeMilestoneSchema,
  outcomeMilestoneUpdateSchema,
  outcomeSchema,
  participantPassportSchema,
  pathwaySchema,
  pathwayStepPatchSchema,
  pathwayStepSchema,
  pathwayVersionSchema,
  referralSchema,
  referralTransitionInputSchema,
  serviceOfferSchema,
  skillClaimSchema,
  skillRequirementSchema,
  sourceRefSchema,
  verificationSchema,
} from "./schemas";

export type Capability = (typeof CAPABILITIES)[number];
export type NeedType = (typeof NEED_TYPES)[number];
export type OutcomeMilestoneName = (typeof OUTCOME_MILESTONES)[number];

export type SourceRef = z.infer<typeof sourceRefSchema>;
export type Verification = z.infer<typeof verificationSchema>;
export type SkillClaim = z.infer<typeof skillClaimSchema>;
export type SkillRequirement = z.infer<typeof skillRequirementSchema>;
export type ConsentGrant = z.infer<typeof consentGrantSchema>;
export type ParticipantPassport = z.infer<typeof participantPassportSchema>;
export type Occupation = z.infer<typeof occupationSchema>;
export type ActorCapability = z.infer<typeof actorCapabilitySchema>;
export type Actor = z.infer<typeof actorSchema>;
export type ActorSearchFilters = z.input<typeof actorSearchFiltersSchema>;
export type ServiceOffer = z.infer<typeof serviceOfferSchema>;
export type Opportunity = z.infer<typeof opportunitySchema>;
export type Need = z.infer<typeof needSchema>;
export type PathwayStep = z.infer<typeof pathwayStepSchema>;
export type PathwayStepPatch = z.infer<typeof pathwayStepPatchSchema>;
export type Pathway = z.infer<typeof pathwaySchema>;
export type PathwayVersion = z.infer<typeof pathwayVersionSchema>;
export type Referral = z.infer<typeof referralSchema>;
export type ReferralTransitionInput = z.infer<typeof referralTransitionInputSchema>;
export type CostItem = z.infer<typeof costItemSchema>;
export type FundingAllocation = z.infer<typeof fundingAllocationSchema>;
export type OutcomeMilestone = z.infer<typeof outcomeMilestoneSchema>;
export type OutcomeMilestoneUpdate = z.input<typeof outcomeMilestoneUpdateSchema>;
export type Outcome = z.infer<typeof outcomeSchema>;
export type Cohort = z.infer<typeof cohortSchema>;
export type OrchestrationSnapshot = z.infer<typeof orchestrationSnapshotSchema>;

export type SkillGapReason = "MISSING" | "UNCONFIRMED" | "LEVEL_TOO_LOW" | "LEVEL_UNKNOWN";

export type SkillGap = {
  participantId: string;
  occupationId: string;
  requirement: SkillRequirement;
  matchingClaim: SkillClaim | null;
  reason: SkillGapReason;
  explanation: string;
};

export type ActorMatchLevel = "ACTIVATABLE" | "QUALIFIED_WITH_CHECKS" | "DISCOVERY_ONLY" | "EXCLUDED";

export type ActorMatchScoreComponent = {
  criterion: "CAPABILITY" | "ACTOR_VERIFICATION" | "TERRITORY" | "SERVICE_FIT" | "SERVICE_VERIFICATION" | "AVAILABILITY" | "PREREQUISITES";
  points: number;
  maximum: number;
  explanation: string;
};

export type ActorMatch = {
  actor: Actor;
  capability: ActorCapability;
  serviceOffers: ServiceOffer[];
  level: ActorMatchLevel;
  score: number;
  scoreBreakdown: ActorMatchScoreComponent[];
  reasons: string[];
  unknowns: string[];
  hardStops: string[];
};

export type PathwayMatchSuggestion = {
  planType: "A" | "B";
  needId: string;
  needLabel: string;
  matches: ActorMatch[];
};

export type PathwayDraftResult = {
  planA: Pathway;
  planB: Pathway;
  needs: Need[];
  matchSuggestions: PathwayMatchSuggestion[];
  explanations: string[];
  unknowns: string[];
  humanValidationRequired: true;
};

export type PathwayApprovalIssue = {
  code: "INVALID_STATUS" | "MISSING_OWNER" | "MISSING_DEADLINE" | "BLOCKED_WITHOUT_RELAUNCH" | "MISSING_CRITICAL_INPUT_EVIDENCE";
  stepId: string | null;
  message: string;
};

export type CostSummary = {
  expectedTotalCents: number | null;
  actualTotalCents: number | null;
  expectedKnownSubtotalCents: number;
  actualKnownSubtotalCents: number;
  expectedUnknownCount: number;
  actualUnknownCount: number;
  expectedComplete: boolean;
  actualComplete: boolean;
};

export type FundingSummary = {
  costTotalCents: number | null;
  approvedFundingCents: number | null;
  paidFundingCents: number | null;
  remainingToFundCents: number | null;
  costUnknown: boolean;
  fundingUnknown: boolean;
};

export type OrchestrationRepository = {
  getSnapshot(): OrchestrationSnapshot;
  getPassport(passportId: string): ParticipantPassport | null;
  getPathway(pathwayId: string): Pathway | null;
  getPathwayApprovalIssues(pathwayId: string): PathwayApprovalIssue[];
  listActors(filters?: ActorSearchFilters): Actor[];
  upsertActorCapability(actorId: string, capability: ActorCapability): Actor;
  updatePathwayStep(input: {
    pathwayId: string;
    stepId: string;
    expectedVersion: number;
    patch: PathwayStepPatch;
    changedBy: string;
    reason: string;
    at?: string;
  }): Pathway;
  approvePathway(input: {
    pathwayId: string;
    expectedVersion: number;
    approvedBy: string;
    reason: string;
    at?: string;
  }): Pathway;
  transitionReferral(referralId: string, input: ReferralTransitionInput): Referral;
  createReferral(referral: Referral): Referral;
  relaunchReferral(referralId: string, input?: { at?: string; note?: string }): Referral;
  activatePlanB(input: {
    planAPathwayId: string;
    planBPathwayId: string;
    expectedPlanAVersion: number;
    expectedPlanBVersion: number;
    activatedBy: string;
    reason: string;
    at?: string;
  }): { planA: Pathway; planB: Pathway };
  recordOutcomeMilestone(outcomeId: string, update: OutcomeMilestoneUpdate): Outcome;
  recordOutcome(outcome: Outcome, input: { recordedBy: string; reason: string; at?: string }): Outcome;
  addCostItem(item: CostItem): CostItem;
  addFundingAllocation(allocation: FundingAllocation): FundingAllocation;
  reset(): OrchestrationSnapshot;
};
