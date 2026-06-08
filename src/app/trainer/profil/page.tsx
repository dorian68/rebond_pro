import { getTrainerContext } from "@/server/trainer-self";
import { PageHeader, Card, EmptyState } from "@/components/ui/primitives";
import { TrainerProfileForm } from "./profile-form";

export const dynamic = "force-dynamic";

export default async function TrainerProfilePage() {
  const { trainer } = await getTrainerContext();
  if (!trainer) {
    return <div className="fade-up"><PageHeader title="Mon profil" /><Card><EmptyState icon="user-x" title="Compte non rattaché" text="Contactez votre centre de formation." /></Card></div>;
  }
  return (
    <div className="fade-up">
      <PageHeader title="Mon profil formateur" subtitle="Ces informations peuvent être mises en avant par votre centre." />
      <TrainerProfileForm
        trainerId={trainer.id}
        defaults={{ firstName: trainer.firstName, lastName: trainer.lastName, phone: trainer.phone, bio: trainer.bio, specialities: trainer.specialities, yearsExperience: trainer.yearsExperience, photoUrl: trainer.photoUrl }}
      />
    </div>
  );
}
