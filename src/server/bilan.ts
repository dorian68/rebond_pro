import "server-only";

// Les 3 phases légales du bilan de compétences + étapes par défaut.
export const BILAN_PHASES = [
  { id: "preliminaire", label: "Phase préliminaire" },
  { id: "investigation", label: "Phase d'investigation" },
  { id: "conclusion", label: "Phase de conclusion" },
] as const;

export const PHASE_LABEL: Record<string, string> = Object.fromEntries(BILAN_PHASES.map((p) => [p.id, p.label]));

export const DEFAULT_BILAN_STEPS: { phase: string; title: string; description: string }[] = [
  { phase: "preliminaire", title: "Analyser ma demande et mes besoins", description: "Clarifier mes attentes et le cadre de l'accompagnement." },
  { phase: "preliminaire", title: "Comprendre le déroulé du bilan", description: "M'informer sur les méthodes et les étapes à venir." },
  { phase: "investigation", title: "Explorer mes motivations et intérêts", description: "Identifier ce qui me motive et donne du sens." },
  { phase: "investigation", title: "Identifier mes compétences et aptitudes", description: "Faire l'inventaire de mes savoir-faire et qualités." },
  { phase: "investigation", title: "Étudier les pistes professionnelles", description: "Explorer métiers, secteurs et formations possibles." },
  { phase: "conclusion", title: "Définir mon projet professionnel", description: "Formaliser un projet réaliste et motivant." },
  { phase: "conclusion", title: "Construire mon plan d'action", description: "Lister les étapes concrètes (dont formations) pour avancer." },
  { phase: "conclusion", title: "Recevoir mon document de synthèse", description: "Conserver la synthèse de mon bilan." },
];
