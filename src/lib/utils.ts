/** Concatène des classes conditionnelles. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** Slug URL-safe à partir d'un texte. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 60);
}

/** Centimes -> chaîne monétaire FR (ex : 69000 -> "690 €"). */
export function formatMoney(cents: number, currency = "EUR"): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

/** Centimes -> nombre en k€ arrondi (pour graphiques). */
export function toK(cents: number): number {
  return Math.round((cents / 100 / 1000) * 10) / 10;
}

const DATE_FMT = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });
const DATE_FMT_SHORT = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return DATE_FMT.format(typeof date === "string" ? new Date(date) : date);
}

export function formatDateShort(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return DATE_FMT_SHORT.format(typeof date === "string" ? new Date(date) : date);
}

/** Plage de dates lisible (ex : "12 – 14 juin 2026"). */
export function formatDateRange(start: Date | string, end: Date | string): string {
  const s = typeof start === "string" ? new Date(start) : start;
  const e = typeof end === "string" ? new Date(end) : end;
  if (s.toDateString() === e.toDateString()) return formatDate(s);
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
  if (sameMonth) {
    return `${s.getDate()} – ${formatDate(e)}`;
  }
  return `${formatDateShort(s)} – ${formatDate(e)}`;
}

export function initials(first: string, last?: string): string {
  return ((first?.[0] ?? "") + (last?.[0] ?? "")).toUpperCase();
}

export function clampPct(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** Date -> "yyyy-mm-dd" pour <input type="date"> (en UTC pour rester stable). */
export function toDateInput(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().slice(0, 10);
}

/** Clé jour (UTC) "yyyy-mm-dd". */
export function dayKey(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().slice(0, 10);
}

export function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

/** Lundi 00:00 UTC de la semaine contenant `date`. */
export function mondayOf(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dow = (d.getUTCDay() + 6) % 7; // 0 = lundi
  return addDays(d, -dow);
}

const WEEKDAY_FMT = new Intl.DateTimeFormat("fr-FR", { weekday: "short", timeZone: "UTC" });
export function weekdayLabel(date: Date): string {
  return WEEKDAY_FMT.format(date);
}
