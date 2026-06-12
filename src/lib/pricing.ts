export const BILAN_COMPETENCES_PRICING = [
  {
    id: "essentiel",
    tier: "Essentiel",
    amount: "490 – 790",
    desc: "Pour faire le point rapidement et y voir plus clair.",
    features: [
      "Entretien initial approfondi",
      "Bilan de vos compétences clés",
      "Premières pistes d'orientation",
      "Synthèse écrite",
    ],
    featured: false,
  },
  {
    id: "standard",
    tier: "Standard",
    amount: "990 – 1 490",
    desc: "L'accompagnement complet, méthode Rebond Clarté.",
    features: [
      "Les 5 étapes de la méthode",
      "6 à 10 séances personnalisées",
      "Exploration métier & formations",
      "Plan d'action sur 3 à 6 mois",
      "Mise en relation centres partenaires",
    ],
    featured: true,
    flag: "Le plus choisi",
  },
  {
    id: "premium",
    tier: "Premium",
    amount: "1 800 – 2 500",
    desc: "Accompagnement renforcé et suivi dans la durée.",
    features: [
      "Tout le contenu Standard",
      "Séances supplémentaires de coaching",
      "Suivi post-bilan sur 6 mois",
      "Accompagnement à la mise en action",
    ],
    featured: false,
  },
] as const;
