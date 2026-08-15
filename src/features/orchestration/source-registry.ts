import { z } from "zod";

import rawSourceRegistry from "../../../data/guadeloupe-orchestration.sources.json";
import {
  actorTypeSchema,
  capabilitySchema,
  verificationStatusSchema,
} from "./schemas";
import { NEED_TYPES, OPPORTUNITY_TYPES } from "./constants";

const identifierSchema = z.string().trim().min(1).max(160);
const shortTextSchema = z.string().trim().min(1).max(300);
const longTextSchema = z.string().trim().min(1).max(8_000);
const isoDateTimeSchema = z.string().refine(
  (value) => !Number.isNaN(Date.parse(value)),
  "Date ISO invalide.",
);

const registrySourceSchema = z
  .object({
    id: identifierSchema,
    title: shortTextSchema,
    publisher: shortTextSchema,
    url: z.string().url().nullable(),
    kind: z.enum(["PUBLIC_OFFICIAL", "INTERNAL_FILE"]),
    checkedAt: isoDateTimeSchema,
    publishedAt: isoDateTimeSchema.nullable(),
    verificationStatus: verificationStatusSchema,
    freshness: shortTextSchema,
    caveats: z.array(shortTextSchema).max(30),
  })
  .strict();

const marketSignalSchema = z
  .object({
    id: identifierSchema,
    label: shortTextSchema,
    value: z.number().finite(),
    unit: shortTextSchema,
    scope: shortTextSchema,
    period: shortTextSchema,
    sourceId: identifierSchema,
    caveat: longTextSchema,
  })
  .strict();

const fundingMechanismSchema = z
  .object({
    id: identifierSchema,
    name: shortTextSchema,
    funderActorId: identifierSchema.nullable(),
    purpose: longTextSchema,
    eligiblePublic: z.array(shortTextSchema).max(100),
    conditions: z.array(shortTextSchema).max(100),
    coveredCosts: z.array(shortTextSchema).max(100),
    amountRule: longTextSchema.nullable(),
    decisionRequired: z.literal(true),
    sourceId: identifierSchema,
    verificationStatus: verificationStatusSchema,
  })
  .strict();

const budgetScenarioSchema = z
  .object({
    id: identifierSchema,
    name: shortTextSchema,
    participants: z.number().int().positive(),
    durationMonths: z.number().int().positive(),
    totalCents: z.number().int().positive(),
    targetFundingCents: z.number().int().nonnegative(),
    targetCofundingCents: z.number().int().nonnegative(),
    status: z.literal("INTERNAL_SCENARIO"),
    sourceId: identifierSchema,
    caveat: longTextSchema,
  })
  .strict();

const evidenceRequirementSchema = z
  .object({
    id: identifierSchema,
    label: shortTextSchema,
    appliesTo: shortTextSchema,
    requiredEvidence: z.array(shortTextSchema).min(1).max(100),
    sourceId: identifierSchema,
    verificationStatus: verificationStatusSchema,
  })
  .strict();

const registryContactSchema = z
  .object({
    name: shortTextSchema.nullable(),
    role: shortTextSchema.nullable(),
    email: z.string().email().nullable(),
    phone: shortTextSchema.nullable(),
  })
  .strict();

const officialActorSchema = z
  .object({
    id: identifierSchema,
    legalName: shortTextSchema.nullable(),
    displayName: shortTextSchema,
    actorTypes: z.array(actorTypeSchema).max(20),
    territory: z.array(shortTextSchema).max(30),
    employmentBasin: z.array(shortTextSchema).max(30),
    addresses: z.array(shortTextSchema).max(20),
    contacts: z.array(registryContactSchema).max(30),
    capabilities: z.array(z.object({
      capability: capabilitySchema,
      verificationStatus: verificationStatusSchema,
      sourceId: identifierSchema,
      notes: longTextSchema,
    }).strict()).max(50),
    eligibilityRules: z.array(shortTextSchema).max(100),
    sourceId: identifierSchema,
    verificationStatus: verificationStatusSchema,
    lastVerifiedAt: isoDateTimeSchema,
    verificationOwner: shortTextSchema,
  })
  .strict();

const officialServiceOfferSchema = z
  .object({
    id: identifierSchema,
    actorId: identifierSchema,
    name: shortTextSchema,
    description: longTextSchema,
    capabilitiesProvided: z.array(capabilitySchema).min(1).max(50),
    skillsDeveloped: z.array(shortTextSchema).max(100),
    needsResolved: z.array(z.enum(NEED_TYPES)).max(30),
    targetPublic: z.array(shortTextSchema).max(100),
    territory: z.array(shortTextSchema).max(30),
    eligibilityRules: z.array(shortTextSchema).max(100),
    prerequisites: z.array(shortTextSchema).max(100),
    duration: shortTextSchema.nullable(),
    dates: z.array(isoDateTimeSchema).max(100),
    places: z.number().int().nonnegative().nullable(),
    costCents: z.number().int().nonnegative().nullable(),
    possibleFunderActorIds: z.array(identifierSchema).max(100),
    requiredDocuments: z.array(shortTextSchema).max(100),
    expectedOutput: longTextSchema.nullable(),
    verificationStatus: verificationStatusSchema,
    sourceId: identifierSchema,
  })
  .strict();

const registrySkillRequirementSchema = z
  .object({
    skillId: shortTextSchema.nullable(),
    skillLabel: shortTextSchema,
    minimumLevel: shortTextSchema.nullable(),
    minimumLevelRank: z.number().int().min(0).max(10).nullable(),
  })
  .strict();

const officialOpportunitySchema = z
  .object({
    id: identifierSchema,
    providerActorId: identifierSchema,
    type: z.enum(OPPORTUNITY_TYPES),
    title: shortTextSchema,
    occupationId: shortTextSchema.nullable(),
    location: shortTextSchema.nullable(),
    schedule: longTextSchema.nullable(),
    startDate: isoDateTimeSchema.nullable(),
    endDate: isoDateTimeSchema.nullable(),
    contractType: shortTextSchema.nullable(),
    vacancies: z.number().int().nonnegative().nullable(),
    requiredSkills: z.array(registrySkillRequirementSchema).max(200),
    preferredSkills: z.array(registrySkillRequirementSchema).max(200),
    prerequisites: z.array(shortTextSchema).max(100),
    constraints: z.array(shortTextSchema).max(100),
    applicationProcess: longTextSchema.nullable(),
    contact: longTextSchema.nullable(),
    responseDeadline: isoDateTimeSchema.nullable(),
    status: z.enum(["DRAFT", "OPEN", "PAUSED", "FILLED", "CLOSED", "UNKNOWN"]),
    verificationStatus: verificationStatusSchema,
    sourceId: identifierSchema,
  })
  .strict();

export const sourceRegistrySchema = z
  .object({
    meta: z
      .object({
        territory: shortTextSchema,
        generatedAt: isoDateTimeSchema,
        warning: longTextSchema,
        missingSources: z.array(shortTextSchema).max(100),
      })
      .strict(),
    sources: z.array(registrySourceSchema),
    marketSignals: z.array(marketSignalSchema),
    fundingMechanisms: z.array(fundingMechanismSchema),
    budgetScenarios: z.array(budgetScenarioSchema),
    evidenceRequirements: z.array(evidenceRequirementSchema),
    officialActors: z.array(officialActorSchema),
    officialServiceOffers: z.array(officialServiceOfferSchema),
    officialOpportunities: z.array(officialOpportunitySchema),
  })
  .strict()
  .superRefine((registry, context) => {
    const sourceIds = new Set(registry.sources.map((source) => source.id));
    const referencedSourceIds = [
      ...registry.marketSignals.map((signal) => signal.sourceId),
      ...registry.fundingMechanisms.map((mechanism) => mechanism.sourceId),
      ...registry.budgetScenarios.map((scenario) => scenario.sourceId),
      ...registry.evidenceRequirements.map((requirement) => requirement.sourceId),
      ...registry.officialActors.flatMap((actor) => [actor.sourceId, ...actor.capabilities.map((claim) => claim.sourceId)]),
      ...registry.officialServiceOffers.map((offer) => offer.sourceId),
      ...registry.officialOpportunities.map((opportunity) => opportunity.sourceId),
    ];

    for (const sourceId of referencedSourceIds) {
      if (!sourceIds.has(sourceId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Source de registre inconnue : ${sourceId}.`,
        });
      }
    }
  });

export type SourceRegistry = z.infer<typeof sourceRegistrySchema>;

export const sourceRegistry: SourceRegistry = sourceRegistrySchema.parse(rawSourceRegistry);
