import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

function required(value, name) {
  if (!value) throw new Error(`${name} absent.`);
  return value;
}

async function uploadWithRetry({ baseUrl, serviceKey, bucket, key, buffer, fetchImpl }) {
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  const url = `${baseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${encodedKey}`;
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetchImpl(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
          "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "x-upsert": "true",
        },
        body: buffer,
        signal: AbortSignal.timeout(20_000),
      });
      if (response.ok) return;
      if (response.status !== 429 && response.status < 500) throw new Error(`Upload modele: HTTP ${response.status}`);
      lastError = new Error(`Upload modele: HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 300));
  }
  throw lastError instanceof Error ? lastError : new Error("Upload modele impossible.");
}

export async function syncDefaultTemplates({ prisma, defaultsDir, runtimeEnv, fetchImpl = fetch }) {
  if ((runtimeEnv.STORAGE_DRIVER ?? "local") !== "supabase") {
    throw new Error("La synchronisation de production exige STORAGE_DRIVER=supabase.");
  }
  const baseUrl = required(runtimeEnv.SUPABASE_URL, "SUPABASE_URL").replace(/\/$/, "");
  const serviceKey = required(runtimeEnv.SUPABASE_SERVICE_KEY, "SUPABASE_SERVICE_KEY");
  const bucket = runtimeEnv.SUPABASE_STORAGE_BUCKET || "documents";
  const manifest = JSON.parse(await readFile(path.join(defaultsDir, "manifest.json"), "utf8"));
  if (!Array.isArray(manifest) || manifest.length !== 70) throw new Error("Manifest des modeles incomplet.");

  const prepared = [];
  for (const item of manifest) {
    if (!item.type || !item.name || !item.file || !item.sha256 || !Array.isArray(item.variables)) {
      throw new Error("Entree de manifest invalide.");
    }
    const buffer = await readFile(path.resolve(defaultsDir, item.file));
    const fingerprint = createHash("sha256").update(buffer).digest("hex");
    if (fingerprint !== item.sha256) throw new Error(`Hash invalide pour ${item.type}.`);
    prepared.push({ item, buffer, fingerprint });
  }

  const concurrency = 6;
  let nextUpload = 0;
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (true) {
      const index = nextUpload;
      nextUpload += 1;
      if (index >= prepared.length) return;
      const { item, buffer } = prepared[index];
      const key = `document-templates/global/${item.type.toLowerCase()}-${path.basename(item.file)}`;
      await uploadWithRetry({ baseUrl, serviceKey, bucket, key, buffer, fetchImpl });
    }
  }));

  const summary = { created: 0, updated: 0, skipped: 0, uploaded: prepared.length };
  for (const { item, fingerprint } of prepared) {
    const key = `document-templates/global/${item.type.toLowerCase()}-${path.basename(item.file)}`;
    const contentTemplate = `DOCX template: ${item.file} [sha256:${fingerprint}]`;
    const exact = await prisma.documentTemplate.findFirst({
      where: { organizationId: null, type: item.type, name: item.name },
    });
    const existing = exact ?? await prisma.documentTemplate.findFirst({
      where: { organizationId: null, type: item.type },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });
    const data = {
      name: item.name,
      description: item.description ?? null,
      contentTemplate,
      engine: "DOCX",
      sourceFileUrl: key,
      sourceFileName: path.basename(item.file),
      sourceMimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      variables: item.variables,
      variablesDetected: { recognized: item.variables, unknown: [], total: item.variables.length },
      isDefault: item.isDefault ?? true,
      status: "ACTIVE",
    };

    if (data.isDefault) {
      await prisma.documentTemplate.updateMany({
        where: {
          organizationId: null,
          type: item.type,
          ...(existing ? { id: { not: existing.id } } : {}),
        },
        data: { isDefault: false },
      });
    }

    if (!existing) {
      await prisma.documentTemplate.create({ data: { organizationId: null, type: item.type, ...data } });
      summary.created += 1;
      continue;
    }
    const unchanged =
      existing.name === data.name &&
      existing.description === data.description &&
      existing.contentTemplate === data.contentTemplate &&
      existing.engine === data.engine &&
      existing.sourceFileUrl === data.sourceFileUrl &&
      existing.sourceFileName === data.sourceFileName &&
      existing.sourceMimeType === data.sourceMimeType &&
      JSON.stringify(existing.variables) === JSON.stringify(data.variables) &&
      existing.isDefault === data.isDefault &&
      existing.status === data.status;
    if (unchanged) {
      summary.skipped += 1;
    } else {
      await prisma.documentTemplate.update({ where: { id: existing.id }, data: { ...data, version: existing.version + 1 } });
      summary.updated += 1;
    }
  }
  return summary;
}

async function main() {
  const defaultsDir = path.resolve(process.argv[2] ?? "/app/document-templates/defaults");
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    const summary = await syncDefaultTemplates({ prisma, defaultsDir, runtimeEnv: process.env });
    console.log(JSON.stringify({ ok: true, summary }));
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
