import "server-only";
import { promises as fs } from "fs";
import path from "path";

// Abstraction stockage : driver "local" (disque) en dev, "supabase" en prod.
const DRIVER = process.env.STORAGE_DRIVER ?? "local";
const LOCAL_DIR = process.env.STORAGE_LOCAL_DIR ?? "./storage";
const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY ?? "";
const SUPABASE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "documents";

function localPath(key: string): string {
  return path.join(process.cwd(), LOCAL_DIR, key);
}

/** Enregistre un buffer sous `key` (ex: "documents/<org>/<id>.pdf"). Retourne la clé. */
export async function saveFile(key: string, data: Buffer | Uint8Array): Promise<string> {
  if (DRIVER === "supabase") {
    await supabaseUpload(key, data);
    return key;
  }
  // default: local
  const full = localPath(key);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, data);
  return key;
}

export async function readFile(key: string): Promise<Buffer> {
  if (DRIVER === "supabase") {
    return supabaseDownload(key);
  }
  return fs.readFile(localPath(key));
}

export async function deleteFile(key: string): Promise<void> {
  if (DRIVER === "supabase") {
    await supabaseDelete(key);
    return;
  }
  try { await fs.unlink(localPath(key)); } catch { /* ignore */ }
}

/** Retourne une URL de téléchargement signée (Supabase) ou undefined en local. */
export async function getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string | null> {
  if (DRIVER !== "supabase") return null;
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/sign/${SUPABASE_BUCKET}/${key}`,
    { method: "POST", headers: { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ expiresIn: expiresInSeconds }) }
  );
  if (!res.ok) return null;
  const { signedURL } = await res.json() as { signedURL: string };
  return `${SUPABASE_URL}/storage/v1${signedURL}`;
}

const PUBLIC_BUCKET = process.env.SUPABASE_PUBLIC_BUCKET ?? "public-assets";

/**
 * Upload d'une image destinée à un affichage PUBLIC (logo centre, photo formateur…).
 * Retourne une URL publique directement utilisable dans <img>.
 * - Supabase configuré → bucket public Supabase (URL publique permanente).
 * - Sinon → disque local sous public/uploads (servi par Next en dev).
 */
export async function uploadPublicImage(key: string, data: Buffer, contentType: string): Promise<string> {
  if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
    const url = `${SUPABASE_URL}/storage/v1/object/${PUBLIC_BUCKET}/${key}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, "Content-Type": contentType, "x-upsert": "true", "cache-control": "3600" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      body: data as any,
    });
    if (!res.ok) throw new Error(`Upload image échoué: ${res.status} ${await res.text()}`);
    return `${SUPABASE_URL}/storage/v1/object/public/${PUBLIC_BUCKET}/${key}`;
  }
  // Fallback local
  const full = path.join(process.cwd(), "public", "uploads", key);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, data);
  return `/uploads/${key}`;
}

// ── Supabase Storage REST helpers ─────────────────────────────────

async function supabaseUpload(key: string, data: Buffer | Uint8Array): Promise<void> {
  const url = `${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, "Content-Type": "application/octet-stream", "x-upsert": "true" },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body: data as any,
  });
  if (!res.ok) throw new Error(`Supabase storage upload failed: ${res.status} ${await res.text()}`);
}

async function supabaseDownload(key: string): Promise<Buffer> {
  const url = `${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${key}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } });
  if (!res.ok) throw new Error(`Supabase storage download failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function supabaseDelete(key: string): Promise<void> {
  const url = `${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}`;
  await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: [key] }),
  });
}
