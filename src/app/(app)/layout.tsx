import { redirect } from "next/navigation";
import { Sidebar } from "@/components/app/Sidebar";
import { Topbar, type TopNotif } from "@/components/app/Topbar";
import { AgentDock } from "@/components/agent/AgentDock";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { documentSuggestions } from "@/server/documents";

function deriveInitials(name: string | null, email: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
  }
  return (email?.[0] ?? "?").toUpperCase();
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireTenant();
  // Les formateurs ont leur propre portail simplifié
  if (ctx.role === "TRAINER") redirect("/trainer");
  const now = new Date();

  const [relances, suggestions] = await Promise.all([
    prisma.prospect.count({
      where: { organizationId: ctx.organizationId, deletedAt: null, nextFollowUpDate: { lte: now }, stage: { in: ["NOUVEAU", "CONTACTE", "DEVIS", "RELANCE"] } },
    }),
    documentSuggestions(ctx),
  ]);
  const docsToGenerate = suggestions.length;

  const notifications: TopNotif[] = [];
  if (relances > 0) notifications.push({ id: "n-relances", type: "warn", icon: "send", title: `${relances} prospect${relances > 1 ? "s" : ""} à relancer`, text: "Des relances commerciales sont en attente cette semaine." });
  if (docsToGenerate > 0) notifications.push({ id: "n-docs", type: "primary", icon: "file-text", title: `${docsToGenerate} document${docsToGenerate > 1 ? "s" : ""} à générer`, text: "Des documents administratifs sont en attente de génération." });

  return (
    <div className="app-root">
      <Sidebar
        user={{ name: ctx.name ?? ctx.email ?? "Utilisateur", initials: deriveInitials(ctx.name, ctx.email), orgName: ctx.organizationName ?? "Mon centre" }}
        badges={{ prospects: relances || undefined, documents: docsToGenerate || undefined }}
      />
      <div className="main-col">
        <Topbar notifications={notifications} />
        <div className="page-wrap">{children}</div>
      </div>
      <AgentDock />
    </div>
  );
}
