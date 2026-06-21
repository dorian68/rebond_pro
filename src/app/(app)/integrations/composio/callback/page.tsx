import Link from "next/link";
import { PageHeader, Card } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export default async function ComposioCallbackPage({ searchParams }: { searchParams: Promise<{ status?: string; connector?: string; scope?: string; connected_account_id?: string }> }) {
  const params = await searchParams;
  const ok = params.status === "success";
  const scope = params.scope === "organization" ? "du centre" : "personnel";
  return (
    <div className="fade-up">
      <PageHeader title={ok ? "Connecteur connecté" : "Connexion interrompue"} subtitle="Retour de l'autorisation Composio." />
      <Card>
        <p style={{ color: "var(--ink-2)", fontSize: 14, marginBottom: 16 }}>
          {ok
            ? `Le connecteur ${params.connector ?? ""} ${scope} est maintenant disponible pour Socrate.`
            : "La connexion n'a pas été finalisée. Vous pouvez réessayer depuis les paramètres."}
        </p>
        <Link href="/parametres" className="btn btn-primary">Retour aux paramètres</Link>
      </Card>
    </div>
  );
}
