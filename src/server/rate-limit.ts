/**
 * Limiteur de débit en mémoire (fenêtre glissante) — adapté au déploiement
 * mono-instance (un seul conteneur app). Pas de dépendance externe.
 */

type Window = { timestamps: number[] };

const buckets = new Map<string, Window>();
let lastSweep = Date.now();

/** Purge périodique des clés inactives (évite la croissance mémoire). */
function sweep(now: number, windowMs: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, w] of buckets) {
    if (w.timestamps.length === 0 || now - w.timestamps[w.timestamps.length - 1] > windowMs) {
      buckets.delete(key);
    }
  }
}

/**
 * Consomme une unité pour `key`. Retourne false si la limite `max` est
 * atteinte sur la fenêtre `windowMs` (l'appel refusé n'est pas compté).
 */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  sweep(now, windowMs);
  const w = buckets.get(key) ?? { timestamps: [] };
  w.timestamps = w.timestamps.filter((t) => now - t < windowMs);
  if (w.timestamps.length >= max) {
    buckets.set(key, w);
    return false;
  }
  w.timestamps.push(now);
  buckets.set(key, w);
  return true;
}

/** IP client derrière le reverse proxy (Caddy pose X-Forwarded-For). */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
