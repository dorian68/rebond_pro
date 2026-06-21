import Link from "next/link";
import { PageHeader, Card } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

function safeReturnTo(value?: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/assistant";
  return value;
}

export default async function ComposioCallbackPage({ searchParams }: { searchParams: Promise<{ status?: string; connector?: string; scope?: string; returnTo?: string; connected_account_id?: string }> }) {
  const params = await searchParams;
  const ok = params.status === "success";
  const scope = params.scope === "organization" ? "du centre" : "personnel";
  const returnTo = safeReturnTo(params.returnTo);
  return (
    <div className="fade-up">
      <PageHeader title={ok ? "Connecteur connecté" : "Connexion interrompue"} subtitle="Retour de l'autorisation Composio." />
      <Card>
        <p style={{ color: "var(--ink-2)", fontSize: 14, marginBottom: 16 }}>
          {ok
            ? `Le connecteur ${params.connector ?? ""} ${scope} est maintenant disponible pour Socrate.`
            : "La connexion n'a pas été finalisée. Vous pouvez réessayer depuis les paramètres."}
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href={returnTo} className="btn btn-primary">Retour à Socrate</Link>
          <Link href="/parametres" className="btn btn-secondary">Voir les connecteurs</Link>
        </div>
      </Card>
    </div>
  );
}
