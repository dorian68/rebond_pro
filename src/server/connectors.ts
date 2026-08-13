import "server-only";
import { Composio } from "@composio/core";
import { createHash } from "node:crypto";
import { z } from "zod";
import type { Role } from "@prisma/client";
import type { TenantContext } from "@/lib/tenant";
import { requireRole } from "@/lib/tenant";
import { logAi } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
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
  return account;
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
  const safeDestination = safeReturnTo(returnTo);
  const callbackPath = !ctx.organizationId && safeDestination.startsWith("/admin/") ? "/admin/integrations/composio/callback" : "/integrations/composio/callback";
  const callbackUrl = `${appUrl()}${callbackPath}?connector=${connector.key}&scope=${scope}&returnTo=${encodeURIComponent(safeDestination)}`;
  const session = await composio().create(connectorEntityId(ctx, scope), { manageConnections: false, toolkits: [connector.toolkit] });
  const request = await session.authorize(connector.toolkit, { callbackUrl });
  return { url: request.redirectUrl, connector: connector.key, scope };
}

export async function listExternalCalendarEvents(ctx: TenantContext, input: { connector: "google_calendar" | "microsoft_calendar"; scope?: ConnectorScope; from?: string; to?: string; limit?: number }) {
  assertConnectorRole(ctx);
  const connector = getConnector(input.connector);
  if (!connector || !connector.capabilities.includes("calendar_read")) throw new Error("Connecteur calendrier invalide.");
  const scope = input.scope ?? connector.defaultScope;
  const account = await assertConnectorConnected(ctx, connector, scope);
  const tool = resolveComposioTool(connector, "listEvents");
  if (!tool) throw new Error(`Outil calendrier non configuré pour ${connector.label}.`);
  const result = await composio().tools.execute(tool, {
    userId: connectorEntityId(ctx, scope),
    ...(account.id ? { connectedAccountId: account.id } : {}),
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
  const account = await assertConnectorConnected(ctx, connector, scope);
  const query = ensureNonEmpty(input.query, "Requête de recherche");
  const tool = resolveComposioTool(connector, "searchFiles");
  if (!tool) throw new Error(`Outil recherche document non configuré pour ${connector.label}.`);
  const limit = clamp(input.limit, 10, 1, 20);
  const result = await composio().tools.execute(tool, {
    userId: connectorEntityId(ctx, scope),
    ...(account.id ? { connectedAccountId: account.id } : {}),
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
  const account = await assertConnectorConnected(ctx, connector, scope);
  const fileId = ensureNonEmpty(input.fileId, "Identifiant du fichier");
  const tool = resolveComposioTool(connector, "getFile");
  if (!tool) throw new Error(`Outil import document non configuré pour ${connector.label}.`);
  const result = await composio().tools.execute(tool, {
    userId: connectorEntityId(ctx, scope),
    ...(account.id ? { connectedAccountId: account.id } : {}),
    arguments: { fileId, file_id: fileId, id: fileId },
  });
  await logAi({ organizationId: ctx.organizationId, userId: ctx.userId, type: "connector_document_import", input: `${connector.key}:${scope}:${fileId}`, output: redactResult(result) });
  return result;
}

export async function createExternalEmailDraft(ctx: TenantContext, input: { connector: "gmail" | "outlook"; to: string[]; subject: string; body: string; cc?: string[] }) {
  assertConnectorRole(ctx);
  const connector = getConnector(input.connector);
  if (!connector || !connector.capabilities.includes("email_draft")) throw new Error("Connecteur email invalide.");
  const account = await assertConnectorConnected(ctx, connector, "personal");
  const recipients = input.to.map((email) => email.trim()).filter(Boolean);
  if (recipients.length === 0) throw new Error("Au moins un destinataire est obligatoire pour créer un brouillon.");
  const subject = ensureNonEmpty(input.subject, "Objet du brouillon");
  const body = ensureNonEmpty(input.body, "Corps du brouillon");
  const tool = resolveComposioTool(connector, "createDraft");
  if (!tool) throw new Error(`Outil brouillon email non configuré pour ${connector.label}.`);
  const result = await composio().tools.execute(tool, {
    userId: connectorEntityId(ctx, "personal"),
    ...(account.id ? { connectedAccountId: account.id } : {}),
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

type GmailEmail = {
  messageId: string;
  threadId?: string;
  from: string;
  to?: string;
  subject: string;
  receivedAt?: string;
  snippet?: string;
  unread?: boolean;
  body?: string;
  attachments?: { filename: string; mimeType?: string; attachmentId?: string; size?: number }[];
};

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringValue(...values: unknown[]) {
  const found = values.find((value) => typeof value === "string" || typeof value === "number");
  return found == null ? "" : String(found);
}

function header(record: Record<string, unknown>, name: string) {
  const direct = record[name] ?? record[name.toLowerCase()];
  if (typeof direct === "string") return direct;
  const payload = object(record.payload);
  const headers = Array.isArray(payload.headers) ? payload.headers : Array.isArray(record.headers) ? record.headers : [];
  const match = headers.map(object).find((item) => stringValue(item.name).toLowerCase() === name.toLowerCase());
  return stringValue(match?.value);
}

function emailArray(result: unknown): unknown[] {
  const root = object(result);
  const data = object(root.data);
  const response = object(data.response_data ?? root.response_data);
  for (const value of [data.messages, response.messages, root.messages, data.items, response.items]) {
    if (Array.isArray(value)) return value;
  }
  return [];
}

function decodeBase64Url(value: string) {
  try { return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"); } catch { return ""; }
}

function stripHtml(value: string) {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function gmailPayloadContent(record: Record<string, unknown>) {
  const attachments: GmailEmail["attachments"] = [];
  const plain: string[] = [];
  const html: string[] = [];
  const visit = (value: unknown) => {
    const part = object(value);
    const body = object(part.body);
    const mimeType = stringValue(part.mimeType, part.mime_type).toLowerCase();
    const filename = stringValue(part.filename);
    const attachmentId = stringValue(body.attachmentId, body.attachment_id);
    const size = Number(body.size);
    if (filename || attachmentId) attachments.push({ filename: filename || "Pièce jointe", mimeType: mimeType || undefined, attachmentId: attachmentId || undefined, size: Number.isFinite(size) ? size : undefined });
    const encoded = stringValue(body.data);
    if (encoded) {
      const decoded = decodeBase64Url(encoded);
      if (mimeType.includes("text/plain")) plain.push(decoded);
      else if (mimeType.includes("text/html")) html.push(decoded);
    }
    if (Array.isArray(part.parts)) part.parts.forEach(visit);
  };
  visit(record.payload);
  const fallback = stringValue(record.messageText, record.message_text, record.text, record.body, record.content);
  const raw = plain.join("\n\n") || fallback || html.map(stripHtml).join("\n\n");
  return { body: (/<[a-z][\s\S]*>/i.test(raw) ? stripHtml(raw) : raw).trim().slice(0, 20_000), attachments: attachments.slice(0, 30) };
}

function normalizeGmailEmail(value: unknown): GmailEmail | null {
  const record = object(value);
  const messageId = stringValue(record.messageId, record.message_id, record.id);
  if (!messageId) return null;
  const labels = Array.isArray(record.labelIds) ? record.labelIds : Array.isArray(record.label_ids) ? record.label_ids : [];
  const receivedAtRaw = stringValue(record.receivedAt, record.received_at, record.internalDate, record.internal_date, header(record, "Date"));
  let receivedAt: string | undefined;
  if (receivedAtRaw) {
    const numeric = Number(receivedAtRaw);
    const date = Number.isFinite(numeric) ? new Date(numeric > 10_000_000_000 ? numeric : numeric * 1000) : new Date(receivedAtRaw);
    if (!Number.isNaN(date.getTime())) receivedAt = date.toISOString();
  }
  const content = gmailPayloadContent(record);
  return {
    messageId,
    threadId: stringValue(record.threadId, record.thread_id) || undefined,
    from: stringValue(record.from, record.sender, header(record, "From")),
    to: stringValue(record.to, header(record, "To")) || undefined,
    subject: stringValue(record.subject, header(record, "Subject")) || "(sans objet)",
    receivedAt,
    snippet: stringValue(record.snippet, record.preview, content.body).replace(/\s+/g, " ").trim().slice(0, 700) || undefined,
    unread: labels.map(String).includes("UNREAD") || record.unread === true,
    body: content.body || undefined,
    attachments: content.attachments?.length ? content.attachments : undefined,
  };
}

function gmailEmailSummary(email: GmailEmail) {
  return { messageId: email.messageId, threadId: email.threadId, from: email.from, to: email.to, subject: email.subject, receivedAt: email.receivedAt, snippet: email.snippet, unread: email.unread };
}

function assertProviderSuccess(result: unknown) {
  const rec = object(result);
  if (rec.successful === false || rec.success === false || rec.error) {
    throw new Error(stringValue(object(rec.error).message, rec.error, rec.message) || "Le fournisseur Gmail a refusé l’opération.");
  }
}

export async function listExternalGmailEmails(ctx: TenantContext, input: { query?: string; limit?: number }) {
  assertConnectorRole(ctx);
  const connector = getConnector("gmail");
  if (!connector?.capabilities.includes("email_read")) throw new Error("Lecture Gmail indisponible.");
  const account = await assertConnectorConnected(ctx, connector, "personal");
  const tool = resolveComposioTool(connector, "fetchEmails");
  if (!tool) throw new Error("Outil de lecture Gmail non configuré.");
  const limit = clamp(input.limit, 8, 1, 10);
  const result = await composio().tools.execute(tool, {
    userId: connectorEntityId(ctx, "personal"),
    ...(account.id ? { connectedAccountId: account.id } : {}),
    arguments: {
      user_id: "me",
      query: input.query?.trim() || "in:inbox -in:spam -in:trash",
      max_results: limit,
      include_payload: true,
      include_spam_trash: false,
      verbose: true,
    },
  });
  assertProviderSuccess(result);
  const emails = emailArray(result).map(normalizeGmailEmail).filter((email): email is GmailEmail => Boolean(email)).slice(0, limit).map(gmailEmailSummary);
  await logAi({ organizationId: ctx.organizationId, userId: ctx.userId, type: "connector_gmail_read", input: "gmail:personal", output: JSON.stringify({ count: emails.length }) });
  return { mailbox: ctx.email ?? undefined, emails };
}

export async function readExternalGmailEmail(ctx: TenantContext, input: { messageId: string }) {
  assertConnectorRole(ctx);
  const connector = getConnector("gmail");
  if (!connector?.capabilities.includes("email_read")) throw new Error("Lecture Gmail indisponible.");
  const account = await assertConnectorConnected(ctx, connector, "personal");
  const tool = resolveComposioTool(connector, "fetchMessage");
  if (!tool) throw new Error("Outil de lecture Gmail non configuré.");
  const messageId = z.string().trim().min(1).max(500).parse(input.messageId);
  const result = await composio().tools.execute(tool, {
    userId: connectorEntityId(ctx, "personal"),
    ...(account.id ? { connectedAccountId: account.id } : {}),
    arguments: { message_id: messageId, user_id: "me", format: "full" },
  });
  assertProviderSuccess(result);
  const root = object(result);
  const data = object(root.data);
  const response = object(data.response_data ?? root.response_data);
  const email = normalizeGmailEmail(response.message ?? data.message ?? response ?? data);
  if (!email) throw new Error("Email Gmail introuvable.");
  await logAi({ organizationId: ctx.organizationId, userId: ctx.userId, type: "connector_gmail_message_read", input: createHash("sha256").update(messageId).digest("hex").slice(0, 16), output: JSON.stringify({ found: true }) });
  return email;
}

const emailSchema = z.string().trim().email().max(320);

class GmailProviderRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GmailProviderRejectedError";
  }
}

export function roadmap2EmailTrackingReference(requestHash: string) {
  return `RM2-${requestHash.slice(0, 24).toUpperCase()}`;
}

export function roadmap2EmailRequestHash(input: { to: string[]; cc?: string[]; bcc?: string[]; subject: string; body: string; nodeId?: string }) {
  const normalized = {
    to: input.to.map((value) => value.trim()),
    cc: (input.cc ?? []).map((value) => value.trim()),
    bcc: (input.bcc ?? []).map((value) => value.trim()),
    subject: input.subject.trim(),
    body: input.body.trim(),
    nodeId: input.nodeId?.trim() || null,
  };
  return createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
}

export function roadmap2FinalEmailBody(input: { body: string; requestHash: string }) {
  return `${input.body.trim()}\n\n—\nRéférence de suivi Roadmap 2 : ${roadmap2EmailTrackingReference(input.requestHash)}`;
}

function providerIds(result: unknown) {
  const root = object(result);
  const data = object(root.data);
  const response = object(data.response_data ?? root.response_data);
  return {
    messageId: stringValue(response.message_id, response.messageId, response.id, data.message_id, data.id) || null,
    threadId: stringValue(response.thread_id, response.threadId, data.thread_id) || null,
  };
}

async function reconcileUncertainGmailOperation(input: {
  ctx: TenantContext;
  connector: ConnectorDefinition;
  account: { id?: string };
  operation: { id: string; requestHash: string };
  workspaceId: string;
  subject: string;
}) {
  const tool = resolveComposioTool(input.connector, "fetchEmails");
  if (!tool) return null;
  const trackingReference = roadmap2EmailTrackingReference(input.operation.requestHash);
  const result = await composio().tools.execute(tool, {
    userId: connectorEntityId(input.ctx, "personal"),
    ...(input.account.id ? { connectedAccountId: input.account.id } : {}),
    arguments: { user_id: "me", query: `in:sent "${trackingReference}" newer_than:30d`, max_results: 10, include_payload: true, include_spam_trash: false, verbose: true },
  });
  assertProviderSuccess(result);
  const found = emailArray(result)
    .map(normalizeGmailEmail)
    .find((email): email is GmailEmail => Boolean(email && email.subject === input.subject && `${email.body ?? ""}\n${email.snippet ?? ""}`.includes(trackingReference)));
  if (!found) return null;
  await prisma.roadmap2EmailOperation.update({
    where: { id: input.operation.id },
    data: { status: "succeeded", providerMessageId: found.messageId, providerThreadId: found.threadId ?? null, providerAppliedAt: new Date(), completedAt: new Date(), errorCode: null, errorMessage: null },
  });
  await prisma.roadmap2AuditLog.create({ data: { workspaceId: input.workspaceId, actorUserId: input.ctx.userId, action: "email.reconciled", entityType: "Roadmap2EmailOperation", entityId: input.operation.id } });
  return { sent: true, duplicatePrevented: true, reconciled: true, messageId: found.messageId, threadId: found.threadId ?? null };
}

export async function sendExternalGmail(ctx: TenantContext, input: { workspaceId: string; approvalId: string; nodeId?: string; to: string[]; cc?: string[]; bcc?: string[]; subject: string; body: string }) {
  assertConnectorRole(ctx);
  const connector = getConnector("gmail");
  if (!connector?.capabilities.includes("email_send")) throw new Error("Envoi Gmail indisponible.");
  const account = await assertConnectorConnected(ctx, connector, "personal");
  const to = z.array(emailSchema).min(1).max(20).parse(input.to);
  const cc = z.array(emailSchema).max(20).parse(input.cc ?? []);
  const bcc = z.array(emailSchema).max(20).parse(input.bcc ?? []);
  const subject = z.string().trim().min(1).max(998).parse(input.subject);
  const body = z.string().trim().min(1).max(100_000).parse(input.body);
  const approvalId = z.string().uuid().parse(input.approvalId);
  const nodeId = input.nodeId ? z.string().min(1).max(100).parse(input.nodeId) : undefined;
  if (nodeId) {
    const exists = await prisma.roadmap2Node.count({ where: { id: nodeId, workspaceId: input.workspaceId, archivedAt: null } });
    if (!exists) throw new Error("Nœud Roadmap 2 introuvable.");
  }
  const requestHash = roadmap2EmailRequestHash({ to, cc, bcc, subject, body, nodeId });
  const trackingReference = roadmap2EmailTrackingReference(requestHash);
  const payload = {
    recipientHashes: [...to, ...cc, ...bcc].map((email) => createHash("sha256").update(email.toLowerCase()).digest("hex")),
    subjectHash: createHash("sha256").update(subject).digest("hex"),
    bodyHash: createHash("sha256").update(body).digest("hex"),
  };
  const existing = await prisma.roadmap2EmailOperation.findFirst({
    where: {
      workspaceId: input.workspaceId,
      OR: [
        { idempotencyKey: approvalId },
        { requestHash, status: { in: ["running", "provider_succeeded", "needs_repair", "succeeded"] } },
      ],
    },
  });
  let operation = existing;
  if (existing) {
    if (existing.requestHash !== requestHash) throw new Error("Cette validation ne correspond pas au même email.");
    if (existing.status === "succeeded") return { sent: true, duplicatePrevented: true, messageId: existing.providerMessageId, threadId: existing.providerThreadId };
    if (["running", "provider_succeeded", "needs_repair"].includes(existing.status)) {
      const reconciled = await reconcileUncertainGmailOperation({ ctx, connector, account, operation: existing, workspaceId: input.workspaceId, subject });
      if (reconciled) return reconciled;
      throw new Error(`Envoi suspendu pour éviter un doublon. Gmail ne confirme pas encore l’état de la référence ${trackingReference}. Vérifiez les messages envoyés avant toute nouvelle tentative.`);
    }
    if (existing.status === "failed" && existing.errorCode === "GMAIL_SEND_REJECTED") {
      const claimed = await prisma.roadmap2EmailOperation.updateMany({
        where: { id: existing.id, status: "failed", errorCode: "GMAIL_SEND_REJECTED" },
        data: { status: "running", idempotencyKey: approvalId, attemptCount: { increment: 1 }, errorCode: null, errorMessage: null, completedAt: null },
      });
      if (claimed.count !== 1) throw new Error("Cet envoi est déjà en cours de reprise.");
      operation = { ...existing, status: "running", idempotencyKey: approvalId, errorCode: null, errorMessage: null, completedAt: null, attemptCount: existing.attemptCount + 1 };
    } else {
      throw new Error("Cet envoi ne peut pas être relancé automatiquement. Son état durable doit d’abord être résolu.");
    }
  }
  operation ??= await prisma.roadmap2EmailOperation.create({ data: { workspaceId: input.workspaceId, nodeId, actorUserId: ctx.userId, idempotencyKey: approvalId, requestHash, payload } });
  try {
    const tool = resolveComposioTool(connector, "sendEmail");
    if (!tool) throw new Error("Outil d’envoi Gmail non configuré.");
    const result = await composio().tools.execute(tool, {
      userId: connectorEntityId(ctx, "personal"),
      ...(account.id ? { connectedAccountId: account.id } : {}),
      arguments: { user_id: "me", recipient_email: to[0], extra_recipients: to.slice(1), cc, bcc, subject, body: roadmap2FinalEmailBody({ body, requestHash }), is_html: false },
    });
    const providerRecord = object(result);
    if (providerRecord.successful === false || providerRecord.success === false || providerRecord.error) {
      throw new GmailProviderRejectedError(stringValue(object(providerRecord.error).message, providerRecord.error, providerRecord.message) || "Le fournisseur Gmail a refusé l’opération.");
    }
    const ids = providerIds(result);
    await prisma.roadmap2EmailOperation.update({
      where: { id: operation.id },
      data: { status: "succeeded", providerMessageId: ids.messageId, providerThreadId: ids.threadId, providerAppliedAt: new Date(), completedAt: new Date() },
    });
    await prisma.roadmap2AuditLog.create({ data: { workspaceId: input.workspaceId, actorUserId: ctx.userId, action: "email.sent", entityType: "Roadmap2EmailOperation", entityId: operation.id } });
    await logAi({ organizationId: ctx.organizationId, userId: ctx.userId, type: "connector_gmail_send", input: "gmail:personal", output: JSON.stringify({ sent: true, operationId: operation.id }) });
    return { sent: true, duplicatePrevented: false, messageId: ids.messageId, threadId: ids.threadId };
  } catch (error) {
    if (error instanceof GmailProviderRejectedError) {
      await prisma.roadmap2EmailOperation.update({ where: { id: operation.id }, data: { status: "failed", errorCode: "GMAIL_SEND_REJECTED", errorMessage: error.message, completedAt: new Date() } });
    } else {
      await prisma.roadmap2EmailOperation.update({ where: { id: operation.id }, data: { status: "needs_repair", errorCode: "GMAIL_SEND_UNCERTAIN", errorMessage: `État fournisseur incertain. Rechercher ${trackingReference} dans les messages envoyés avant toute nouvelle tentative.` } });
    }
    throw error;
  }
}
