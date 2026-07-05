/**
 * Helper Gmail pour l'E2E réel — lit les emails envoyés par la prod (Resend) via Composio.
 * Permet d'extraire les liens de vérification / invitation / reset pour piloter les vrais flux.
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Composio } from '@composio/core';

dotenv.config({ path: path.resolve(__dirname, '../.env.local'), quiet: true });

const ENTITY = process.env.E2E_COMPOSIO_ENTITY || 'e2e_gmail';
const FETCH_TOOL = process.env.COMPOSIO_TOOL_GMAIL_FETCH || 'GMAIL_FETCH_EMAILS';

if (!process.env.COMPOSIO_API_KEY) {
  throw new Error('COMPOSIO_API_KEY absente de .env.local — connecteur Gmail E2E indisponible.');
}
const composio = new Composio({ apiKey: process.env.COMPOSIO_API_KEY });

export type GmailMessage = {
  messageId: string;
  messageText: string;
  /** Corps complet décodé depuis payload.parts (base64) — NON redacté, contient les vraies URLs. */
  body: string;
  subject: string;
  to: string;
  from: string;
  timestamp: string;
};

type GmailHeader = {
  name?: string;
  value?: string;
};

type GmailPayload = {
  headers?: GmailHeader[];
  body?: { data?: string };
  parts?: GmailPayload[];
};

type RawGmailMessage = {
  messageId?: string;
  messageText?: string;
  payload?: GmailPayload;
  messageTimestamp?: string;
};

type GmailFetchResult = {
  data?: {
    messages?: RawGmailMessage[];
    response_data?: {
      messages?: RawGmailMessage[];
    };
  };
};

function headerValue(msg: RawGmailMessage, name: string): string {
  const headers = msg?.payload?.headers ?? [];
  const h = headers.find((x) => (x?.name || '').toLowerCase() === name.toLowerCase());
  return h?.value ?? '';
}

/** Composio redacte les URLs dans messageText ; on décode les parties base64 brutes du payload. */
function decodeBody(payload?: GmailPayload): string {
  let out = '';
  const walk = (p?: GmailPayload) => {
    if (!p) return;
    const data = p?.body?.data;
    if (data) {
      try { out += Buffer.from(data, 'base64').toString('utf8') + '\n'; } catch { /* ignore */ }
    }
    for (const child of p?.parts ?? []) walk(child);
  };
  walk(payload);
  return out;
}

export async function fetchEmails(query: string, max = 10): Promise<GmailMessage[]> {
  const result = await composio.tools.execute(FETCH_TOOL, {
    userId: ENTITY,
    arguments: { query, q: query, max_results: max, maxResults: max },
    dangerouslySkipVersionCheck: true,
  }) as GmailFetchResult;
  const messages = result?.data?.messages ?? result?.data?.response_data?.messages ?? [];
  return messages.map((m) => ({
    messageId: m.messageId ?? '',
    messageText: m.messageText || '',
    body: decodeBody(m.payload),
    subject: headerValue(m, 'Subject'),
    to: headerValue(m, 'To'),
    from: headerValue(m, 'From'),
    timestamp: m.messageTimestamp || '',
  }));
}

/** Attend qu'un email correspondant arrive (poll). Lève si rien dans le délai. */
export async function waitForEmail(opts: {
  query: string;
  timeoutMs?: number;
  intervalMs?: number;
  predicate?: (m: GmailMessage) => boolean;
}): Promise<GmailMessage> {
  const timeout = opts.timeoutMs ?? 90_000;
  const interval = opts.intervalMs ?? 5_000;
  const deadline = Date.now() + timeout;
  let last: GmailMessage[] = [];
  while (Date.now() < deadline) {
    last = await fetchEmails(opts.query);
    const found = opts.predicate ? last.find(opts.predicate) : last[0];
    if (found) return found;
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error(
    `Aucun email pour query "${opts.query}" après ${timeout}ms. ${last.length} message(s) vus (sujets: ${last.map((m) => m.subject).join(' | ')}).`
  );
}

/** Extrait toutes les URLs http(s) du corps décodé (non redacté). */
export function extractLinks(msg: GmailMessage): string[] {
  const source = `${msg.body}\n${msg.messageText}`;
  const urls = [...(source.matchAll(/https?:\/\/[^\s<>"')\]]+/g))].map((m) => m[0].replace(/[.,)]+$/, ''));
  return [...new Set(urls)];
}

/** Premier lien contenant l'un des fragments donnés (ex: "verify", "definir-mdp", "reset"). */
export function findLink(msg: GmailMessage, ...fragments: string[]): string | null {
  const links = extractLinks(msg);
  for (const frag of fragments) {
    const hit = links.find((u) => u.toLowerCase().includes(frag.toLowerCase()));
    if (hit) return hit;
  }
  return null;
}
