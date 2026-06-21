"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenant, requireRole } from "@/lib/tenant";
import type { FormActionState } from "@/server/formations-actions";

const EDITORS = ["OWNER", "ADMIN", "ASSISTANT"] as const;

const learnerSchema = z.object({
  firstName: z.string().min(1, "Prénom requis."),
  lastName: z.string().min(1, "Nom requis."),
  email: z.string().email("Email invalide.").optional().or(z.literal("")),
  phone: z.string().optional(),
  company: z.string().optional(),
});

function parse(formData: FormData) {
  return learnerSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email") || "",
    phone: formData.get("phone") || undefined,
    company: formData.get("company") || undefined,
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

export async function createLearner(_prev: FormActionState, formData: FormData): Promise<FormActionState> {
  const ctx = await requireTenant();
  requireRole(ctx, [...EDITORS]);
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  const d = parsed.data;
  const created = await prisma.learner.create({
    data: { organizationId: ctx.organizationId, firstName: d.firstName, lastName: d.lastName, email: d.email || null, phone: d.phone, company: d.company },
  });

  // inscription immédiate si fournie
  const sessionId = String(formData.get("sessionId") || "");
  if (sessionId) await enrollInternal(ctx.organizationId, created.id, sessionId);

  revalidatePath("/apprenants");
  redirect(`/apprenants/${created.id}`);
}

export async function createLearnersBatch(_prev: FormActionState, formData: FormData): Promise<FormActionState> {
  const ctx = await requireTenant();
  requireRole(ctx, [...EDITORS]);
  const items = parseItemsJson(formData);
  if (items.length === 0) return { error: "Aucune fiche apprenant à créer." };
  const sessionId = String(formData.get("sessionId") || "");

  for (let index = 0; index < items.length; index += 1) {
    const parsed = learnerSchema.safeParse(items[index]);
    if (!parsed.success) return { error: `Ligne ${index + 1}: ${parsed.error.issues[0]?.message ?? "Champs invalides."}` };
    const d = parsed.data;
    const created = await prisma.learner.create({
      data: { organizationId: ctx.organizationId, firstName: d.firstName, lastName: d.lastName, email: d.email || null, phone: d.phone, company: d.company },
    });
    const itemSessionId = String((items[index] as Record<string, unknown>).sessionId || sessionId || "");
    if (itemSessionId) await enrollInternal(ctx.organizationId, created.id, itemSessionId);
  }

  revalidatePath("/apprenants");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateLearner(id: string, _prev: FormActionState, formData: FormData): Promise<FormActionState> {
  const ctx = await requireTenant();
  requireRole(ctx, [...EDITORS]);
  const existing = await prisma.learner.findFirst({ where: { id, organizationId: ctx.organizationId } });
  if (!existing) return { error: "Apprenant introuvable." };
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  const d = parsed.data;
  await prisma.learner.update({ where: { id }, data: { firstName: d.firstName, lastName: d.lastName, email: d.email || null, phone: d.phone, company: d.company } });
  revalidatePath("/apprenants");
  revalidatePath(`/apprenants/${id}`);
  redirect(`/apprenants/${id}`);
}

export async function deleteLearner(id: string): Promise<void> {
  const ctx = await requireTenant();
  requireRole(ctx, [...EDITORS]);
  const existing = await prisma.learner.findFirst({ where: { id, organizationId: ctx.organizationId } });
  if (!existing) return;
  await prisma.learner.update({ where: { id }, data: { deletedAt: new Date() } });
  revalidatePath("/apprenants");
  redirect("/apprenants");
}

// ---- Inscriptions ----

async function enrollInternal(orgId: string, learnerId: string, sessionId: string) {
  const session = await prisma.session.findFirst({ where: { id: sessionId, organizationId: orgId }, include: { _count: { select: { enrollments: true } } } });
  if (!session) throw new Error("Session invalide.");
  if (session._count.enrollments >= session.capacity) throw new Error("Session complète.");
  const exists = await prisma.enrollment.findUnique({ where: { learnerId_sessionId: { learnerId, sessionId } } });
  if (exists) return;
  await prisma.enrollment.create({ data: { organizationId: orgId, learnerId, sessionId, status: "INSCRIT" } });
  const newCount = session._count.enrollments + 1;
  if (newCount >= session.capacity) await prisma.session.update({ where: { id: sessionId }, data: { status: "COMPLETE" } });
}

export async function enrollLearner(sessionId: string, formData: FormData): Promise<void> {
  const ctx = await requireTenant();
  requireRole(ctx, [...EDITORS]);
  const learnerId = String(formData.get("learnerId") || "");
  if (learnerId) {
    const learner = await prisma.learner.findFirst({ where: { id: learnerId, organizationId: ctx.organizationId } });
    if (learner) await enrollInternal(ctx.organizationId, learnerId, sessionId);
  }
  revalidatePath(`/sessions/${sessionId}`);
  revalidatePath("/dashboard");
}

export async function unenroll(enrollmentId: string): Promise<void> {
  const ctx = await requireTenant();
  requireRole(ctx, [...EDITORS]);
  const e = await prisma.enrollment.findFirst({ where: { id: enrollmentId, organizationId: ctx.organizationId } });
  if (!e) return;
  await prisma.enrollment.delete({ where: { id: enrollmentId } });
  // si la session était complète, repasser à ouverte
  await prisma.session.updateMany({ where: { id: e.sessionId, status: "COMPLETE" }, data: { status: "OUVERTE" } });
  revalidatePath(`/sessions/${e.sessionId}`);
  revalidatePath(`/apprenants/${e.learnerId}`);
  revalidatePath("/dashboard");
}

export async function setEnrollmentStatus(enrollmentId: string, status: string): Promise<void> {
  const ctx = await requireTenant();
  requireRole(ctx, [...EDITORS]);
  const allowed = ["PRE_INSCRIT", "INSCRIT", "CONFIRME", "PRESENT", "ABSENT", "TERMINE"];
  if (!allowed.includes(status)) return;
  const e = await prisma.enrollment.findFirst({ where: { id: enrollmentId, organizationId: ctx.organizationId } });
  if (!e) return;
  await prisma.enrollment.update({ where: { id: enrollmentId }, data: { status: status as never } });
  revalidatePath(`/sessions/${e.sessionId}`);
  revalidatePath(`/apprenants/${e.learnerId}`);
}

// ---- Import CSV ----
// Format attendu : prénom,nom,email,entreprise (1 par ligne, en-tête optionnel)
export async function importLearnersCsv(_prev: FormActionState, formData: FormData): Promise<FormActionState> {
  const ctx = await requireTenant();
  requireRole(ctx, [...EDITORS]);
  const raw = String(formData.get("csv") || "").trim();
  if (!raw) return { error: "Collez des lignes CSV." };

  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const rows: { firstName: string; lastName: string; email: string | null; company: string | null }[] = [];
  for (const line of lines) {
    const cols = line.split(/[,;\t]/).map((c) => c.trim());
    if (!cols[0] || /pr[ée]nom/i.test(cols[0])) continue; // saute en-tête
    rows.push({ firstName: cols[0], lastName: cols[1] ?? "", email: cols[2] || null, company: cols[3] || null });
  }
  if (rows.length === 0) return { error: "Aucune ligne valide détectée." };

  for (const r of rows) {
    await prisma.learner.create({ data: { organizationId: ctx.organizationId, firstName: r.firstName, lastName: r.lastName, email: r.email, company: r.company } });
  }
  revalidatePath("/apprenants");
  return { ok: true, error: undefined } as FormActionState;
}
