import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/primitives";
import { Logo } from "@/components/app/Logo";
import { verifyIkigaiToken } from "@/server/bilan-roadmap";
import { submitIkigaiResult } from "@/server/ikigai-public-actions";
import { prisma } from "@/lib/prisma";

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
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Votre Ikigai professionnel</h1>
          <p className="muted" style={{ lineHeight: 1.6, marginBottom: 18 }}>
            Bonjour {beneficiary.firstName}, remplissez ces quatre zones. Vos réponses seront ajoutées à votre dossier bilan de compétences.
          </p>
          {query.done === "1" ? (
            <div className="badge badge-positive" style={{ height: "auto", padding: "12px 14px", whiteSpace: "normal" }}>
              Réponses enregistrées. Vous pouvez fermer cette page.
            </div>
          ) : (
            <form action={action} style={{ display: "grid", gap: 14 }}>
              {query.error === "missing" && <div className="badge badge-danger" style={{ height: "auto", padding: "10px 12px" }}>Merci de compléter les quatre zones principales.</div>}
              <Field name="love" label="Ce que j'aime faire" placeholder="Activités, environnements, sujets qui me donnent de l'énergie..." />
              <Field name="goodAt" label="Ce pour quoi je suis doué(e)" placeholder="Compétences, qualités, réussites, savoir-faire..." />
              <Field name="useful" label="Ce dont les autres ont besoin" placeholder="Problèmes que je peux aider à résoudre, publics que je veux aider..." />
              <Field name="paidFor" label="Ce qui peut être valorisé économiquement" placeholder="Métiers, services, postes, offres, formations ou projets finançables..." />
              <Field name="synthesis" label="Ce que je remarque en me relisant" placeholder="Pistes, évidences, surprises, doutes..." optional />
              <button type="submit" className="btn btn-primary" style={{ justifySelf: "end" }}>Envoyer mes réponses</button>
            </form>
          )}
        </Card>
      </div>
    </main>
  );
}

function Field({ name, label, placeholder, optional = false }: { name: string; label: string; placeholder: string; optional?: boolean }) {
  return (
    <label style={{ display: "grid", gap: 7 }}>
      <span className="field-label">{label}{optional ? "" : " *"}</span>
      <textarea className="input" name={name} rows={4} required={!optional} placeholder={placeholder} />
    </label>
  );
}
