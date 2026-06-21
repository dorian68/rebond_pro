import { requireTenant } from "@/lib/tenant";
import { documentIntakeRequestSchema, generateDocumentIntakeDraft } from "@/server/document-intake";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ctx = await requireTenant();
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const parsed = documentIntakeRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json({ ok: false, error: parsed.error.issues[0]?.message ?? "invalid_request" }, { status: 400 });
  }
  const draft = await generateDocumentIntakeDraft(ctx, parsed.data);
  return Response.json({ ok: true, draft });
}
