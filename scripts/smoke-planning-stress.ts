import "./_env";
import { prisma } from "../src/lib/prisma";
import { addDays, dayKey, mondayOf } from "../src/lib/utils";
import { createTestTenant, step, assert, runner } from "./_tenant";
import { getWeekPlanning, findBestSlots } from "../src/server/planning";
import { getMyAvailabilities, getMyPlanning, getMyChangeRequests } from "../src/server/trainer-self";
import { listChangeRequests, countPendingChangeRequests } from "../src/server/change-requests";
import { WRITE_TOOLS } from "../src/server/agent/write-tools";
import type { TenantContext } from "../src/lib/tenant";

function tool(name: string) {
  const t = WRITE_TOOLS.find((x) => x.name === name);
  if (!t) throw new Error(`Outil introuvable: ${name}`);
  return t;
}

async function call(name: string, ctx: TenantContext, args: Record<string, unknown>) {
  return tool(name).execute(ctx, args);
}

function at(day: Date, hour = 8): Date {
  return new Date(`${dayKey(day)}T${String(hour).padStart(2, "0")}:00:00.000Z`);
}

runner("planning_stress", async () => {
  const center = await createTestTenant("planning-stress");
  const other = await createTestTenant("planning-other");
  try {
    const week = mondayOf(addDays(new Date(), 7));
    const mon = week;
    const tue = addDays(week, 1);
    const wed = addDays(week, 2);
    const thu = addDays(week, 3);
    const fri = addDays(week, 4);

    const roomA = await prisma.room.create({ data: { organizationId: center.organizationId, name: "Salle A", type: "SALLE", capacity: 12 } });
    const roomB = await prisma.room.create({ data: { organizationId: center.organizationId, name: "Salle B", type: "SALLE", capacity: 8 } });
    const formation = await prisma.formation.create({
      data: {
        organizationId: center.organizationId,
        title: "Stress contraintes planning",
        slug: "stress-contraintes-planning",
        durationDays: 2,
        durationHours: 14,
        price: 90000,
        modality: "PRESENTIEL",
        status: "PUBLIE",
      },
    });
    const trainerA = await prisma.trainer.create({ data: { organizationId: center.organizationId, firstName: "Alice", lastName: "Indispo", initials: "AI", email: "alice-planning@smoke.test", active: true } });
    const trainerB = await prisma.trainer.create({ data: { organizationId: center.organizationId, firstName: "Bruno", lastName: "Busy", initials: "BB", email: "bruno-planning@smoke.test", active: true } });
    const trainerC = await prisma.trainer.create({ data: { organizationId: center.organizationId, firstName: "Chloe", lastName: "Conflict", initials: "CC", email: "chloe-planning@smoke.test", active: true } });
    await prisma.trainerFormation.createMany({
      data: [trainerA, trainerB, trainerC].map((t) => ({ trainerId: t.id, formationId: formation.id })),
    });
    step("seed_core_entities", { formation: formation.id, trainers: 3, rooms: 2 });

    const trainerUser = await prisma.user.create({ data: { email: `alice-planning-user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@smoke.test`, name: "Alice Trainer" } });
    await prisma.trainer.update({ where: { id: trainerA.id }, data: { userId: trainerUser.id } });
    await prisma.membership.create({ data: { userId: trainerUser.id, organizationId: center.organizationId, role: "TRAINER", status: "ACTIVE" } });
    step("trainer_linked_to_portal");

    await prisma.trainerAvailability.createMany({
      data: [
        { trainerId: trainerA.id, date: at(mon, 0), slot: "JOURNEE", type: "INDISPONIBLE", note: "Audit stress lundi" },
        { trainerId: trainerA.id, date: at(tue, 0), slot: "JOURNEE", type: "INDISPONIBLE", note: "Audit stress mardi" },
        { trainerId: trainerB.id, date: at(thu, 0), slot: "MATIN", type: "TENTATIVE", note: "Réservé mais pas bloquant" },
      ],
    });
    const aAvail = await getMyAvailabilities(trainerA.id, mon, addDays(week, 6));
    assert(aAvail.filter((a) => a.type === "INDISPONIBLE").length === 2, "Les indisponibilités formateur ne remontent pas.");
    step("trainer_availability_received", { trainerAIndispo: aAvail.length });

    const busyB = await prisma.session.create({
      data: {
        organizationId: center.organizationId,
        formationId: formation.id,
        trainerId: trainerB.id,
        roomId: roomA.id,
        startDate: at(mon),
        endDate: at(tue, 17),
        slots: ["JOURNEE"],
        capacity: 6,
        pricePerLearner: 90000,
        breakEvenSeats: 2,
        status: "OUVERTE",
      },
    });
    step("busy_session_seeded", { session: busyB.id });

    const suggestions = await findBestSlots(center, formation.id, 14);
    assert(suggestions.length > 0, "L'optimiseur ne propose aucun créneau alors qu'il existe des options.");
    assert(!suggestions.some((s) => s.trainerId === trainerA.id && [dayKey(mon), dayKey(tue)].includes(s.date)), "L'optimiseur propose un formateur indisponible.");
    assert(!suggestions.some((s) => s.trainerId === trainerB.id && [dayKey(mon), dayKey(tue)].includes(s.date)), "L'optimiseur propose un formateur déjà occupé.");
    assert(suggestions.every((s) => !s.conflict), "L'optimiseur retourne un créneau avec conflit alors qu'une salle libre existe.");
    step("best_slots_respect_constraints", { top: suggestions[0] });

    await call("create_session", center, {
      formationId: formation.id,
      trainerId: trainerA.id,
      roomId: roomB.id,
      startDate: dayKey(mon),
      endDate: dayKey(tue),
      capacity: 8,
      slots: ["JOURNEE"],
    }).then(
      () => { throw new Error("La création a accepté un formateur indisponible."); },
      (e) => assert(String(e).includes("indisponible"), `Erreur attendue indisponible, reçu: ${String(e)}`),
    );
    step("create_blocks_unavailable_trainer");

    await call("create_session", center, {
      formationId: formation.id,
      trainerId: trainerB.id,
      roomId: roomB.id,
      startDate: dayKey(mon),
      endDate: dayKey(tue),
      capacity: 8,
      slots: ["JOURNEE"],
    }).then(
      () => { throw new Error("La création a accepté un formateur déjà occupé."); },
      (e) => assert(String(e).includes("déjà une session"), `Erreur attendue session existante, reçu: ${String(e)}`),
    );
    step("create_blocks_busy_trainer");

    const valid = suggestions.find((s) => s.trainerId !== trainerB.id || ![dayKey(mon), dayKey(tue)].includes(s.date)) ?? suggestions[0];
    await call("create_session", center, {
      formationId: formation.id,
      trainerId: valid.trainerId,
      roomId: valid.roomId ?? roomB.id,
      startDate: valid.date,
      endDate: valid.endDate,
      capacity: 7,
      slots: ["JOURNEE"],
    });
    const created = await prisma.session.findFirst({
      where: { organizationId: center.organizationId, formationId: formation.id, trainerId: valid.trainerId, startDate: at(new Date(`${valid.date}T00:00:00.000Z`), 0) },
      orderBy: { createdAt: "desc" },
    });
    assert(created, "La session valide proposée par l'optimiseur n'a pas été créée.");
    step("create_valid_optimized_session", { session: created.id, date: valid.date, trainer: valid.trainerName });

    await call("update_session", center, { id: created.id, capacity: 11, status: "COMPLETE" });
    const updated = await prisma.session.findUnique({ where: { id: created.id } });
    assert(updated?.capacity === 11 && updated.status === "COMPLETE", "La modification de session n'a pas persisté.");
    step("update_session_persists");

    await call("update_session", center, { id: created.id, startDate: dayKey(mon), endDate: dayKey(tue), trainerId: trainerB.id, roomId: roomB.id }).then(
      () => { throw new Error("La modification a accepté un conflit formateur."); },
      (e) => assert(String(e).includes("déjà une session"), `Erreur attendue conflit formateur, reçu: ${String(e)}`),
    );
    step("update_blocks_conflict");

    await prisma.session.createMany({
      data: [
        { organizationId: center.organizationId, formationId: formation.id, trainerId: trainerC.id, roomId: roomA.id, startDate: at(fri, 8), endDate: at(fri, 12), slots: ["MATIN"], capacity: 4, pricePerLearner: 90000, breakEvenSeats: 1, status: "OUVERTE" },
        { organizationId: center.organizationId, formationId: formation.id, trainerId: trainerC.id, roomId: roomA.id, startDate: at(fri, 9), endDate: at(fri, 12), slots: ["MATIN"], capacity: 4, pricePerLearner: 90000, breakEvenSeats: 1, status: "OUVERTE" },
      ],
    });
    const weekPlanning = await getWeekPlanning(center, dayKey(week));
    assert(weekPlanning.conflictCount >= 2, "Le planning hebdo ne détecte pas les conflits fabriqués.");
    const conflictCells = weekPlanning.rows.flatMap((r) => r.cells.flatMap((c) => c.sessions.filter((s) => s.conflict)));
    assert(conflictCells.length >= 2, "Les cellules du planning ne marquent pas les sessions en conflit.");
    step("planning_detects_hard_conflicts", { conflictCount: weekPlanning.conflictCount });

    const change = await prisma.changeRequest.create({
      data: { organizationId: center.organizationId, trainerId: trainerA.id, requestType: "unavailable", reason: "Plus disponible mercredi", proposedDate: at(wed, 0), proposedSlot: "JOURNEE", urgency: "high", status: "pending" },
    });
    assert((await getMyChangeRequests(trainerA.id)).some((r) => r.id === change.id), "La demande n'apparaît pas côté formateur.");
    assert((await listChangeRequests(center)).some((r) => r.id === change.id), "La demande n'apparaît pas côté centre.");
    assert((await countPendingChangeRequests(center)) >= 1, "Le compteur de demandes en attente est faux.");
    await prisma.changeRequest.update({ where: { id: change.id }, data: { status: "accepted", centerResponse: "Accepté en stress test." } });
    const acceptedAvail = await prisma.trainerAvailability.findFirst({ where: { trainerId: trainerA.id, date: at(wed, 0), slot: "JOURNEE" } });
    if (acceptedAvail) {
      await prisma.trainerAvailability.update({ where: { id: acceptedAvail.id }, data: { type: "INDISPONIBLE" } });
    } else {
      await prisma.trainerAvailability.create({ data: { trainerId: trainerA.id, date: at(wed, 0), slot: "JOURNEE", type: "INDISPONIBLE" } });
    }
    assert((await getMyAvailabilities(trainerA.id, wed, wed)).some((a) => a.type === "INDISPONIBLE"), "L'indisponibilité acceptée n'est pas répercutée.");
    step("change_request_to_unavailability");

    const myPlanning = await getMyPlanning(trainerB.id, center.organizationId);
    assert(myPlanning.upcoming.some((s) => s.id === busyB.id), "Le planning personnel du formateur ne contient pas sa session.");
    assert(!(await listChangeRequests(other)).some((r) => r.id === change.id), "Fuite cross-tenant sur les demandes formateur.");
    step("trainer_planning_and_tenant_isolation");

    await call("delete_session", center, { id: created.id });
    const deleted = await prisma.session.findUnique({ where: { id: created.id } });
    assert(!!deleted?.deletedAt, "La suppression de session n'est pas un soft delete.");
    step("delete_session_soft");
  } finally {
    await center.cleanup();
    await other.cleanup();
    step("tenant_cleanup");
  }
});
