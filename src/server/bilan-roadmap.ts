import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";

export const IKIGAI_STEP_TITLE = "Test Ikigai portable";

export const BILAN_ROADMAP = [
  {
    id: "entree",
    phase: "preliminaire",
    title: "Entrée dans le parcours",
    short: "Cadrer",
    description: "Créer le dossier, comprendre la demande et poser le cadre de confidentialité.",
    clientPrompt: "Expliquez votre situation actuelle et ce que vous attendez du bilan.",
    checkpoints: ["Dossier créé", "Confidentialité expliquée", "Objectif initial formulé"],
  },
  {
    id: "engagement",
    phase: "preliminaire",
    title: "Engagement et feuille de route",
    short: "S'engager",
    description: "Valider l'engagement dans la démarche et partager la feuille de route.",
    clientPrompt: "Confirmez ce que vous souhaitez obtenir à la fin du parcours.",
    checkpoints: ["Attentes validées", "Rythme du parcours accepté", "Livrables présentés"],
  },
  {
    id: "situation",
    phase: "preliminaire",
    title: "Situation actuelle",
    short: "Comprendre",
    description: "Analyser le contexte professionnel, personnel et les contraintes.",
    clientPrompt: "Décrivez votre poste, votre contexte, vos contraintes et vos irritants.",
    checkpoints: ["Contexte professionnel décrit", "Contraintes identifiées", "Premières hypothèses posées"],
  },
  {
    id: "ikigai",
    phase: "investigation",
    title: IKIGAI_STEP_TITLE,
    short: "Ikigai",
    description: "Collecter ce que la personne aime, sait faire, peut apporter et peut valoriser.",
    clientPrompt: "Remplissez les quatre zones Ikigai : aimer, savoir-faire, utilité, valeur économique.",
    checkpoints: ["Réponses collectées", "Convergences repérées", "Pistes émergentes notées"],
  },
  {
    id: "competences",
    phase: "investigation",
    title: "Cartographie compétences et talents",
    short: "Compétences",
    description: "Identifier compétences techniques, transférables, qualités et preuves.",
    clientPrompt: "Listez vos compétences, réussites, qualités et situations dont vous êtes fier.",
    checkpoints: ["Compétences techniques", "Compétences transférables", "Preuves et réalisations"],
  },
  {
    id: "motivations",
    phase: "investigation",
    title: "Motivations, valeurs et freins",
    short: "Valeurs",
    description: "Clarifier les moteurs profonds et les éléments qui bloquent ou sécurisent.",
    clientPrompt: "Classez vos valeurs, vos motivations et les freins à lever.",
    checkpoints: ["Valeurs priorisées", "Motivations explicitées", "Freins documentés"],
  },
  {
    id: "pistes",
    phase: "investigation",
    title: "Pistes professionnelles réalistes",
    short: "Explorer",
    description: "Comparer emploi, reconversion, création et montée en compétences.",
    clientPrompt: "Sélectionnez les pistes qui vous semblent réalistes et désirables.",
    checkpoints: ["Pistes listées", "Faisabilité estimée", "Formations potentielles repérées"],
  },
  {
    id: "decision",
    phase: "conclusion",
    title: "Décision projet principal et alternatives",
    short: "Décider",
    description: "Choisir un projet principal et conserver une ou deux alternatives crédibles.",
    clientPrompt: "Formulez le projet que vous choisissez et pourquoi.",
    checkpoints: ["Projet principal", "Alternative", "Critères de décision"],
  },
  {
    id: "plan-action",
    phase: "conclusion",
    title: "Plan d'action concret",
    short: "Agir",
    description: "Transformer la décision en étapes, calendrier, ressources et contacts.",
    clientPrompt: "Validez les prochaines actions à 30, 60 et 90 jours.",
    checkpoints: ["Actions 30 jours", "Actions 60 jours", "Actions 90 jours", "Besoin formation"],
  },
  {
    id: "synthese",
    phase: "conclusion",
    title: "Synthèse finale partageable",
    short: "Synthèse",
    description: "Produire la synthèse écrite et décider si un transfert vers un centre est pertinent.",
    clientPrompt: "Relisez la synthèse et validez ce qui peut être partagé.",
    checkpoints: ["Synthèse écrite", "Éléments partageables", "Décision de transfert"],
  },
] as const;

export type BilanRoadmapItem = (typeof BILAN_ROADMAP)[number];

export function roadmapIndex(id?: string | null) {
  const index = BILAN_ROADMAP.findIndex((item) => item.id === id);
  return index >= 0 ? index : 0;
}

export async function ensureBilanRoadmap(beneficiaryId: string) {
  const existing = await prisma.bilanStep.findMany({ where: { beneficiaryId }, select: { title: true } });
  const titles = new Set(existing.map((step) => step.title));
  const missing = BILAN_ROADMAP.filter((item) => !titles.has(item.title));
  if (missing.length === 0) return;
  await prisma.bilanStep.createMany({
    data: missing.map((item, offset) => ({
      beneficiaryId,
      phase: item.phase,
      title: item.title,
      description: item.description,
      order: BILAN_ROADMAP.findIndex((candidate) => candidate.id === item.id) + offset,
    })),
  });
}

function secret() {
  return process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "local-dev-secret";
}

function signPayload(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createIkigaiToken(beneficiaryId: string, days = 30) {
  const exp = Math.floor(Date.now() / 1000) + days * 86400;
  const payload = `${beneficiaryId}.${exp}`;
  return `${payload}.${signPayload(payload)}`;
}

export function verifyIkigaiToken(token: string): { beneficiaryId: string; exp: number } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [beneficiaryId, expRaw, sig] = parts;
  const exp = Number(expRaw);
  if (!beneficiaryId || !Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null;
  const payload = `${beneficiaryId}.${expRaw}`;
  const expected = signPayload(payload);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  return { beneficiaryId, exp };
}

export function ikigaiShareUrl(beneficiaryId: string) {
  const base = (process.env.APP_PUBLIC_URL ?? process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}/bilan/ikigai/${createIkigaiToken(beneficiaryId)}`;
}

export type IkigaiResult = {
  love: string;
  goodAt: string;
  useful: string;
  paidFor: string;
  synthesis?: string;
  submittedAt?: string;
};

export function encodeIkigaiResult(result: IkigaiResult) {
  return `IKIGAI_RESULT::${JSON.stringify(result)}`;
}

export function decodeIkigaiResult(notes: string | null | undefined): IkigaiResult | null {
  if (!notes?.startsWith("IKIGAI_RESULT::")) return null;
  try {
    const parsed = JSON.parse(notes.slice("IKIGAI_RESULT::".length)) as Partial<IkigaiResult>;
    return {
      love: String(parsed.love ?? ""),
      goodAt: String(parsed.goodAt ?? ""),
      useful: String(parsed.useful ?? ""),
      paidFor: String(parsed.paidFor ?? ""),
      synthesis: parsed.synthesis ? String(parsed.synthesis) : undefined,
      submittedAt: parsed.submittedAt ? String(parsed.submittedAt) : undefined,
    };
  } catch {
    return null;
  }
}
