import PizZip from "pizzip";
import { extractDocxVariables, renderDocxTemplate } from "@/server/docx/template-engine";
import type { DocData } from "@/server/pdf/templates";

function add(zip: PizZip, path: string, content: string) {
  zip.file(path, content);
}

function createTemplate(): Buffer {
  const zip = new PizZip();
  add(
    zip,
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
  );
  add(
    zip,
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
  );
  add(
    zip,
    "word/_rels/document.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`,
  );
  add(
    zip,
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Centre: {org_name}</w:t></w:r></w:p>
    <w:p><w:r><w:t>Formation: {formation_title}</w:t></w:r></w:p>
    <w:p><w:r><w:t>Apprenant: {learner_name}</w:t></w:r></w:p>
    <w:p><w:r><w:t>Dates: {session_date}</w:t></w:r></w:p>
    <w:sectPr/>
  </w:body>
</w:document>`,
  );
  return zip.generate({ type: "nodebuffer", compression: "DEFLATE" }) as Buffer;
}

async function main() {
  const template = createTemplate();
  const variables = extractDocxVariables(template);
  const expectedVariables = ["formation_title", "learner_name", "org_name", "session_date"];
  for (const variable of expectedVariables) {
    if (!variables.includes(variable)) {
      throw new Error(`Variable non detectee: ${variable}`);
    }
  }

  const data: DocData = {
    type: "CONVOCATION",
    generatedAt: "20 juin 2026",
    org: { name: "Academie Guadeloupe", legalName: "Academie Guadeloupe SAS", nda: "97970000000" },
    formation: { title: "IA appliquee", durationDays: 2, durationHours: 14, modality: "Presentiel" },
    session: { dateRange: "du 1 au 2 juillet 2026", trainerName: "Marie Formatrice", roomName: "Salle A" },
    learner: { fullName: "Jean Apprenant", company: "Client SAS" },
  };
  const rendered = renderDocxTemplate(template, data);
  const xml = new PizZip(rendered).file("word/document.xml")?.asText() ?? "";
  for (const value of ["Academie Guadeloupe", "IA appliquee", "Jean Apprenant", "du 1 au 2 juillet 2026"]) {
    if (!xml.includes(value)) {
      throw new Error(`Valeur non rendue dans le DOCX: ${value}`);
    }
  }
  if (xml.includes("{org_name}") || xml.includes("{learner_name}")) {
    throw new Error("Le DOCX rendu contient encore des placeholders.");
  }

  console.log(JSON.stringify({ ok: true, variables, bytes: rendered.length }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
