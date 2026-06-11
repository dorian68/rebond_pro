import { requireTenant } from "@/lib/tenant";
import { getTrainerForUser } from "@/server/trainer-portal";
import { getMyPlanning } from "@/server/trainer-self";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function ics(dt: Date): string {
  return dt.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}
function esc(s: string): string {
  return s.replace(/[\\;,]/g, (m) => "\\" + m).replace(/\n/g, "\\n");
}

export async function GET() {
  const ctx = await requireTenant();
  const trainer = await getTrainerForUser(ctx.userId, ctx.organizationId);
  if (!trainer) return new Response("Aucune fiche formateur.", { status: 404 });

  const { upcoming, past } = await getMyPlanning(trainer.id, ctx.organizationId);
  const all = [...past, ...upcoming];

  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Le Bon Rebond//Planning formateur//FR", "CALSCALE:GREGORIAN"];
  for (const s of all) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${s.id}@rebondpro`);
    lines.push(`DTSTAMP:${ics(new Date())}`);
    lines.push(`DTSTART:${ics(s.startDate)}`);
    lines.push(`DTEND:${ics(s.endDate)}`);
    lines.push(`SUMMARY:${esc(s.formation.title)}`);
    lines.push(`LOCATION:${esc(s.room?.name ?? "Distanciel")}`);
    lines.push(`STATUS:${s.status === "ANNULEE" ? "CANCELLED" : "CONFIRMED"}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");

  return new Response(lines.join("\r\n"), {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'attachment; filename="planning-rebondpro.ics"' },
  });
}
