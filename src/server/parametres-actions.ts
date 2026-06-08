"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenant, requireRole } from "@/lib/tenant";
import type { FormActionState } from "@/server/formations-actions";

const ADMIN_ROLES = ["OWNER", "ADMIN"] as const;

// ── Profil du centre ──────────────────────────────────────────────
const orgSchema = z.object({
  name: z.string().min(2, "Nom requis."),
  siret: z.string().optional(),
  website: z.string().url("URL invalide.").optional().or(z.literal("")),
  description: z.string().optional(),
  tagline: z.string().optional(),
  city: z.string().optional(),
  publicEmail: z.string().email("Email invalide.").optional().or(z.literal("")),
  publicPhone: z.string().optional(),
  specialties: z.string().optional(),
  modalities: z.string().optional(),
  certifications: z.string().optional(),
  linkedin: z.string().optional(),
  facebook: z.string().optional(),
  instagram: z.string().optional(),
  publicProfileEnabled: z.coerce.boolean().optional(),
  legalName: z.string().optional(),
  legalAddress: z.string().optional(),
  nda: z.string().optional(),
  legalRep: z.string().optional(),
  timezone: z.string().optional(),
});

function toList(s?: string): string[] {
  return (s ?? "").split(",").map((x) => x.trim()).filter(Boolean);
}

export async function updateOrganization(_prev: FormActionState, formData: FormData): Promise<FormActionState> {
  const ctx = await requireTenant();
  requireRole(ctx, [...ADMIN_ROLES]);
  const parsed = orgSchema.safeParse({
    name: formData.get("name"),
    siret: formData.get("siret") || undefined,
    website: formData.get("website") || "",
    description: formData.get("description") || undefined,
    tagline: formData.get("tagline") || undefined,
    city: formData.get("city") || undefined,
    publicEmail: formData.get("publicEmail") || "",
    publicPhone: formData.get("publicPhone") || undefined,
    specialties: formData.get("specialties") || undefined,
    modalities: formData.get("modalities") || undefined,
    certifications: formData.get("certifications") || undefined,
    linkedin: formData.get("linkedin") || undefined,
    facebook: formData.get("facebook") || undefined,
    instagram: formData.get("instagram") || undefined,
    publicProfileEnabled: formData.get("publicProfileEnabled") === "on",
    legalName: formData.get("legalName") || undefined,
    legalAddress: formData.get("legalAddress") || undefined,
    nda: formData.get("nda") || undefined,
    legalRep: formData.get("legalRep") || undefined,
    timezone: formData.get("timezone") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  const d = parsed.data;
  // Mise à jour PARTIELLE : on ne touche qu'aux champs présents dans ce formulaire,
  // pour éviter qu'un onglet n'écrase les champs d'un autre.
  const has = (k: string) => formData.has(k);
  const data: Record<string, unknown> = { name: d.name };
  if (has("siret")) data.siret = d.siret;
  if (has("website")) data.website = d.website || null;
  if (has("description")) data.description = d.description;
  if (has("tagline")) data.tagline = d.tagline;
  if (has("city")) data.city = d.city;
  if (has("timezone")) data.timezone = d.timezone;
  if (has("legalName")) data.legalName = d.legalName;
  if (has("legalAddress")) data.legalAddress = d.legalAddress;
  if (has("nda")) data.nda = d.nda;
  if (has("legalRep")) data.legalRep = d.legalRep;
  // Profil public
  if (has("publicEmail")) data.publicEmail = d.publicEmail || null;
  if (has("publicPhone")) data.publicPhone = d.publicPhone;
  if (has("specialties")) data.specialties = toList(d.specialties);
  if (has("modalities")) data.modalities = toList(d.modalities);
  if (has("certifications")) data.certifications = toList(d.certifications);
  if (has("hasPublicProfile")) data.publicProfileEnabled = formData.get("publicProfileEnabled") === "on";
  if (has("linkedin") || has("facebook") || has("instagram")) {
    data.socialLinks = { linkedin: d.linkedin || null, facebook: d.facebook || null, instagram: d.instagram || null };
  }

  await prisma.organization.update({ where: { id: ctx.organizationId }, data });
  revalidatePath("/parametres");
  revalidatePath(`/${ctx.organizationSlug}`);
  return { ok: true };
}

// ── Membres ───────────────────────────────────────────────────────
const inviteSchema = z.object({
  email: z.string().email("Email invalide."),
  role: z.enum(["ADMIN", "ASSISTANT", "COMMERCIAL", "TRAINER"]),
});

export async function inviteMember(_prev: FormActionState, formData: FormData): Promise<FormActionState> {
  const ctx = await requireTenant();
  requireRole(ctx, ["OWNER", "ADMIN"]);
  const parsed = inviteSchema.safeParse({ email: formData.get("email"), role: formData.get("role") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Données invalides." };
  const { email, role } = parsed.data;

  let user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    user = await prisma.user.create({ data: { email: email.toLowerCase(), name: email.split("@")[0] } });
  }

  const existing = await prisma.membership.findUnique({ where: { userId_organizationId: { userId: user.id, organizationId: ctx.organizationId } } });
  if (existing) return { error: "Cet utilisateur est déjà membre de votre centre." };

  await prisma.membership.create({
    data: { userId: user.id, organizationId: ctx.organizationId, role, status: "INVITED", invitedAt: new Date(), invitedEmail: email.toLowerCase() },
  });
  revalidatePath("/parametres");
  return { ok: true };
}

export async function updateMemberRole(membershipId: string, role: string): Promise<void> {
  const ctx = await requireTenant();
  requireRole(ctx, ["OWNER", "ADMIN"]);
  await prisma.membership.updateMany({
    where: { id: membershipId, organizationId: ctx.organizationId, role: { not: "OWNER" } },
    data: { role: role as never },
  });
  revalidatePath("/parametres");
}

export async function removeMember(membershipId: string): Promise<void> {
  const ctx = await requireTenant();
  requireRole(ctx, ["OWNER", "ADMIN"]);
  const m = await prisma.membership.findFirst({ where: { id: membershipId, organizationId: ctx.organizationId } });
  if (!m || m.role === "OWNER") return;
  await prisma.membership.delete({ where: { id: membershipId } });
  revalidatePath("/parametres");
}

// ── Modèles de documents ──────────────────────────────────────────
const templateSchema = z.object({
  type: z.string(),
  name: z.string().min(2, "Nom requis."),
  contentTemplate: z.string().min(10, "Contenu requis."),
});

export async function saveDocumentTemplate(_prev: FormActionState, formData: FormData): Promise<FormActionState> {
  const ctx = await requireTenant();
  requireRole(ctx, [...ADMIN_ROLES]);
  const parsed = templateSchema.safeParse({ type: formData.get("type"), name: formData.get("name"), contentTemplate: formData.get("contentTemplate") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Données invalides." };
  const d = parsed.data;
  const existing = await prisma.documentTemplate.findFirst({ where: { organizationId: ctx.organizationId, type: d.type as never } });
  if (existing) {
    await prisma.documentTemplate.update({ where: { id: existing.id }, data: { name: d.name, contentTemplate: d.contentTemplate } });
  } else {
    await prisma.documentTemplate.create({ data: { organizationId: ctx.organizationId, type: d.type as never, name: d.name, contentTemplate: d.contentTemplate } });
  }
  revalidatePath("/parametres");
  return { ok: true };
}

// ── Démo ─────────────────────────────────────────────────────────
export async function loadDemoDataAction(): Promise<FormActionState> {
  const ctx = await requireTenant();
  requireRole(ctx, ["OWNER"]);
  const { loadDemoData } = await import("@/lib/demo-seed");
  await loadDemoData(ctx.organizationId);
  revalidatePath("/dashboard");
  revalidatePath("/formations");
  revalidatePath("/sessions");
  revalidatePath("/prospects");
  revalidatePath("/apprenants");
  return { ok: true };
}
