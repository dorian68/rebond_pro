import "./_env";
import { prisma } from "../src/lib/prisma";
import { createTestTenant, step, assert, runner } from "./_tenant";
import { getMyAvailabilities, getMyChangeRequests, getMyPlanning } from "../src/server/trainer-self";
import { listChangeRequests, countPendingChangeRequests } from "../src/server/change-requests";

runner("trainer_portal_smoke", async () => {
  const center = await createTestTenant("center");
  const other = await createTestTenant("center2");
  try {
    // 1. Le centre crée un formateur avec email, puis l'invite (lie un compte)
    const trainer = await prisma.trainer.create({ data: { organizationId: center.organizationId, firstName: "Léo", lastName: "Test", email: `leo-${Date.now()}@smoke.test`, active: true } });
    const user = await prisma.user.create({ data: { email: trainer.email!, name: "Léo Test" } });
    await prisma.trainer.update({ where: { id: trainer.id }, data: { userId: user.id } });
    await prisma.membership.create({ data: { userId: user.id, organizationId: center.organizationId, role: "TRAINER", status: "INVITED", invitedEmail: trainer.email! } });
    const linked = await prisma.trainer.findUnique({ where: { id: trainer.id } });
    assert(linked?.userId === user.id, "Le compte formateur n'a pas été lié.");
    step("trainer_invited_linked");

    // 2. Le formateur renseigne des disponibilités (DISPONIBLE / TENTATIVE / INDISPONIBLE)
    const d1 = new Date(Date.now() + 3 * 86400000); d1.setUTCHours(0, 0, 0, 0);
    await prisma.trainerAvailability.create({ data: { trainerId: trainer.id, date: d1, slot: "MATIN", type: "DISPONIBLE" } });
    await prisma.trainerAvailability.create({ data: { trainerId: trainer.id, date: d1, slot: "APRES_MIDI", type: "TENTATIVE" } });
    const avails = await getMyAvailabilities(trainer.id);
    assert(avails.length >= 2 && avails.some((a) => a.type === "TENTATIVE"), "Les disponibilités (dont TENTATIVE) ne sont pas remontées.");
    step("availabilities_set", { count: avails.length });

    // 3. Le formateur crée une demande de modification
    const cr = await prisma.changeRequest.create({ data: { organizationId: center.organizationId, trainerId: trainer.id, requestType: "unavailable", reason: "Je ne suis plus dispo le 12.", proposedDate: d1, proposedSlot: "MATIN", urgency: "high", status: "pending" } });
    const myReqs = await getMyChangeRequests(trainer.id);
    assert(myReqs.some((r) => r.id === cr.id), "La demande n'apparaît pas côté formateur.");
    step("change_request_created");

    // 4. Le centre voit la demande en attente
    const centerReqs = await listChangeRequests(center);
    assert(centerReqs.some((r) => r.id === cr.id && r.trainer.id === trainer.id), "La demande ne remonte pas au centre.");
    const pending = await countPendingChangeRequests(center);
    assert(pending >= 1, "Le compteur de demandes en attente est faux.");
    step("center_sees_request", { pending });

    // 5. Le centre accepte → statut accepté + indisponibilité répercutée
    await prisma.changeRequest.update({ where: { id: cr.id }, data: { status: "accepted", centerResponse: "OK, noté." } });
    const existingAvail = await prisma.trainerAvailability.findFirst({ where: { trainerId: trainer.id, date: d1, slot: "MATIN" } });
    if (existingAvail) await prisma.trainerAvailability.update({ where: { id: existingAvail.id }, data: { type: "INDISPONIBLE" } });
    const after = await prisma.changeRequest.findUnique({ where: { id: cr.id } });
    assert(after?.status === "accepted", "La demande n'a pas été acceptée.");
    step("center_accepts_request");

    // 6. Isolation : l'autre centre ne voit pas la demande
    const otherReqs = await listChangeRequests(other);
    assert(!otherReqs.some((r) => r.id === cr.id), "FUITE : un autre centre voit la demande.");
    step("cross_tenant_isolation");

    // 7. Planning du formateur accessible
    const planning = await getMyPlanning(trainer.id, center.organizationId);
    assert(Array.isArray(planning.upcoming) && Array.isArray(planning.past), "Le planning formateur est invalide.");
    step("planning_accessible");
  } finally {
    await center.cleanup();
    await other.cleanup();
    step("tenant_cleanup");
  }
});
