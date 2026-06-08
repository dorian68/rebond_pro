import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { getJob } from "@/lib/jobs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireTenant();
    const { id } = await params;
    const job = await getJob(ctx, id);
    if (!job) return NextResponse.json({ error: "Job introuvable." }, { status: 404 });
    return NextResponse.json({ id: job.id, status: job.status, resultUrl: job.resultUrl, error: job.error, completedAt: job.completedAt });
  } catch {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
}
