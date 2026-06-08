"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole, requireTenant } from "@/lib/tenant";
import { slugify } from "@/lib/utils";

export type OnboardingState = { error?: string } | undefined;

const schema = z.object({
  website: z.string().trim().url("Adresse du site invalide.").optional().or(z.literal("")),
  nbFormationsDeclarees: z.coerce.number().int().min(0).max(10000),
  nbFormateursDeclares: z.coerce.number().int().min(0).max(10000),
  nbSessionsMois: z.coerce.number().int().min(0).max(10000),
  objectifPrincipal: z.enum(["PLANIFIER", "VENDRE", "DOCUMENTS", "APPRENANTS", "CENTRALISER"]),
  starterTitle: z.string().trim().max(180).optional(),
  starterTrainer: z.string().trim().max(180).optional(),
  starterSessionDate: z.string().optional(),
  starterProspect: z.string().trim().max(180).optional(),
  loadDemo: z.boolean().optional(),
});

async function uniqueFormationSlug(client: Prisma.TransactionClient, organizationId: string, title: string) {
  const root = slugify(title) || "formation";
  let slug = root;
  for (let i = 1; await client.formation.findFirst({ where: { organizationId, slug } }); i++) slug = `${root}-${i}`;
  return slug;
}

export async function completeOnboarding(_prev: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const ctx = await requireTenant();
  requireRole(ctx, ["OWNER", "ADMIN"]);
  const parsed = schema.safeParse({
    website: formData.get("website") || "",
    nbFormationsDeclarees: formData.get("nbFormationsDeclarees") || 0,
    nbFormateursDeclares: formData.get("nbFormateursDeclares") || 0,
    nbSessionsMois: formData.get("nbSessionsMois") || 0,
    objectifPrincipal: formData.get("objectifPrincipal"),
    starterTitle: formData.get("starterTitle") || undefined,
    starterTrainer: formData.get("starterTrainer") || undefined,
    starterSessionDate: formData.get("starterSessionDate") || undefined,
    starterProspect: formData.get("starterProspect") || undefined,
    loadDemo: formData.get("loadDemo") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  const data = parsed.data;

  await prisma.$transaction(async (tx) => {
    await tx.organization.update({
      where: { id: ctx.organizationId },
      data: {
        website: data.website || null,
        nbFormationsDeclarees: data.nbFormationsDeclarees,
        nbFormateursDeclares: data.nbFormateursDeclares,
        nbSessionsMois: data.nbSessionsMois,
        objectifPrincipal: data.objectifPrincipal,
      },
    });

    const existingFormationCount = await tx.formation.count({ where: { organizationId: ctx.organizationId, deletedAt: null } });
    const starterTitle = data.starterTitle || (data.loadDemo && existingFormationCount === 0 ? "Ma première formation" : "");
    let formationId: string | null = null;
    if (starterTitle) {
      const slug = await uniqueFormationSlug(tx, ctx.organizationId, starterTitle);
      const formation = await tx.formation.create({
        data: {
          organizationId: ctx.organizationId,
          title: starterTitle,
          slug,
          shortDescription: "Formation à compléter depuis votre catalogue.",
          status: "BROUILLON",
        },
      });
      formationId = formation.id;
    } else {
      formationId = (await tx.formation.findFirst({
        where: { organizationId: ctx.organizationId, deletedAt: null },
        select: { id: true },
        orderBy: { createdAt: "asc" },
      }))?.id ?? null;
    }

    const existingTrainerCount = await tx.trainer.count({ where: { organizationId: ctx.organizationId, deletedAt: null } });
    const starterTrainer = data.starterTrainer || (data.loadDemo && existingTrainerCount === 0 ? "Formateur exemple" : "");
    let trainerId: string | null = null;
    if (starterTrainer) {
      const [firstName, ...lastParts] = starterTrainer.split(/\s+/);
      const trainer = await tx.trainer.create({
        data: {
          organizationId: ctx.organizationId,
          firstName: firstName || "Formateur",
          lastName: lastParts.join(" ") || "exemple",
          specialities: starterTitle ? [starterTitle] : [],
        },
      });
      trainerId = trainer.id;
      if (formationId) {
        await tx.trainerFormation.upsert({
          where: { trainerId_formationId: { trainerId, formationId } },
          update: {},
          create: { trainerId, formationId },
        });
      }
    } else {
      trainerId = (await tx.trainer.findFirst({
        where: { organizationId: ctx.organizationId, deletedAt: null },
        select: { id: true },
        orderBy: { createdAt: "asc" },
      }))?.id ?? null;
    }

    const existingSessionCount = await tx.session.count({ where: { organizationId: ctx.organizationId, deletedAt: null } });
    if (formationId && existingSessionCount === 0 && (data.starterSessionDate || data.loadDemo)) {
      const startDate = data.starterSessionDate ? new Date(`${data.starterSessionDate}T08:00:00.000Z`) : new Date(Date.now() + 14 * 86400000);
      const endDate = new Date(startDate.getTime() + 8 * 3600000);
      await tx.session.create({
        data: {
          organizationId: ctx.organizationId,
          formationId,
          trainerId,
          startDate,
          endDate,
          slots: ["JOURNEE"],
          capacity: 10,
          breakEvenSeats: 4,
          status: "OUVERTE",
          trainerConfirmed: false,
        },
      });
    }

    const existingProspectCount = await tx.prospect.count({ where: { organizationId: ctx.organizationId, deletedAt: null } });
    const starterProspect = data.starterProspect || (data.loadDemo && existingProspectCount === 0 ? "Prospect à contacter" : "");
    if (starterProspect) {
      await tx.prospect.create({
        data: {
          organizationId: ctx.organizationId,
          formationOfInterestId: formationId,
          name: starterProspect,
          contactName: starterProspect,
          type: "ENTREPRISE",
          source: "AUTRE",
          stage: "NOUVEAU",
          nextAction: "Qualifier le besoin",
          nextFollowUpDate: new Date(),
          ownerId: ctx.userId,
        },
      });
    }
  });

  redirect("/dashboard");
}
