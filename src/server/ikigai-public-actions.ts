"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { encodeIkigaiResult, IKIGAI_STEP_TITLE, verifyIkigaiToken } from "@/server/bilan-roadmap";

export async function submitIkigaiResult(token: string, formData: FormData): Promise<void> {
  const verified = verifyIkigaiToken(token);
  if (!verified) redirect("/login");
  const result = {
    love: String(formData.get("love") || "").trim().slice(0, 1500),
    goodAt: String(formData.get("goodAt") || "").trim().slice(0, 1500),
    useful: String(formData.get("useful") || "").trim().slice(0, 1500),
    paidFor: String(formData.get("paidFor") || "").trim().slice(0, 1500),
    synthesis: String(formData.get("synthesis") || "").trim().slice(0, 1500) || undefined,
    submittedAt: new Date().toISOString(),
  };
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
      after: { submittedAt: result.submittedAt },
    },
  });
  redirect(`/bilan/ikigai/${encodeURIComponent(token)}?done=1`);
}
