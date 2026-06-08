import { NextRequest, NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export type SearchResult = {
  type: "formation" | "session" | "prospect" | "learner" | "trainer";
  id: string;
  title: string;
  subtitle: string;
  url: string;
};

export async function GET(req: NextRequest) {
  const ctx = await requireTenant();
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);

  const orgId = ctx.organizationId;
  const like = { contains: q, mode: "insensitive" as const };

  const [formations, sessions, prospects, learners, trainers] = await Promise.all([
    prisma.formation.findMany({
      where: { organizationId: orgId, deletedAt: null, OR: [{ title: like }, { category: like }] },
      select: { id: true, title: true, category: true },
      take: 5,
    }),
    prisma.session.findMany({
      where: { organizationId: orgId, formation: { title: like } },
      select: { id: true, startDate: true, formation: { select: { title: true } }, trainer: { select: { firstName: true, lastName: true } } },
      take: 5,
    }),
    prisma.prospect.findMany({
      where: { organizationId: orgId, deletedAt: null, OR: [{ name: like }, { contactName: like }] },
      select: { id: true, name: true, contactName: true, stage: true },
      take: 5,
    }),
    prisma.learner.findMany({
      where: { organizationId: orgId, OR: [{ firstName: like }, { lastName: like }, { email: like }, { company: like }] },
      select: { id: true, firstName: true, lastName: true, company: true },
      take: 5,
    }),
    prisma.trainer.findMany({
      where: { organizationId: orgId, OR: [{ firstName: like }, { lastName: like }] },
      select: { id: true, firstName: true, lastName: true, specialities: true },
      take: 5,
    }),
  ]);

  const results: SearchResult[] = [
    ...formations.map((f) => ({ type: "formation" as const, id: f.id, title: f.title, subtitle: f.category ?? "", url: `/formations/${f.id}` })),
    ...sessions.map((s) => ({ type: "session" as const, id: s.id, title: s.formation.title, subtitle: `Session · ${s.startDate.toLocaleDateString("fr-FR")} · ${s.trainer ? `${s.trainer.firstName} ${s.trainer.lastName}` : ""}`, url: `/sessions/${s.id}` })),
    ...prospects.map((p) => ({ type: "prospect" as const, id: p.id, title: p.name, subtitle: `${p.contactName ?? ""} · ${p.stage}`, url: `/prospects/${p.id}` })),
    ...learners.map((l) => ({ type: "learner" as const, id: l.id, title: `${l.firstName} ${l.lastName}`, subtitle: l.company ?? "", url: `/apprenants/${l.id}` })),
    ...trainers.map((t) => ({ type: "trainer" as const, id: t.id, title: `${t.firstName} ${t.lastName}`, subtitle: t.specialities.join(", "), url: `/formateurs/${t.id}` })),
  ];

  return NextResponse.json(results);
}
