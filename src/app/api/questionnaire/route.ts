import { NextResponse } from "next/server";
import { submissionSchema } from "@/features/questionnaire/schema";
import { saveQuestionnaire } from "@/server/questionnaire-service";
import { rateLimit, rateLimitFingerprint, clientIp } from "@/server/rate-limit";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  try { if (!origin || new URL(origin).host !== request.headers.get("host") || request.headers.get("sec-fetch-site") === "cross-site") return NextResponse.json({ error: "Cette demande ne peut pas être envoyée depuis cette page." }, { status: 403 }); }
  catch { return NextResponse.json({ error: "Origine non autorisée." }, { status: 403 }); }
  if (!request.headers.get("content-type")?.startsWith("application/json")) return NextResponse.json({ error: "Format de demande invalide." }, { status: 415 });
  if (!rateLimit(`questionnaire:${rateLimitFingerprint(clientIp(request))}`, 120, 3_600_000) || !rateLimit("questionnaire:global", 400, 3_600_000)) return NextResponse.json({ error: "Trop de tentatives. Réessayez dans un moment." }, { status: 429, headers: { "Retry-After": "3600" } });
  let input: unknown;
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new Error("EMPTY");
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 16_384) { await reader.cancel(); return NextResponse.json({ error: "La réponse est trop volumineuse." }, { status: 413 }); } chunks.push(value); }
    input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch { return NextResponse.json({ error: "La demande est illisible. Réessayez." }, { status: 400 }); }
  if (input && typeof input === "object" && "website" in input && input.website) return NextResponse.json({ error: "La demande n’a pas pu être enregistrée." }, { status: 400 });
  const parsed = submissionSchema.safeParse(input);
  if (!parsed.success) return NextResponse.json({ error: "Vérifiez les réponses indiquées.", fields: Object.fromEntries(parsed.error.issues.map(issue => [issue.path.join("."), issue.message])) }, { status: 400 });
  try {
    const result = await saveQuestionnaire(parsed.data);
    logger.info("questionnaire.saved", { responseId: result.id, repeated: result.repeated });
    return NextResponse.json({ ok: true }, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message === "SUBMISSION_CONFLICT") return NextResponse.json({ error: "Une autre réponse a déjà été enregistrée pour cet envoi. Rechargez la page pour commencer un nouveau questionnaire." }, { status: 409 });
    logger.error("questionnaire.save_failed", { code: error && typeof error === "object" && "code" in error ? String(error.code) : "UNKNOWN" });
    return NextResponse.json({ error: "L’enregistrement n’est pas confirmé. Vos réponses sont conservées sur cette page : réessayez dans un instant." }, { status: 503 });
  }
}
