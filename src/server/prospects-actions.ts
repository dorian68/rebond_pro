"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenant, requireRole } from "@/lib/tenant";
import type { FormActionState } from "@/server/formations-actions";

const EDITORS = ["OWNER", "ADMIN", "COMMERCIAL"] as const;
const STAGES = ["NOUVEAU", "CONTACTE", "DEVIS", "RELANCE", "GAGNE", "PERDU"] as const;

const prospectSchema = z.object({
  name: z.string().min(1, "Nom requis."),
  contactName: z.string().optional(),
  type: z.enum(["PARTICULIER", "ENTREPRISE", "ORGANISME"]),
  email: z.string().email("Email invalide.").optional().or(z.literal("")),
  phone: z.string().optional(),
  formationOfInterestId: z.string().optional(),
  source: z.enum(["LINKEDIN", "SITE_WEB", "APPEL", "RECOMMANDATION", "SALON", "CAMPAGNE_EMAIL", "PAGE_PUBLIQUE", "AUTRE"]),
  stage: z.enum(STAGES),
  potentialEuros: z.coerce.number().min(0).optional(),
  nextAction: z.string().optional(),
  nextFollowUpDate: z.string().optional(),
  isHot: z.coerce.boolean().optional(),
  notes: z.string().optional(),
});

function parse(formData: FormData) {
  return prospectSchema.safeParse({
    name: formData.get("name"),
    contactName: formData.get("contactName") || undefined,
    type: formData.get("type"),
    email: formData.get("email") || "",
    phone: formData.get("phone") || undefined,
    formationOfInterestId: formData.get("formationOfInterestId") || undefined,
    source: formData.get("source"),
    stage: formData.get("stage"),
    potentialEuros: formData.get("potentialEuros") || 0,
    nextAction: formData.get("nextAction") || undefined,
    nextFollowUpDate: formData.get("nextFollowUpDate") || undefined,
    isHot: formData.get("isHot") === "on",
    notes: formData.get("notes") || undefined,
  });
}

function parseItemsJson(formData: FormData) {
  try {
    const raw = JSON.parse(String(formData.get("itemsJson") || "[]")) as unknown;
    if (!Array.isArray(raw)) return [];
    return raw.slice(0, 50);
  } catch {
    return [];
  }
}

export async function createProspect(_prev: FormActionState, formData: FormData): Promise<FormActionState> {
  const ctx = await requireTenant();
  requireRole(ctx, [...EDITORS]);
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  const d = parsed.data;
  const created = await prisma.prospect.create({
    data: {
      organizationId: ctx.organizationId, name: d.name, contactName: d.contactName, type: d.type,
      email: d.email || null, phone: d.phone, formationOfInterestId: d.formationOfInterestId || null,
      source: d.source, stage: d.stage, potentialAmount: Math.round((d.potentialEuros ?? 0) * 100),
      nextAction: d.nextAction, nextFollowUpDate: d.nextFollowUpDate ? new Date(d.nextFollowUpDate) : null,
      isHot: d.isHot ?? false, notes: d.notes, ownerId: ctx.userId,
    },
  });
  revalidatePath("/prospects");
  revalidatePath("/dashboard");
  redirect(`/prospects/${created.id}`);
}

export async function createProspectsBatch(_prev: FormActionState, formData: FormData): Promise<FormActionState> {
  const ctx = await requireTenant();
  requireRole(ctx, [...EDITORS]);
  const items = parseItemsJson(formData);
  if (items.length === 0) return { error: "Aucune fiche prospect à créer." };

  let created = 0;
  for (const item of items) {
    const parsed = prospectSchema.safeParse({
      ...(item as Record<string, unknown>),
      type: (item as Record<string, unknown>).type || "ENTREPRISE",
      source: (item as Record<string, unknown>).source || "AUTRE",
      stage: (item as Record<string, unknown>).stage || "NOUVEAU",
      potentialEuros: (item as Record<string, unknown>).potentialEuros || 0,
    });
    if (!parsed.success) return { error: `Ligne ${created + 1}: ${parsed.error.issues[0]?.message ?? "Champs invalides."}` };
    const d = parsed.data;
    await prisma.prospect.create({
      data: {
        organizationId: ctx.organizationId, name: d.name, contactName: d.contactName, type: d.type,
        email: d.email || null, phone: d.phone, formationOfInterestId: d.formationOfInterestId || null,
        source: d.source, stage: d.stage, potentialAmount: Math.round((d.potentialEuros ?? 0) * 100),
        nextAction: d.nextAction, nextFollowUpDate: d.nextFollowUpDate ? new Date(d.nextFollowUpDate) : null,
        isHot: d.isHot ?? false, notes: d.notes, ownerId: ctx.userId,
      },
    });
    created += 1;
  }
  revalidatePath("/prospects");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateProspect(id: string, _prev: FormActionState, formData: FormData): Promise<FormActionState> {
  const ctx = await requireTenant();
  requireRole(ctx, [...EDITORS]);
  const existing = await prisma.prospect.findFirst({ where: { id, organizationId: ctx.organizationId } });
  if (!existing) return { error: "Prospect introuvable." };
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  const d = parsed.data;
  await prisma.prospect.update({
    where: { id },
    data: {
      name: d.name, contactName: d.contactName, type: d.type, email: d.email || null, phone: d.phone,
      formationOfInterestId: d.formationOfInterestId || null, source: d.source, stage: d.stage,
      potentialAmount: Math.round((d.potentialEuros ?? 0) * 100), nextAction: d.nextAction,
      nextFollowUpDate: d.nextFollowUpDate ? new Date(d.nextFollowUpDate) : null, isHot: d.isHot ?? false, notes: d.notes,
    },
  });
  revalidatePath("/prospects");
  revalidatePath(`/prospects/${id}`);
  revalidatePath("/dashboard");
  redirect(`/prospects/${id}`);
}

export async function moveProspect(id: string, stage: string): Promise<void> {
  const ctx = await requireTenant();
  requireRole(ctx, [...EDITORS]);
  if (!STAGES.includes(stage as never)) return;
  const existing = await prisma.prospect.findFirst({ where: { id, organizationId: ctx.organizationId } });
  if (!existing || existing.stage === stage) return;
  await prisma.prospect.update({ where: { id }, data: { stage: stage as never } });
  await prisma.prospectActivity.create({ data: { prospectId: id, type: "stage_change", content: `Étape : ${existing.stage} → ${stage}` } });
  revalidatePath("/prospects");
  revalidatePath("/dashboard");
}

export async function deleteProspect(id: string): Promise<void> {
  const ctx = await requireTenant();
  requireRole(ctx, [...EDITORS]);
  const existing = await prisma.prospect.findFirst({ where: { id, organizationId: ctx.organizationId } });
  if (!existing) return;
  await prisma.prospect.update({ where: { id }, data: { deletedAt: new Date() } });
  revalidatePath("/prospects");
  redirect("/prospects");
}

export async function addProspectActivity(id: string, formData: FormData): Promise<void> {
  const ctx = await requireTenant();
  requireRole(ctx, [...EDITORS]);
  const existing = await prisma.prospect.findFirst({ where: { id, organizationId: ctx.organizationId } });
  if (!existing) return;
  const type = String(formData.get("type") || "note");
  const content = String(formData.get("content") || "").trim();
  if (!content) return;
  await prisma.prospectActivity.create({ data: { prospectId: id, type, content } });
  revalidatePath(`/prospects/${id}`);
}

/** Convertit un prospect gagné en apprenant + inscription sur une session. */
export async function convertProspect(id: string, formData: FormData): Promise<void> {
  const ctx = await requireTenant();
  requireRole(ctx, [...EDITORS]);
  const p = await prisma.prospect.findFirst({ where: { id, organizationId: ctx.organizationId } });
  if (!p) return;
  const sessionId = String(formData.get("sessionId") || "");
  const session = sessionId ? await prisma.session.findFirst({ where: { id: sessionId, organizationId: ctx.organizationId }, include: { _count: { select: { enrollments: true } } } }) : null;

  const [firstName, ...rest] = (p.contactName || p.name).split(" ");
  const learner = await prisma.learner.create({
    data: { organizationId: ctx.organizationId, firstName: firstName || p.name, lastName: rest.join(" ") || "", email: p.email, phone: p.phone, company: p.type !== "PARTICULIER" ? p.name : null },
  });
  if (session && session._count.enrollments < session.capacity) {
    await prisma.enrollment.create({ data: { organizationId: ctx.organizationId, learnerId: learner.id, sessionId: session.id, status: "INSCRIT" } });
  }
  await prisma.prospect.update({ where: { id }, data: { stage: "GAGNE" } });
  await prisma.prospectActivity.create({ data: { prospectId: id, type: "conversion", content: `Converti en apprenant${session ? " et inscrit à une session" : ""}.` } });
  revalidatePath("/prospects");
  revalidatePath("/apprenants");
  revalidatePath("/dashboard");
  redirect(`/apprenants/${learner.id}`);
}
