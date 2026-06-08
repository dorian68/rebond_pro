import { getTrainerContext, getMyAvailabilities } from "@/server/trainer-self";
import { PageHeader, Card, EmptyState } from "@/components/ui/primitives";
import { AvailabilityEditor } from "./availability-editor";

export const dynamic = "force-dynamic";

export default async function DisponibilitesPage() {
  const { trainer } = await getTrainerContext();
  if (!trainer) {
    return (
      <div className="fade-up">
        <PageHeader title="Mes disponibilités" />
        <Card><EmptyState icon="user-x" title="Compte non rattaché" text="Votre compte n'est pas encore relié à une fiche formateur. Contactez votre centre de formation." /></Card>
      </div>
    );
  }

  const avails = await getMyAvailabilities(trainer.id);
  const initial = avails.map((a) => ({ key: `${a.date.toISOString().slice(0, 10)}_${a.slot}`, type: a.type as string }));

  return (
    <div className="fade-up">
      <PageHeader title="Mes disponibilités" subtitle="Cliquez sur un créneau pour indiquer votre disponibilité. Tout est enregistré automatiquement." />
      <AvailabilityEditor initial={initial} />
    </div>
  );
}
