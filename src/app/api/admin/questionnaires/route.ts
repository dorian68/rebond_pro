import { NextResponse } from "next/server";
import { getPlatformAdmin } from "@/lib/platform";
import { prisma } from "@/lib/prisma";
import { questionnaireWhere } from "@/server/questionnaire-service";
import { csvCell, questions, responseStatistics, STATUS_LABELS, type Answers } from "@/features/questionnaire/schema";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const admin = await getPlatformAdmin();
  if (!admin) return NextResponse.json({ error: "Accès réservé à l’administration." }, { status: 403 });
  const params = new URL(request.url).searchParams;
  const where = questionnaireWhere(params);
  const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
  try {
    if (params.get("format") === "csv") {
      const rows = await prisma.questionnaireResponse.findMany({ where, orderBy: { createdAt: "desc" } });
      const columns = ["Référence", "Reçu le (Guadeloupe)", "Statut", "Prénom", "Téléphone", "Email", "Créneau souhaité", "Métier ou idée d’activité", ...questions.map(q => `${q.number}. ${q.label}`), "Version du questionnaire", "Accord recueilli le", "Suppression prévue le"];
      const values = rows.map(row => [row.id, row.createdAt.toLocaleString("fr-FR", { timeZone: "America/Guadeloupe" }), STATUS_LABELS[row.status as keyof typeof STATUS_LABELS], row.firstName, row.phone, row.email, row.contactSlot, row.sectorDetail,
        ...questions.map(q => { const v = (row.answers as Answers)[q.id]; return Array.isArray(v) ? v.join(" | ") : v ?? ""; }), row.version, row.consentedAt.toISOString(), row.expiresAt.toISOString()]);
      logger.info("questionnaire.exported", { actorId: admin.userId, count: rows.length });
      return new Response("\uFEFF"+[columns,...values].map(row => row.map(csvCell).join(";")).join("\r\n"), { headers: { ...headers, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="questionnaires-le-bon-rebond.csv"' } });
    }
    const distributionRows = await prisma.questionnaireResponse.findMany({ where, select: { answers: true, status: true } });
    const stats = responseStatistics(distributionRows);
    const totalPages = Math.max(1, Math.ceil(stats.total/25));
    const page = Math.min(totalPages, Math.max(1, Math.floor(Number(params.get("page")) || 1)));
    const rows = await prisma.questionnaireResponse.findMany({ where, orderBy: [{ createdAt: "desc" },{ id: "desc" }], skip: (page-1)*25, take: 25,
      select: { id: true, createdAt: true, status: true, firstName: true, phone: true, email: true, answers: true, sectorDetail: true } });
    return NextResponse.json({ rows, stats, page, totalPages }, { headers });
  } catch {
    logger.error("questionnaire.admin_read_failed", { actorId: admin.userId });
    return NextResponse.json({ error: "Les réponses sont indisponibles. Réessayez dans un instant." }, { status: 503, headers });
  }
}
