import { z } from "zod";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { VERIFIED_MARKETPLACE_ORGANIZATION } from "@/lib/marketplace-publication";

export const publicLeadSchema = z
  .object({
    contactName: z.string().trim().min(2, "Votre nom est requis.").max(120),
    company: z.string().trim().max(160).optional(),
    email: z.string().trim().email("Email invalide.").optional().or(z.literal("")),
    phone: z.string().trim().max(40).optional(),
    intent: z.enum(["INSCRIPTION", "RAPPEL"]),
    message: z.string().trim().max(1200).optional(),
  })
  .refine((data) => Boolean(data.email || data.phone), {
    message: "Renseignez un email ou un téléphone.",
    path: ["email"],
  });

export type PublicLeadInput = z.infer<typeof publicLeadSchema>;

export async function getPublicFormationUncached(orgSlug: string, publicSlug: string) {
  const now = new Date();
  return prisma.formation.findFirst({
    where: {
      publicSlug,
      isPublic: true,
      status: "PUBLIE",
      deletedAt: null,
      organization: { slug: orgSlug, ...VERIFIED_MARKETPLACE_ORGANIZATION },
    },
    include: {
      organization: {
        select: { id: true, name: true, slug: true, website: true, description: true, logoUrl: true },
      },
      sessions: {
        where: {
          deletedAt: null,
          status: { in: ["OUVERTE", "COMPLETE"] },
          endDate: { gte: now },
        },
        orderBy: { startDate: "asc" },
        take: 5,
        include: {
          trainer: { select: { firstName: true, lastName: true } },
          _count: { select: { enrollments: true } },
        },
      },
      eligibleTrainers: {
        take: 6,
        include: {
          trainer: {
            select: { id: true, firstName: true, lastName: true, initials: true, color: true, photoUrl: true, bio: true, specialities: true, yearsExperience: true },
          },
        },
      },
      modules: {
        orderBy: { position: "asc" },
        include: {
          trainers: { include: { trainer: { select: { id: true, firstName: true, lastName: true } } } },
        },
      },
      testimonials: { orderBy: { createdAt: "desc" }, take: 6 },
      faqs: { orderBy: { position: "asc" }, take: 10 },
    },
  });
}

// Cache public (Data Cache Next.js), tagué "marketplace" → invalidé par revalidateMarketplace().
export const getPublicFormation = unstable_cache(
  getPublicFormationUncached,
  ["public-formation"],
  { revalidate: 120, tags: ["marketplace"] },
);

export async function createPublicLead(orgSlug: string, publicSlug: string, rawInput: PublicLeadInput) {
  const input = publicLeadSchema.parse(rawInput);
  const formation = await prisma.formation.findFirst({
    where: {
      publicSlug,
      isPublic: true,
      status: "PUBLIE",
      deletedAt: null,
      organization: { slug: orgSlug, ...VERIFIED_MARKETPLACE_ORGANIZATION },
    },
    select: { id: true, organizationId: true, title: true, price: true },
  });
  if (!formation) throw new Error("PUBLIC_FORMATION_NOT_FOUND");

  const email = input.email || null;
  const existing = email
    ? await prisma.prospect.findFirst({
        where: {
          organizationId: formation.organizationId,
          formationOfInterestId: formation.id,
          email,
          deletedAt: null,
          stage: { notIn: ["GAGNE", "PERDU"] },
        },
        orderBy: { createdAt: "desc" },
      })
    : null;

  const nextAction = input.intent === "INSCRIPTION" ? "Traiter la demande d'inscription" : "Rappeler le prospect";
  const notes = [
    input.message || null,
    `Demande reçue depuis la page publique « ${formation.title} ».`,
  ]
    .filter(Boolean)
    .join("\n\n");

  if (existing) {
    const updated = await prisma.prospect.update({
      where: { id: existing.id },
      data: {
        contactName: input.contactName,
        name: input.company || input.contactName,
        phone: input.phone || existing.phone,
        nextAction,
        nextFollowUpDate: new Date(),
        isHot: input.intent === "INSCRIPTION",
        notes,
      },
    });
    await prisma.prospectActivity.create({
      data: { prospectId: updated.id, type: "public_request", content: nextAction },
    });
    return { id: updated.id, created: false };
  }

  const prospect = await prisma.prospect.create({
    data: {
      organizationId: formation.organizationId,
      formationOfInterestId: formation.id,
      name: input.company || input.contactName,
      contactName: input.contactName,
      type: input.company ? "ENTREPRISE" : "PARTICULIER",
      email,
      phone: input.phone || null,
      source: "PAGE_PUBLIQUE",
      stage: "NOUVEAU",
      potentialAmount: formation.price,
      nextAction,
      nextFollowUpDate: new Date(),
      isHot: input.intent === "INSCRIPTION",
      notes,
    },
  });
  return { id: prospect.id, created: true };
}
