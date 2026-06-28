import "server-only";
import { Composio } from "@composio/core";
import type { Role } from "@prisma/client";
import type { TenantContext } from "@/lib/tenant";
import { requireRole } from "@/lib/tenant";
import { logAi } from "@/lib/ai";
import { CONNECTORS, connectorOrganizationId, connectorUserId, getConnector, resolveComposioTool, type ConnectorDefinition, type ConnectorKey, type ConnectorScope } from "@/lib/connectors";

const CONNECTOR_ROLES: Role[] = ["OWNER", "ADMIN", "ASSISTANT", "COMMERCIAL"];
const ORGANIZATION_CONNECTOR_ROLES: Role[] = ["OWNER", "ADMIN"];

let composioClient: Composio | null = null;

export class ConnectorAuthRequiredError extends Error {
  connector: ConnectorKey;
  scope: ConnectorScope;
  label: string;
  policy: ConnectorDefinition["writePolicy"];
  canConnect: boolean;
  blockedReason?: string;

  constructor(input: {
    connector: ConnectorDefinition;
    scope: ConnectorScope;
    canConnect: boolean;
    message?: string;
    blockedReason?: string;
  }) {
    const scopeLabel = input.scope === "organization" ? "du centre" : "personnel";
    super(input.message ?? `${input.connector.label} ${scopeLabel} doit être connecté pour continuer.`);
    this.name = "ConnectorAuthRequiredError";
    this.connector = input.connector.key;
    this.scope = input.scope;
    this.label = input.connector.label;
    this.policy = input.connector.writePolicy;
    this.canConnect = input.canConnect;
    this.blockedReason = input.blockedReason;
  }
}

export function isConnectorAuthRequiredError(error: unknown): error is ConnectorAuthRequiredError {
  return error instanceof ConnectorAuthRequiredError || (
    !!error &&
    typeof error === "object" &&
    (error as { name?: string }).name === "ConnectorAuthRequiredError" &&
    typeof (error as { connector?: unknown }).connector === "string"
  );
}

function assertConnectorRole(ctx: TenantContext) {
  requireRole(ctx, CONNECTOR_ROLES);
}

function assertConnectorScopeRole(ctx: TenantContext, scope: ConnectorScope) {
  if (scope === "organization") requireRole(ctx, ORGANIZATION_CONNECTOR_ROLES);
  else assertConnectorRole(ctx);
}

function connectorEntityId(ctx: TenantContext, scope: ConnectorScope) {
  return scope === "organization" ? connectorOrganizationId(ctx.organizationId) : connectorUserId(ctx.userId);
}

export function isComposioEnabled() {
  return !!process.env.COMPOSIO_API_KEY;
}

function composio() {
  if (!process.env.COMPOSIO_API_KEY) throw new Error("COMPOSIO_API_KEY absente. Connecteurs externes désactivés.");
  if (!composioClient) composioClient = new Composio({ apiKey: process.env.COMPOSIO_API_KEY });
  return composioClient;
}

function appUrl() {
  return (process.env.APP_PUBLIC_URL || process.env.AUTH_URL || "http://localhost:3000").replace(/\/$/, "");
}

function redactResult(value: unknown) {
  const text = JSON.stringify(value ?? {});
  return text.length > 8000 ? `${text.slice(0, 8000)}…` : text;
}

function parseConnectedAccounts(accounts: unknown) {
  return Array.isArray((accounts as { items?: unknown[] }).items)
    ? (accounts as { items: unknown[] }).items
    : Array.isArray(accounts)
      ? accounts as unknown[]
      : [];
}

async function connectedAccountFor(ctx: TenantContext, connector: ConnectorDefinition, scope: ConnectorScope) {
  const accounts = await composio().connectedAccounts.list({ userIds: [connectorEntityId(ctx, scope)] });
  return parseConnectedAccounts(accounts).find((item) => {
    const rec = item as { status?: string; toolkit?: { slug?: string }; nanoid?: string; id?: string };
    return rec.toolkit?.slug === connector.toolkit && rec.status === "ACTIVE";
  }) as { status?: string; nanoid?: string; id?: string } | undefined;
}

async function assertConnectorConnected(ctx: TenantContext, connector: ConnectorDefinition, scope: ConnectorScope) {
  if (!isComposioEnabled()) throw new Error("Connecteurs externes désactivés : COMPOSIO_API_KEY absente.");
  if (!connector.scopes.includes(scope)) throw new Error(`${connector.label} ne supporte pas ce périmètre de connexion.`);
  const canConnect = scope === "organization" ? ORGANIZATION_CONNECTOR_ROLES.includes(ctx.role) : CONNECTOR_ROLES.includes(ctx.role);
  if (!canConnect) {
    throw new ConnectorAuthRequiredError({
      connector,
      scope,
      canConnect: false,
      blockedReason: scope === "organization"
        ? "Demandez à un propriétaire ou administrateur du centre de connecter ce compte."
        : "Votre rôle ne permet pas de connecter ce compte.",
    });
  }
  assertConnectorScopeRole(ctx, scope);
  const account = await connectedAccountFor(ctx, connector, scope);
  const label = scope === "organization" ? "du centre" : "personnel";
  if (!account) {
    throw new ConnectorAuthRequiredError({
      connector,
      scope,
      canConnect,
      message: `${connector.label} ${label} n'est pas connecté. Autorisez-le pour que Socrate continue.`,
    });
  }
}

function clamp(value: number | undefined, fallback: number, min: number, max: number) {
  return Math.min(Math.max(value ?? fallback, min), max);
}

function ensureNonEmpty(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${label} obligatoire.`);
  return trimmed;
}

export async function listConnectorStatuses(ctx: TenantContext) {
  assertConnectorRole(ctx);
  if (!isComposioEnabled()) {
    return {
      enabled: false,
      connectors: CONNECTORS.flatMap((c) => c.scopes.map((scope) => connectorStatus(c, scope, false, "DISABLED", null))),
    };
  }
  // La réponse Composio `connectedAccounts.list` ne contient pas l'identité utilisateur par item :
  // on interroge donc une liste par périmètre (déjà filtrée par userId) puis on matche uniquement
  // sur le toolkit + statut ACTIVE, exactement comme connectedAccountFor().
  const scopes: ConnectorScope[] = ["personal", "organization"];
  const activeByScope = new Map<ConnectorScope, Map<string, { status?: string; id?: string }>>();
  await Promise.all(scopes.map(async (scope) => {
    const accounts = await composio().connectedAccounts.list({ userIds: [connectorEntityId(ctx, scope)] });
    const byToolkit = new Map<string, { status?: string; id?: string }>();
    for (const item of parseConnectedAccounts(accounts)) {
      const rec = item as { status?: string; toolkit?: { slug?: string }; id?: string };
      if (rec.toolkit?.slug && rec.status === "ACTIVE" && !byToolkit.has(rec.toolkit.slug)) {
        byToolkit.set(rec.toolkit.slug, { status: rec.status, id: rec.id });
      }
    }
    activeByScope.set(scope, byToolkit);
  }));
  return {
    enabled: true,
    connectors: CONNECTORS.flatMap((c) => c.scopes.map((scope) => {
      const match = activeByScope.get(scope)?.get(c.toolkit);
      return connectorStatus(c, scope, !!match, match?.status ?? "NOT_CONNECTED", match?.id ?? null);
    })),
  };
}

function connectorStatus(connector: ConnectorDefinition, scope: ConnectorScope, connected: boolean, status: string, accountId: string | null) {
  return {
    key: connector.key,
    label: connector.label,
    provider: connector.provider,
    priority: connector.priority,
    capabilities: connector.capabilities,
    scopes: connector.scopes,
    scope,
    defaultScope: connector.defaultScope,
    writePolicy: connector.writePolicy,
    description: connector.description,
    connected,
    status,
    accountId,
  };
}

function safeReturnTo(returnTo?: string) {
  if (!returnTo) return "/assistant";
  if (!returnTo.startsWith("/") || returnTo.startsWith("//") || returnTo.includes("\\") || returnTo.includes("\n")) return "/assistant";
  return returnTo;
}

export async function createConnectorAuthLink(ctx: TenantContext, key: ConnectorKey, scope: ConnectorScope = "personal", returnTo?: string) {
  assertConnectorRole(ctx);
  const connector = getConnector(key);
  if (!connector) return { error: "Connecteur inconnu." };
  if (!connector.scopes.includes(scope)) return { error: "Périmètre de connexion invalide pour ce connecteur." };
  assertConnectorScopeRole(ctx, scope);
  if (!isComposioEnabled()) return { error: "COMPOSIO_API_KEY absente. Configurez Composio avant de connecter un compte." };
  const callbackUrl = `${appUrl()}/integrations/composio/callback?connector=${connector.key}&scope=${scope}&returnTo=${encodeURIComponent(safeReturnTo(returnTo))}`;
  const session = await composio().create(connectorEntityId(ctx, scope), { manageConnections: false, toolkits: [connector.toolkit] });
  const request = await session.authorize(connector.toolkit, { callbackUrl });
  return { url: request.redirectUrl, connector: connector.key, scope };
}

export async function listExternalCalendarEvents(ctx: TenantContext, input: { connector: "google_calendar" | "microsoft_calendar"; scope?: ConnectorScope; from?: string; to?: string; limit?: number }) {
  assertConnectorRole(ctx);
  const connector = getConnector(input.connector);
  if (!connector || !connector.capabilities.includes("calendar_read")) throw new Error("Connecteur calendrier invalide.");
  const scope = input.scope ?? connector.defaultScope;
  await assertConnectorConnected(ctx, connector, scope);
  const tool = resolveComposioTool(connector, "listEvents");
  if (!tool) throw new Error(`Outil calendrier non configuré pour ${connector.label}.`);
  const result = await composio().tools.execute(tool, {
    userId: connectorEntityId(ctx, scope),
    arguments: {
      timeMin: input.from,
      timeMax: input.to,
      maxResults: clamp(input.limit, 10, 1, 25),
    },
  });
  await logAi({ organizationId: ctx.organizationId, userId: ctx.userId, type: "connector_calendar_read", input: `${connector.key}:${scope}`, output: redactResult(result) });
  return result;
}

export async function searchExternalDocuments(ctx: TenantContext, input: { connector: "google_drive" | "onedrive" | "sharepoint"; scope?: ConnectorScope; query: string; limit?: number }) {
  assertConnectorRole(ctx);
  const connector = getConnector(input.connector);
  if (!connector || !connector.capabilities.includes("document_read")) throw new Error("Connecteur documentaire invalide.");
  const scope = input.scope ?? connector.defaultScope;
  await assertConnectorConnected(ctx, connector, scope);
  const query = ensureNonEmpty(input.query, "Requête de recherche");
  const tool = resolveComposioTool(connector, "searchFiles");
  if (!tool) throw new Error(`Outil recherche document non configuré pour ${connector.label}.`);
  const limit = clamp(input.limit, 10, 1, 20);
  const result = await composio().tools.execute(tool, {
    userId: connectorEntityId(ctx, scope),
    arguments: {
      query,
      q: query,
      limit,
      pageSize: limit,
    },
  });
  await logAi({ organizationId: ctx.organizationId, userId: ctx.userId, type: "connector_document_search", input: `${connector.key}:${scope}:${query}`, output: redactResult(result) });
  return result;
}

export async function importExternalDocument(ctx: TenantContext, input: { connector: "google_drive" | "onedrive" | "sharepoint"; scope?: ConnectorScope; fileId: string }) {
  assertConnectorRole(ctx);
  const connector = getConnector(input.connector);
  if (!connector || !connector.capabilities.includes("document_import")) throw new Error("Connecteur import document invalide.");
  const scope = input.scope ?? connector.defaultScope;
  await assertConnectorConnected(ctx, connector, scope);
  const fileId = ensureNonEmpty(input.fileId, "Identifiant du fichier");
  const tool = resolveComposioTool(connector, "getFile");
  if (!tool) throw new Error(`Outil import document non configuré pour ${connector.label}.`);
  const result = await composio().tools.execute(tool, {
    userId: connectorEntityId(ctx, scope),
    arguments: { fileId, file_id: fileId, id: fileId },
  });
  await logAi({ organizationId: ctx.organizationId, userId: ctx.userId, type: "connector_document_import", input: `${connector.key}:${scope}:${fileId}`, output: redactResult(result) });
  return result;
}

export async function createExternalEmailDraft(ctx: TenantContext, input: { connector: "gmail" | "outlook"; to: string[]; subject: string; body: string; cc?: string[] }) {
  assertConnectorRole(ctx);
  const connector = getConnector(input.connector);
  if (!connector || !connector.capabilities.includes("email_draft")) throw new Error("Connecteur email invalide.");
  await assertConnectorConnected(ctx, connector, "personal");
  const recipients = input.to.map((email) => email.trim()).filter(Boolean);
  if (recipients.length === 0) throw new Error("Au moins un destinataire est obligatoire pour créer un brouillon.");
  const subject = ensureNonEmpty(input.subject, "Objet du brouillon");
  const body = ensureNonEmpty(input.body, "Corps du brouillon");
  const tool = resolveComposioTool(connector, "createDraft");
  if (!tool) throw new Error(`Outil brouillon email non configuré pour ${connector.label}.`);
  const result = await composio().tools.execute(tool, {
    userId: connectorEntityId(ctx, "personal"),
    arguments: {
      to: recipients,
      recipient: recipients.join(", "),
      cc: input.cc ?? [],
      subject,
      body,
      message: body,
      isHtml: false,
    },
  });
  await logAi({ organizationId: ctx.organizationId, userId: ctx.userId, type: "connector_email_draft", input: `${connector.key}:${subject}`, output: redactResult(result) });
  return result;
}

export async function sendExternalEmail(ctx: TenantContext, input: { connector: "gmail" | "outlook"; to: string[]; subject: string; body: string; cc?: string[] }) {
  assertConnectorRole(ctx);
  const connector = getConnector(input.connector);
  if (!connector || !connector.capabilities.includes("email_send")) throw new Error("Connecteur d'envoi email invalide.");
  await assertConnectorConnected(ctx, connector, "personal");
  const recipients = input.to.map((email) => email.trim()).filter(Boolean);
  if (recipients.length === 0) throw new Error("Au moins un destinataire est obligatoire pour envoyer un email.");
  const subject = ensureNonEmpty(input.subject, "Objet de l'email");
  const body = ensureNonEmpty(input.body, "Corps de l'email");
  const tool = resolveComposioTool(connector, "sendEmail");
  if (!tool) throw new Error(`Outil d'envoi email non configuré pour ${connector.label}.`);
  const cc = (input.cc ?? []).map((email) => email.trim()).filter(Boolean);
  // Schémas vérifiés via l'API Composio : Gmail = recipient_email/extra_recipients/cc ;
  // Outlook = to_email/cc_emails (slug OUTLOOK_OUTLOOK_SEND_EMAIL).
  const sendArgs = connector.toolkit === "gmail"
    ? { recipient_email: recipients[0], extra_recipients: recipients.slice(1), cc, subject, body, is_html: false }
    : { to_email: recipients.join(","), cc_emails: cc, subject, body, is_html: false, save_to_sent_items: true };
  const result = await composio().tools.execute(tool, {
    userId: connectorEntityId(ctx, "personal"),
    arguments: sendArgs,
  });
  await logAi({ organizationId: ctx.organizationId, userId: ctx.userId, type: "connector_email_send", input: `${connector.key}:${subject}`, output: redactResult(result) });
  return result;
}

export async function createExternalCalendarEvent(ctx: TenantContext, input: { connector: "google_calendar" | "microsoft_calendar"; scope?: ConnectorScope; title: string; start: string; end?: string; description?: string; location?: string; attendees?: string[]; timezone?: string }) {
  assertConnectorRole(ctx);
  const connector = getConnector(input.connector);
  if (!connector || !connector.capabilities.includes("calendar_write")) throw new Error("Connecteur agenda en écriture invalide.");
  const scope = input.scope ?? connector.defaultScope;
  await assertConnectorConnected(ctx, connector, scope);
  const title = ensureNonEmpty(input.title, "Titre de l'événement");
  const start = ensureNonEmpty(input.start, "Date/heure de début (ISO 8601)");
  const tool = resolveComposioTool(connector, "createEvent");
  if (!tool) throw new Error(`Outil création d'événement non configuré pour ${connector.label}.`);
  const timezone = input.timezone || "Europe/Paris";
  const attendees = (input.attendees ?? []).map((email) => email.trim()).filter(Boolean);
  const startMs = Date.parse(start);
  const endMs = input.end ? Date.parse(input.end) : NaN;
  const durationMin = Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs ? Math.round((endMs - startMs) / 60000) : 60;
  // Schémas vérifiés via l'API Composio :
  //  - Google : summary/start_datetime/event_duration_minutes/attendees (liste d'emails).
  //  - Outlook : subject/start_datetime/end_datetime/time_zone requis, attendees_info = [{ email }].
  const endIso = input.end || (Number.isFinite(startMs) ? new Date(startMs + durationMin * 60000).toISOString() : start);
  const eventArgs = connector.toolkit === "googlecalendar"
    ? { summary: title, description: input.description, location: input.location, start_datetime: start, event_duration_minutes: durationMin, attendees, timezone, calendar_id: "primary" }
    : { subject: title, body: input.description ?? title, location: input.location, start_datetime: start, end_datetime: endIso, time_zone: timezone, attendees_info: attendees.map((email) => ({ email })) };
  const result = await composio().tools.execute(tool, {
    userId: connectorEntityId(ctx, scope),
    arguments: eventArgs,
  });
  await logAi({ organizationId: ctx.organizationId, userId: ctx.userId, type: "connector_calendar_create", input: `${connector.key}:${scope}:${title}`, output: redactResult(result) });
  return result;
}

export async function createExternalDocument(ctx: TenantContext, input: { connector: "google_drive"; scope?: ConnectorScope; fileName: string; content: string; mimeType?: string; parentId?: string }) {
  assertConnectorRole(ctx);
  const connector = getConnector(input.connector);
  if (!connector || !connector.capabilities.includes("document_write")) throw new Error("Connecteur d'écriture documentaire invalide.");
  const scope = input.scope ?? connector.defaultScope;
  await assertConnectorConnected(ctx, connector, scope);
  const fileName = ensureNonEmpty(input.fileName, "Nom du fichier");
  const content = ensureNonEmpty(input.content, "Contenu du document");
  const tool = resolveComposioTool(connector, "createFile");
  if (!tool) throw new Error(`Outil création de document non configuré pour ${connector.label}.`);
  // Schéma vérifié : GOOGLEDRIVE_CREATE_FILE_FROM_TEXT = file_name/text_content (+ mime_type, parent_id optionnels).
  const result = await composio().tools.execute(tool, {
    userId: connectorEntityId(ctx, scope),
    arguments: {
      file_name: fileName,
      text_content: content,
      mime_type: input.mimeType,
      parent_id: input.parentId,
    },
  });
  await logAi({ organizationId: ctx.organizationId, userId: ctx.userId, type: "connector_document_create", input: `${connector.key}:${scope}:${fileName}`, output: redactResult(result) });
  return result;
}
