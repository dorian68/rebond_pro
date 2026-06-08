// Logger structuré minimal (JSON), avec masquage des secrets.
// Usage : logger.info("event", { ... }) — jamais de secret en clair.

type Level = "debug" | "info" | "warn" | "error";

const SECRET_KEYS = /(password|passwd|secret|token|apikey|api_key|authorization|cookie|service_key|private)/i;

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[deep]";
  if (value == null) return value;
  if (typeof value === "string") return value.length > 500 ? value.slice(0, 500) + "…" : value;
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => redact(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = SECRET_KEYS.test(k) ? "[redacted]" : redact(v, depth + 1);
  }
  return out;
}

function emit(level: Level, event: string, data?: Record<string, unknown>) {
  const line = { ts: new Date().toISOString(), level, event, ...(data ? (redact(data) as object) : {}) };
  const text = JSON.stringify(line);
  if (level === "error") console.error(text);
  else if (level === "warn") console.warn(text);
  else console.log(text);
}

export const logger = {
  debug: (event: string, data?: Record<string, unknown>) => { if (process.env.NODE_ENV !== "production") emit("debug", event, data); },
  info: (event: string, data?: Record<string, unknown>) => emit("info", event, data),
  warn: (event: string, data?: Record<string, unknown>) => emit("warn", event, data),
  error: (event: string, data?: Record<string, unknown>) => emit("error", event, data),
};
