import { readFileSync } from "node:fs";
import { CONNECTORS } from "../src/lib/connectors";
import { AGENT_TOOLS, isSensitive } from "../src/server/agent/tools";
import { isToolAllowed } from "../src/lib/ag-ui/persona";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

function read(path: string) {
  return readFileSync(path, "utf8");
}

const expected = [
  "google_calendar",
  "google_drive",
  "gmail",
  "outlook",
  "onedrive",
  "sharepoint",
  "microsoft_calendar",
];

for (const key of expected) {
  assert(CONNECTORS.some((c) => c.key === key), `Connecteur manquant: ${key}`);
}

assert(CONNECTORS.find((c) => c.key === "google_calendar")?.writePolicy === "READ_ONLY", "Google Calendar doit rester en lecture seule.");
assert(CONNECTORS.find((c) => c.key === "microsoft_calendar")?.writePolicy === "READ_ONLY", "Microsoft Calendar doit rester en lecture seule.");
assert(CONNECTORS.find((c) => c.key === "gmail")?.writePolicy === "DRAFT_ONLY", "Gmail doit rester en brouillon uniquement.");
assert(CONNECTORS.find((c) => c.key === "outlook")?.writePolicy === "DRAFT_ONLY", "Outlook doit rester en brouillon uniquement.");
assert(CONNECTORS.find((c) => c.key === "gmail")?.scopes.join(",") === "personal", "Gmail doit être uniquement personnel.");
assert(CONNECTORS.find((c) => c.key === "google_drive")?.defaultScope === "organization", "Google Drive doit privilégier le centre.");
assert(CONNECTORS.find((c) => c.key === "sharepoint")?.scopes.includes("organization"), "SharePoint doit supporter le périmètre centre.");

const toolNames = AGENT_TOOLS.map((tool) => tool.name);
for (const name of [
  "list_external_connectors",
  "list_external_calendar_events",
  "search_external_documents",
  "import_external_document",
  "create_external_email_draft",
  "list_document_templates",
  "preflight_document_generation",
  "generate_document",
]) {
  assert(toolNames.includes(name), `Outil Socrate manquant: ${name}`);
}

assert(isSensitive("import_external_document"), "L'import de document externe doit exiger validation humaine.");
assert(isSensitive("create_external_email_draft"), "La création de brouillon email doit exiger validation humaine.");
assert(isSensitive("generate_document"), "La génération documentaire doit exiger validation humaine.");
assert(!isSensitive("preflight_document_generation"), "Le préflight documentaire doit rester en lecture/analyse.");
assert(isToolAllowed("center", "preflight_document_generation"), "Le persona centre doit pouvoir analyser une génération documentaire.");
assert(isToolAllowed("center", "generate_document"), "Le persona centre doit pouvoir demander une génération documentaire validée.");
assert(!isToolAllowed("visitor", "generate_document"), "Le persona visiteur ne doit pas générer de document centre.");
assert(isToolAllowed("platform_admin", "create_external_email_draft"), "Le persona platform_admin doit pouvoir utiliser ses connecteurs personnels (brouillon email).");
assert(isToolAllowed("platform_admin", "list_external_calendar_events"), "Le persona platform_admin doit pouvoir lire son agenda personnel connecté.");
assert(!isToolAllowed("platform_admin", "generate_document"), "Le persona platform_admin ne doit pas générer de documents centre.");
assert(!isToolAllowed("visitor", "search_external_documents"), "Le persona visiteur ne doit pas avoir accès aux documents externes.");

const envExample = read(".env.example");
assert(envExample.includes("COMPOSIO_API_KEY"), ".env.example doit documenter COMPOSIO_API_KEY.");

const connectorSource = read("src/lib/connectors.ts") + read("src/server/connectors.ts") + read("src/server/agent/tools.ts");
const forbiddenSendPatterns = [
  "GMAIL_SEND",
  "GMAIL_SEND_EMAIL",
  "OUTLOOK_SEND",
  "OUTLOOK_SEND_EMAIL",
  "SEND_EMAIL",
  "SEND_MESSAGE",
  "sendExternalEmail",
];
for (const pattern of forbiddenSendPatterns) {
  assert(!connectorSource.includes(pattern), `Capacité d'envoi direct interdite détectée: ${pattern}`);
}

assert(read("src/server/connectors.ts").includes("requireRole"), "Les connecteurs doivent vérifier les rôles serveur.");
assert(read("src/server/connectors.ts").includes("assertConnectorConnected"), "Chaque exécution connecteur doit vérifier qu'un compte actif est connecté.");
assert(read("src/server/connectors.ts").includes("ConnectorAuthRequiredError"), "Un connecteur absent doit produire une erreur métier structurée.");
assert(read("src/server/connectors.ts").includes("connectorOrganizationId"), "Les connexions centre doivent utiliser une identité Composio organisation.");
assert(read("src/server/connectors.ts").includes("ORGANIZATION_CONNECTOR_ROLES"), "Les connexions centre doivent être limitées à OWNER/ADMIN.");
assert(read("src/server/agent/runtime.ts").includes("connector_oauth_card"), "Socrate doit émettre une carte OAuth quand une connexion est requise.");
assert(read("src/lib/ag-ui/types.ts").includes("connector_oauth_card"), "Le bloc OAuth doit être dans l'allowlist AG-UI.");
assert(read("src/components/agent/AgentUIBlockRenderer.tsx").includes("connectExternalConnector"), "La carte Socrate doit pouvoir lancer OAuth.");
assert(read("src/app/(app)/integrations/composio/callback/page.tsx").includes("returnTo"), "Le callback OAuth doit permettre de revenir à Socrate.");
assert(read("src/server/connectors.ts").includes("COMPOSIO_API_KEY absente"), "L'absence de clé Composio doit produire une erreur explicite.");
assert(read("src/server/connectors.ts").includes("Au moins un destinataire"), "La création de brouillon doit refuser les destinataires vides.");
assert(read("src/app/(app)/parametres/parametres-client.tsx").includes("Aucun outil d&apos;envoi direct"), "L'UI doit expliciter l'absence d'envoi direct.");
assert(read("src/app/(app)/parametres/parametres-client.tsx").includes("Mes connexions"), "L'UI doit distinguer les connexions personnelles.");
assert(read("src/app/(app)/parametres/parametres-client.tsx").includes("Connexions du centre"), "L'UI doit distinguer les connexions du centre.");

console.log("smoke:connectors PASS");
