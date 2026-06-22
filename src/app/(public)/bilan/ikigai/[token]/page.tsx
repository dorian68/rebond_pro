import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/primitives";
import { Logo } from "@/components/app/Logo";
import { verifyIkigaiToken } from "@/server/bilan-roadmap";
import { submitIkigaiResult } from "@/server/ikigai-public-actions";
import { prisma } from "@/lib/prisma";
import { IkigaiCanvasClient } from "./ikigai-canvas-client";

export const dynamic = "force-dynamic";

export default async function PublicIkigaiPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ done?: string; error?: string }>;
}) {
  const { token } = await params;
  const query = await searchParams;
  const verified = verifyIkigaiToken(token);
  if (!verified) notFound();
  const beneficiary = await prisma.beneficiary.findUnique({
    where: { id: verified.beneficiaryId },
    select: { firstName: true, lastName: true },
  });
  if (!beneficiary) notFound();
  const action = submitIkigaiResult.bind(null, token);

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", padding: "28px 20px" }}>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
          <Link href="/"><Logo size={52} priority /></Link>
          <span className="badge badge-primary">Test Ikigai</span>
        </header>
        <Card>
          <h1 style={{ fontSize: 30, fontWeight: 850, marginBottom: 8 }}>Votre canvas Ikigai professionnel</h1>
          <p className="muted" style={{ lineHeight: 1.6, marginBottom: 18 }}>
            Bonjour {beneficiary.firstName}, choisissez des cartes, ajustez les intensités et ajoutez vos nuances.
            La carte se construit en direct puis rejoint votre dossier bilan.
          </p>
          {query.done === "1" ? (
            <div className="badge badge-positive" style={{ height: "auto", padding: "12px 14px", whiteSpace: "normal" }}>
              Canvas enregistré. Vous pouvez fermer cette page.
            </div>
          ) : (
            <IkigaiCanvasClient action={action} error={query.error} />
          )}
        </Card>
      </div>
    </main>
  );
}
