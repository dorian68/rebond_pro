import "./_env";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/prisma";
import { questions, submissionSchema, responseStatistics, csvCell, type Answers } from "../src/features/questionnaire/schema";
import { saveQuestionnaire, expiryDate, questionnaireWhere } from "../src/server/questionnaire-service";
import { step, assert, runner } from "./_tenant";

runner("questionnaire", async () => {
  const ids: string[] = [];
  const keys: string[] = [];
  try {
    const answers: Answers = {};
    for (const q of questions) if (q.required) answers[q.id] = q.type === "multiple" ? [q.options![0]] : q.options![0];
    answers.rappel = "Non, pas pour le moment";
    const payload = () => { const key = randomUUID(); keys.push(key); return { submissionKey: key, answers, consent: true, firstName: "À effacer", phone: "0690123456", email: "synthetic@example.test", sectorDetail: "Projet synthétique" }; };
    const parsed = submissionSchema.parse(payload());
    assert(!parsed.firstName && !parsed.phone && !parsed.email, "Coordonnées effacées sans demande de rappel");
    const first = await saveQuestionnaire(parsed); ids.push(first.id);
    const retry = await saveQuestionnaire(parsed);
    assert(first.id === retry.id && retry.repeated, "Un rejeu doit retrouver une seule réponse");
    assert(await prisma.questionnaireResponse.count({ where: { submissionKey: parsed.submissionKey } }) === 1, "Pas de doublon");
    step("saved_and_idempotent");
    const concurrent = submissionSchema.parse(payload());
    const parallel = await Promise.all([saveQuestionnaire(concurrent), saveQuestionnaire(concurrent), saveQuestionnaire(concurrent)]);
    ids.push(parallel[0].id);
    assert(new Set(parallel.map(r => r.id)).size === 1, "Rejeux concurrents sans doublon");
    let conflict = false;
    try { await saveQuestionnaire({ ...parsed, sectorDetail: "Autre réponse" }); } catch (error) { conflict = error instanceof Error && error.message === "SUBMISSION_CONFLICT"; }
    assert(conflict, "Le changement d'un envoi déjà enregistré doit être explicite");
    step("concurrent_retry_and_conflict");
    for (const invalid of [
      { ...payload(), consent: false },
      { ...payload(), answers: { ...answers, objectif: "Inventé" } },
      { ...payload(), answers: { ...answers, besoins: questions.find(q => q.id === "besoins")!.options!.slice(0,3) } },
      { ...payload(), answers: { ...answers, freins: ["Rien de particulier", "Les déplacements"] } },
      { ...payload(), answers: { ...answers, rappel: "Oui, par téléphone" }, phone: "" },
      { ...payload(), answers: { ...answers, rappel: "Oui, par email" }, email: "invalide" },
    ]) assert(!submissionSchema.safeParse(invalid).success, "Validation d'un cas invalide");
    step("validation_optional_contact_maxima_exclusivity_consent");
    const stats = responseStatistics([{ answers: { ...answers, besoins: ["A", "B"] }, status: "NEW" },{ answers: { ...answers, besoins: ["A"] }, status: "DONE" }]);
    assert(stats.total === 2 && stats.pending === 1 && stats.contact === 0, "Statistiques exactes");
    const mobility = stats.distributions.find(q => q.id === "freins")!;
    assert(mobility.answered === 0 && mobility.unanswered === 2, "Les non-réponses ne sont pas des réponses négatives");
    assert(csvCell("=1+1").startsWith('"\''), "Export protège contre les formules CSV");
    const expire = expiryDate(new Date("2026-08-31T10:00:00Z"));
    assert(expire.toISOString().startsWith("2027-02-28"), "Six mois calendaires");
    const where = questionnaireWhere(new URLSearchParams("from=2026-11-18&to=2026-11-18&status=NEW"));
    assert(JSON.stringify(where).includes("2026-11-18T04:00:00.000Z"), "Dates de Guadeloupe");
    await prisma.questionnaireResponse.update({ where: { id: first.id }, data: { expiresAt: new Date(0) } });
    assert(await prisma.questionnaireResponse.count({ where: { ...questionnaireWhere(new URLSearchParams()), id: first.id } }) === 0, "Réponse expirée masquée");
    step("statistics_csv_dates_and_retention");
  } finally {
    await prisma.questionnaireResponse.deleteMany({ where: { OR: [{ id: { in: ids } }, { submissionKey: { in: keys } }] } });
  }
});
