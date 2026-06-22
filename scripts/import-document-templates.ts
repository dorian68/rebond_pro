import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { prisma } from "../src/lib/prisma";
import { saveFile } from "../src/lib/storage";
import { extractDocxVariables } from "../src/server/docx/template-engine";
import { DOCUMENT_VARIABLE_MAP } from "../src/lib/document-variables";
import { DOC_LABELS } from "../src/lib/document-types";

type ManifestItem = {
  type: string;
  name: string;
  file: string;
  description?: string;
  isDefault?: boolean;
};

async function main() {
  const baseDir = process.argv[2] ? path.resolve(process.argv[2]) : path.join(process.cwd(), "document-templates", "defaults");
  const manifestPath = process.argv[3]
    ? path.resolve(process.argv[3])
    : path.join(baseDir, existsSync(path.join(baseDir, "manifest.json")) ? "manifest.json" : "manifest_lot_1_catalogue_formation.json");
  const summary = { created: 0, updated: 0, skipped: 0, missing: 0 };

  if (!existsSync(manifestPath)) {
    console.log(JSON.stringify({ ok: true, message: "Aucun manifest de modèles.", summary }, null, 2));
    return;
  }

  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as ManifestItem[];
  for (const item of manifest) {
    const filePath = path.join(baseDir, item.file);
    if (!existsSync(filePath)) {
      summary.missing += 1;
      console.log(`[skip] fichier absent: ${item.file}`);
      continue;
    }
    const buffer = await readFile(filePath);
    const variables = extractDocxVariables(buffer);
    const recognized = variables.filter((v) => DOCUMENT_VARIABLE_MAP[v]);
    const unknown = variables.filter((v) => !DOCUMENT_VARIABLE_MAP[v]);
    const name = item.name ?? DOC_LABELS[item.type] ?? path.basename(item.file, path.extname(item.file)).replace(/^template_/, "").replace(/_/g, " ");
    const isDefault = item.isDefault ?? true;
    const key = `document-templates/global/${item.type.toLowerCase()}-${path.basename(item.file)}`;
    await saveFile(key, buffer);

    if (isDefault) {
      await prisma.documentTemplate.updateMany({
        where: { organizationId: null, type: item.type as never },
        data: { isDefault: false },
      });
    }

    const existing = await prisma.documentTemplate.findFirst({
      where: { organizationId: null, type: item.type as never, name },
    });
    const data = {
      description: item.description ?? null,
      contentTemplate: `DOCX template: ${item.file}`,
      engine: "DOCX",
      sourceFileUrl: key,
      sourceFileName: item.file,
      sourceMimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      variables,
      variablesDetected: { recognized, unknown, total: variables.length },
      isDefault,
      status: "ACTIVE" as const,
    };

    if (existing) {
      await prisma.documentTemplate.update({ where: { id: existing.id }, data: { ...data, version: existing.version + 1 } });
      summary.updated += 1;
    } else {
      await prisma.documentTemplate.create({
        data: { organizationId: null, type: item.type as never, name, ...data },
      });
      summary.created += 1;
    }
  }

  console.log(JSON.stringify({ ok: true, summary }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
