export type BilanWorkspaceKind = "intake" | "commitment" | "situation" | "motivations" | "pistes" | "decision" | "action_plan" | "synthesis";

export type BilanField =
  | { name: string; label: string; type: "text"; placeholder?: string }
  | { name: string; label: string; type: "textarea"; placeholder?: string; rows?: number }
  | { name: string; label: string; type: "chips"; options: string[] }
  | { name: string; label: string; type: "scale"; minLabel: string; maxLabel: string };

export type BilanSection = {
  title: string;
  intent: string;
  fields: BilanField[];
};

export type BilanWorkspace = {
  pageId: string;
  key: string;
  kind: BilanWorkspaceKind;
  title: string;
  promise: string;
  sections: BilanSection[];
};

export const BILAN_WORKSPACES: BilanWorkspace[] = [
  {
    pageId: "entree",
    key: "intake-diagnostic",
    kind: "intake",
    title: "Diagnostic d'entrée",
    promise: "Transformer une demande floue en point de départ clair.",
    sections: [
      {
        title: "Demande initiale",
        intent: "Ce qui amène la personne à démarrer le bilan.",
        fields: [
          { name: "trigger", label: "Déclencheur", type: "chips", options: ["Perte de sens", "Burn-out / fatigue", "Envie d'évolution", "Licenciement", "Reprise d'études", "Mobilité interne", "Création d'activité", "Besoin de confiance"] },
          { name: "currentQuestion", label: "Question principale", type: "textarea", rows: 3, placeholder: "La vraie question que la personne se pose aujourd'hui..." },
          { name: "expectedOutcome", label: "Résultat attendu", type: "chips", options: ["Choisir un métier", "Valider une formation", "Changer de secteur", "Retrouver confiance", "Négocier une évolution", "Créer un plan d'action"] },
        ],
      },
      {
        title: "Cadre de confiance",
        intent: "Ce qui doit être compris avant de collecter des éléments personnels.",
        fields: [
          { name: "confidentiality", label: "Confidentialité comprise", type: "chips", options: ["Oui", "À réexpliquer", "Point sensible identifié"] },
          { name: "sensitivePoints", label: "Points sensibles", type: "textarea", rows: 2, placeholder: "Santé, conflit employeur, finances, famille, mobilité..." },
        ],
      },
    ],
  },
  {
    pageId: "engagement",
    key: "roadmap-contract",
    kind: "commitment",
    title: "Contrat de parcours",
    promise: "Rendre le parcours lisible, partagé et engageant.",
    sections: [
      {
        title: "Objectifs du parcours",
        intent: "Ce qui permettra de dire que le bilan a servi.",
        fields: [
          { name: "successCriteria", label: "Critères de réussite", type: "chips", options: ["Projet clair", "Plan 90 jours", "Formation identifiée", "Confiance renforcée", "Alternatives réalistes", "Synthèse partageable"] },
          { name: "nonNegotiables", label: "Non négociables", type: "textarea", rows: 2, placeholder: "Contraintes ou limites à respecter absolument..." },
          { name: "rhythm", label: "Rythme accepté", type: "chips", options: ["Hebdomadaire", "Toutes les 2 semaines", "Intensif", "À distance", "Hybride", "Présentiel"] },
        ],
      },
    ],
  },
  {
    pageId: "situation",
    key: "situation-map",
    kind: "situation",
    title: "Carte de situation",
    promise: "Voir la situation entière, pas seulement le poste actuel.",
    sections: [
      {
        title: "Contexte professionnel",
        intent: "Comprendre le terrain réel de départ.",
        fields: [
          { name: "role", label: "Poste / situation actuelle", type: "text", placeholder: "Intitulé, secteur, statut..." },
          { name: "satisfaction", label: "Satisfaction actuelle", type: "scale", minLabel: "Subie", maxLabel: "Alignée" },
          { name: "irritants", label: "Irritants", type: "chips", options: ["Management", "Salaire", "Horaires", "Trajet", "Sens", "Charge mentale", "Conflits", "Stagnation", "Santé", "Isolement"] },
        ],
      },
      {
        title: "Contraintes de vie",
        intent: "Ancrer le projet dans le réel.",
        fields: [
          { name: "constraints", label: "Contraintes", type: "chips", options: ["Mobilité limitée", "Enfants", "Budget", "Temps", "Santé", "Aidant familial", "Transport", "Niveau diplôme", "Langue", "Numérique"] },
          { name: "resources", label: "Ressources disponibles", type: "textarea", rows: 2, placeholder: "Soutiens, temps, financement, réseau, expériences..." },
        ],
      },
    ],
  },
  {
    pageId: "motivations",
    key: "drivers-values-blockers",
    kind: "motivations",
    title: "Moteurs, valeurs et freins",
    promise: "Identifier ce qui attire, ce qui bloque et ce qui doit être protégé.",
    sections: [
      {
        title: "Valeurs et moteurs",
        intent: "Ce qui doit être présent dans la suite professionnelle.",
        fields: [
          { name: "values", label: "Valeurs prioritaires", type: "chips", options: ["Autonomie", "Sécurité", "Impact", "Apprentissage", "Reconnaissance", "Créativité", "Relation humaine", "Stabilité", "Liberté", "Transmission"] },
          { name: "drivers", label: "Moteurs", type: "chips", options: ["Aider", "Créer", "Résoudre", "Organiser", "Diriger", "Former", "Vendre", "Analyser", "Réparer", "Conseiller"] },
          { name: "alignment", label: "Niveau d'alignement ressenti", type: "scale", minLabel: "Très faible", maxLabel: "Très fort" },
        ],
      },
      {
        title: "Freins à lever",
        intent: "Distinguer les vrais risques des peurs à travailler.",
        fields: [
          { name: "blockers", label: "Freins", type: "chips", options: ["Peur de l'échec", "Financement", "Âge", "Confiance", "Niveau scolaire", "Famille", "Marché local", "Santé", "Manque d'information", "Administratif"] },
          { name: "mitigation", label: "Comment sécuriser", type: "textarea", rows: 3, placeholder: "Actions concrètes pour réduire le risque..." },
        ],
      },
    ],
  },
  {
    pageId: "pistes",
    key: "career-hypotheses",
    kind: "pistes",
    title: "Hypothèses professionnelles",
    promise: "Comparer des pistes sans décider trop tôt.",
    sections: [
      {
        title: "Pistes à explorer",
        intent: "Créer des hypothèses testables.",
        fields: [
          { name: "tracks", label: "Pistes", type: "textarea", rows: 4, placeholder: "1 piste par ligne : métier, secteur, formation, création..." },
          { name: "desirability", label: "Désirabilité moyenne", type: "scale", minLabel: "Faible", maxLabel: "Forte" },
          { name: "feasibility", label: "Faisabilité moyenne", type: "scale", minLabel: "Difficile", maxLabel: "Accessible" },
          { name: "nextTests", label: "Tests terrain", type: "chips", options: ["Appeler un pro", "Immersion", "MOOC", "Atelier", "RDV centre", "Recherche salaire", "Vérifier financement", "Analyser offre d'emploi"] },
        ],
      },
    ],
  },
  {
    pageId: "decision",
    key: "decision-board",
    kind: "decision",
    title: "Tableau de décision",
    promise: "Passer des pistes à une direction assumée.",
    sections: [
      {
        title: "Choix principal",
        intent: "Formuler la décision et ses raisons.",
        fields: [
          { name: "mainProject", label: "Projet principal", type: "text", placeholder: "Ex : assistant RH, formateur bureautique, développeur web..." },
          { name: "why", label: "Pourquoi ce choix", type: "textarea", rows: 3 },
          { name: "confidence", label: "Confiance dans le choix", type: "scale", minLabel: "Fragile", maxLabel: "Solide" },
        ],
      },
      {
        title: "Alternatives",
        intent: "Garder un plan B réaliste.",
        fields: [
          { name: "alternatives", label: "Alternatives crédibles", type: "textarea", rows: 3, placeholder: "Pistes secondaires, conditions de bascule..." },
          { name: "decisionCriteria", label: "Critères de décision", type: "chips", options: ["Revenu", "Sens", "Temps formation", "Débouchés", "Mobilité", "Santé", "Famille", "Autonomie", "Stabilité", "Financement"] },
        ],
      },
    ],
  },
  {
    pageId: "plan-action",
    key: "action-plan-90",
    kind: "action_plan",
    title: "Plan 30-60-90 jours",
    promise: "Transformer la décision en actions datées.",
    sections: [
      {
        title: "Actions",
        intent: "Rendre la suite vérifiable.",
        fields: [
          { name: "d30", label: "Dans 30 jours", type: "textarea", rows: 2 },
          { name: "d60", label: "Dans 60 jours", type: "textarea", rows: 2 },
          { name: "d90", label: "Dans 90 jours", type: "textarea", rows: 2 },
          { name: "supportNeeded", label: "Appuis nécessaires", type: "chips", options: ["Formation", "Financement", "Réseau", "CV", "LinkedIn", "Coaching", "Immersion", "Transport", "Garde", "Matériel"] },
        ],
      },
    ],
  },
  {
    pageId: "synthese",
    key: "shareable-synthesis",
    kind: "synthesis",
    title: "Synthèse partageable",
    promise: "Produire un dossier clair, utile et transmissible.",
    sections: [
      {
        title: "Synthèse finale",
        intent: "Séparer le partageable du confidentiel.",
        fields: [
          { name: "publicSummary", label: "Résumé partageable", type: "textarea", rows: 4, placeholder: "Ce qui peut être transmis à un centre ou partenaire..." },
          { name: "privateNotes", label: "Notes confidentielles", type: "textarea", rows: 3, placeholder: "Éléments à garder côté accompagnement..." },
          { name: "shareScope", label: "Périmètre de partage", type: "chips", options: ["Projet", "Compétences", "Contraintes utiles", "Plan d'action", "Formation visée", "Ne pas partager santé", "Ne pas partager situation employeur"] },
        ],
      },
    ],
  },
];

export function workspaceForPage(pageId: string | null | undefined) {
  return BILAN_WORKSPACES.find((workspace) => workspace.pageId === pageId) ?? null;
}
