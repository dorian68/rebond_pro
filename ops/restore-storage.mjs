import { createReadStream } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { runtimeEnvFromContainer, verifyStorageBackup } from "./backup-storage.mjs";

async function uploadWithRetry({ url, serviceKey, filePath, fetchImpl }) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetchImpl(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
          "Content-Type": "application/octet-stream",
          "x-upsert": "true",
        },
        body: createReadStream(filePath),
        duplex: "half",
        signal: AbortSignal.timeout(30_000),
      });
      if (response.ok) return;
      lastError = new Error(`Restauration stockage: HTTP ${response.status}`);
      if (response.status !== 429 && response.status < 500) break;
    } catch (error) {
      lastError = error;
    }
    if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 300));
  }
  throw lastError instanceof Error ? lastError : new Error("Restauration stockage impossible.");
}

export async function restoreSupabaseStorage({ inputDir, runtimeEnv, execute = false, fetchImpl = fetch }) {
  const manifest = await verifyStorageBackup(inputDir);
  if (!execute) return { verified: manifest.objectCount, uploaded: 0, dryRun: true };
  if ((runtimeEnv.STORAGE_DRIVER ?? "local") !== "supabase") throw new Error("La restauration exige STORAGE_DRIVER=supabase.");
  const baseUrl = runtimeEnv.SUPABASE_URL?.replace(/\/$/, "");
  const serviceKey = runtimeEnv.SUPABASE_SERVICE_KEY;
  if (!baseUrl || !serviceKey) throw new Error("Configuration Supabase absente.");

  let nextObject = 0;
  let uploaded = 0;
  const concurrency = 6;
  await Promise.all(Array.from({ length: Math.min(concurrency, manifest.objects.length) }, async () => {
    while (true) {
      const index = nextObject;
      nextObject += 1;
      if (index >= manifest.objects.length) return;
      const object = manifest.objects[index];
      const encodedKey = object.key.split("/").map(encodeURIComponent).join("/");
      await uploadWithRetry({
        url: `${baseUrl}/storage/v1/object/${encodeURIComponent(object.bucket)}/${encodedKey}`,
        serviceKey,
        filePath: path.resolve(inputDir, object.bucket, ...object.key.split("/")),
        fetchImpl,
      });
      uploaded += 1;
    }
  }));
  return { verified: manifest.objectCount, uploaded, dryRun: false };
}

async function main() {
  const execute = process.argv[2] === "--execute";
  const inputArg = execute ? process.argv[3] : process.argv[2];
  if (!inputArg) throw new Error("Usage: restore-storage.mjs [--execute] <repertoire-extrait> [conteneur-app]");
  const containerName = (execute ? process.argv[4] : process.argv[3]) || "rebondpro-app";
  const result = await restoreSupabaseStorage({
    inputDir: path.resolve(inputArg),
    runtimeEnv: execute ? runtimeEnvFromContainer(containerName) : {},
    execute,
  });
  console.log(JSON.stringify({ ok: true, ...result }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
