/**
 * Sandbox Composio Gmail pour l'E2E — lit les emails de vérif/invitation envoyés par la prod.
 * Calqué sur l'API @composio/core v0.11 déjà utilisée dans src/server/connectors.ts.
 *
 * Usage :
 *   node e2e/composio-gmail.mjs connect          # génère le lien OAuth → autoriser dorian.labry@gmail.com
 *   node e2e/composio-gmail.mjs status           # liste les comptes connectés (statut ACTIVE ?)
 *   node e2e/composio-gmail.mjs fetch "<query>"  # lit les emails (query Gmail, ex: subject:vérif newer_than:1h)
 *
 * Requiert COMPOSIO_API_KEY dans .env.local.
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { Composio } from '@composio/core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local'), quiet: true });

const ENTITY = process.env.E2E_COMPOSIO_ENTITY || 'e2e_gmail';
const TOOLKIT = 'gmail';
const FETCH_TOOL = process.env.COMPOSIO_TOOL_GMAIL_FETCH || 'GMAIL_FETCH_EMAILS';

if (!process.env.COMPOSIO_API_KEY) {
  console.error('❌ COMPOSIO_API_KEY absente de .env.local — ajoute-la puis relance.');
  process.exit(2);
}
const composio = new Composio({ apiKey: process.env.COMPOSIO_API_KEY, dangerouslySkipVersionCheck: true });

const cmd = process.argv[2];
const arg = process.argv[3];

function parseAccounts(accounts) {
  if (Array.isArray(accounts?.items)) return accounts.items;
  if (Array.isArray(accounts)) return accounts;
  return [];
}

if (cmd === 'connect') {
  const session = await composio.create(ENTITY, { manageConnections: false, toolkits: [TOOLKIT] });
  const request = await session.authorize(TOOLKIT, { callbackUrl: 'https://lebonrebond.fr/' });
  console.log('\n👉 Ouvre ce lien et autorise dorian.labry@gmail.com :\n');
  console.log(request.redirectUrl);
  console.log(`\n(entity = ${ENTITY}) — puis : node e2e/composio-gmail.mjs status`);
} else if (cmd === 'status') {
  const accounts = await composio.connectedAccounts.list({ userIds: [ENTITY] });
  const items = parseAccounts(accounts).map(a => ({ toolkit: a?.toolkit?.slug, status: a?.status, id: a?.id }));
  console.log(`Comptes connectés pour entity "${ENTITY}":`);
  console.log(JSON.stringify(items, null, 2));
  const gmail = items.find(i => i.toolkit === 'gmail' && i.status === 'ACTIVE');
  console.log(gmail ? '✅ Gmail ACTIVE — prêt à lire.' : '⏳ Gmail pas encore ACTIVE (autorise via `connect`).');
} else if (cmd === 'fetch') {
  const query = arg || 'newer_than:1h';
  const result = await composio.tools.execute(FETCH_TOOL, {
    userId: ENTITY,
    arguments: { query, q: query, max_results: 5, maxResults: 5 },
    dangerouslySkipVersionCheck: true,
  });
  const msgs = result?.data?.messages ?? [];
  for (const m of msgs) {
    console.log(`\n--- ${m.messageId} | ${m.messageTimestamp} ---`);
    const decoded = decodeParts(m?.payload);
    console.log('messageText:', m.messageText);
    console.log('decoded parts:\n', decoded.slice(0, 2000));
    console.log('URLs:', [...decoded.matchAll(/https?:\/\/[^\s<>"')\]]+/g)].map(x => x[0]).join('\n'));
  }

  function decodeParts(payload) {
    let out = '';
    const walk = (p) => {
      if (!p) return;
      const data = p?.body?.data;
      if (data) {
        try { out += Buffer.from(data, 'base64').toString('utf8') + '\n'; } catch {}
      }
      for (const child of p?.parts ?? []) walk(child);
    };
    walk(payload);
    return out;
  }
} else {
  console.log('Commandes : connect | status | fetch "<gmail query>"');
}
