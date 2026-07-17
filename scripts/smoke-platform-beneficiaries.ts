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
const adminDetailActions = read("src/app/admin/beneficiaires/[id]/beneficiary-admin-actions.tsx");
const actions = read("src/server/platform-beneficiary-actions.ts");
const platform = read("src/server/platform.ts");
const platformOrg = read("src/server/platform-beneficiary-org.ts");
const apiDraft = read("src/app/api/document-intake/draft/route.ts");
const roadmap = read("src/server/bilan-roadmap.ts");
const programs = read("src/lib/bilan-programs.ts");
const workspaces = read("src/lib/bilan-workspaces.ts");
const dossierPdf = read("src/server/pdf/beneficiary-dossier.tsx");
const dossierApi = read("src/app/api/admin/beneficiaires/[id]/documents/[documentId]/download/route.ts");
const schema = read("prisma/schema.prisma");
const ikigaiPage = read("src/app/(public)/bilan/ikigai/[token]/page.tsx");
const ikigaiClient = read("src/app/(public)/bilan/ikigai/[token]/ikigai-canvas-client.tsx");
const ikigaiAction = read("src/server/ikigai-public-actions.ts");
const appBeneficiaries = read("src/app/(app)/beneficiaires/page.tsx");
const speechCostDoc = read("docs/speech-to-text-cost-analysis.md");

assert(!nav.includes('href: "/beneficiaires"'), "Le cockpit centre ne doit plus exposer /beneficiaires dans la navigation.");
assert(documentIntake.includes('beneficiary: "/admin/beneficiaires"'), "L'import document bénéficiaire doit router vers l'admin.");
assert(adminList.includes("PlatformInviteBeneficiary"), "La page admin doit permettre de créer un dossier bénéficiaire.");
assert(!adminInvite.includes('name="organizationId"'), "La création admin ne doit pas assigner le bénéficiaire à un centre dès le départ.");
assert(actions.includes("getPlatformBeneficiaryOrganization"), "La création admin doit stocker le dossier dans le sas bilan plateforme.");
assert(platformOrg.includes("le-bon-rebond-bilans"), "Le sas bilan plateforme doit être explicite et stable.");
assert(apiDraft.includes("getPlatformBeneficiaryOrganization"), "L'import document admin bénéficiaire doit logger sur le sas bilan.");
assert(adminDetail.includes("TransferBeneficiaryForm"), "La fiche admin doit exposer la migration vers un centre.");
assert(adminDetail.includes("getBilanRoadmap") && adminDetail.includes("BilanStepEditor"), "La fiche admin doit exposer le dossier numérique page par page.");
assert(programs.includes("adultes_projet_competences") && programs.includes("jeunes_orientation"), "Les deux livrets Le Bon Rebond doivent exister comme programmes numériques.");
assert(programs.includes("04_Livret_projet_competences_adultes_Rebond.pdf") && programs.includes("03_Livret_orientation_jeunes_Rebond.pdf"), "Les programmes doivent référencer les PDF sources.");
assert(adminDetail.includes("BeneficiaryProgramSelector") && adminDetail.includes("BeneficiaryDossierDocuments"), "La fiche admin doit exposer le choix de prestation et le support numérique.");
assert(adminDetailActions.includes("setPlatformBeneficiaryProgram") && adminDetailActions.includes("sendPlatformBeneficiaryDossier") && adminDetailActions.includes("generatePlatformBeneficiaryDossier"), "Les actions admin doivent choisir le programme, générer le PDF et envoyer le dossier.");
assert(actions.includes("platform.beneficiary.program_set") && actions.includes("platform.beneficiary.dossier_pdf_sent") && actions.includes("platform.beneficiary.dossier_pdf_generated"), "Le choix programme, la génération et l'envoi dossier doivent être audités.");
assert(actions.includes('formData.get("reviewedLatestPdf") === "true"'), "L'envoi email doit exiger la relecture explicite du dernier PDF.");
assert(actions.includes('artifact.shareable || artifact.status === "shareable"'), "Le PDF bénéficiaire ne doit inclure que les blocs explicitement partageables.");
assert(dossierPdf.includes("renderBeneficiaryDossierPdf") && dossierPdf.includes("@react-pdf/renderer"), "Le dossier doit être exportable en PDF généré.");
assert(dossierPdf.includes('includes("private")') && dossierPdf.includes('includes("confidential")'), "Le rendu PDF doit filtrer les champs confidentiels.");
assert(dossierApi.includes("requirePlatformAdmin") && dossierApi.includes("application/pdf") && dossierApi.includes("no-store"), "Une route admin doit servir le PDF privé du dossier.");
assert(platform.includes("listPlatformBeneficiaryDocuments") && platform.includes("DOSSIER_NUMERIQUE_EXPORTABLE"), "Les PDFs de dossier doivent être listés depuis la fiche bénéficiaire.");
assert(adminDetailActions.includes("Ouvrir / imprimer") && adminDetailActions.includes("/documents/${latest.id}/download"), "La fiche admin doit exposer une action PDF imprimable.");
assert(adminDetailActions.includes("Inclure PDF/email") && adminDetailActions.includes("J’ai relu le dernier PDF"), "L'UX doit expliciter inclusion PDF/email et relecture avant envoi.");
assert(adminDetail.includes("BilanWorkspaceEditor") && adminDetail.includes("CompetenceCanvasEditor") && adminDetail.includes("AdminIkigaiGraph"), "La fiche admin doit afficher des ateliers visuels, pas seulement des formulaires.");
assert(adminDetail.includes("CopyShareLink") && adminDetail.includes("ikigaiShareUrl"), "La fiche admin doit exposer un lien Ikigai portable.");
assert(adminDetailActions.includes("updatePlatformBilanStep"), "L'admin doit pouvoir éditer les pages du parcours bilan.");
assert(adminDetailActions.includes("BilanWorkspaceEditor") && adminDetailActions.includes("savePlatformBilanArtifact"), "Les pages du dossier doivent sauvegarder des artefacts structurés.");
assert(adminDetailActions.includes("Atelier compétences transférables") && adminDetailActions.includes("competence-map"), "La page compétences doit être remplie par canvas structuré.");
assert(actions.includes("platform.bilan_artifact.upsert") && actions.includes("bilanArtifact.upsert"), "Les artefacts bilan doivent être persistés et audités.");
assert(schema.includes("model BilanArtifact") && schema.includes("@@unique([beneficiaryId, key])"), "Le dossier numérique doit avoir une table d'artefacts structurés.");
assert(workspaces.includes("Carte de situation") && workspaces.includes("Moteurs, valeurs et freins") && workspaces.includes("Plan 30-60-90 jours"), "Les workspaces bilan doivent couvrir les pages non-Ikigai.");
assert(roadmap.includes("Test Ikigai portable") && roadmap.includes("createIkigaiToken"), "Le parcours doit inclure un test Ikigai signé.");
assert(ikigaiPage.includes("Votre canvas Ikigai professionnel") && ikigaiPage.includes("IkigaiCanvasClient"), "La route publique Ikigai doit afficher le canvas portable.");
assert(ikigaiClient.includes("Carte Ikigai vivante") && ikigaiClient.includes("Convergences générées"), "Le canvas Ikigai doit générer une lecture visuelle.");
assert(ikigaiAction.includes("verifyIkigaiToken") && ikigaiAction.includes("ikigaiPayload"), "La soumission Ikigai doit vérifier le token et remonter un payload structuré.");
assert(speechCostDoc.includes("Phase 1") && speechCostDoc.includes("Phase 4") && speechCostDoc.includes("speech-to-text"), "L'analyse coût speech-to-text doit documenter les phases.");
assert(actions.includes("platform.beneficiary.transfer_out") && actions.includes("platform.beneficiary.transfer_in"), "Le transfert doit écrire les audits entrée/sortie.");
assert(actions.includes("tx.prospect.create") || actions.includes("tx.prospect.update"), "Le transfert doit créer ou mettre à jour un prospect dans le centre cible.");
assert(appBeneficiaries.includes('redirect("/dashboard")'), "L'ancienne route centre /beneficiaires doit rediriger vers le dashboard.");

console.log("platform_beneficiaries_smoke: PASS");
