const PREFIX = "rebondpro:roadmap2:drive-operation:v1";
const KEY_PATTERN = /^[A-Za-z0-9_-]{16,120}$/;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1_000;

function storageKey(workspaceKey: string, operationScope: string) {
  return `${PREFIX}:${encodeURIComponent(workspaceKey)}:${encodeURIComponent(operationScope)}`;
}

function available() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function stableScopeHash(value: string) {
  let first = 2166136261;
  let second = 5381;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first = Math.imul(first ^ code, 16777619) >>> 0;
    second = (Math.imul(second, 33) ^ code) >>> 0;
  }
  return `${first.toString(36)}${second.toString(36)}`;
}

function pruneExpiredOperationKeys(storage: Storage, now: number) {
  const expired: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key?.startsWith(`${PREFIX}:`)) continue;
    try {
      const parsed = JSON.parse(storage.getItem(key) ?? "null") as { createdAt?: unknown } | null;
      if (!parsed || typeof parsed.createdAt !== "number" || now - parsed.createdAt > MAX_AGE_MS) expired.push(key);
    } catch {
      expired.push(key);
    }
  }
  for (const key of expired) storage.removeItem(key);
}

export function getOrCreateRoadmap2OperationKey(workspaceKey: string, operationScope: string) {
  const key = storageKey(workspaceKey, operationScope);
  if (available()) {
    try {
      pruneExpiredOperationKeys(window.localStorage, Date.now());
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const existing = JSON.parse(raw) as { value?: unknown; createdAt?: unknown };
        if (typeof existing.value === "string" && KEY_PATTERN.test(existing.value)
          && typeof existing.createdAt === "number" && Date.now() - existing.createdAt <= MAX_AGE_MS) return existing.value;
        window.localStorage.removeItem(key);
      }
    } catch {
      // Un navigateur qui interdit sessionStorage peut toujours utiliser la
      // clé en mémoire pour la tentative courante.
    }
  }
  const created = globalThis.crypto.randomUUID();
  if (available()) {
    try { window.localStorage.setItem(key, JSON.stringify({ value: created, createdAt: Date.now() })); } catch { /* voir ci-dessus */ }
  }
  return created;
}

export function clearRoadmap2OperationKey(workspaceKey: string, operationScope: string) {
  if (!available()) return;
  try { window.localStorage.removeItem(storageKey(workspaceKey, operationScope)); } catch { /* stockage optionnel */ }
}

export function roadmap2UploadOperationScope(nodeId: string, file: Pick<File, "name" | "size" | "lastModified">) {
  return `upload:${stableScopeHash(`${nodeId}|${file.name}|${file.size}|${file.lastModified}`)}`;
}

export function roadmap2PermissionOperationScope(emails: string[]) {
  const value = [...emails].map((email) => email.trim().toLowerCase()).sort().join("|");
  return `permissions:${stableScopeHash(value)}:${emails.length}`;
}
