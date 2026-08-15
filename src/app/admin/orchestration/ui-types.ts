export type OrchestrationView = "overview" | "cohorts" | "pathway" | "ecosystem" | "reference" | "costs";

export type VerificationStatus = "VERIFIED" | "NEEDS_VERIFICATION";
export type PlanType = "A" | "B";

export type UiSource = {
  id: string;
  title: string;
  publisher: string;
  url: string | null;
  kind: string;
  checkedAt: string;
  publishedAt: string | null;
  verificationStatus: VerificationStatus;
  freshness: string;
  freshnessStatus: "CURRENT" | "REVIEW_DUE" | "NEEDS_VERIFICATION";
  reviewDueAt: string;
  caveats: string[];
};

export type UiMarketSignal = {
  id: string;
  label: string;
  value: number;
  unit: string;
  scope: string;
  period: string;
  sourceId: string;
  caveat: string;
};

export type UiFundingMechanism = {
  id: string;
  name: string;
  funderActorId: string | null;
  funderName: string | null;
  purpose: string;
  eligiblePublic: string[];
  conditions: string[];
  coveredCosts: string[];
  amountRule: string | null;
  decisionRequired: true;
  sourceId: string;
  verificationStatus: VerificationStatus;
};

export type UiBudgetScenario = {
  id: string;
  name: string;
  participants: number;
  durationMonths: number;
  totalCents: number;
  targetFundingCents: number;
  targetCofundingCents: number;
  status: "INTERNAL_SCENARIO";
  sourceId: string;
  caveat: string;
};

export type UiEvidenceRequirement = {
  id: string;
  label: string;
  appliesTo: string;
  requiredEvidence: string[];
  sourceId: string;
  verificationStatus: VerificationStatus;
};

export type UiSourceRegistry = {
  sources: UiSource[];
  marketSignals: UiMarketSignal[];
  fundingMechanisms: UiFundingMechanism[];
  budgetScenarios: UiBudgetScenario[];
  evidenceRequirements: UiEvidenceRequirement[];
  missingSources: string[];
  latestCheckedAt: string | null;
};

export type UiCapabilityClaim = {
  capability: string;
  verificationStatus: VerificationStatus;
  sourceLabel: string;
  sourceUrl: string | null;
  lastVerifiedAt: string | null;
  notes: string | null;
  localDraft?: boolean;
};

export type UiActor = {
  id: string;
  name: string;
  legalName?: string | null;
  actorTypes: string[];
  territory: string;
  employmentBasin?: string | null;
  capabilities: string[];
  pathwayRoles: string[];
  requiredInputs: string[];
  producedOutputs: string[];
  mobilizationNotes: string[];
  capabilityClaims: UiCapabilityClaim[];
  sectors: string[];
  services: string[];
  opportunities: string[];
  contacts: string[];
  sourceLabel: string;
  sourceLocation?: string | null;
  sourceUrl?: string | null;
  verificationSource?: string | null;
  verificationStatus: VerificationStatus;
  lastVerifiedAt?: string | null;
  verifiedBy?: string | null;
  responseSla?: string | null;
  capacity?: string | null;
  active: boolean;
  usedInPathway: boolean;
  synthetic?: boolean;
};

export type UiSkill = {
  id: string;
  label: string;
  level: string;
  confidence: string;
  evidence: string;
};

export type UiNeed = {
  id: string;
  type: string;
  label: string;
  severity: string;
  blocking: boolean;
  status: string;
  evidence: string;
};

export type UiPassport = {
  id: string;
  participantId: string;
  firstName: string;
  ageLabel: string;
  sourceLabel: string;
  currentSituation: string;
  employmentStatus: string;
  experienceSummary: string;
  skills: UiSkill[];
  tools: string[];
  mobility: string;
  availability: string;
  planA: string;
  planB: string;
  aspirations: string[];
  needs: UiNeed[];
  consents: { label: string; granted: boolean; scope: string }[];
  lastReviewedAt?: string | null;
};

export type UiStep = {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  planType: PlanType;
  assignedActorId: string | null;
  assignedActorName: string;
  dependencies: string[];
  plannedStart?: string | null;
  dueDate?: string | null;
  completedAt?: string | null;
  expectedCost: number | null;
  actualCost: number | null;
  sourceReason: string;
  evidence: string[];
  draft: boolean;
  x: number;
  y: number;
};

export type UiReferral = {
  id: string;
  stepId: string;
  title: string;
  fromActorId: string;
  toActorId: string;
  toActorName: string;
  reason: string;
  requestedAction: string;
  status: string;
  expectedResponseAt?: string | null;
  sentAt?: string | null;
  acknowledgedAt?: string | null;
  acceptedAt?: string | null;
  completedAt?: string | null;
  lastRelaunchAt?: string | null;
  response?: string | null;
  rejectionReason?: string | null;
  relaunchCount: number;
};

export type UiCostItem = {
  id: string;
  stepId: string | null;
  label: string;
  category: string;
  expectedCost: number | null;
  actualCost: number | null;
  funderActorId: string | null;
  mechanism: string | null;
  amountRequested: number | null;
  amountApproved: number | null;
  amountPaid: number | null;
  fundingStatus: string;
  verificationStatus: VerificationStatus;
};

export type UiOutcome = {
  id: string;
  type: string;
  providerActorId: string | null;
  startDate: string | null;
  evidence: string;
  finalStatus: string;
  planBActivated: boolean;
  followups: Record<"J7" | "J30" | "J60" | "J90", string>;
  followupEvidence: Record<"J7" | "J30" | "J60" | "J90", string>;
  followupCheckedAt: Record<"J7" | "J30" | "J60" | "J90", string | null>;
};

export type UiCohort = {
  id: string;
  name: string;
  sector: string;
  territory: string;
  dateLabel: string;
  buyer: string;
  participants: number;
  opportunities: number;
  outcomes: number;
  status: string;
  owner: string;
};

export type UiOccupation = {
  id: string;
  label: string;
  code: string | null;
  sector: string;
  requiredSkills: string[];
  preferredSkills: string[];
  constraints: string[];
  verificationStatus: VerificationStatus;
  sourceLabel: string;
  sourceUrl: string | null;
  sourceKind: string;
};

export type UiReferenceSkill = {
  id: string;
  label: string;
  usedByOccupations: string[];
  participantConfidence: string | null;
  sourceLabels: string[];
  verificationStatus: VerificationStatus;
};

export type UiService = {
  id: string;
  actorId: string;
  actorName: string;
  name: string;
  capabilityLabels: string[];
  needsResolved: string[];
  skills: string[];
  territory: string[];
  eligibilityRules: string[];
  prerequisites: string[];
  requiredDocuments: string[];
  expectedOutput: string | null;
  mobilizationStatus: "ACTIVATABLE" | "QUALIFIED_WITH_CHECKS" | "UNAVAILABLE" | "TO_VERIFY";
  duration: string | null;
  places: string | null;
  cost: number | null;
  verificationStatus: VerificationStatus;
  sourceLabel: string;
  sourceUrl: string | null;
  caveats: string[];
};

export type UiNeedSolution = {
  needId: string;
  needLabel: string;
  requiredCapability: string;
  candidates: Array<{
    actorId: string;
    actorName: string;
    serviceId: string | null;
    serviceName: string | null;
    readiness: "ACTIVATABLE" | "QUALIFIED_WITH_CHECKS" | "DISCOVERY_ONLY" | "EXCLUDED";
    score: number;
    reasons: string[];
    unknowns: string[];
  }>;
};

export type UiOpportunity = {
  id: string;
  providerName: string;
  type: string;
  title: string;
  location: string;
  vacancies: string;
  status: string;
  verificationStatus: VerificationStatus;
  sourceLabel: string;
  sourceUrl: string | null;
  caveats: string[];
  synthetic: boolean;
};

export type OrchestrationUiModel = {
  demoLabel: string;
  cohort: UiCohort;
  passport: UiPassport;
  occupation: UiOccupation;
  occupations: UiOccupation[];
  referenceSkills: UiReferenceSkill[];
  actors: UiActor[];
  services: UiService[];
  needSolutions: UiNeedSolution[];
  opportunities: UiOpportunity[];
  steps: UiStep[];
  referrals: UiReferral[];
  costs: UiCostItem[];
  outcome: UiOutcome;
  pathwayId: string;
  pathwayVersion: number;
  pathwayStatus: string;
  planBActive: boolean;
  sourceRegistry: UiSourceRegistry;
};
