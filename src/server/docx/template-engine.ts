import "server-only";
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import type { DocData } from "@/server/pdf/templates";
import { variableLabel } from "@/lib/document-variables";

export type MissingVariableStrategy = "readable_placeholder" | "keep_variable" | "empty";

function cleanTag(raw: string) {
  return raw.replace(/^[#\/\^!@~:%]+/, "").trim();
}

const WORD_XML_RE = /^word\/(document|header\d+|footer\d+)\.xml$/;

/**
 * Normalise les délimiteurs des modèles importés : beaucoup utilisent la double
 * accolade `{{var}}` (style Handlebars) alors que docxtemplater attend `{var}`.
 * Sans ça, le rendu lève « Duplicate open/close tag ». On replie `{{`→`{` et
 * `}}`→`}` directement dans le XML Word ; les modèles déjà en simple accolade
 * (sans `{{`) ne sont jamais touchés.
 */
function normalizeDoubleBraceDelimiters(zip: PizZip): void {
  for (const name of Object.keys(zip.files)) {
    if (!WORD_XML_RE.test(name)) continue;
    const text = zip.file(name)?.asText();
    if (!text || (!text.includes("{{") && !text.includes("}}"))) continue;
    zip.file(name, text.replace(/\{\{+/g, "{").replace(/\}\}+/g, "}"));
  }
}

export function extractDocxVariables(input: Buffer): string[] {
  const zip = new PizZip(input);
  const names = Object.keys(zip.files).filter((name) =>
    /^word\/(document|header\d+|footer\d+)\.xml$/.test(name),
  );
  const found = new Set<string>();
  for (const name of names) {
    const text = zip.file(name)?.asText() ?? "";
    for (const match of text.matchAll(/\{([^{}]+)\}/g)) {
      const tag = cleanTag(match[1] ?? "");
      if (tag && !tag.includes(" ")) found.add(tag);
    }
  }
  return [...found].sort();
}

export function docDataToTemplateData(d: DocData, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const firstLearner = d.learner ?? d.learners?.[0] ?? null;
  const data = {
    org: d.org,
    formation: d.formation ?? {},
    session: d.session ?? {},
    learner: firstLearner ?? {},
    learners: d.learners ?? (firstLearner ? [firstLearner] : []),
    document: {
      type: d.type,
      generatedAt: d.generatedAt,
      amountText: d.amountText ?? "",
    },
    amountText: d.amountText ?? "",
    generatedAt: d.generatedAt,
    org_name: d.org.name,
    org_legal_name: d.org.legalName ?? d.org.name,
    org_legal_address: d.org.legalAddress ?? "",
    org_nda: d.org.nda ?? "",
    org_legal_rep: d.org.legalRep ?? "",
    formation_title: d.formation?.title ?? "",
    formation_duration_days: d.formation?.durationDays ?? "",
    formation_duration_hours: d.formation?.durationHours ?? "",
    formation_program: d.formation?.program ?? "",
    formation_objectives: d.formation?.objectives ?? "",
    formation_modality: d.formation?.modality ?? "",
    session_date: d.session?.dateRange ?? "",
    session_date_range: d.session?.dateRange ?? "",
    session_trainer: d.session?.trainerName ?? "",
    trainer_name: d.session?.trainerName ?? "",
    session_room: d.session?.roomName ?? "",
    room_name: d.session?.roomName ?? "",
    learner_name: firstLearner?.fullName ?? "",
    learner_company: firstLearner?.company ?? "",
  };
  return { ...data, ...overrides };
}

function missingValue(tag: string, strategy: MissingVariableStrategy): string {
  if (strategy === "keep_variable") return `{${tag}}`;
  if (strategy === "empty") return "";
  return `[À compléter : ${variableLabel(tag)}]`;
}

export function renderDocxTemplate(
  template: Buffer,
  d: DocData,
  options: { values?: Record<string, unknown>; missingVariableStrategy?: MissingVariableStrategy } = {},
): Buffer {
  const zip = new PizZip(template);
  normalizeDoubleBraceDelimiters(zip);
  const values = docDataToTemplateData(d, options.values);
  const missingVariableStrategy = options.missingVariableStrategy ?? "readable_placeholder";
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: (part) => missingValue(part.value, missingVariableStrategy),
  });
  doc.render(values);
  return doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" }) as Buffer;
}
