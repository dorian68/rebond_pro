import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// Helpers partagés autour des modules de formation : utilisés par les server
// actions du formulaire ET par les outils Socrate (write-tools). Ce fichier
// n'est PAS "use server" → il peut exporter des fonctions non-action.

export const moduleItemSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(2, "Le titre du module est requis."),
  description: z.string().optional(),
  durationDays: z.coerce.number().int().min(0).optional(),
  durationHours: z.coerce.number().int().min(0).optional(),
  trainerIds: z.array(z.string()).optional(),
});

export type ModuleItem = z.infer<typeof moduleItemSchema> & { position: number };

/** Parse un tableau de modules (objet JS déjà parsé OU chaîne JSON). Tolérant, borné à 40. */
export function parseModulesInput(raw: unknown): ModuleItem[] {
  let arr: unknown = raw;
  if (typeof raw === "string") {
    try {
      arr = JSON.parse(raw || "[]");
    } catch {
      return [];
    }
  }
  if (!Array.isArray(arr)) return [];
  return arr
    .slice(0, 40)
    .map((item) => moduleItemSchema.safeParse(item))
    .filter((parsed): parsed is z.ZodSafeParseSuccess<z.infer<typeof moduleItemSchema>> => parsed.success)
    .map((parsed, index) => ({ ...parsed.data, position: index }));
}

/** Remplace intégralement les modules d'une formation (+ leurs formateurs validés tenant). */
export async function replaceFormationModules(formationId: string, orgId: string, rawModules: ModuleItem[]) {
  await prisma.formationModule.deleteMany({ where: { formationId } });
  if (rawModules.length === 0) return;
  const trainerIds = Array.from(new Set(rawModules.flatMap((m) => m.trainerIds ?? [])));
  const validTrainers = trainerIds.length
    ? await prisma.trainer.findMany({ where: { id: { in: trainerIds }, organizationId: orgId, deletedAt: null }, select: { id: true } })
    : [];
  const validTrainerIds = new Set(validTrainers.map((t) => t.id));
  for (const item of rawModules) {
    const created = await prisma.formationModule.create({
      data: {
        organizationId: orgId,
        formationId,
        title: item.title,
        description: item.description || null,
        durationDays: item.durationDays ?? null,
        durationHours: item.durationHours ?? null,
        position: item.position,
      },
    });
    const moduleTrainerIds = Array.from(new Set((item.trainerIds ?? []).filter((id) => validTrainerIds.has(id))));
    if (moduleTrainerIds.length) {
      await prisma.formationModuleTrainer.createMany({
        data: moduleTrainerIds.map((trainerId) => ({ moduleId: created.id, trainerId })),
        skipDuplicates: true,
      });
    }
  }
}
