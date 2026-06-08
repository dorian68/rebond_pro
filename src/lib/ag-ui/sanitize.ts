// Masquage des secrets avant tout envoi au modèle ou au frontend (CDC §13).

const SECRET_KEYS = ["apikey", "token", "password", "secret", "authorization", "cookie", "set-cookie", "privatekey", "refreshtoken", "accesstoken", "passwordhash"];

export function sanitizeForAgent<T>(input: T): T {
  return walk(input) as T;
}

function walk(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(walk);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const lk = k.toLowerCase().replace(/[_-]/g, "");
      if (SECRET_KEYS.some((s) => lk.includes(s))) out[k] = "***";
      else out[k] = walk(v);
    }
    return out;
  }
  return value;
}
