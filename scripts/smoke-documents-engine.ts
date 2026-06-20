import "./_env";
import PizZip from "pizzip";
import { prisma } from "../src/lib/prisma";
import { saveFile } from "../src/lib/storage";
import { renderDocxTemplate } from "../src/server/docx/template-engine";
import { getDocumentGenerationPreflight } from "../src/server/documents/document-context";
import { createTestTenant, step, assert, runner } from "./_tenant";

function add(zip: PizZip, filePath: string, content: string) {
  zip.file(filePath, content);
}

function createTemplate(): Buffer {
  const zip = new PizZip();
  add(zip, "[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);
  add(zip, "_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
  add(zip, "word/_rels/document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`);
  add(zip, "word/document.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>{org_name}</w:t></w:r></w:p>
    <w:p><w:r><w:t>{formation_title}</w:t></w:r></w:p>
    <w:p><w:r><w:t>{learner_name}</w:t></w:r></w:p>
    <w:p><w:r><w:t>{funding_organization}</w:t></w:r></w:p>
    <w:p><w:r><w:t>{unknown_custom_var}</w:t></w:r></w:p>
    <w:sectPr/>
  </w:body>
</w:document>`);
  return zip.generate({ type: "nodebuffer", compression: "DEFLATE" }) as Buffer;
}

runner("documents_engine_smoke", async () => {
  const t = await createTestTenant("documents-engine");
  try {
    const templateBuffer = createTemplate();
    const key = `document-templates/${t.organizationId}/smoke-template.docx`;
    await saveFile(key, templateBuffer);
    const template = await prisma.documentTemplate.create({
      data: {
        organizationId: t.organizationId,
        type: "CONVOCATION",
        name: "Smoke convocation",
        contentTemplate: "DOCX smoke",
        engine: "DOCX",
        sourceFileUrl: key,
        sourceFileName: "smoke-template.docx",
        sourceMimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        variables: ["org_name", "formation_title", "learner_name", "funding_organization", "unknown_custom_var"],
        variablesDetected: { recognized: ["org_name", "formation_title", "learner_name", "funding_organization"], unknown: ["unknown_custom_var"], total: 5 },
        isDefault: true,
        createdById: t.userId,
      },
    });
    step("template_created", { id: template.id });

    const formation = await prisma.formation.create({ data: { organizationId: t.organizationId, title: "Formation documents", slug: "formation-documents", durationHours: 14, durationDays: 2 } });
    const learner = await prisma.learner.create({ data: { organizationId: t.organizationId, firstName: "Alice", lastName: "Doc", email: "alice.doc@test.fr" } });
    const session = await prisma.session.create({
      data: {
        organizationId: t.organizationId,
        formationId: formation.id,
        startDate: new Date("2026-07-01T08:00:00.000Z"),
        endDate: new Date("2026-07-02T16:00:00.000Z"),
        slots: ["MATIN"],
      },
    });
    const enrollment = await prisma.enrollment.create({ data: { organizationId: t.organizationId, learnerId: learner.id, sessionId: session.id } });

    const preflight = await getDocumentGenerationPreflight({ ctx: t, type: "CONVOCATION", sessionId: session.id, enrollmentId: enrollment.id, templateId: template.id });
    assert(preflight.template.id === template.id, "Le template explicite n'est pas utilisé.");
    assert(preflight.availableVariables.includes("org_name"), "org_name devrait être rempli.");
    assert(preflight.missingVariables.some((m) => m.key === "funding_organization"), "funding_organization devrait être signalé manquant.");
    assert(preflight.unknownVariables.includes("unknown_custom_var"), "La variable inconnue devrait être signalée.");
    assert(preflight.completionStatus !== "COMPLETE", "Le statut devrait indiquer un document incomplet.");
    step("preflight_detects_missing", { status: preflight.completionStatus, score: preflight.completionScore, missing: preflight.missingVariables.length, unknown: preflight.unknownVariables.length });

    const values = { ...preflight.values, funding_organization: "[À compléter : Financeur]", unknown_custom_var: "{unknown_custom_var}" };
    const rendered = renderDocxTemplate(templateBuffer, {
      type: "CONVOCATION",
      org: { name: t.organizationName ?? "Smoke" },
      generatedAt: "20 juin 2026",
      formation: { title: formation.title, durationHours: 14, durationDays: 2 },
      session: { dateRange: "1 – 2 juil. 2026" },
      learner: { fullName: "Alice Doc" },
    }, { values, missingVariableStrategy: "readable_placeholder" });
    const xml = new PizZip(rendered).file("word/document.xml")?.asText() ?? "";
    assert(xml.includes("[À compléter : Financeur]"), "Le placeholder lisible n'est pas rendu.");
    assert(xml.includes("Alice Doc"), "Les valeurs CRM ne sont pas rendues.");
    step("docx_renders_readable_missing", { bytes: rendered.length });
  } finally {
    await t.cleanup();
    step("tenant_cleanup");
  }
});
