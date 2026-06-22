"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { encodeIkigaiResult, IKIGAI_STEP_TITLE, type IkigaiResult, verifyIkigaiToken } from "@/server/bilan-roadmap";

function text(value: unknown, max = 1500) {
  return String(value ?? "").trim().slice(0, max);
}

function parseIkigaiPayload(formData: FormData): IkigaiResult {
  const raw = String(formData.get("ikigaiPayload") || "");
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<IkigaiResult>;
      return {
        mode: parsed.mode === "canvas" ? "canvas" : undefined,
        love: text(parsed.love),
        goodAt: text(parsed.goodAt),
        useful: text(parsed.useful),
        paidFor: text(parsed.paidFor),
        synthesis: text(parsed.synthesis) || undefined,
        choices: typeof parsed.choices === "object" && parsed.choices ? parsed.choices as Record<string, string[]> : undefined,
        scores: typeof parsed.scores === "object" && parsed.scores ? parsed.scores as Record<string, number> : undefined,
        intersections: typeof parsed.intersections === "object" && parsed.intersections ? parsed.intersections as IkigaiResult["intersections"] : undefined,
        submittedAt: new Date().toISOString(),
      };
    } catch {
      // Falls through to legacy fields below.
    }
  }
  return {
    love: text(formData.get("love")),
    goodAt: text(formData.get("goodAt")),
    useful: text(formData.get("useful")),
    paidFor: text(formData.get("paidFor")),
    synthesis: text(formData.get("synthesis")) || undefined,
    submittedAt: new Date().toISOString(),
  };
}

export async function submitIkigaiResult(token: string, formData: FormData): Promise<void> {
  const verified = verifyIkigaiToken(token);
  if (!verified) redirect("/login");
  const result = parseIkigaiPayload(formData);
  if (!result.love || !result.goodAt || !result.useful || !result.paidFor) {
    redirect(`/bilan/ikigai/${encodeURIComponent(token)}?error=missing`);
  }
  const beneficiary = await prisma.beneficiary.findUnique({ where: { id: verified.beneficiaryId }, select: { id: true, organizationId: true } });
  if (!beneficiary) redirect("/login");
  await prisma.bilanStep.updateMany({
    where: { beneficiaryId: beneficiary.id, title: IKIGAI_STEP_TITLE },
    data: { notes: encodeIkigaiResult(result), status: "done", completedAt: new Date() },
  });
  await prisma.auditLog.create({
    data: {
      organizationId: beneficiary.organizationId,
      action: "public.ikigai.submitted",
      entityType: "Beneficiary",
      entityId: beneficiary.id,
      after: { submittedAt: result.submittedAt, mode: result.mode ?? "legacy" },
    },
  });
  redirect(`/bilan/ikigai/${encodeURIComponent(token)}?done=1`);
}
