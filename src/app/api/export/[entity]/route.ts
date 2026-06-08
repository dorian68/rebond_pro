import { NextRequest, NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api";

function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const escape = (v: string | number | null | undefined) => {
    if (v == null) return "";
    const s = String(v).replace(/"/g, '""');
    return s.includes(",") || s.includes("\n") || s.includes('"') ? `"${s}"` : s;
  };
  return [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ entity: string }> }) {
  const ctx = await requireTenant();
  const { entity } = await params;
  const orgId = ctx.organizationId;

  let csv = "";
  let filename = "export.csv";

  if (entity === "learners") {
    const rows = await prisma.learner.findMany({
      where: { organizationId: orgId },
      include: { enrollments: { include: { session: { include: { formation: { select: { title: true } } } } } } },
      orderBy: { lastName: "asc" },
    });
    filename = "apprenants.csv";
    csv = toCsv(
      ["Nom", "Prénom", "Email", "Téléphone", "Entreprise", "Nb inscriptions", "Dernière formation"],
      rows.map((l) => [
        l.lastName, l.firstName, l.email, l.phone ?? "", l.company ?? "",
        l.enrollments.length,
        l.enrollments.at(-1)?.session.formation.title ?? "",
      ])
    );
  } else if (entity === "sessions") {
    const rows = await prisma.session.findMany({
      where: { organizationId: orgId },
      include: { formation: { select: { title: true } }, trainer: { select: { firstName: true, lastName: true } }, room: { select: { name: true } }, _count: { select: { enrollments: true } } },
      orderBy: { startDate: "desc" },
    });
    filename = "sessions.csv";
    csv = toCsv(
      ["Formation", "Date début", "Date fin", "Formateur", "Salle", "Statut", "Capacité", "Inscrits", "Prix/pers (€)"],
      rows.map((s) => [
        s.formation.title,
        s.startDate.toLocaleDateString("fr-FR"),
        s.endDate.toLocaleDateString("fr-FR"),
        s.trainer ? `${s.trainer.firstName} ${s.trainer.lastName}` : "",
        s.room?.name ?? "",
        s.status,
        s.capacity,
        s._count.enrollments,
        (s.pricePerLearner / 100).toFixed(2),
      ])
    );
  } else if (entity === "prospects") {
    const rows = await prisma.prospect.findMany({
      where: { organizationId: orgId, deletedAt: null },
      include: { formationOfInterest: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
    });
    filename = "prospects.csv";
    csv = toCsv(
      ["Nom", "Contact", "Type", "Email", "Téléphone", "Étape", "Montant potentiel (€)", "Formation d'intérêt", "Source", "Chaud"],
      rows.map((p) => [
        p.name, p.contactName ?? "", p.type, p.email ?? "", p.phone ?? "",
        p.stage, (p.potentialAmount / 100).toFixed(2),
        p.formationOfInterest?.title ?? "", p.source ?? "", p.isHot ? "Oui" : "Non",
      ])
    );
  } else {
    return apiError("Entité inconnue.", 404, "UNKNOWN_ENTITY");
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
