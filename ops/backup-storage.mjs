import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { pathToFileURL } from "node:url";

const LIST_PAGE_SIZE = 100;

function required(value, name) {
  if (!value) throw new Error(`${name} absent de l'environnement du conteneur applicatif.`);
  return value;
}

export function runtimeEnvFromContainer(containerName) {
  const raw = execFileSync(
    "docker",
    ["inspect", "--format", "{{json .Config.Env}}", containerName],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  ).trim();
  const entries = JSON.parse(raw);
  return Object.fromEntries(entries.map((entry) => {
    const separator = entry.indexOf("=");
    return separator === -1 ? [entry, ""] : [entry.slice(0, separator), entry.slice(separator + 1)];
  }));
}

function safeObjectPath(outputDir, bucket, key) {
  if (!key || key.split("/").some((part) => part === ".." || part === "")) {
    throw new Error(`Cle de stockage invalide dans ${bucket}.`);
  }
  const root = path.resolve(outputDir, bucket);
  const target = path.resolve(root, ...key.split("/"));
  if (target !== root && !target.startsWith(root + path.sep)) {
    throw new Error(`Cle de stockage hors du repertoire autorise dans ${bucket}.`);
  }
  return target;
}

function encodedKey(key) {
  return key.split("/").map(encodeURIComponent).join("/");
}

async function requestWithRetry(url, init, label) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, { ...init, signal: AbortSignal.timeout(20_000) });
      if (response.ok) return response;
      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable || attempt === 3) {
        let providerDetail = "";
        if (response.status === 402) {
          const body = await response.text().catch(() => "");
          providerDetail = /exceed_egress_quota/i.test(body) ? " — quota d'egress fournisseur depasse; mettre a niveau le plan ou lever le plafond de depenses" : " — service fournisseur restreint; verifier l'abonnement";
        }
        const error = new Error(`${label}: HTTP ${response.status}${providerDetail}`);
        error.retryable = retryable;
        throw error;
      }
      await response.body?.cancel();
    } catch (error) {
      lastError = error;
      if (attempt === 3 || error?.retryable === false) break;
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 300));
  }
  throw lastError instanceof Error ? lastError : new Error(`${label}: echec reseau.`);
}

async function sha256(filePath) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest("hex");
}

export async function backupSupabaseStorage({ outputDir, runtimeEnv }) {
  if ((runtimeEnv.STORAGE_DRIVER ?? "local") !== "supabase") {
    throw new Error("Le backup distant exige STORAGE_DRIVER=supabase.");
  }
  const baseUrl = required(runtimeEnv.SUPABASE_URL, "SUPABASE_URL").replace(/\/$/, "");
  const serviceKey = required(runtimeEnv.SUPABASE_SERVICE_KEY, "SUPABASE_SERVICE_KEY");
  const buckets = [...new Set([
    runtimeEnv.SUPABASE_STORAGE_BUCKET || "documents",
    runtimeEnv.SUPABASE_PUBLIC_BUCKET || "public-assets",
  ])];
  const headers = { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey };
  const objects = [];
  const objectKeys = [];

  await mkdir(outputDir, { recursive: true, mode: 0o700 });

  async function downloadObject(bucket, key) {
    const target = safeObjectPath(outputDir, bucket, key);
    const temporary = `${target}.partial`;
    await mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
    const response = await requestWithRetry(
      `${baseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${encodedKey(key)}`,
      { headers, cache: "no-store" },
      `Telechargement ${bucket}`,
    );
    if (!response.body) throw new Error(`Telechargement ${bucket}: corps vide.`);
    try {
      await pipeline(Readable.fromWeb(response.body), createWriteStream(temporary, { mode: 0o600 }));
      await rename(temporary, target);
    } catch (error) {
      await rm(temporary, { force: true });
      throw error;
    }
    const info = await stat(target);
    objects.push({ bucket, key, bytes: info.size, sha256: await sha256(target) });
  }

  async function walkPrefix(bucket, prefix = "") {
    let offset = 0;
    while (true) {
      const response = await requestWithRetry(
        `${baseUrl}/storage/v1/object/list/${encodeURIComponent(bucket)}`,
        {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ prefix, limit: LIST_PAGE_SIZE, offset, sortBy: { column: "name", order: "asc" } }),
        },
        `Inventaire ${bucket}`,
      );
      const entries = await response.json();
      if (!Array.isArray(entries)) throw new Error(`Inventaire ${bucket}: reponse invalide.`);

      for (const entry of entries) {
        if (!entry || typeof entry.name !== "string" || !entry.name) {
          throw new Error(`Inventaire ${bucket}: entree invalide.`);
        }
        const key = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.id == null) await walkPrefix(bucket, key);
        else objectKeys.push({ bucket, key });
      }

      if (entries.length < LIST_PAGE_SIZE) break;
      offset += entries.length;
    }
  }

  for (const bucket of buckets) await walkPrefix(bucket);
  if (objectKeys.length === 0) throw new Error("Aucun objet Supabase trouve; backup refuse.");

  const concurrency = Math.max(1, Math.min(12, Number(process.env.BACKUP_STORAGE_CONCURRENCY ?? 6) || 6));
  let nextObject = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, objectKeys.length) }, async () => {
    while (true) {
      const index = nextObject;
      nextObject += 1;
      if (index >= objectKeys.length) return;
      await downloadObject(objectKeys[index].bucket, objectKeys[index].key);
    }
  }));

  objects.sort((left, right) => `${left.bucket}/${left.key}`.localeCompare(`${right.bucket}/${right.key}`));
  const manifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    objectCount: objects.length,
    totalBytes: objects.reduce((sum, object) => sum + object.bytes, 0),
    buckets: buckets.map((bucket) => ({
      name: bucket,
      objectCount: objects.filter((object) => object.bucket === bucket).length,
      totalBytes: objects.filter((object) => object.bucket === bucket).reduce((sum, object) => sum + object.bytes, 0),
    })),
    objects,
  };
  await writeFile(path.join(outputDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", { mode: 0o600 });
  return manifest;
}

export async function verifyStorageBackup(outputDir) {
  const manifest = JSON.parse(await readFile(path.join(outputDir, "manifest.json"), "utf8"));
  if (manifest.version !== 1 || !Array.isArray(manifest.objects) || manifest.objects.length !== manifest.objectCount) {
    throw new Error("Manifest de backup stockage invalide.");
  }
  let totalBytes = 0;
  for (const object of manifest.objects) {
    const filePath = safeObjectPath(outputDir, object.bucket, object.key);
    const info = await stat(filePath);
    if (info.size !== object.bytes || await sha256(filePath) !== object.sha256) {
      throw new Error(`Integrite invalide pour ${object.bucket}/${object.key}.`);
    }
    totalBytes += info.size;
  }
  if (totalBytes !== manifest.totalBytes) throw new Error("Taille totale du backup stockage invalide.");
  return manifest;
}

async function main() {
  if (process.argv[2] === "--verify") {
    const outputDir = required(process.argv[3], "repertoire de verification");
    const manifest = await verifyStorageBackup(outputDir);
    console.log(JSON.stringify({ ok: true, verified: manifest.objectCount, bytes: manifest.totalBytes }));
    return;
  }

  const outputDir = required(process.argv[2], "repertoire de sortie");
  const containerName = process.argv[3] || "rebondpro-app";
  const manifest = await backupSupabaseStorage({ outputDir, runtimeEnv: runtimeEnvFromContainer(containerName) });
  console.log(JSON.stringify({ ok: true, objects: manifest.objectCount, bytes: manifest.totalBytes, buckets: manifest.buckets }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
