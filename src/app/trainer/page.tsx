import Link from "next/link";
import { redirect } from "next/navigation";
import { requireTenant } from "@/lib/tenant";
import { getTrainerForUser, getTrainerSessions, getTrainerAvailabilities } from "@/server/trainer-portal";
import { getTrainerMonthSummary } from "@/server/trainer-self";
import { Icon } from "@/components/ui/Icon";
import { formatDateRange, formatDate } from "@/lib/utils";
import { SessionBadge } from "@/components/ui/primitives";
import { TrainerSessionCard } from "./trainer-session-card";

export const dynamic = "force-dynamic";

export default async function TrainerHomePage() {
  const ctx = await requireTenant();
  const trainer = await getTrainerForUser(ctx.userId, ctx.organizationId);

  if (!trainer && ctx.role === "TRAINER") {
    return (
      <div style={{ textAlign: "center", padding: "60px 24px" }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, background: "var(--surface-3)", color: "var(--ink-3)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
          <Icon name="user-x" size={26} />
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Profil formateur non lié</h2>
        <p style={{ color: "var(--ink-2)", fontSize: 14 }}>Votre compte n&apos;est pas encore associé à un profil formateur dans ce centre. Contactez l&apos;administrateur.</p>
      </div>
    );
  }

  if (!trainer) redirect("/dashboard");

  const [{ upcoming, past }, availabilities, summary] = await Promise.all([
    getTrainerSessions(ctx, trainer.id),
    getTrainerAvailabilities(ctx, trainer.id),
    getTrainerMonthSummary(trainer.id, ctx.organizationId),
  ]);

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const cards = [
    { label: "Sessions ce mois", value: summary.sessionsThisMonth, icon: "calendar" },
    { label: "Jours disponibles", value: summary.daysAvailable, icon: "check-circle" },
    { label: "Jours indisponibles", value: summary.daysUnavailable, icon: "circle" },
    { label: "Demandes en attente", value: summary.pendingRequests, icon: "message" },
  ];

  return (
    <div className="fade-up">
      {/* En-tête */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>Bonjour, {trainer.firstName} 👋</h1>
        <p style={{ color: "var(--ink-2)", marginTop: 6, fontSize: 14 }}>
          {upcoming.length > 0
            ? `Vous avez ${upcoming.length} session${upcoming.length > 1 ? "s" : ""} à venir.`
            : "Aucune session programmée pour le moment."}
        </p>
      </div>

      {/* Cartes synthèse */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {cards.map((c) => (
          <div key={c.label} style={{ padding: "14px 16px", border: "1px solid var(--border)", borderRadius: 14, background: "#fff" }}>
            <Icon name={c.icon} size={17} style={{ color: "var(--primary)" }} />
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>{c.value}</div>
            <div style={{ fontSize: 11.5, color: "var(--ink-3)", fontWeight: 600 }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* CTA principal */}
      <Link href="/trainer/disponibilites" className="btn btn-primary btn-lg btn-block" style={{ marginBottom: 28 }}>
        <Icon name="calendar" size={18} /> Renseigner mes disponibilités
      </Link>

      {/* Sessions à venir */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 15.5, fontWeight: 800, marginBottom: 14 }}>Mes sessions à venir</h2>
        {upcoming.length === 0 && (
          <div style={{ padding: "32px 20px", textAlign: "center", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 14 }}>
            <Icon name="calendar" size={28} style={{ color: "var(--ink-4)", marginBottom: 8 }} />
            <p style={{ color: "var(--ink-3)", fontSize: 14 }}>Aucune session à venir.</p>
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {upcoming.map((s) => (
            <TrainerSessionCard key={s.id} session={s} />
          ))}
        </div>
      </section>

      {/* Disponibilités cette semaine */}
      <section style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ fontSize: 15.5, fontWeight: 800 }}>Mes disponibilités cette semaine</h2>
          <Link href={`/trainer/disponibilites`} className="btn btn-secondary btn-sm">
            <Icon name="edit" size={14} /> Gérer
          </Link>
        </div>
        {availabilities.length === 0 ? (
          <p style={{ color: "var(--ink-3)", fontSize: 13, padding: "16px 20px", background: "var(--surface-2)", borderRadius: 12, border: "1px solid var(--border)" }}>
            Aucune disponibilité renseignée cette semaine.{" "}
            <Link href={`/trainer/disponibilites`} style={{ color: "var(--primary)" }}>Renseigner mes disponibilités</Link>
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {availabilities.map((a) => {
              const dayStr = a.date.toISOString().slice(0, 10);
              const isToday = dayStr === todayStr;
              const SLOT_LABELS: Record<string, string> = { MATIN: "Matin", APRES_MIDI: "Après-midi", JOURNEE: "Journée", SOIR: "Soir" };
              return (
                <div key={a.id} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10,
                  background: isToday ? "var(--primary-tint)" : "var(--surface-2)",
                  border: `1px solid ${isToday ? "var(--primary-100)" : "var(--border)"}`,
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: 99, background: a.type === "DISPONIBLE" ? "var(--positive-600)" : "var(--danger)", flex: "none" }} />
                  <span style={{ fontWeight: 700, fontSize: 13, minWidth: 90 }}>{formatDate(a.date)}</span>
                  <span style={{ fontSize: 13, color: "var(--ink-2)" }}>{SLOT_LABELS[a.slot]}</span>
                  <span className={a.type === "DISPONIBLE" ? "badge badge-positive" : "badge badge-danger"} style={{ marginLeft: "auto" }}>
                    {a.type === "DISPONIBLE" ? "Disponible" : "Indisponible"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Sessions passées récentes */}
      {past.length > 0 && (
        <section>
          <h2 style={{ fontSize: 15.5, fontWeight: 800, marginBottom: 14 }}>Sessions récentes</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {past.map((s) => (
              <Link key={s.id} href={`/trainer/sessions/${s.id}`} style={{
                display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderRadius: 12,
                background: "var(--surface-2)", border: "1px solid var(--border)",
              }}>
                <div style={{ width: 8, height: 8, borderRadius: 99, background: s.formation.color ?? "var(--primary)", flex: "none" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{s.formation.title}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{formatDateRange(s.startDate, s.endDate)} · {s._count.enrollments} inscrit{s._count.enrollments > 1 ? "s" : ""}</div>
                </div>
                <SessionBadge statut={s.status} />
                <Icon name="chevron-right" size={15} style={{ color: "var(--ink-4)" }} />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
