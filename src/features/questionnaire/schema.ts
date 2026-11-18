import { z } from "zod";
import definition from "./definition.json";

export type Question = {
  id: string; number: number; label: string; type: string; required: boolean;
  options?: string[]; max_choices?: number; exclusive?: string[]; hint?: string;
  max_length?: number; optional_text?: { label: string; max_length: number };
};
export const questionnaire = definition;
export const questions: Question[] = definition.questions;
export type Answers = Record<string, string | string[]>;
export const PRIVACY_VERSION = "questionnaire-2026-11-18";
export const STATUS_LABELS = { NEW: "À traiter", IN_PROGRESS: "En cours", DONE: "Traité" } as const;

export function answerError(q: Question, value: unknown): string | null {
  const empty = value === undefined || value === "" || (Array.isArray(value) && value.length === 0);
  if (empty) return q.required ? "Choisissez une réponse." : null;
  if (q.type === "text") return typeof value === "string" && value.length <= (q.max_length ?? 80) ? null : "Saisissez une réponse plus courte.";
  if (q.type === "single") return typeof value === "string" && q.options?.includes(value) ? null : "Choisissez une réponse proposée.";
  if (!Array.isArray(value) || value.some(v => typeof v !== "string" || !q.options?.includes(v)) || new Set(value).size !== value.length) return "Vérifiez vos choix.";
  if (q.max_choices && value.length > q.max_choices) return `Choisissez ${q.max_choices} réponses au maximum.`;
  if (value.length > 1 && value.some(v => q.exclusive?.includes(v))) return "Cette réponse se choisit seule.";
  return null;
}

const text = (max: number) => z.string().trim().max(max).optional().default("");
export const submissionSchema = z.object({
  submissionKey: z.uuid(),
  answers: z.record(z.string(), z.union([z.string(), z.array(z.string())])),
  sectorDetail: text(80), firstName: text(80), phone: text(40), email: text(254), contactSlot: text(160),
  consent: z.literal(true, { error: "Votre accord est nécessaire pour utiliser vos réponses." }),
}).superRefine((data, ctx) => {
  for (const key of Object.keys(data.answers)) {
    if (!questions.some(q => q.id === key)) ctx.addIssue({ code: "custom", path: ["answers", key], message: "Question inconnue." });
  }
  for (const q of questions) {
    const message = answerError(q, data.answers[q.id]);
    if (message) ctx.addIssue({ code: "custom", path: ["answers", q.id], message });
  }
  if (data.answers.rappel === "Oui, par téléphone" && !/^\+?[\d\s().-]+$/.test(data.phone)) ctx.addIssue({ code: "custom", path: ["phone"], message: "Saisissez un numéro de téléphone valide." });
  if (data.answers.rappel === "Oui, par téléphone") {
    const digits = data.phone.replace(/\D/g, "");
    if (digits.length < 9 || digits.length > 15) ctx.addIssue({ code: "custom", path: ["phone"], message: "Saisissez un numéro de téléphone valide." });
  }
  if (data.answers.rappel === "Oui, par email" && !z.email().safeParse(data.email).success) ctx.addIssue({ code: "custom", path: ["email"], message: "Saisissez une adresse email valide." });
}).transform(data => {
  const wantsContact = data.answers.rappel !== "Non, pas pour le moment";
  const answers: Answers = {};
  for (const q of questions) {
    const value = data.answers[q.id];
    if (Array.isArray(value)) answers[q.id] = (q.options ?? []).filter(option => value.includes(option));
    else if (typeof value === "string" && value.trim()) answers[q.id] = value.trim();
  }
  return { ...data, answers, firstName: wantsContact ? data.firstName : "", contactSlot: wantsContact ? data.contactSlot : "",
    phone: data.answers.rappel === "Oui, par téléphone" ? data.phone : "", email: data.answers.rappel === "Oui, par email" ? data.email : "" };
});
export type Submission = z.infer<typeof submissionSchema>;

export function responseStatistics(rows: { answers: unknown; status: string }[]) {
  const distributions = questions.map(q => {
    const counts = new Map<string, number>();
    let answered = 0;
    for (const row of rows) {
      const value = (row.answers as Answers)[q.id];
      const values = Array.isArray(value) ? value : value ? [value] : [];
      if (values.length) answered++;
      for (const option of values) counts.set(option, (counts.get(option) ?? 0) + 1);
    }
    const options = q.options ?? [...counts.keys()].sort((a,b) => a.localeCompare(b, "fr"));
    return { id: q.id, label: q.label, multiple: q.type === "multiple", answered, unanswered: rows.length-answered,
      options: options.map(label => ({ label, count: counts.get(label) ?? 0, percent: answered ? Math.round((counts.get(label) ?? 0)/answered*100) : 0 })) };
  });
  return { total: rows.length, contact: rows.filter(r => (r.answers as Answers).rappel !== "Non, pas pour le moment").length,
    pending: rows.filter(r => r.status === "NEW").length, distributions };
}

export function csvCell(value: unknown) {
  const raw = String(value ?? "");
  const safe = /^[\s]*[=+@-]/.test(raw) ? "'"+raw : raw;
  return '"'+safe.replace(/"/g, '""')+'"';
}
