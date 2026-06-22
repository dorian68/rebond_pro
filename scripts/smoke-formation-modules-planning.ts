import "./_env";
import { prisma } from "../src/lib/prisma";
import { addDays, dayKey, mondayOf } from "../src/lib/utils";
import { createTestTenant, step, assert, runner } from "./_tenant";
import { applyBulkTrainerAvailabilities } from "../src/server/availability-actions";
import { findBestSlots } from "../src/server/planning";

function at(day: Date, hour = 0) {
  return new Date(`${dayKey(day)}T${String(hour).padStart(2, "0")}:00:00.000Z`);
}

runner("formation_modules_planning", async () => {
  const ctx = await createTestTenant("formation-modules-planning");
  try {
    const week = mondayOf(addDays(new Date(), 7));
    const mon = week;
    const tue = addDays(week, 1);

    const [trainerA, trainerB, trainerC] = await Promise.all([
      prisma.trainer.create({ data: { organizationId: ctx.organizationId, firstName: "Alice", lastName: "Module", initials: "AM", active: true } }),
      prisma.trainer.create({ data: { organizationId: ctx.organizationId, firstName: "Bruno", lastName: "Expert", initials: "BE", active: true } }),
      prisma.trainer.create({ data: { organizationId: ctx.organizationId, firstName: "Chloe", lastName: "Secours", initials: "CS", active: true } }),
    ]);
    const room = await prisma.room.create({ data: { organizationId: ctx.organizationId, name: "Salle Modules", type: "SALLE", capacity: 10 } });
    const formation = await prisma.formation.create({
      data: {
        organizationId: ctx.organizationId,
        title: "Formation modulaire smoke",
        slug: "formation-modulaire-smoke",
        durationDays: 2,
        durationHours: 14,
        price: 100000,
        modality: "PRESENTIEL",
        status: "PUBLIE",
      },
    });
    await prisma.trainerFormation.createMany({
      data: [trainerA, trainerB, trainerC].map((trainer) => ({ trainerId: trainer.id, formationId: formation.id })),
    });
    const moduleA = await prisma.formationModule.create({
      data: { organizationId: ctx.organizationId, formationId: formation.id, title: "Socle", durationDays: 1, position: 0 },
    });
    const moduleB = await prisma.formationModule.create({
      data: { organizationId: ctx.organizationId, formationId: formation.id, title: "Atelier expert", durationDays: 1, position: 1 },
    });
    await prisma.formationModuleTrainer.createMany({
      data: [
        { moduleId: moduleA.id, trainerId: trainerA.id },
        { moduleId: moduleA.id, trainerId: trainerC.id },
        { moduleId: moduleB.id, trainerId: trainerB.id },
      ],
    });
    step("seed_modular_formation", { modules: 2, trainers: 3 });

    const bulk = await applyBulkTrainerAvailabilities(ctx, [
      { trainerId: trainerA.id, date: dayKey(mon), slot: "JOURNEE", type: "INDISPONIBLE", note: "Smoke indispo A" },
      { trainerId: trainerB.id, date: dayKey(mon), slot: "JOURNEE", type: "INDISPONIBLE", note: "Smoke indispo B" },
      { trainerId: trainerC.id, date: dayKey(mon), slot: "JOURNEE", type: "DISPONIBLE", note: "Smoke dispo C" },
    ]);
    assert(bulk?.ok, `Bulk disponibilités refusé: ${bulk?.error ?? "unknown"}`);
    const saved = await prisma.trainerAvailability.count({ where: { trainerId: { in: [trainerA.id, trainerB.id, trainerC.id] } } });
    assert(saved === 3, "Les disponibilités bulk ne sont pas persistées.");
    const audit = await prisma.auditLog.findFirst({
      where: { organizationId: ctx.organizationId, action: "trainer_availability.bulk_updated" },
      orderBy: { createdAt: "desc" },
    });
    assert(audit, "Le bulk disponibilités n'a pas produit d'audit log.");
    step("bulk_availability_persisted", { saved, audited: true });

    await prisma.session.create({
      data: {
        organizationId: ctx.organizationId,
        formationId: formation.id,
        trainerId: trainerB.id,
        roomId: room.id,
        startDate: at(tue),
        endDate: at(tue, 17),
        slots: ["JOURNEE"],
        capacity: 8,
        pricePerLearner: 100000,
        breakEvenSeats: 2,
        status: "OUVERTE",
      },
    });
    step("module_trainer_busy_seeded");

    const suggestions = await findBestSlots(ctx, formation.id, 21);
    assert(suggestions.length > 0, "L'optimisateur ne trouve aucun créneau modulaire.");
    assert(suggestions.every((s) => s.modulePlan?.length === 2), "Les suggestions modulaires doivent exposer un plan par module.");
    assert(!suggestions.some((s) => s.date === dayKey(mon)), "Le lundi ne devrait pas être proposé car le module expert n'est pas couvert.");
    assert(!suggestions.some((s) => s.date === dayKey(tue)), "Le mardi ne devrait pas être proposé car le formateur expert est déjà occupé.");
    step("optimizer_respects_module_coverage", { top: suggestions[0] });
  } finally {
    await ctx.cleanup();
    step("tenant_cleanup");
  }
});
