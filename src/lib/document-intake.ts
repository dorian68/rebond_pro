export const DOCUMENT_INTAKE_TARGETS = ["formation", "session", "prospect", "learner", "beneficiary", "trainer"] as const;
export type DocumentIntakeTarget = (typeof DOCUMENT_INTAKE_TARGETS)[number];

export type DocumentIntakeDraft = {
  target: DocumentIntakeTarget;
  fields: Record<string, unknown>;
  items?: Record<string, unknown>[];
  confidence: number;
  missingFields: string[];
  warnings: string[];
  evidence: { field: string; quote: string }[];
};

export const DOCUMENT_INTAKE_ROUTES: Record<DocumentIntakeTarget, string> = {
  formation: "/formations/new",
  session: "/sessions/new",
  prospect: "/prospects/new",
  learner: "/apprenants/new",
  beneficiary: "/beneficiaires",
  trainer: "/formateurs/new",
};

export const DOCUMENT_INTAKE_LABELS: Record<DocumentIntakeTarget, string> = {
  formation: "formation",
  session: "session",
  prospect: "prospect",
  learner: "apprenant",
  beneficiary: "bénéficiaire",
  trainer: "formateur",
};

const STORAGE_PREFIX = "lbr.document-intake.";

export function documentIntakeStorageKey(target: DocumentIntakeTarget) {
  return `${STORAGE_PREFIX}${target}`;
}

export function storeDocumentIntakeDraft(draft: DocumentIntakeDraft) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(documentIntakeStorageKey(draft.target), JSON.stringify({ ...draft, storedAt: Date.now() }));
}

export function consumeDocumentIntakeDraft(target: DocumentIntakeTarget): DocumentIntakeDraft | null {
  if (typeof window === "undefined") return null;
  const key = documentIntakeStorageKey(target);
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  window.localStorage.removeItem(key);
  try {
    const parsed = JSON.parse(raw) as DocumentIntakeDraft & { storedAt?: number };
    if (parsed.target !== target || !parsed.fields || typeof parsed.fields !== "object") return null;
    return {
      target,
      fields: parsed.fields,
      items: Array.isArray(parsed.items) ? parsed.items.filter((item) => item && typeof item === "object").map((item) => item as Record<string, unknown>) : undefined,
      confidence: Number(parsed.confidence) || 0,
      missingFields: Array.isArray(parsed.missingFields) ? parsed.missingFields.map(String) : [],
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings.map(String) : [],
      evidence: Array.isArray(parsed.evidence)
        ? parsed.evidence
            .map((e) => ({ field: String((e as { field?: unknown }).field ?? ""), quote: String((e as { quote?: unknown }).quote ?? "") }))
            .filter((e) => e.field && e.quote)
        : [],
    };
  } catch {
    return null;
  }
}

export function isDocumentIntakeTarget(value: unknown): value is DocumentIntakeTarget {
  return typeof value === "string" && (DOCUMENT_INTAKE_TARGETS as readonly string[]).includes(value);
}
