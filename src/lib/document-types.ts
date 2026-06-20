export const DOCUMENT_TYPES = [
  { value: "PROGRAMME", label: "Programme de formation", phase: "Avant" },
  { value: "CONVENTION", label: "Convention de formation", phase: "Avant" },
  { value: "CONTRAT_FORMATION", label: "Contrat de formation", phase: "Avant" },
  { value: "LIVRET_ACCUEIL", label: "Livret d'accueil", phase: "Avant" },
  { value: "TEST_POSITIONNEMENT", label: "Test de positionnement", phase: "Avant" },
  { value: "CONVOCATION", label: "Convocation", phase: "Avant" },
  { value: "EMARGEMENT", label: "Feuille d'émargement", phase: "Pendant" },
  { value: "SUPPORT_COURS", label: "Support de cours", phase: "Pendant" },
  { value: "QUESTIONNAIRE_SUIVI", label: "Questionnaire de suivi", phase: "Pendant" },
  { value: "ATTESTATION", label: "Attestation de fin de formation", phase: "Après" },
  { value: "CERTIFICAT", label: "Certificat de réalisation", phase: "Après" },
  { value: "ATTESTATION_PRESENCE", label: "Attestation de présence / assiduité", phase: "Après" },
  { value: "QUESTIONNAIRE_SATISFACTION", label: "Questionnaire de satisfaction", phase: "Après" },
  { value: "ENQUETE_SATISFACTION_CHAUD", label: "Enquête satisfaction à chaud", phase: "Après" },
  { value: "ENQUETE_SATISFACTION_FROID", label: "Enquête satisfaction à froid", phase: "Après" },
  { value: "SYNTHESE_SATISFACTION", label: "Synthèse satisfaction", phase: "Après" },
  { value: "DIPLOME_TITRE", label: "Diplôme ou titre certifiant", phase: "Après" },
  { value: "DEVIS", label: "Devis", phase: "Comptable" },
  { value: "FACTURE", label: "Facture", phase: "Comptable" },
  { value: "BPF", label: "Bilan pédagogique et financier", phase: "Annuel" },
] as const;

export const GENERATABLE_DOCUMENT_TYPES = DOCUMENT_TYPES.map((d) => d.value);

export const DOC_LABELS = Object.fromEntries(DOCUMENT_TYPES.map((d) => [d.value, d.label])) as Record<string, string>;

export const PER_LEARNER_DOCUMENT_TYPES = [
  "CONVOCATION",
  "ATTESTATION",
  "CERTIFICAT",
  "ATTESTATION_PRESENCE",
  "TEST_POSITIONNEMENT",
  "QUESTIONNAIRE_SUIVI",
  "QUESTIONNAIRE_SATISFACTION",
  "ENQUETE_SATISFACTION_CHAUD",
  "ENQUETE_SATISFACTION_FROID",
] as const;
