import { getBeneficiaryContext, getMyBilanSteps } from "@/server/beneficiary-self";
import { PageHeader, Card, EmptyState } from "@/components/ui/primitives";
import { BILAN_PHASES } from "@/server/bilan";
import { ParcoursClient } from "./parcours-client";

export const dynamic = "force-dynamic";

export default async function ParcoursPage() {
  const { beneficiary } = await getBeneficiaryContext();
  if (!beneficiary) {
    return <div className="fade-up"><PageHeader title="Mon parcours" /><Card><EmptyState icon="smile" title="Parcours en préparation" text="Votre conseiller activera votre parcours très prochainement." /></Card></div>;
  }
  const steps = await getMyBilanSteps(beneficiary.id);

  return (
    <div className="fade-up">
      <PageHeader title="Mon parcours de bilan" subtitle="Avancez à votre rythme dans les trois phases de votre bilan de compétences." />
      <ParcoursClient
        phases={BILAN_PHASES.map((p) => ({ id: p.id, label: p.label }))}
        steps={steps.map((s) => ({ id: s.id, phase: s.phase, title: s.title, description: s.description, status: s.status, notes: s.notes }))}
      />
    </div>
  );
}
