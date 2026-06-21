import { requireTenant } from "@/lib/tenant";
import { getPlatformAdmin } from "@/lib/platform";
import { getPlatformBeneficiaryOrganization } from "@/server/platform-beneficiary-org";
import { documentIntakeRequestSchema, generateDocumentIntakeDraft } from "@/server/document-intake";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
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
  const admin = await getPlatformAdmin();
  if (admin && parsed.data.target === "beneficiary") {
    const org = await getPlatformBeneficiaryOrganization();
    const draft = await generateDocumentIntakeDraft({
      userId: admin.userId,
      email: admin.email,
      name: admin.name,
      organizationId: org.id,
      organizationName: org.name,
      organizationSlug: org.slug,
      role: "ADMIN" as const,
    }, parsed.data);
    return Response.json({ ok: true, draft });
  }
  const ctx = await requireTenant();
  const draft = await generateDocumentIntakeDraft(ctx, parsed.data);
  return Response.json({ ok: true, draft });
}
