import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { TenantContext } from "@/lib/tenant";
import { DOCUMENT_CATALOG_BY_TYPE } from "@/lib/document-catalog";
import { DOCUMENT_VARIABLE_MAP, variableLabel } from "@/lib/document-variables";
import { MODALITY_LABELS, SLOT_LABELS } from "@/lib/labels";
import { formatDate, formatDateRange, formatMoney } from "@/lib/utils";

export type MissingVariable = {
  key: string;
  label: string;
  group: string;
  severity: "important" | "recommended" | "optional";
  reason: string;
};

export type DocumentGenerationContext = {
  values: Record<string, string | number | null | undefined>;
  missingVariables: MissingVariable[];
  availableVariables: string[];
  unknownVariables: string[];
  completionStatus: "COMPLETE" | "PARTIAL" | "DRAFT";
  completionScore: number;
};

export type TemplateChoice = {
  id?: string;
  name: string;
  engine: string;
  sourceFileUrl?: string | null;
  sourceFileName?: string | null;
  version?: number;
  organizationId?: string | null;
  isBuiltin: boolean;
  variables: string[];
};

export type DocumentPreflight = DocumentGenerationContext & {
  type: string;
  template: TemplateChoice;
  engineLabel: string;
  filledVariables: string[];
  detectedVariables: string[];
};

type Overrides = Record<string, string | number | null | undefined>;

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function asOverrides(input?: unknown): Overrides {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  return input as Overrides;
}

function clean(v: unknown): string | number | null | undefined {
  if (v === null || v === undefined) return v;
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  const s = String(v).trim();
  return s.length > 0 ? s : undefined;
}

function severityFor(type: string, key: string): MissingVariable["severity"] {
  const cat = DOCUMENT_CATALOG_BY_TYPE[type];
  if (cat?.importantVariables.includes(key)) return "important";
  if (cat?.recommendedVariables.includes(key)) return "recommended";
  return "optional";
}

function statusFrom(missing: MissingVariable[], total: number): Pick<DocumentGenerationContext, "completionScore" | "completionStatus"> {
  const important = missing.filter((m) => m.severity === "important").length;
  const recommended = missing.filter((m) => m.severity === "recommended").length;
  const penalty = important * 25 + recommended * 12 + Math.max(0, missing.length - important - recommended) * 4;
  const completionScore = total === 0 ? 100 : Math.max(0, Math.min(100, 100 - penalty));
  const completionStatus = missing.length === 0 ? "COMPLETE" : completionScore >= 55 && important <= 1 ? "PARTIAL" : "DRAFT";
  return { completionScore, completionStatus };
}

export function readablePlaceholder(key: string): string {
  return `[À compléter : ${variableLabel(key)}]`;
}

function sessionSchedule(slots: string[]): string {
  return slots.map((s) => SLOT_LABELS[s] ?? s).join(", ");
}

async function loadContextData(ctx: TenantContext, sessionId?: string, enrollmentId?: string) {
  const [org, session, enrollment] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      select: {
        name: true, legalName: true, legalAddress: true, nda: true, legalRep: true, siret: true,
        publicEmail: true, publicPhone: true, website: true, currency: true,
      },
    }),
    sessionId ? prisma.session.findFirst({
      where: { id: sessionId, organizationId: ctx.organizationId },
      include: {
        formation: true,
        trainer: { select: { firstName: true, lastName: true, email: true } },
        room: { select: { name: true, location: true, url: true } },
        enrollments: { include: { learner: true } },
      },
    }) : null,
    enrollmentId ? prisma.enrollment.findFirst({
      where: { id: enrollmentId, organizationId: ctx.organizationId },
      include: { learner: true },
    }) : null,
  ]);
  return { org, session, enrollment };
}

export async function buildDocumentGenerationContext(input: {
  ctx: TenantContext;
  type: string;
  sessionId?: string;
  enrollmentId?: string;
  variables?: string[];
  manualOverrides?: unknown;
}): Promise<DocumentGenerationContext> {
  const { org, session, enrollment } = await loadContextData(input.ctx, input.sessionId, input.enrollmentId);
  const firstEnrollment = enrollment ?? session?.enrollments[0] ?? null;
  const learner = firstEnrollment?.learner ?? null;
  const formation = session?.formation ?? null;
  const trainerName = session?.trainer ? `${session.trainer.firstName} ${session.trainer.lastName}` : undefined;
  const roomLabel = session?.room?.name ?? session?.room?.location ?? session?.room?.url ?? undefined;
  const dateRange = session ? formatDateRange(session.startDate, session.endDate) : undefined;
  const currency = org?.currency ?? "EUR";
  const overrides = asOverrides(input.manualOverrides);

  const base: Record<string, string | number | null | undefined> = {
    org_name: org?.name,
    org_legal_name: org?.legalName ?? org?.name,
    org_legal_address: org?.legalAddress,
    org_nda: org?.nda,
    org_legal_rep: org?.legalRep,
    org_siret: org?.siret,
    org_email: org?.publicEmail,
    org_phone: org?.publicPhone,
    org_website: org?.website,
    centre_nom: org?.name,
    centre_adresse: org?.legalAddress,
    centre_siret: org?.siret,
    centre_nda: org?.nda,
    centre_email: org?.publicEmail,
    centre_phone: org?.publicPhone,
    formation_title: formation?.title,
    formation_duration_days: formation?.durationDays,
    formation_duration_hours: formation?.durationHours,
    formation_program: formation?.program,
    formation_objectives: formation?.objectives,
    formation_modality: formation?.modality ? MODALITY_LABELS[formation.modality] ?? formation.modality : undefined,
    formation_titre: formation?.title,
    formation_duree: formation?.durationHours ? `${formation.durationHours} heures` : formation?.durationDays ? `${formation.durationDays} jours` : undefined,
    formation_programme: formation?.program,
    formation_objectifs: formation?.objectives,
    formation_modalite: formation?.modality ? MODALITY_LABELS[formation.modality] ?? formation.modality : undefined,
    formation_tarif: session ? formatMoney(session.pricePerLearner, currency) : undefined,
    session_date: dateRange,
    session_dates: dateRange,
    session_date_range: dateRange,
    session_start_date: session ? formatDate(session.startDate) : undefined,
    session_end_date: session ? formatDate(session.endDate) : undefined,
    session_location: roomLabel,
    session_lieu: roomLabel,
    session_schedule: session ? sessionSchedule(session.slots) : undefined,
    session_horaires: session ? sessionSchedule(session.slots) : undefined,
    horaires: session ? sessionSchedule(session.slots) : undefined,
    trainer_name: trainerName,
    trainer_email: session?.trainer?.email,
    formateur_nom: trainerName,
    room_name: session?.room?.name,
    learner_name: learner ? `${learner.firstName} ${learner.lastName}` : undefined,
    learner_company: learner?.company,
    learner_email: learner?.email,
    learner_phone: learner?.phone,
    apprenant_nom: learner ? `${learner.firstName} ${learner.lastName}` : undefined,
    apprenant_email: learner?.email,
    apprenant_phone: learner?.phone,
    apprenant_entreprise: learner?.company,
    beneficiaire_nom: learner ? `${learner.firstName} ${learner.lastName}` : undefined,
    company_name: learner?.company,
    client_nom: learner ? `${learner.firstName} ${learner.lastName}` : undefined,
    client_entreprise: learner?.company,
    entreprise_nom: learner?.company,
    amountText: session ? formatMoney(session.pricePerLearner, currency) : undefined,
    prix_total: session ? formatMoney(session.pricePerLearner, currency) : undefined,
    prix_unitaire: session ? formatMoney(session.pricePerLearner, currency) : undefined,
    montant: session ? formatMoney(session.pricePerLearner, currency) : undefined,
    total_ht: session ? formatMoney(session.pricePerLearner, currency) : undefined,
    ligne_total_ht: session ? formatMoney(session.pricePerLearner, currency) : undefined,
    total_ttc: session ? formatMoney(session.pricePerLearner, currency) : undefined,
    quantite: session?.enrollments.length,
    apprenants_liste: session?.enrollments.map((e) => `${e.learner.firstName} ${e.learner.lastName}`).join(", "),
    nombre_apprenants: session?.enrollments.length,
    generatedAt: new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date()),
    date_generation: new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date()),
    date_document: new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date()),
    date_signature: new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date()),
    date_facture: new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date()),
    annee: new Date().getUTCFullYear(),
    document_reference: `DOC-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`,
    facture_numero: `FAC-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`,
    devis_numero: `DEV-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`,
    reference: `REF-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`,
    signataire_nom: org?.legalRep,
    signature_nom: org?.legalRep,
    signataire_centre: org?.legalRep,
  };

  const values = { ...base };
  for (const [key, value] of Object.entries(overrides)) values[key] = clean(value);

  const expected = input.variables?.length ? input.variables : DOCUMENT_CATALOG_BY_TYPE[input.type]?.recommendedVariables ?? [];
  const uniqueExpected = [...new Set(expected)];
  const unknownVariables = uniqueExpected.filter((key) => !DOCUMENT_VARIABLE_MAP[key]);
  const missingVariables = uniqueExpected
    .filter((key) => DOCUMENT_VARIABLE_MAP[key] && clean(values[key]) === undefined)
    .map((key) => {
      const meta = DOCUMENT_VARIABLE_MAP[key];
      const severity = severityFor(input.type, key);
      return {
        key,
        label: meta.label,
        group: meta.group,
        severity,
        reason: "Aucune donnée CRM ou surcharge manuelle disponible.",
      };
    });

  const availableVariables = uniqueExpected.filter((key) => clean(values[key]) !== undefined);
  return {
    values,
    missingVariables,
    availableVariables,
    unknownVariables,
    ...statusFrom(missingVariables, uniqueExpected.length),
  };
}

export async function resolveDocumentTemplate(input: {
  ctx: TenantContext;
  type: string;
  templateId?: string | null;
}): Promise<TemplateChoice> {
  const { ctx, type, templateId } = input;
  if (templateId === "__builtin") {
    return { name: "PDF intégré Le Bon Rebond", engine: "PDF", isBuiltin: true, variables: DOCUMENT_CATALOG_BY_TYPE[type]?.recommendedVariables ?? [] };
  }
  const explicit = templateId ? await prisma.documentTemplate.findFirst({
    where: {
      id: templateId,
      type: type as never,
      status: "ACTIVE",
      OR: [{ organizationId: ctx.organizationId }, { organizationId: null }],
    },
  }) : null;
  const baseWhere = {
    type: type as never,
    status: "ACTIVE" as const,
    engine: "DOCX",
    sourceFileUrl: { not: null },
  };
  const automatic = explicit
    ?? await prisma.documentTemplate.findFirst({ where: { ...baseWhere, organizationId: ctx.organizationId, isDefault: true }, orderBy: { updatedAt: "desc" } })
    ?? await prisma.documentTemplate.findFirst({ where: { ...baseWhere, organizationId: ctx.organizationId }, orderBy: { updatedAt: "desc" } })
    ?? await prisma.documentTemplate.findFirst({ where: { ...baseWhere, organizationId: null, isDefault: true }, orderBy: { updatedAt: "desc" } })
    ?? await prisma.documentTemplate.findFirst({ where: { ...baseWhere, organizationId: null }, orderBy: { updatedAt: "desc" } });

  if (!automatic) {
    return { name: "PDF intégré Le Bon Rebond", engine: "PDF", isBuiltin: true, variables: DOCUMENT_CATALOG_BY_TYPE[type]?.recommendedVariables ?? [] };
  }
  return {
    id: automatic.id,
    name: automatic.name,
    engine: automatic.engine,
    sourceFileUrl: automatic.sourceFileUrl,
    sourceFileName: automatic.sourceFileName,
    version: automatic.version,
    organizationId: automatic.organizationId,
    isBuiltin: false,
    variables: automatic.variables,
  };
}

export async function getDocumentGenerationPreflight(input: {
  ctx: TenantContext;
  type: string;
  sessionId?: string;
  enrollmentId?: string;
  templateId?: string | null;
  manualOverrides?: unknown;
}): Promise<DocumentPreflight> {
  const template = await resolveDocumentTemplate(input);
  const detectedVariables = template.variables.length > 0 ? template.variables : DOCUMENT_CATALOG_BY_TYPE[input.type]?.recommendedVariables ?? [];
  const context = await buildDocumentGenerationContext({
    ctx: input.ctx,
    type: input.type,
    sessionId: input.sessionId,
    enrollmentId: input.enrollmentId,
    variables: detectedVariables,
    manualOverrides: input.manualOverrides,
  });
  return {
    type: input.type,
    template,
    engineLabel: template.engine === "DOCX" && template.sourceFileUrl ? "DOCX modèle" : "PDF intégré",
    detectedVariables,
    filledVariables: context.availableVariables,
    ...context,
  };
}

export function contextSnapshot(input: DocumentGenerationContext): Prisma.InputJsonObject {
  const cleanValues = Object.fromEntries(
    Object.entries(input.values).map(([key, value]) => [key, value === undefined ? null : value]),
  );
  return {
    values: cleanValues,
    availableVariables: input.availableVariables,
    unknownVariables: input.unknownVariables,
    completionStatus: input.completionStatus,
    completionScore: input.completionScore,
  };
}

export { DOCX_MIME };
