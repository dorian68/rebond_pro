import "server-only";
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import type { DocData } from "@/server/pdf/templates";

function cleanTag(raw: string) {
  return raw.replace(/^[#\/\^!@~:%]+/, "").trim();
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

export function docDataToTemplateData(d: DocData): Record<string, unknown> {
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
  return data;
}

export function renderDocxTemplate(template: Buffer, d: DocData): Buffer {
  const zip = new PizZip(template);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => "",
  });
  doc.render(docDataToTemplateData(d));
  return doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" }) as Buffer;
}
