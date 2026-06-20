export type DocumentVariableGroup =
  | "Centre"
  | "Formation"
  | "Session"
  | "Apprenant"
  | "Formateur"
  | "Salle"
  | "Facturation"
  | "Certification"
  | "Génération";

export type DocumentVariable = {
  key: string;
  label: string;
  description: string;
  group: DocumentVariableGroup;
  requiredLevel: "core" | "recommended" | "optional";
  example: string;
  source: string;
};

export const DOCUMENT_VARIABLES = [
  { key: "org_name", label: "Nom du centre", description: "Nom commercial du centre de formation.", group: "Centre", requiredLevel: "core", example: "Académie Guadeloupe", source: "organization.name" },
  { key: "org_legal_name", label: "Nom légal", description: "Raison sociale du centre.", group: "Centre", requiredLevel: "recommended", example: "Académie Guadeloupe SAS", source: "organization.legalName" },
  { key: "org_legal_address", label: "Adresse légale", description: "Adresse administrative du centre.", group: "Centre", requiredLevel: "recommended", example: "12 rue Exemple, 97110 Pointe-à-Pitre", source: "organization.legalAddress" },
  { key: "org_nda", label: "Numéro NDA", description: "Numéro de déclaration d'activité.", group: "Centre", requiredLevel: "recommended", example: "9797XXXXXXXXX", source: "organization.nda" },
  { key: "org_legal_rep", label: "Représentant légal", description: "Nom du représentant légal.", group: "Centre", requiredLevel: "recommended", example: "Marie Exemple", source: "organization.legalRep" },
  { key: "org_siret", label: "SIRET", description: "Numéro SIRET du centre.", group: "Centre", requiredLevel: "recommended", example: "12345678900012", source: "organization.siret" },
  { key: "org_email", label: "Email du centre", description: "Email public ou administratif.", group: "Centre", requiredLevel: "recommended", example: "contact@centre.fr", source: "organization.publicEmail" },
  { key: "org_phone", label: "Téléphone du centre", description: "Téléphone public ou administratif.", group: "Centre", requiredLevel: "optional", example: "+590 590 00 00 00", source: "organization.publicPhone" },
  { key: "org_website", label: "Site web", description: "Site internet du centre.", group: "Centre", requiredLevel: "optional", example: "https://centre.fr", source: "organization.website" },
  { key: "formation_title", label: "Titre de la formation", description: "Intitulé de la formation.", group: "Formation", requiredLevel: "core", example: "Excel avancé", source: "formation.title" },
  { key: "formation_duration_days", label: "Durée en jours", description: "Durée déclarée en jours.", group: "Formation", requiredLevel: "recommended", example: "2", source: "formation.durationDays" },
  { key: "formation_duration_hours", label: "Durée en heures", description: "Durée déclarée en heures.", group: "Formation", requiredLevel: "recommended", example: "14", source: "formation.durationHours" },
  { key: "formation_program", label: "Programme", description: "Programme pédagogique.", group: "Formation", requiredLevel: "recommended", example: "Module 1...", source: "formation.program" },
  { key: "formation_objectives", label: "Objectifs", description: "Objectifs pédagogiques.", group: "Formation", requiredLevel: "recommended", example: "Savoir créer un tableau croisé dynamique.", source: "formation.objectives" },
  { key: "formation_modality", label: "Modalité", description: "Présentiel, distanciel ou hybride.", group: "Formation", requiredLevel: "recommended", example: "Présentiel", source: "formation.modality" },
  { key: "session_date", label: "Dates de session", description: "Alias historique des dates de session.", group: "Session", requiredLevel: "core", example: "du 1 au 2 juillet 2026", source: "session.dateRange" },
  { key: "session_date_range", label: "Période de session", description: "Dates de début et fin formatées.", group: "Session", requiredLevel: "core", example: "du 1 au 2 juillet 2026", source: "session.dateRange" },
  { key: "session_start_date", label: "Date de début", description: "Date de début de session.", group: "Session", requiredLevel: "recommended", example: "1 juillet 2026", source: "session.startDate" },
  { key: "session_end_date", label: "Date de fin", description: "Date de fin de session.", group: "Session", requiredLevel: "recommended", example: "2 juillet 2026", source: "session.endDate" },
  { key: "session_location", label: "Lieu de session", description: "Salle ou lieu principal.", group: "Session", requiredLevel: "recommended", example: "Salle A", source: "room.name" },
  { key: "session_schedule", label: "Horaires", description: "Créneaux de formation.", group: "Session", requiredLevel: "optional", example: "Lundi 09:00-12:00", source: "session.slots" },
  { key: "trainer_name", label: "Nom du formateur", description: "Formateur affecté à la session.", group: "Formateur", requiredLevel: "recommended", example: "Marie Formatrice", source: "trainer.firstName/lastName" },
  { key: "trainer_email", label: "Email du formateur", description: "Email du formateur.", group: "Formateur", requiredLevel: "optional", example: "marie@centre.fr", source: "trainer.email" },
  { key: "room_name", label: "Salle", description: "Nom de la salle.", group: "Salle", requiredLevel: "optional", example: "Salle A", source: "room.name" },
  { key: "learner_name", label: "Nom de l'apprenant", description: "Nom complet de l'apprenant.", group: "Apprenant", requiredLevel: "core", example: "Jean Apprenant", source: "learner.firstName/lastName" },
  { key: "learner_company", label: "Entreprise apprenant", description: "Entreprise rattachée à l'apprenant.", group: "Apprenant", requiredLevel: "recommended", example: "Client SAS", source: "learner.company" },
  { key: "learner_email", label: "Email apprenant", description: "Email de l'apprenant.", group: "Apprenant", requiredLevel: "recommended", example: "jean@example.fr", source: "learner.email" },
  { key: "learner_phone", label: "Téléphone apprenant", description: "Téléphone de l'apprenant.", group: "Apprenant", requiredLevel: "optional", example: "0690 00 00 00", source: "learner.phone" },
  { key: "company_name", label: "Nom de l'entreprise", description: "Entreprise cliente ou employeur.", group: "Facturation", requiredLevel: "recommended", example: "Client SAS", source: "learner.company / override" },
  { key: "company_address", label: "Adresse de l'entreprise", description: "Adresse client à compléter si absente.", group: "Facturation", requiredLevel: "recommended", example: "1 rue Client", source: "override" },
  { key: "company_siret", label: "SIRET entreprise", description: "SIRET client.", group: "Facturation", requiredLevel: "optional", example: "98765432100010", source: "override" },
  { key: "billing_number", label: "Numéro de dossier", description: "Référence de facturation ou dossier.", group: "Facturation", requiredLevel: "optional", example: "DOS-2026-001", source: "override" },
  { key: "invoice_number", label: "Numéro de facture", description: "Numéro de facture.", group: "Facturation", requiredLevel: "recommended", example: "FAC-2026-001", source: "override" },
  { key: "quote_number", label: "Numéro de devis", description: "Numéro de devis.", group: "Facturation", requiredLevel: "recommended", example: "DEV-2026-001", source: "override" },
  { key: "funding_organization", label: "Financeur", description: "OPCO ou organisme financeur.", group: "Facturation", requiredLevel: "recommended", example: "AKTO", source: "override" },
  { key: "payment_terms", label: "Conditions de paiement", description: "Modalités de règlement.", group: "Facturation", requiredLevel: "optional", example: "Paiement à 30 jours", source: "override" },
  { key: "attendance_hours", label: "Heures réalisées", description: "Volume horaire réellement suivi.", group: "Certification", requiredLevel: "recommended", example: "14", source: "override / attendance" },
  { key: "attendance_rate", label: "Taux d'assiduité", description: "Taux de présence.", group: "Certification", requiredLevel: "optional", example: "100%", source: "override / attendance" },
  { key: "certificate_date", label: "Date de certification", description: "Date du certificat.", group: "Certification", requiredLevel: "optional", example: "2 juillet 2026", source: "override" },
  { key: "satisfaction_survey_url", label: "Lien enquête satisfaction", description: "URL du questionnaire.", group: "Certification", requiredLevel: "optional", example: "https://...", source: "override" },
  { key: "document_reference", label: "Référence document", description: "Référence interne du document.", group: "Génération", requiredLevel: "optional", example: "DOC-2026-001", source: "generated" },
  { key: "amountText", label: "Montant", description: "Montant formaté.", group: "Facturation", requiredLevel: "recommended", example: "1 200,00 €", source: "session.pricePerLearner" },
  { key: "generatedAt", label: "Date de génération", description: "Date de génération du document.", group: "Génération", requiredLevel: "core", example: "20 juin 2026", source: "generated" },
] as const satisfies readonly DocumentVariable[];

export const DOCUMENT_VARIABLE_MAP = Object.fromEntries(DOCUMENT_VARIABLES.map((v) => [v.key, v])) as Record<string, DocumentVariable>;

export function variableLabel(key: string): string {
  return DOCUMENT_VARIABLE_MAP[key]?.label ?? key.replace(/_/g, " ");
}
