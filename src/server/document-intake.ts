import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { z } from "zod";
import { DOCUMENT_INTAKE_LABELS, DOCUMENT_INTAKE_TARGETS, type DocumentIntakeDraft, type DocumentIntakeTarget } from "@/lib/document-intake";
import { isAiEnabled, LLM_PROVIDER, logAi } from "@/lib/ai";
import type { TenantContext } from "@/lib/tenant";

const MAX_TEXT_CHARS = 32_000;
const MAX_ATTACHMENT_BYTES = 5_242_880;
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"] as const;

export const documentIntakeRequestSchema = z.object({
  target: z.enum(DOCUMENT_INTAKE_TARGETS),
  extractedText: z.string().max(MAX_TEXT_CHARS).optional(),
  filename: z.string().max(255).optional(),
  attachments: z
    .array(z.object({
      name: z.string().max(255),
      type: z.enum(ALLOWED_MIME),
      data: z.string(),
      size: z.number().int().max(MAX_ATTACHMENT_BYTES),
    }))
    .max(2)
    .optional(),
  context: z.record(z.string(), z.unknown()).optional(),
});

type IntakeRequest = z.infer<typeof documentIntakeRequestSchema>;

const FIELD_CONTRACTS: Record<DocumentIntakeTarget, string[]> = {
  formation: [
    "title", "category", "shortDescription", "longDescription", "objectives", "targetAudience",
    "prerequisites", "program", "durationDays", "durationHours", "priceEuros", "modality", "level", "status", "modules",
  ],
  session: ["formationId", "trainerId", "roomId", "startDate", "endDate", "slots", "capacity", "priceEuros", "breakEvenSeats", "status", "trainerConfirmed"],
  prospect: ["name", "contactName", "type", "email", "phone", "formationOfInterestId", "source", "stage", "potentialEuros", "nextAction", "nextFollowUpDate", "isHot", "notes"],
  learner: ["firstName", "lastName", "email", "phone", "company", "sessionId"],
  beneficiary: ["firstName", "lastName", "email", "phone", "objective"],
  trainer: ["firstName", "lastName", "email", "phone", "specialities", "bio", "yearsExperience", "active", "formationIds"],
  availability: ["trainerId", "trainerName", "date", "slot", "type", "note"],
};

const ENUM_HINTS = {
  modality: ["PRESENTIEL", "DISTANCIEL", "HYBRIDE"],
  level: ["DEBUTANT", "INTERMEDIAIRE", "AVANCE"],
  formationStatus: ["BROUILLON", "PUBLIE", "ARCHIVE"],
  sessionStatus: ["BROUILLON", "OUVERTE", "COMPLETE", "TERMINEE", "ANNULEE"],
  slots: ["MATIN", "APRES_MIDI", "JOURNEE", "SOIR"],
  prospectType: ["PARTICULIER", "ENTREPRISE", "ORGANISME"],
  prospectSource: ["LINKEDIN", "SITE_WEB", "APPEL", "RECOMMANDATION", "SALON", "CAMPAGNE_EMAIL", "PAGE_PUBLIQUE", "AUTRE"],
  prospectStage: ["NOUVEAU", "CONTACTE", "DEVIS", "RELANCE", "GAGNE", "PERDU"],
  availabilityType: ["DISPONIBLE", "INDISPONIBLE", "TENTATIVE"],
};

let anthropic: Anthropic | null = null;
let openai: OpenAI | null = null;
function getAnthropic() { if (!anthropic) anthropic = new Anthropic(); return anthropic; }
function getOpenAI() { if (!openai) openai = new OpenAI(); return openai; }

export async function generateDocumentIntakeDraft(ctx: TenantContext, req: IntakeRequest): Promise<DocumentIntakeDraft> {
  const draft = isAiEnabled()
    ? await generateWithAi(req)
    : fallbackDraft(req);
  const normalized = normalizeDraft(req.target, draft);
  await logAi({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    type: "document_intake",
    input: JSON.stringify({ target: req.target, filename: req.filename, hasText: !!req.extractedText, attachments: req.attachments?.map((a) => ({ name: a.name, type: a.type, size: a.size })) }),
    output: JSON.stringify(normalized),
  });
  return normalized;
}

async function generateWithAi(req: IntakeRequest): Promise<unknown> {
  const system = `Tu transformes un document métier de centre de formation en brouillon de formulaire.
Tu ne crées rien. Tu ne dois renvoyer QUE du JSON valide.
Respecte strictement ce format:
{"target":"...","fields":{},"items":[],"confidence":0.0,"missingFields":[],"warnings":[],"evidence":[{"field":"...","quote":"..."}]}
Si le document contient plusieurs personnes, entreprises, apprenants, bénéficiaires, prospects, formateurs ou créneaux de disponibilité, remplis items avec une entrée par unité détectée. fields doit alors reprendre la première entrée exploitable.
Pour availability: préfère trainerId si fourni dans le contexte; sinon renseigne trainerName pour rapprochement humain. slot vaut MATIN, APRES_MIDI, JOURNEE ou SOIR. type vaut DISPONIBLE, INDISPONIBLE ou TENTATIVE.
Pour formation.modules: renvoie un tableau [{title,description,durationDays,durationHours,trainerIds}]. Utilise trainerIds seulement si les IDs sont fournis dans le contexte.
N'invente pas d'identifiants. Si un champ doit référencer une entité existante, utilise seulement les IDs fournis dans le contexte.
Dates au format YYYY-MM-DD. Prix en euros numériques. Enumérations exactes.`;
  const prompt = buildPrompt(req);
  if (LLM_PROVIDER === "openai") {
    const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [{ type: "text", text: prompt }];
    for (const att of req.attachments ?? []) {
      if (att.type.startsWith("image/")) content.push({ type: "image_url", image_url: { url: `data:${att.type};base64,${att.data}` } });
      if (att.type === "application/pdf") content.push({ type: "text", text: `[PDF joint non textuel: ${att.name}. Si le modèle ne peut pas le lire, renvoie missingFields.]` });
    }
    const resp = await getOpenAI().chat.completions.create({
      model: process.env.AG_UI_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.1,
      max_tokens: 3000,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: system }, { role: "user", content }],
    });
    return parseJson(resp.choices[0]?.message?.content ?? "{}");
  }

  const content: Anthropic.ContentBlockParam[] = [{ type: "text", text: prompt }];
  for (const att of req.attachments ?? []) {
    if (att.type.startsWith("image/")) {
      content.push({ type: "image", source: { type: "base64", media_type: att.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif", data: att.data } });
    } else if (att.type === "application/pdf") {
      content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: att.data } } as unknown as Anthropic.ContentBlockParam);
    }
  }
  const resp = await getAnthropic().messages.create({
    model: process.env.AG_UI_MODEL ?? process.env.AI_MODEL_FAST ?? "claude-haiku-4-5",
    temperature: 0.1,
    max_tokens: 3000,
    system,
    messages: [{ role: "user", content }],
  });
  const text = resp.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("\n");
  return parseJson(text);
}

function buildPrompt(req: IntakeRequest) {
  const context = req.context ? JSON.stringify(req.context).slice(0, 6000) : "{}";
  const text = (req.extractedText ?? "").slice(0, MAX_TEXT_CHARS);
  return `Cible: ${req.target} (${DOCUMENT_INTAKE_LABELS[req.target]})
Champs autorisés: ${FIELD_CONTRACTS[req.target].join(", ")}
Enumérations: ${JSON.stringify(ENUM_HINTS)}
Contexte applicatif disponible: ${context}
Nom du fichier: ${req.filename ?? "inconnu"}

Texte extrait par fonction avant IA:
${text || "[Aucun texte extrait. Utilise les pièces jointes vision/document si présentes.]"}`;
}

function parseJson(text: string) {
  const trimmed = text.trim();
  try { return JSON.parse(trimmed); } catch { /* noop */ }
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) return {};
  try { return JSON.parse(match[0]); } catch { return {}; }
}

function normalizeDraft(target: DocumentIntakeTarget, raw: unknown): DocumentIntakeDraft {
  const r = (raw ?? {}) as Record<string, unknown>;
  const allowed = new Set(FIELD_CONTRACTS[target]);
  const rawItems = Array.isArray(r.items) ? r.items : [];
  const items = rawItems
    .map((item) => pickAllowedFields(item, allowed))
    .filter((item) => Object.keys(item).length > 0)
    .slice(0, 50);
  const fields = pickAllowedFields(r.fields, allowed);
  if (Object.keys(fields).length === 0 && items[0]) Object.assign(fields, items[0]);
  const fieldCount = Object.keys(fields).length;
  const explicitConfidence = clampNumber(r.confidence, 0, 1);
  const heuristicConfidence = fieldCount > 0
    ? Math.min(0.85, 0.25 + fieldCount / Math.max(6, allowed.size))
    : 0;
  return {
    target,
    fields,
    items: items.length > 1 ? items : undefined,
    confidence: Math.max(explicitConfidence, heuristicConfidence),
    missingFields: arrayOfStrings(r.missingFields),
    warnings: arrayOfStrings(r.warnings),
    evidence: Array.isArray(r.evidence)
      ? r.evidence.map((e) => ({ field: String((e as { field?: unknown }).field ?? ""), quote: String((e as { quote?: unknown }).quote ?? "").slice(0, 500) })).filter((e) => e.field && e.quote).slice(0, 8)
      : [],
  };
}

function pickAllowedFields(raw: unknown, allowed: Set<string>) {
  const rawFields = ((raw ?? {}) as Record<string, unknown>) ?? {};
  const fields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rawFields)) {
    if (!allowed.has(key) || value == null || value === "") continue;
    fields[key] = value;
  }
  return fields;
}

function fallbackDraft(req: IntakeRequest): DocumentIntakeDraft {
  const text = req.extractedText ?? "";
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  const phone = text.match(/(?:\+33|0)[ .-]?[1-9](?:[ .-]?\d{2}){4}/)?.[0];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const fields: Record<string, unknown> = {};
  if (req.target === "formation") fields.title = lines.find((l) => l.length > 5 && l.length < 90) ?? "";
  if (["learner", "beneficiary", "trainer"].includes(req.target)) {
    const nameLine = lines.find((l) => /^[A-ZÀ-Ÿ][\p{L}'-]+ [A-ZÀ-Ÿ][\p{L}'-]+/u.test(l));
    if (nameLine) {
      const [firstName, ...rest] = nameLine.split(/\s+/);
      fields.firstName = firstName;
      fields.lastName = rest.join(" ");
    }
    if (email) fields.email = email;
    if (phone) fields.phone = phone;
  }
  if (req.target === "prospect") {
    fields.name = lines[0] ?? "";
    if (email) fields.email = email;
    if (phone) fields.phone = phone;
  }
  return { target: req.target, fields, confidence: 0.25, missingFields: [], warnings: ["Fallback déterministe : IA non configurée."], evidence: [] };
}

function arrayOfStrings(value: unknown) {
  return Array.isArray(value) ? value.map(String).filter(Boolean).slice(0, 12) : [];
}

function clampNumber(value: unknown, min: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(max, Math.max(min, n));
}
