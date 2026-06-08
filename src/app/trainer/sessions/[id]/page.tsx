import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireTenant } from "@/lib/tenant";
import { getTrainerForUser, getSessionEnrollments } from "@/server/trainer-portal";
import { Icon } from "@/components/ui/Icon";
import { formatDateRange } from "@/lib/utils";
import { SessionBadge } from "@/components/ui/primitives";
import { AttendanceClient } from "./attendance-client";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function TrainerSessionPage({ params }: Props) {
  const { id } = await params;
  const ctx = await requireTenant();
  const trainer = await getTrainerForUser(ctx.userId, ctx.organizationId);
  if (!trainer && ctx.role === "TRAINER") redirect("/trainer");

  const effectiveTrainerId = trainer?.id ?? "";
  const session = await getSessionEnrollments(ctx, id, effectiveTrainerId);
  if (!session && ctx.role === "TRAINER") notFound();
  if (!session) redirect("/trainer");

  return (
    <div className="fade-up">
      <div style={{ marginBottom: 20 }}>
        <Link href="/trainer" style={{ fontSize: 13, color: "var(--ink-3)", display: "inline-flex", alignItems: "center", gap: 5, marginBottom: 12 }}>
          <Icon name="arrow-left" size={14} /> Retour
        </Link>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 20, fontWeight: 800 }}>{session.formation.title}</h1>
            <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 5, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <span><Icon name="calendar" size={13} /> {formatDateRange(session.startDate, session.endDate)}</span>
              {session.room && <span><Icon name="map-pin" size={13} /> {session.room.name}</span>}
              <span><Icon name="users" size={13} /> {session.enrollments.length}/{session.capacity} inscrits</span>
            </div>
          </div>
          <SessionBadge statut={session.status} />
        </div>
      </div>

      <AttendanceClient session={session} />
    </div>
  );
}
