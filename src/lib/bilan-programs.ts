export type BilanProgramId = "adultes_projet_competences" | "jeunes_orientation";

export type BilanProgramStep = {
  id: string;
  phase: "preliminaire" | "investigation" | "conclusion" | "suivi";
  title: string;
  short: string;
  description: string;
  clientPrompt: string;
  checkpoints: string[];
};

export type BilanProgram = {
  id: BilanProgramId;
  label: string;
  subtitle: string;
  sourcePdf: string;
  audience: string;
  steps: BilanProgramStep[];
};

export const BILAN_PROGRAMS: Record<BilanProgramId, BilanProgram> = {
  adultes_projet_competences: {
    id: "adultes_projet_competences",
    label: "Projet & compétences adultes",
    subtitle: "Clarifier, valoriser, confronter, décider, agir",
    sourcePdf: "04_Livret_projet_competences_adultes_Rebond.pdf",
    audience: "Adultes - AAP 3 et bilan de compétences",
    steps: [
      {
        id: "entree",
        phase: "preliminaire",
        title: "Mon parcours",
        short: "Cadre",
        description: "Poser le cadre, l'objectif initial, la confidentialité et les conditions de partage.",
        clientPrompt: "Renseignez l'identité, le parcours choisi, l'objectif initial et les points de confidentialité.",
        checkpoints: ["Objectif initial", "Consultant référent", "Règles de confidentialité"],
      },
      {
        id: "situation",
        phase: "preliminaire",
        title: "Clarifier - pourquoi maintenant",
        short: "Clarifier",
        description: "Décrire la situation actuelle, le déclencheur et la décision attendue.",
        clientPrompt: "Décrivez ce qui n'est plus acceptable, ce qui doit être préservé et la décision attendue.",
        checkpoints: ["Situation actuelle", "Déclencheur", "Décision attendue"],
      },
      {
        id: "parcours",
        phase: "preliminaire",
        title: "Clarifier - frise du parcours",
        short: "Frise",
        description: "Relire le parcours à partir des expériences, ruptures, réussites et transitions.",
        clientPrompt: "Notez les périodes clés, les situations vécues, les apprentissages et les fils rouges.",
        checkpoints: ["Périodes clés", "Réussites/difficultés", "Fils rouges"],
      },
      {
        id: "ikigai",
        phase: "investigation",
        title: "Me connaître - envies et ressources",
        short: "Me connaître",
        description: "Identifier les intérêts, ressources, valeurs, conditions de réussite et contraintes.",
        clientPrompt: "Repérez ce qui donne de l'énergie, les ressources disponibles et les conditions à respecter.",
        checkpoints: ["Énergie", "Ressources", "Contraintes"],
      },
      {
        id: "competences",
        phase: "investigation",
        title: "Valoriser - compétences et preuves",
        short: "Compétences",
        description: "Cartographier les compétences, preuves, réalisations et éléments transférables.",
        clientPrompt: "Associez chaque compétence à une situation concrète et une preuve.",
        checkpoints: ["Compétences", "Preuves", "Transférabilité"],
      },
      {
        id: "motivations",
        phase: "investigation",
        title: "Valoriser - synthèse du profil",
        short: "Profil",
        description: "Synthétiser forces, motivations, points d'appui et besoins de sécurisation.",
        clientPrompt: "Formulez les forces principales, les motivations et les points à sécuriser.",
        checkpoints: ["Forces", "Motivations", "Freins"],
      },
      {
        id: "pistes",
        phase: "investigation",
        title: "Explorer - pistes professionnelles",
        short: "Explorer",
        description: "Comparer les pistes professionnelles, formations et hypothèses réalistes.",
        clientPrompt: "Listez les pistes, les informations à vérifier et les premiers contacts utiles.",
        checkpoints: ["Pistes", "Informations métier", "Formations possibles"],
      },
      {
        id: "preparer",
        phase: "investigation",
        title: "Préparer - confrontation au réel",
        short: "Tester",
        description: "Préparer les enquêtes métier, immersions, recherches et vérifications terrain.",
        clientPrompt: "Identifiez les tests terrain à mener et ce qu'ils doivent permettre de confirmer.",
        checkpoints: ["Enquêtes métier", "Immersion", "Risques vérifiés"],
      },
      {
        id: "decision",
        phase: "conclusion",
        title: "Décider - projet principal",
        short: "Décider",
        description: "Choisir un projet principal, les alternatives et les critères de décision.",
        clientPrompt: "Formulez le projet retenu, ses raisons et les alternatives possibles.",
        checkpoints: ["Projet principal", "Alternatives", "Critères"],
      },
      {
        id: "plan-action",
        phase: "conclusion",
        title: "Agir - plan d'action",
        short: "Agir",
        description: "Transformer le choix en actions datées, ressources, contacts et prochaines étapes.",
        clientPrompt: "Définissez les actions à 30, 60 et 90 jours.",
        checkpoints: ["Actions 30 jours", "Actions 60 jours", "Actions 90 jours"],
      },
      {
        id: "synthese",
        phase: "conclusion",
        title: "Conclure - synthèse personnelle",
        short: "Synthèse",
        description: "Formaliser la synthèse finale et ce qui peut être partagé.",
        clientPrompt: "Validez la synthèse personnelle, les éléments confidentiels et les documents à transmettre.",
        checkpoints: ["Synthèse", "Partage", "Suite"],
      },
    ],
  },
  jeunes_orientation: {
    id: "jeunes_orientation",
    label: "Orientation jeunes",
    subtitle: "Me connaître, explorer, tester, décider",
    sourcePdf: "03_Livret_orientation_jeunes_Rebond.pdf",
    audience: "Jeunes et apprenti(e)s - AAP 1 et AAP 2",
    steps: [
      {
        id: "entree",
        phase: "preliminaire",
        title: "Mon parcours",
        short: "Cadre",
        description: "Poser le cadre du livret, l'objectif de départ et les règles de partage.",
        clientPrompt: "Renseignez le parcours, l'objectif de départ et ce que le jeune veut obtenir.",
        checkpoints: ["Objectif de départ", "Conseiller référent", "Documents à garder"],
      },
      {
        id: "situation",
        phase: "preliminaire",
        title: "Mon point de départ",
        short: "Départ",
        description: "Décrire la situation actuelle, ce qui fonctionne, ce qui bloque et l'urgence éventuelle.",
        clientPrompt: "Décrivez ce qui se passe maintenant et par quoi commencer.",
        checkpoints: ["Situation", "Blocage", "Prochaine échéance"],
      },
      {
        id: "parcours",
        phase: "preliminaire",
        title: "La frise de mon parcours",
        short: "Frise",
        description: "Identifier les moments importants, réussites, ruptures et apprentissages.",
        clientPrompt: "Notez les moments clés, ce qui s'est passé et ce qu'il faut retenir.",
        checkpoints: ["Moments importants", "Apprentissages", "Fierté"],
      },
      {
        id: "ikigai",
        phase: "investigation",
        title: "Me connaître",
        short: "Profil",
        description: "Identifier goûts, forces, besoins, rythme et conditions de motivation.",
        clientPrompt: "Repérez ce que le jeune aime, réussit, évite et ce qui l'aide à avancer.",
        checkpoints: ["Goûts", "Forces", "Conditions de réussite"],
      },
      {
        id: "competences",
        phase: "investigation",
        title: "Mes compétences",
        short: "Compétences",
        description: "Transformer expériences scolaires, stages, sport, activités et projets en compétences.",
        clientPrompt: "Associez les expériences vécues à des compétences observables.",
        checkpoints: ["Expériences", "Compétences", "Preuves"],
      },
      {
        id: "pistes",
        phase: "investigation",
        title: "Explorer",
        short: "Explorer",
        description: "Explorer métiers, formations, secteurs et environnements possibles.",
        clientPrompt: "Listez les pistes à explorer et les informations à vérifier.",
        checkpoints: ["Métiers", "Formations", "Contacts utiles"],
      },
      {
        id: "tester",
        phase: "investigation",
        title: "Tester",
        short: "Tester",
        description: "Préparer mini-tests, immersions, stages, rencontres et candidatures.",
        clientPrompt: "Choisissez les tests concrets qui permettront de vérifier une piste.",
        checkpoints: ["Test terrain", "Retour d'expérience", "Ajustement"],
      },
      {
        id: "decision",
        phase: "conclusion",
        title: "Décider",
        short: "Décider",
        description: "Choisir une direction, une formation ou une étape réaliste.",
        clientPrompt: "Formulez la décision et ce qui la rend réaliste maintenant.",
        checkpoints: ["Choix", "Raisons", "Plan B"],
      },
      {
        id: "plan-action",
        phase: "conclusion",
        title: "Plan d'action",
        short: "Agir",
        description: "Organiser les prochaines démarches, candidatures, contacts et documents.",
        clientPrompt: "Définissez les actions prioritaires et les personnes à contacter.",
        checkpoints: ["Démarches", "Contacts", "Documents"],
      },
      {
        id: "synthese",
        phase: "conclusion",
        title: "Conclure",
        short: "Synthèse",
        description: "Formaliser la synthèse personnelle et les éléments partageables.",
        clientPrompt: "Relisez ce qui a été compris, décidé et ce qui peut être partagé.",
        checkpoints: ["Synthèse", "Partage", "Suite"],
      },
      {
        id: "suivi",
        phase: "suivi",
        title: "Suivi",
        short: "Suivi",
        description: "Suivre l'avancement après la décision et ajuster le plan.",
        clientPrompt: "Notez les actions réalisées, les retours et les prochains ajustements.",
        checkpoints: ["Actions réalisées", "Retours", "Ajustements"],
      },
    ],
  },
};

export const DEFAULT_BILAN_PROGRAM_ID: BilanProgramId = "adultes_projet_competences";

export function parseBilanProgramId(value: unknown): BilanProgramId {
  return value === "jeunes_orientation" ? "jeunes_orientation" : DEFAULT_BILAN_PROGRAM_ID;
}

export function getBilanProgram(value: unknown): BilanProgram {
  return BILAN_PROGRAMS[parseBilanProgramId(value)];
}
