import "server-only";
import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { questionnaire, PRIVACY_VERSION, type Submission } from "@/features/questionnaire/schema";

export function expiryDate(now: Date) {
  const date = new Date(now);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth()+6);
  const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth()+1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, last));
  return date;
}

export async function saveQuestionnaire(data: Submission) {
  const { submissionKey, ...content } = data;
  const requestHash = createHash("sha256").update(JSON.stringify(content)).digest("hex");
  const existing = await prisma.questionnaireResponse.findUnique({ where: { submissionKey }, select: { id: true, requestHash: true } });
  if (existing) {
    if (existing.requestHash !== requestHash) throw new Error("SUBMISSION_CONFLICT");
    return { id: existing.id, repeated: true };
  }
  const now = new Date();
  try {
    const response = await prisma.questionnaireResponse.create({ data: {
      submissionKey, requestHash, version: questionnaire.version, answers: data.answers,
      sectorDetail: data.sectorDetail || null, firstName: data.firstName || null,
      phone: data.phone || null, email: data.email || null, contactSlot: data.contactSlot || null,
      consentedAt: now, privacyVersion: PRIVACY_VERSION, expiresAt: expiryDate(now),
    }, select: { id: true } });
    return { id: response.id, repeated: false };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const row = await prisma.questionnaireResponse.findUnique({ where: { submissionKey }, select: { id: true, requestHash: true } });
      if (row?.requestHash === requestHash) return { id: row.id, repeated: true };
      throw new Error("SUBMISSION_CONFLICT");
    }
    throw error;
  }
}

export function questionnaireWhere(params: URLSearchParams): Prisma.QuestionnaireResponseWhereInput {
  const start = params.get("from"), end = params.get("to"), status = params.get("status"), contact = params.get("contact");
  const where: Prisma.QuestionnaireResponseWhereInput = { expiresAt: { gt: new Date() } };
  const createdAt: Prisma.DateTimeFilter = {};
  // Dates civiles dans le fuseau de Guadeloupe (UTC-4 toute l'année).
  if (start && /^\d{4}-\d{2}-\d{2}$/.test(start) && !Number.isNaN(Date.parse(start))) createdAt.gte = new Date(start+"T00:00:00-04:00");
  if (end && /^\d{4}-\d{2}-\d{2}$/.test(end) && !Number.isNaN(Date.parse(end))) createdAt.lte = new Date(end+"T23:59:59.999-04:00");
  if (Object.keys(createdAt).length) where.createdAt = createdAt;
  if (status && ["NEW", "IN_PROGRESS", "DONE"].includes(status)) where.status = status;
  if (contact === "yes") where.OR = [{ phone: { not: null } }, { email: { not: null } }];
  if (contact === "no") { where.phone = null; where.email = null; }
  return where;
}
