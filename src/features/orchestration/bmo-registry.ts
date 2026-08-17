import { z } from "zod";

import rawRegistry from "../../../data/bmo-2026-guadeloupe.json";
import { occupationMarketContextSchema, occupationSchema, sourceRefSchema } from "./schemas";
import type { Occupation, OccupationMarketContext, SourceRef } from "./types";

const publishedMeasureSchema = z.object({
  raw: z.string(),
  value: z.number().int().nonnegative().nullable(),
  status: z.enum(["published", "suppressed"]),
}).strict().superRefine((measure, context) => {
  if (measure.status === "suppressed" && (measure.raw !== "*" || measure.value !== null)) {
    context.addIssue({ code: "custom", message: "Une valeur BMO masquée doit conserver raw='*' et value=null." });
  }
  if (measure.status === "published" && measure.value === null) {
    context.addIssue({ code: "custom", message: "Une valeur BMO publiée doit rester numérique." });
  }
});

const aggregateMeasureSchema = z.object({
  value: z.number().int().nonnegative().nullable(),
  knownSubtotal: z.number().int().nonnegative(),
  publishedCellCount: z.number().int().nonnegative(),
  suppressedCellCount: z.number().int().nonnegative(),
  complete: z.boolean(),
}).strict().superRefine((measure, context) => {
  if (measure.complete && measure.value !== measure.knownSubtotal) {
    context.addIssue({ code: "custom", message: "Un agrégat BMO complet doit égaler son sous-total connu." });
  }
  if (!measure.complete && measure.value !== null) {
    context.addIssue({ code: "custom", message: "Un agrégat BMO incomplet doit conserver value=null." });
  }
});

const occupationIdentitySchema = z.object({
  code: z.string().min(1),
  label: z.string().min(1),
  familyCode: z.string().min(1),
  familyLabel: z.string().min(1),
}).strict();

const basinIdentitySchema = z.object({
  code: z.string().min(1),
  label: z.string().min(1),
  clpe: z.string().min(1),
}).strict();

const bmoRecordSchema = z.object({
  id: z.string().min(1),
  sourceRow: z.number().int().positive(),
  occupation: occupationIdentitySchema,
  basin: basinIdentitySchema,
  projects: publishedMeasureSchema,
  difficultProjects: publishedMeasureSchema,
  seasonalProjects: publishedMeasureSchema,
}).strict();

const bmoOccupationSignalSchema = occupationIdentitySchema.extend({
  recordCount: z.number().int().nonnegative(),
  observedBasinCount: z.number().int().nonnegative(),
  basinCodes: z.array(z.string().min(1)),
  projects: aggregateMeasureSchema,
  difficultProjects: aggregateMeasureSchema,
  seasonalProjects: aggregateMeasureSchema,
}).strict();

const officialPdfReferenceSchema = z.object({
  pdfPageNumber: z.number().int().positive(),
  projects: z.number().int().nonnegative(),
  difficultSharePercent: z.number().nonnegative(),
  seasonalSharePercent: z.number().nonnegative(),
}).strict();

const bmoBasinSchema = basinIdentitySchema.extend({
  recordCount: z.number().int().nonnegative(),
  occupationCount: z.number().int().nonnegative(),
  projects: aggregateMeasureSchema,
  difficultProjects: aggregateMeasureSchema,
  seasonalProjects: aggregateMeasureSchema,
  officialPdfReference: officialPdfReferenceSchema,
  reconciliation: z.object({
    projectsKnownSubtotal: z.number().int().nonnegative(),
    projectsPublishedReference: z.number().int().nonnegative(),
    projectsSuppressedRemainder: z.number().int().nonnegative(),
    suppressedProjectCellCount: z.number().int().nonnegative(),
    status: z.string().min(1),
  }).strict(),
}).strict();

const bmoRegistrySchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  meta: z.object({
    datasetId: z.literal("bmo-2026-guadeloupe"),
    title: z.string().min(1),
    surveyYear: z.literal(2026),
    territory: z.object({
      regionCode: z.literal("01"),
      regionLabel: z.literal("Guadeloupe"),
      departmentCode: z.literal("971"),
      departmentLabel: z.literal("Guadeloupe"),
    }).strict(),
    generatedBy: z.string().min(1),
    reproducibility: z.object({
      deterministic: z.literal(true),
      generatedAtIncluded: z.literal(false),
      sourceIntegrityPolicy: z.literal("fail_on_sha256_mismatch"),
    }).strict(),
    provenance: z.object({
      workbook: z.object({
        producer: z.string().min(1),
        datasetPageUrl: z.string().url(),
        officialResourceUrl: z.string().url(),
        localPath: z.string().min(1),
        sha256: z.string().regex(/^[a-f0-9]{64}$/),
        license: z.string().min(1),
        worksheet: z.string().min(1),
      }).strict(),
      pdf: z.object({
        producer: z.string().min(1),
        officialUrl: z.string().url(),
        localPath: z.string().min(1),
        sha256: z.string().regex(/^[a-f0-9]{64}$/),
        referenceExtraction: z.string().min(1),
      }).strict(),
      method: z.object({
        producer: z.string().min(1),
        officialUrl: z.string().url(),
        surveyWindow: z.string().min(1),
        occupationNomenclature: z.literal("FAP 2021"),
      }).strict(),
    }).strict(),
    sourceSchema: z.record(z.string(), z.unknown()),
    counts: z.object({
      workbookDataRows: z.number().int().positive(),
      workbookNationalOccupations: z.number().int().positive(),
      records: z.literal(508),
      occupations: z.literal(180),
      basins: z.literal(5),
    }).strict(),
    quality: z.object({
      verdict: z.string().min(1),
      structuralChecksPassed: z.literal(true),
      sourceHashesVerified: z.literal(true),
      suppressedValuesImputed: z.literal(false),
    }).strict(),
  }).strict(),
  records: z.array(bmoRecordSchema).length(508),
  occupations: z.array(bmoOccupationSignalSchema).length(180),
  basins: z.array(bmoBasinSchema).length(5),
  aggregates: z.object({
    region: z.object({
      recordCount: z.literal(508),
      occupationCount: z.literal(180),
      basinCount: z.literal(5),
      projects: aggregateMeasureSchema,
      difficultProjects: aggregateMeasureSchema,
      seasonalProjects: aggregateMeasureSchema,
      officialPdfReferences: z.object({
        headline: officialPdfReferenceSchema.extend({ recruitingEstablishmentsSharePercent: z.number().nonnegative() }).strict(),
        regionTable: officialPdfReferenceSchema,
      }).strict(),
      reconciliation: z.object({
        projectsKnownSubtotal: z.number().int().nonnegative(),
        projectsPublishedReference: z.number().int().nonnegative(),
        projectsSuppressedRemainder: z.number().int().nonnegative(),
        suppressedProjectCellCount: z.number().int().nonnegative(),
        status: z.string().min(1),
      }).strict(),
    }).strict(),
  }).strict(),
  reconciliations: z.array(z.object({ id: z.string().min(1), status: z.string().min(1) }).passthrough()),
  ambiguities: z.array(z.object({ id: z.string().min(1), severity: z.string().min(1), detail: z.string().min(1), decision: z.string().min(1) }).passthrough()),
}).strict();

export type BmoOccupationSignal = z.infer<typeof bmoOccupationSignalSchema>;
export type Bmo2026Registry = z.infer<typeof bmoRegistrySchema>;

/** Runtime validation makes accidental '*' → 0 coercion a hard failure. */
export const bmo2026Registry: Bmo2026Registry = bmoRegistrySchema.parse(rawRegistry);
export const bmoOccupationSignals = bmo2026Registry.occupations;

export const BMO_2026_SOURCE_REF: SourceRef = sourceRefSchema.parse({
  kind: "PUBLIC_OFFICIAL",
  label: "France Travail · BMO 2026 open data · Guadeloupe",
  file: "bmo-2026-france-travail.xlsx",
  sheet: "BMO_2026_open_data",
  page: null,
  line: null,
  section: "Filtre REG=01 · Dept=971",
  recordId: "source-bmo-2026-open-data-guadeloupe",
  uri: bmo2026Registry.meta.provenance.workbook.datasetPageUrl,
});

/**
 * Creates an L0 engineering target for a BMO family.
 * It deliberately contains no invented ROME mapping, skill, prerequisite,
 * constraint or opportunity. It is not persisted as a canonical occupation.
 */
export function bmoSignalToOccupation(signalInput: BmoOccupationSignal): Occupation {
  const signal = bmoOccupationSignalSchema.parse(signalInput);
  return occupationSchema.parse({
    id: `bmo-2026-${signal.code.toLocaleLowerCase("fr-FR")}`,
    label: signal.label,
    romeCode: null,
    fapCode: signal.code,
    fapMapping: null,
    sector: "Secteur NAF non renseigné — famille métier FAP conservée séparément",
    requiredSkills: [],
    preferredSkills: [],
    prerequisites: [],
    constraints: [],
    typicalSchedules: [],
    relatedOccupationIds: [],
    sourceRef: { ...BMO_2026_SOURCE_REF, recordId: `bmo-2026-${signal.code}` },
    verificationStatus: "NEEDS_VERIFICATION",
  });
}

export const bmoEngineeringTargets = bmoOccupationSignals.map(bmoSignalToOccupation);

export function getBmoOccupationSignal(fapCode: string | null | undefined) {
  if (!fapCode) return null;
  return bmoOccupationSignals.find((signal) => signal.code === fapCode) ?? null;
}

export function getBmoMarketContextForOccupation(occupation: Occupation): OccupationMarketContext | null {
  const signal = getBmoOccupationSignal(occupation.fapCode);
  if (!signal) return null;
  return occupationMarketContextSchema.parse({
    fapCode: signal.code,
    label: signal.label,
    familyCode: signal.familyCode,
    familyLabel: signal.familyLabel,
    territory: bmo2026Registry.meta.territory.regionLabel,
    projectsKnown: signal.projects.knownSubtotal,
    hasSuppressedProjects: signal.projects.suppressedCellCount > 0,
    basinCount: signal.observedBasinCount,
    sourceRef: { ...BMO_2026_SOURCE_REF, recordId: `bmo-2026-${signal.code}` },
    warning: "Signal statistique BMO : intention de recrutement déclarée et redressée. Ce n’est ni une offre, ni une place disponible, ni une opportunité activable.",
  });
}

export function getBmoRecordsForOccupation(fapCode: string) {
  return bmo2026Registry.records.filter((record) => record.occupation.code === fapCode);
}
