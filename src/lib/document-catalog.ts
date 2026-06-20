import { DOCUMENT_TYPES } from "@/lib/document-types";

export type DocumentFamily = "AVANT_FORMATION" | "PENDANT_FORMATION" | "APRES_FORMATION" | "ADMINISTRATIF" | "FINANCE" | "QUALIOPI";
export type DocumentMaturity = "READY" | "PARTIAL" | "GENERIC";
export type DocumentScope = "LEARNER" | "SESSION" | "COMPANY" | "ANNUAL";

export type DocumentCatalogEntry = {
  type: string;
  label: string;
  family: DocumentFamily;
  description: string;
  maturity: DocumentMaturity;
  recommendedVariables: string[];
  importantVariables: string[];
  optionalVariables: string[];
  contexts: string[];
  bulkGeneratable: boolean;
  scope: DocumentScope;
};

const BASE: Record<string, Omit<DocumentCatalogEntry, "type" | "label">> = {
  PROGRAMME: { family: "AVANT_FORMATION", description: "Programme pédagogique et commercial de l'action.", maturity: "READY", recommendedVariables: ["org_name", "formation_title", "formation_duration_hours", "formation_objectives", "formation_program"], importantVariables: ["formation_title", "formation_program"], optionalVariables: ["formation_modality", "amountText"], contexts: ["organization", "formation"], bulkGeneratable: false, scope: "SESSION" },
  CONVENTION: { family: "AVANT_FORMATION", description: "Convention de formation entre le centre et une entreprise ou financeur.", maturity: "READY", recommendedVariables: ["org_legal_name", "org_nda", "formation_title", "session_date_range", "company_name", "amountText"], importantVariables: ["org_legal_name", "formation_title", "company_name"], optionalVariables: ["funding_organization", "payment_terms"], contexts: ["organization", "formation", "session", "learner", "billing"], bulkGeneratable: false, scope: "COMPANY" },
  CONTRAT_FORMATION: { family: "AVANT_FORMATION", description: "Contrat de formation pour financement individuel.", maturity: "PARTIAL", recommendedVariables: ["org_legal_name", "learner_name", "formation_title", "session_date_range", "amountText"], importantVariables: ["learner_name", "formation_title"], optionalVariables: ["payment_terms"], contexts: ["organization", "formation", "session", "learner"], bulkGeneratable: true, scope: "LEARNER" },
  LIVRET_ACCUEIL: { family: "AVANT_FORMATION", description: "Livret d'accueil de l'apprenant.", maturity: "GENERIC", recommendedVariables: ["org_name", "org_email", "org_phone", "formation_title"], importantVariables: ["org_name"], optionalVariables: ["satisfaction_survey_url"], contexts: ["organization", "formation"], bulkGeneratable: false, scope: "SESSION" },
  TEST_POSITIONNEMENT: { family: "AVANT_FORMATION", description: "Test initial de positionnement.", maturity: "GENERIC", recommendedVariables: ["learner_name", "formation_title"], importantVariables: ["learner_name", "formation_title"], optionalVariables: ["generatedAt"], contexts: ["formation", "session", "learner"], bulkGeneratable: true, scope: "LEARNER" },
  CONVOCATION: { family: "AVANT_FORMATION", description: "Convocation apprenant à une session.", maturity: "READY", recommendedVariables: ["org_name", "learner_name", "formation_title", "session_date_range", "trainer_name", "session_location"], importantVariables: ["learner_name", "formation_title", "session_date_range"], optionalVariables: ["room_name", "org_phone"], contexts: ["organization", "formation", "session", "learner", "trainer", "room"], bulkGeneratable: true, scope: "LEARNER" },
  EMARGEMENT: { family: "PENDANT_FORMATION", description: "Feuille d'émargement de session.", maturity: "READY", recommendedVariables: ["org_name", "formation_title", "session_date_range", "trainer_name"], importantVariables: ["formation_title", "session_date_range"], optionalVariables: ["room_name"], contexts: ["organization", "formation", "session", "trainer", "room"], bulkGeneratable: false, scope: "SESSION" },
  SUPPORT_COURS: { family: "PENDANT_FORMATION", description: "Support pédagogique remis aux apprenants.", maturity: "GENERIC", recommendedVariables: ["formation_title", "formation_objectives"], importantVariables: ["formation_title"], optionalVariables: ["formation_program"], contexts: ["formation"], bulkGeneratable: false, scope: "SESSION" },
  QUESTIONNAIRE_SUIVI: { family: "PENDANT_FORMATION", description: "Questionnaire de suivi à mi-parcours.", maturity: "GENERIC", recommendedVariables: ["learner_name", "formation_title", "session_date_range"], importantVariables: ["learner_name", "formation_title"], optionalVariables: [], contexts: ["formation", "session", "learner"], bulkGeneratable: true, scope: "LEARNER" },
  ATTESTATION: { family: "APRES_FORMATION", description: "Attestation de fin de formation.", maturity: "READY", recommendedVariables: ["org_legal_name", "learner_name", "formation_title", "session_date_range", "attendance_hours"], importantVariables: ["learner_name", "formation_title"], optionalVariables: ["attendance_rate"], contexts: ["organization", "formation", "session", "learner", "certification"], bulkGeneratable: true, scope: "LEARNER" },
  CERTIFICAT: { family: "APRES_FORMATION", description: "Certificat de réalisation.", maturity: "READY", recommendedVariables: ["org_legal_name", "learner_name", "formation_title", "session_date_range", "attendance_hours"], importantVariables: ["learner_name", "formation_title"], optionalVariables: ["certificate_date"], contexts: ["organization", "formation", "session", "learner", "certification"], bulkGeneratable: true, scope: "LEARNER" },
  ATTESTATION_PRESENCE: { family: "APRES_FORMATION", description: "Attestation de présence ou d'assiduité.", maturity: "PARTIAL", recommendedVariables: ["learner_name", "formation_title", "attendance_hours", "attendance_rate"], importantVariables: ["learner_name", "formation_title"], optionalVariables: ["session_date_range"], contexts: ["session", "learner", "certification"], bulkGeneratable: true, scope: "LEARNER" },
  QUESTIONNAIRE_SATISFACTION: { family: "APRES_FORMATION", description: "Questionnaire de satisfaction générique.", maturity: "GENERIC", recommendedVariables: ["learner_name", "formation_title", "satisfaction_survey_url"], importantVariables: ["formation_title"], optionalVariables: ["session_date_range"], contexts: ["formation", "session", "learner"], bulkGeneratable: true, scope: "LEARNER" },
  ENQUETE_SATISFACTION_CHAUD: { family: "APRES_FORMATION", description: "Enquête satisfaction à chaud.", maturity: "GENERIC", recommendedVariables: ["learner_name", "formation_title", "satisfaction_survey_url"], importantVariables: ["formation_title"], optionalVariables: [], contexts: ["formation", "session", "learner"], bulkGeneratable: true, scope: "LEARNER" },
  ENQUETE_SATISFACTION_FROID: { family: "APRES_FORMATION", description: "Enquête satisfaction à froid.", maturity: "GENERIC", recommendedVariables: ["learner_name", "formation_title", "satisfaction_survey_url"], importantVariables: ["formation_title"], optionalVariables: [], contexts: ["formation", "session", "learner"], bulkGeneratable: true, scope: "LEARNER" },
  SYNTHESE_SATISFACTION: { family: "QUALIOPI", description: "Synthèse des retours de satisfaction.", maturity: "GENERIC", recommendedVariables: ["formation_title", "session_date_range"], importantVariables: ["formation_title"], optionalVariables: ["satisfaction_survey_url"], contexts: ["formation", "session"], bulkGeneratable: false, scope: "SESSION" },
  DIPLOME_TITRE: { family: "APRES_FORMATION", description: "Diplôme ou titre certifiant.", maturity: "PARTIAL", recommendedVariables: ["learner_name", "formation_title", "certificate_date"], importantVariables: ["learner_name", "formation_title"], optionalVariables: [], contexts: ["learner", "formation", "certification"], bulkGeneratable: true, scope: "LEARNER" },
  DEVIS: { family: "FINANCE", description: "Devis commercial simple.", maturity: "READY", recommendedVariables: ["org_legal_name", "quote_number", "company_name", "formation_title", "amountText"], importantVariables: ["company_name", "formation_title", "amountText"], optionalVariables: ["payment_terms"], contexts: ["organization", "formation", "session", "billing"], bulkGeneratable: false, scope: "COMPANY" },
  FACTURE: { family: "FINANCE", description: "Facture simple.", maturity: "PARTIAL", recommendedVariables: ["org_legal_name", "invoice_number", "company_name", "formation_title", "amountText"], importantVariables: ["invoice_number", "company_name", "amountText"], optionalVariables: ["payment_terms"], contexts: ["organization", "formation", "session", "billing"], bulkGeneratable: false, scope: "COMPANY" },
  BPF: { family: "ADMINISTRATIF", description: "Bilan pédagogique et financier annuel.", maturity: "GENERIC", recommendedVariables: ["org_legal_name", "org_siret", "org_nda"], importantVariables: ["org_legal_name"], optionalVariables: [], contexts: ["organization", "annualReport"], bulkGeneratable: false, scope: "ANNUAL" },
};

export const DOCUMENT_CATALOG = DOCUMENT_TYPES.map((d) => ({
  type: d.value,
  label: d.label,
  ...BASE[d.value],
})) satisfies DocumentCatalogEntry[];

export const DOCUMENT_CATALOG_BY_TYPE = Object.fromEntries(DOCUMENT_CATALOG.map((d) => [d.type, d])) as Record<string, DocumentCatalogEntry>;
