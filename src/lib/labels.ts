// Libellés FR centralisés pour les enums Prisma (UI).

export const MODALITY_LABELS: Record<string, string> = {
  PRESENTIEL: "Présentiel",
  DISTANCIEL: "Distanciel",
  HYBRIDE: "Hybride",
};

export const LEVEL_LABELS: Record<string, string> = {
  DEBUTANT: "Débutant",
  INTERMEDIAIRE: "Intermédiaire",
  AVANCE: "Avancé",
};

export const FORMATION_STATUS_LABELS: Record<string, string> = {
  BROUILLON: "Brouillon",
  PUBLIE: "Publié",
  ARCHIVE: "Archivé",
};

export const FORMATION_STATUS_BADGE: Record<string, string> = {
  BROUILLON: "badge-neutral",
  PUBLIE: "badge-positive",
  ARCHIVE: "badge-neutral",
};

export const SESSION_STATUS_LABELS: Record<string, string> = {
  BROUILLON: "Brouillon",
  OUVERTE: "Ouverte",
  COMPLETE: "Complète",
  TERMINEE: "Terminée",
  ANNULEE: "Annulée",
};

export const SLOT_LABELS: Record<string, string> = {
  MATIN: "Matin",
  APRES_MIDI: "Après-midi",
  JOURNEE: "Journée",
  SOIR: "Soir",
};

export const PROSPECT_STAGE_LABELS: Record<string, string> = {
  NOUVEAU: "Nouveau",
  CONTACTE: "Contacté",
  DEVIS: "Devis envoyé",
  RELANCE: "Relance",
  GAGNE: "Gagné",
  PERDU: "Perdu",
};

export const PROSPECT_TYPE_LABELS: Record<string, string> = {
  PARTICULIER: "Particulier",
  ENTREPRISE: "Entreprise",
  ORGANISME: "Organisme",
};

export const PROSPECT_SOURCE_LABELS: Record<string, string> = {
  LINKEDIN: "LinkedIn",
  SITE_WEB: "Site web",
  APPEL: "Appel",
  RECOMMANDATION: "Recommandation",
  SALON: "Salon",
  CAMPAGNE_EMAIL: "Campagne email",
  PAGE_PUBLIQUE: "Page publique",
  AUTRE: "Autre",
};

export const ENROLLMENT_STATUS_LABELS: Record<string, string> = {
  PRE_INSCRIT: "Pré-inscrit",
  INSCRIT: "Inscrit",
  CONFIRME: "Confirmé",
  PRESENT: "Présent",
  ABSENT: "Absent",
  TERMINE: "Terminé",
};

export const CATEGORIES = [
  "Bureautique",
  "Data & BI",
  "Intelligence artificielle",
  "Finance & Gestion",
  "Management",
  "Marketing & Digital",
  "Langues",
  "Développement web",
  "RH",
  "Autre",
];
