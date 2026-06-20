"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenant, requireRole } from "@/lib/tenant";
import { revalidateMarketplace } from "@/server/marketplace";
import { slugify } from "@/lib/utils";
import { logger } from "@/lib/logger";

export type FormActionState = { error?: string; ok?: boolean } | undefined;

const EDITORS = ["OWNER", "ADMIN"] as const;

const formationSchema = z.object({
  title: z.string().min(2, "Le titre est requis."),
  category: z.string().optional(),
  shortDescription: z.string().optional(),
  longDescription: z.string().optional(),
  objectives: z.string().optional(),
  targetAudience: z.string().optional(),
  prerequisites: z.string().optional(),
  program: z.string().optional(),
  durationDays: z.coerce.number().int().min(0).optional(),
  durationHours: z.coerce.number().int().min(0).optional(),
  priceEuros: z.coerce.number().min(0, "Prix invalide."),
  modality: z.enum(["PRESENTIEL", "DISTANCIEL", "HYBRIDE"]),
  level: z.enum(["DEBUTANT", "INTERMEDIAIRE", "AVANCE"]),
  status: z.enum(["BROUILLON", "PUBLIE", "ARCHIVE"]),
  color: z.string().optional(),
});

function parse(formData: FormData) {
  return formationSchema.safeParse({
    title: formData.get("title"),
    category: formData.get("category") || undefined,
    shortDescription: formData.get("shortDescription") || undefined,
    longDescription: formData.get("longDescription") || undefined,
    objectives: formData.get("objectives") || undefined,
    targetAudience: formData.get("targetAudience") || undefined,
    prerequisites: formData.get("prerequisites") || undefined,
    program: formData.get("program") || undefined,
    durationDays: formData.get("durationDays") || undefined,
    durationHours: formData.get("durationHours") || undefined,
    priceEuros: formData.get("priceEuros") ?? 0,
    modality: formData.get("modality"),
    level: formData.get("level"),
    status: formData.get("status"),
    color: formData.get("color") || undefined,
  });
}

async function uniqueSlug(orgId: string, base: string, exceptId?: string): Promise<string> {
  const root = slugify(base) || "formation";
  let slug = root;
  for (let i = 1; ; i++) {
    const found = await prisma.formation.findFirst({ where: { organizationId: orgId, slug, NOT: exceptId ? { id: exceptId } : undefined } });
    if (!found) return slug;
    slug = `${root}-${i}`;
  }
}

async function uniquePublicSlug(base: string, exceptId?: string): Promise<string> {
  const root = slugify(base) || "formation";
  let slug = root;
  for (let i = 1; ; i++) {
    const found = await prisma.formation.findFirst({ where: { publicSlug: slug, NOT: exceptId ? { id: exceptId } : undefined } });
    if (!found) return slug;
    slug = `${root}-${i}`;
  }
}

export async function createFormation(_prev: FormActionState, formData: FormData): Promise<FormActionState> {
  const ctx = await requireTenant();
  requireRole(ctx, [...EDITORS]);
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  const d = parsed.data;

  const slug = await uniqueSlug(ctx.organizationId, d.title);
  const created = await prisma.formation.create({
    data: {
      organizationId: ctx.organizationId,
      title: d.title,
      slug,
      category: d.category,
      shortDescription: d.shortDescription,
      longDescription: d.longDescription,
      objectives: d.objectives,
      targetAudience: d.targetAudience,
      prerequisites: d.prerequisites,
      program: d.program,
      durationDays: d.durationDays,
      durationHours: d.durationHours,
      price: Math.round(d.priceEuros * 100),
      modality: d.modality,
      level: d.level,
      status: d.status,
      color: d.color,
    },
  });
  revalidatePath("/formations");
  redirect(`/formations/${created.id}`);
}

export async function updateFormation(id: string, _prev: FormActionState, formData: FormData): Promise<FormActionState> {
  const ctx = await requireTenant();
  requireRole(ctx, [...EDITORS]);
  const existing = await prisma.formation.findFirst({ where: { id, organizationId: ctx.organizationId } });
  if (!existing) return { error: "Formation introuvable." };

  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  const d = parsed.data;

  const slug = d.title !== existing.title ? await uniqueSlug(ctx.organizationId, d.title, id) : existing.slug;
  await prisma.formation.update({
    where: { id },
    data: {
      title: d.title, slug, category: d.category, shortDescription: d.shortDescription, longDescription: d.longDescription,
      objectives: d.objectives, targetAudience: d.targetAudience, prerequisites: d.prerequisites, program: d.program,
      durationDays: d.durationDays, durationHours: d.durationHours, price: Math.round(d.priceEuros * 100),
      modality: d.modality, level: d.level, status: d.status, color: d.color,
    },
  });
  revalidatePath("/formations");
  revalidatePath(`/formations/${id}`);
  revalidateMarketplace(); // si la formation est publiée, le cache public reflète l'édition
  redirect(`/formations/${id}`);
}

export async function deleteFormation(id: string): Promise<void> {
  const ctx = await requireTenant();
  requireRole(ctx, [...EDITORS]);
  const existing = await prisma.formation.findFirst({ where: { id, organizationId: ctx.organizationId } });
  if (!existing) return;
  await prisma.formation.update({ where: { id }, data: { deletedAt: new Date() } });
  revalidatePath("/formations");
  revalidateMarketplace();
  redirect("/formations");
}

export async function togglePublish(id: string): Promise<void> {
  const ctx = await requireTenant();
  requireRole(ctx, [...EDITORS]);
  const existing = await prisma.formation.findFirst({ where: { id, organizationId: ctx.organizationId } });
  if (!existing) return;
  const willPublish = !existing.isPublic;
  let publicSlug = existing.publicSlug;
  if (willPublish && !publicSlug) publicSlug = await uniquePublicSlug(existing.title, existing.id);
  const updated = await prisma.formation.update({
    where: { id },
    data: {
      isPublic: willPublish,
      publicSlug,
      ...(willPublish ? { status: "PUBLIE" as const } : {}),
    },
    select: { id: true, title: true, status: true, isPublic: true, publicSlug: true },
  });
  logger.info(willPublish ? "formation.public_page.published" : "formation.public_page.unpublished", {
    organizationId: ctx.organizationId,
    formationId: id,
    by: ctx.email,
    before: { status: existing.status, isPublic: existing.isPublic, publicSlug: existing.publicSlug },
    after: { status: updated.status, isPublic: updated.isPublic, publicSlug: updated.publicSlug },
  });
  await prisma.auditLog.create({
    data: {
      organizationId: ctx.organizationId,
      actorId: ctx.userId,
      action: willPublish ? "formation.public_page.published" : "formation.public_page.unpublished",
      entityType: "Formation",
      entityId: id,
      before: { status: existing.status, isPublic: existing.isPublic, publicSlug: existing.publicSlug },
      after: { status: updated.status, isPublic: updated.isPublic, publicSlug: updated.publicSlug },
    },
  }).catch((e) => {
    logger.error("formation.public_page.audit_failed", {
      organizationId: ctx.organizationId,
      formationId: id,
      error: e instanceof Error ? e.message : String(e),
    });
  });
  revalidatePath(`/formations/${id}`);
  if (ctx.organizationSlug && publicSlug) revalidatePath(`/${ctx.organizationSlug}/f/${publicSlug}`);
  revalidateMarketplace(); // rafraîchit le cache public (catalogue, fiches centre/formation)
}
