import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/platform";

export const dynamic = "force-dynamic";

function safeReturnTo(value?: string) {
  if (!value || !value.startsWith("/admin/") || value.startsWith("//") || value.includes("\\")) return "/admin/roadmap-2";
  return value;
}

export default async function AdminComposioCallbackPage({ searchParams }: { searchParams: Promise<{ status?: string; connector?: string; returnTo?: string }> }) {
  await requirePlatformAdmin();
  const params = await searchParams;
  const ok = params.status === "success";
  const returnTo = safeReturnTo(params.returnTo);
  return (
    <section className="card" style={{ maxWidth: 680, margin: "40px auto", padding: 24 }}>
      <h1 style={{ marginBottom: 10 }}>{ok ? "Gmail est connecté" : "Connexion Gmail interrompue"}</h1>
      <p style={{ color: "var(--ink-2)", marginBottom: 18 }}>
        {ok ? "Le compte personnel est maintenant disponible pour Socrate sur Roadmap 2." : "L’autorisation n’a pas été finalisée. Vous pouvez la relancer depuis Socrate."}
      </p>
      <Link href={returnTo} className="btn btn-primary">Retour à Roadmap 2</Link>
    </section>
  );
}
