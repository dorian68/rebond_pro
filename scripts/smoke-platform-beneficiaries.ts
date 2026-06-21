import { readFileSync } from "node:fs";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function read(path: string) {
  return readFileSync(path, "utf8");
}

const nav = read("src/lib/nav.ts");
const documentIntake = read("src/lib/document-intake.ts");
const adminList = read("src/app/admin/beneficiaires/page.tsx");
const adminDetail = read("src/app/admin/beneficiaires/[id]/page.tsx");
const adminInvite = read("src/app/admin/beneficiaires/platform-invite-beneficiary.tsx");
const actions = read("src/server/platform-beneficiary-actions.ts");
const platformOrg = read("src/server/platform-beneficiary-org.ts");
const apiDraft = read("src/app/api/document-intake/draft/route.ts");
const appBeneficiaries = read("src/app/(app)/beneficiaires/page.tsx");

assert(!nav.includes('href: "/beneficiaires"'), "Le cockpit centre ne doit plus exposer /beneficiaires dans la navigation.");
assert(documentIntake.includes('beneficiary: "/admin/beneficiaires"'), "L'import document bénéficiaire doit router vers l'admin.");
assert(adminList.includes("PlatformInviteBeneficiary"), "La page admin doit permettre de créer un dossier bénéficiaire.");
assert(!adminInvite.includes('name="organizationId"'), "La création admin ne doit pas assigner le bénéficiaire à un centre dès le départ.");
assert(actions.includes("getPlatformBeneficiaryOrganization"), "La création admin doit stocker le dossier dans le sas bilan plateforme.");
assert(platformOrg.includes("le-bon-rebond-bilans"), "Le sas bilan plateforme doit être explicite et stable.");
assert(apiDraft.includes("getPlatformBeneficiaryOrganization"), "L'import document admin bénéficiaire doit logger sur le sas bilan.");
assert(adminDetail.includes("TransferBeneficiaryForm"), "La fiche admin doit exposer la migration vers un centre.");
assert(actions.includes("platform.beneficiary.transfer_out") && actions.includes("platform.beneficiary.transfer_in"), "Le transfert doit écrire les audits entrée/sortie.");
assert(actions.includes("tx.prospect.create") || actions.includes("tx.prospect.update"), "Le transfert doit créer ou mettre à jour un prospect dans le centre cible.");
assert(appBeneficiaries.includes('redirect("/dashboard")'), "L'ancienne route centre /beneficiaires doit rediriger vers le dashboard.");

console.log("platform_beneficiaries_smoke: PASS");
