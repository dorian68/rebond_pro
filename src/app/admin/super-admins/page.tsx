import { requirePlatformAdmin } from "@/lib/platform";
import { listPlatformAdminManagement } from "@/server/platform-admin-access";
import { PageHeader } from "@/components/ui/primitives";
import { PlatformAdminAccessManager } from "./platform-admin-access-manager";

export const dynamic = "force-dynamic";

export default async function SuperAdminsPage() {
  const actor = await requirePlatformAdmin();
  const data = await listPlatformAdminManagement(actor);

  return (
    <div className="fade-up">
      <PageHeader
        title="Accès super-admin"
        subtitle="Accordez et retirez les accès d’administration globale de la plateforme."
      />
      <PlatformAdminAccessManager data={data} />
    </div>
  );
}
