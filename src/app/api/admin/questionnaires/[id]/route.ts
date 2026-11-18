import { NextResponse } from "next/server";
import { getPlatformAdmin } from "@/lib/platform";
import { prisma } from "@/lib/prisma";
import { STATUS_LABELS } from "@/features/questionnaire/schema";
import { logger } from "@/lib/logger";

type Context = { params: Promise<{ id: string }> };
export const dynamic = "force-dynamic";
export async function GET(_request: Request, context: Context) {
  if (!await getPlatformAdmin()) return NextResponse.json({ error: "Accès réservé à l’administration." }, { status: 403 });
  const { id } = await context.params;
  const row = await prisma.questionnaireResponse.findFirst({ where: { id, expiresAt: { gt: new Date() } }, select: {
    id: true, version: true, answers: true, sectorDetail: true, firstName: true, phone: true, email: true, contactSlot: true,
    status: true, createdAt: true, updatedAt: true, consentedAt: true, privacyVersion: true, expiresAt: true,
  } });
  return NextResponse.json(row ? { row } : { error: "Cette réponse n’est plus disponible." }, { status: row ? 200 : 404, headers: { "Cache-Control": "private, no-store" } });
}

async function mutate(request: Request, context: Context, remove: boolean) {
  const admin = await getPlatformAdmin();
  if (!admin) return NextResponse.json({ error: "Accès réservé à l’administration." }, { status: 403 });
  try { if (new URL(request.headers.get("origin") ?? "").host !== request.headers.get("host")) return NextResponse.json({ error: "Origine non autorisée." }, { status: 403 }); }
  catch { return NextResponse.json({ error: "Origine non autorisée." }, { status: 403 }); }
  const { id } = await context.params;
  try {
    if (remove) {
      const result = await prisma.questionnaireResponse.deleteMany({ where: { id } });
      if (!result.count) return NextResponse.json({ error: "Cette réponse n’est plus disponible." }, { status: 404 });
    } else {
      const raw = await request.text();
      if (raw.length > 200) return NextResponse.json({ error: "Demande invalide." }, { status: 400 });
      const input = JSON.parse(raw);
      if (typeof input.status !== "string" || !Object.hasOwn(STATUS_LABELS, input.status)) return NextResponse.json({ error: "Choisissez un statut proposé." }, { status: 400 });
      const result = await prisma.questionnaireResponse.updateMany({ where: { id, expiresAt: { gt: new Date() } }, data: { status: input.status } });
      if (!result.count) return NextResponse.json({ error: "Cette réponse n’est plus disponible." }, { status: 404 });
    }
    logger.info(remove ? "questionnaire.deleted" : "questionnaire.status_changed", { actorId: admin.userId, responseId: id });
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return NextResponse.json({ error: "La modification n’est pas confirmée. Réessayez." }, { status: 503 }); }
}
export async function PATCH(request: Request, context: Context) { return mutate(request, context, false); }
export async function DELETE(request: Request, context: Context) { return mutate(request, context, true); }
