import { getBeneficiaryContext } from "@/server/beneficiary-self";
import { PageHeader, Card, EmptyState } from "@/components/ui/primitives";
import { BeneficiaryProfileForm } from "./profile-form";

export const dynamic = "force-dynamic";

export default async function EspaceProfilPage() {
  const { beneficiary } = await getBeneficiaryContext();
  if (!beneficiary) {
    return <div className="fade-up"><PageHeader title="Mon profil" /><Card><EmptyState icon="user" title="Espace en préparation" text="Votre conseiller activera votre espace très prochainement." /></Card></div>;
  }
  return (
    <div className="fade-up">
      <PageHeader title="Mon profil" subtitle="Ces informations aident votre conseiller à personnaliser votre accompagnement." />
      <BeneficiaryProfileForm defaults={{ firstName: beneficiary.firstName, lastName: beneficiary.lastName, phone: beneficiary.phone, objective: beneficiary.objective, situation: beneficiary.situation }} />
    </div>
  );
}
