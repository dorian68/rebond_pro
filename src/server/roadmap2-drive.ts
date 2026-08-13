import { Composio } from "@composio/core";
import { createHash } from "node:crypto";
import { z } from "zod";
import { ROADMAP2_TRACKING_DOC_TEMPLATE, type Roadmap2Category } from "@/lib/roadmap2";
import {
  ROADMAP2_DRIVE_CONNECTION_STATUSES,
  type Roadmap2DriveAccountIdentity,
  type Roadmap2DriveConnectionStatus,
} from "@/lib/roadmap2-drive-status";

const DRIVE_TOOLKIT = "googledrive";
const FOLDER_MIME = "application/vnd.google-apps.folder";
const DOC_MIME = "application/vnd.google-apps.document";
const GOOGLE_WORKSPACE_PREVIEW_TYPES = new Set([
  DOC_MIME,
  "application/vnd.google-apps.spreadsheet",
  "application/vnd.google-apps.presentation",
  "application/vnd.google-apps.drawing",
]);
const FILE_ID = /^[A-Za-z0-9_-]{3,200}$/;

export const ROADMAP2_DRIVE_MAX_FILE_BYTES = 10 * 1024 * 1024;
export const ROADMAP2_DRIVE_ALLOWED_FILE_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/csv",
  "text/plain",
]);
const ROADMAP2_DRIVE_ALLOWED_EXTENSIONS: Record<string, ReadonlySet<string>> = {
  "application/pdf": new Set(["pdf"]),
  "application/msword": new Set(["doc"]),
  "application/vnd.ms-excel": new Set(["xls"]),
  "application/vnd.ms-powerpoint": new Set(["ppt"]),
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": new Set(["docx"]),
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": new Set(["xlsx"]),
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": new Set(["pptx"]),
  "image/jpeg": new Set(["jpg", "jpeg"]),
  "image/png": new Set(["png"]),
  "image/webp": new Set(["webp"]),
  "text/csv": new Set(["csv"]),
  "text/plain": new Set(["txt"]),
};

const TOOLS = {
  createFile: "GOOGLEDRIVE_CREATE_FILE",
  createFolder: "GOOGLEDRIVE_CREATE_FOLDER",
  createPermission: "GOOGLEDRIVE_CREATE_PERMISSION",
  updatePermission: "GOOGLEDRIVE_UPDATE_PERMISSION",
  about: "GOOGLEDRIVE_GET_ABOUT",
  findFile: "GOOGLEDRIVE_FIND_FILE",
  metadata: "GOOGLEDRIVE_GET_FILE_METADATA",
  moveFile: "GOOGLEDRIVE_MOVE_FILE",
  renameFile: "GOOGLEDRIVE_UPDATE_FILE_METADATA_PATCH",
  downloadFile: "GOOGLEDRIVE_DOWNLOAD_FILE",
} as const;

const ROADMAP2_DRIVE_TOOLKIT_VERSION = process.env.COMPOSIO_TOOLKIT_VERSION_GOOGLEDRIVE || "20260811_00";

/** Arborescence documentaire de référence. Elle reste additive et n'efface jamais l'existant. */
export const ROADMAP2_DRIVE_STRUCTURE = [
  { name: "00_ROADMAP", children: ["Roadmap_Le_Bon_Rebond", "00_Suivi_Global"] },
  { name: "01_Strategie_Gouvernance" },
  { name: "02_Juridique_Association_Optiquant" },
  { name: "03_Offres_Produits", children: ["EmploiTon", "Diagnostic_Rebond", "Rebond_Securise_90"] },
  { name: "04_Financements_FSE" },
  { name: "05_Acheteurs_Publics" },
  { name: "06_Partenaires", children: ["Entreprises", "CFA", "SIAE_GEIQ", "Prescripteurs"] },
  { name: "07_Pilote_EmploiTon" },
  { name: "08_Technologie_Data" },
  { name: "09_Communication_Decks" },
  { name: "10_Archives" },
] as const;

const CATEGORY_FOLDER: Record<Roadmap2Category, string> = {
  strategy_governance: "01_Strategie_Gouvernance",
  operations_compliance: "02_Juridique_Association_Optiquant",
  product_pedagogy: "03_Offres_Produits",
  buyers_funding: "04_Financements_FSE",
  partners_market: "06_Partenaires",
  pilot_execution: "07_Pilote_EmploiTon",
  technology_data: "08_Technologie_Data",
};

export type Roadmap2DriveNodeContext = {
  id: string;
  title: string;
  type: "phase" | "milestone" | "initiative" | "action" | "decision";
  category: Roadmap2Category;
  status: string;
  parentId: string | null;
  driveFolderUrl: string | null;
  trackingDocUrl?: string | null;
  isWorkspaceRoot: boolean;
};

export type Roadmap2DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  url: string;
  isFolder: boolean;
  modifiedAt: string | null;
  size: string | null;
};

export type Roadmap2DriveStatus = {
  enabled: boolean;
  connected: boolean;
  status: Roadmap2DriveConnectionStatus;
  account: Roadmap2DriveAccountIdentity | null;
};

export type Roadmap2DriveLayoutPreview = {
  inSync: boolean;
  currentPath: string;
  expectedPath: string;
  willMove: boolean;
  willRename: boolean;
  managed: boolean;
  warning: string | null;
};

export type Roadmap2DrivePreviewPayload = {
  bytes: Uint8Array;
  contentType: "application/pdf" | "image/jpeg" | "image/png" | "image/webp" | "text/plain" | "text/csv";
  fileName: string;
};

type DriveRecord = Record<string, unknown>;

export type Roadmap2DriveDriver = {
  enabled(): boolean;
  status(entityId: string): Promise<Omit<Roadmap2DriveStatus, "enabled">>;
  authLink(entityId: string, callbackUrl: string): Promise<string>;
  execute(entityId: string, tool: string, args: Record<string, unknown>): Promise<unknown>;
  uploadText(name: string, content: string): Promise<{ name: string; mimetype: string; s3key: string }>;
  uploadFile(file: File): Promise<{ name: string; mimetype: string; s3key: string }>;
};

export class Roadmap2DriveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "Roadmap2DriveError";
  }
}

export class Roadmap2DriveValidationError extends Roadmap2DriveError {
  constructor(message: string) {
    super(message);
    this.name = "Roadmap2DriveValidationError";
  }
}

export class Roadmap2DriveAuthRequiredError extends Roadmap2DriveError {
  constructor() {
    super("Connectez Google Drive à cette roadmap avant de continuer.");
    this.name = "Roadmap2DriveAuthRequiredError";
  }
}

let client: Composio | null = null;
const activeComposioConnections = new Map<string, string>();

function composio() {
  if (!process.env.COMPOSIO_API_KEY) throw new Roadmap2DriveError("L’intégration Google Drive n’est pas configurée sur le serveur.");
  if (!client) client = new Composio({ apiKey: process.env.COMPOSIO_API_KEY, toolkitVersions: { [DRIVE_TOOLKIT]: ROADMAP2_DRIVE_TOOLKIT_VERSION } });
  return client;
}

function parseConnectedAccounts(accounts: unknown) {
  if (Array.isArray((accounts as { items?: unknown[] })?.items)) return (accounts as { items: unknown[] }).items;
  return Array.isArray(accounts) ? accounts : [];
}

type ConnectedAccountRecord = {
  id?: string;
  alias?: string | null;
  status?: string;
  updatedAt?: string;
  updated_at?: string;
  toolkit?: { slug?: string };
};

const CONNECTION_STATUS_PRIORITY: Record<Roadmap2DriveConnectionStatus, number> = {
  ACTIVE: 100,
  INITIATED: 90,
  INITIALIZING: 80,
  EXPIRED: 70,
  REVOKED: 60,
  FAILED: 50,
  INACTIVE: 40,
  UNKNOWN: 30,
  NOT_CONNECTED: 20,
  DISABLED: 10,
};

function normalizeConnectionStatus(value: unknown): Roadmap2DriveConnectionStatus {
  return typeof value === "string" && (ROADMAP2_DRIVE_CONNECTION_STATUSES as readonly string[]).includes(value)
    ? value as Roadmap2DriveConnectionStatus
    : "UNKNOWN";
}

export function selectRoadmap2DriveConnection(accounts: unknown): { accountId: string | null; connected: boolean; status: Roadmap2DriveConnectionStatus; alias: string | null } {
  const candidates = parseConnectedAccounts(accounts)
    .map((item) => item as ConnectedAccountRecord)
    .filter((item) => item.toolkit?.slug === DRIVE_TOOLKIT)
    .sort((left, right) => {
      const priority = CONNECTION_STATUS_PRIORITY[normalizeConnectionStatus(right.status)] - CONNECTION_STATUS_PRIORITY[normalizeConnectionStatus(left.status)];
      if (priority !== 0) return priority;
      return Date.parse(right.updatedAt ?? right.updated_at ?? "") - Date.parse(left.updatedAt ?? left.updated_at ?? "");
    });
  const account = candidates[0];
  if (!account) return { accountId: null, connected: false, status: "NOT_CONNECTED", alias: null };
  const status = normalizeConnectionStatus(account.status);
  const accountId = typeof account.id === "string" && account.id.trim() ? account.id : null;
  if (status === "ACTIVE" && !accountId) return { accountId: null, connected: false, status: "UNKNOWN", alias: null };
  return {
    accountId,
    connected: status === "ACTIVE",
    status,
    alias: typeof account.alias === "string" && account.alias.trim() ? account.alias.trim() : null,
  };
}

const composioDriver: Roadmap2DriveDriver = {
  enabled: () => Boolean(process.env.COMPOSIO_API_KEY),
  async status(entityId) {
    if (!process.env.COMPOSIO_API_KEY) return { connected: false, status: "DISABLED", account: null };
    activeComposioConnections.delete(entityId);
    const accounts = await composio().connectedAccounts.list({ userIds: [entityId] });
    const selected = selectRoadmap2DriveConnection(accounts);
    if (selected.connected && selected.accountId) activeComposioConnections.set(entityId, selected.accountId);
    else activeComposioConnections.delete(entityId);
    let account: Roadmap2DriveAccountIdentity | null = selected.accountId || selected.alias
      ? { displayName: null, emailAddress: null, alias: selected.alias, verified: false }
      : null;
    if (selected.connected && selected.accountId) {
      try {
        const about = unwrapRoadmap2DriveResult(await composio().tools.execute(TOOLS.about, {
          userId: entityId,
          connectedAccountId: selected.accountId,
          arguments: { fields: "user(displayName,emailAddress)" },
        }));
        const user = record(about.user);
        const emailAddress = optionalString(user?.emailAddress);
        account = {
          displayName: optionalString(user?.displayName),
          emailAddress,
          alias: selected.alias,
          verified: Boolean(emailAddress),
        };
      } catch {
        // L'état OAuth reste exploitable, mais l'UI signale que l'identité
        // n'a pas encore été confirmée par Google Drive.
      }
    }
    return { connected: selected.connected, status: selected.status, account };
  },
  async authLink(entityId, callbackUrl) {
    const session = await composio().create(entityId, { manageConnections: false, toolkits: [DRIVE_TOOLKIT] });
    const request = await session.authorize(DRIVE_TOOLKIT, { callbackUrl });
    if (!request.redirectUrl) throw new Roadmap2DriveError("Le fournisseur OAuth n’a pas retourné de lien d’autorisation.");
    return request.redirectUrl;
  },
  execute: (entityId, tool, args) => {
    const connectedAccountId = activeComposioConnections.get(entityId);
    return composio().tools.execute(tool, { userId: entityId, ...(connectedAccountId ? { connectedAccountId } : {}), arguments: args });
  },
  async uploadText(name, content) {
    const file = new File([content], `${name}.txt`, { type: "text/plain;charset=utf-8" });
    return composio().files.upload({ file, toolSlug: TOOLS.createFile, toolkitSlug: DRIVE_TOOLKIT });
  },
  uploadFile: (file) => composio().files.upload({ file, toolSlug: TOOLS.createFile, toolkitSlug: DRIVE_TOOLKIT }),
};

function record(value: unknown): DriveRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as DriveRecord : null;
}

export function unwrapRoadmap2DriveResult(result: unknown): DriveRecord {
  let current = record(result);
  if (!current) throw new Roadmap2DriveError("Réponse Google Drive invalide.");
  for (let depth = 0; depth < 3; depth += 1) {
    if (current.successful === false) throw new Roadmap2DriveError("Google Drive a refusé l’opération.");
    const error = typeof current.error === "string" ? current.error.trim() : "";
    if (error) throw new Roadmap2DriveError("Google Drive a refusé l’opération.");
    const nested = record(current.data);
    if (!nested) return current;
    current = nested;
  }
  return current;
}

function requireFileId(value: unknown, label = "Identifiant Drive") {
  if (typeof value !== "string" || !FILE_ID.test(value)) throw new Roadmap2DriveError(`${label} invalide.`);
  return value;
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function extractRoadmap2DriveFolderId(url: string | null | undefined) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.hostname.toLowerCase() !== "drive.google.com") return null;
    const match = parsed.pathname.match(/\/folders\/([A-Za-z0-9_-]{3,200})/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function extractRoadmap2DriveFileId(url: string | null | undefined) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return null;
    const host = parsed.hostname.toLowerCase();
    if (host === "drive.google.com") return parsed.pathname.match(/\/file\/d\/([A-Za-z0-9_-]{3,200})/)?.[1] ?? null;
    if (host !== "docs.google.com") return null;
    return parsed.pathname.match(/^\/(?:document|spreadsheets|presentation|drawings)\/d\/([A-Za-z0-9_-]{3,200})(?:\/|$)/)?.[1] ?? null;
  } catch {
    return null;
  }
}

function entityId(workspaceId: string) {
  return `lbr_roadmap2_${workspaceId}`;
}

function folderUrl(id: string) {
  return `https://drive.google.com/drive/folders/${id}`;
}

function fileUrl(id: string, mimeType: string) {
  if (mimeType === DOC_MIME) return `https://docs.google.com/document/d/${id}/edit`;
  if (mimeType === FOLDER_MIME) return folderUrl(id);
  return `https://drive.google.com/file/d/${id}/view`;
}

function escapedDriveQuery(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function safeResourceName(value: string) {
  return value.replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 120) || "Sans titre";
}

function validatedUpload(file: File) {
  if (file.size <= 0) throw new Roadmap2DriveValidationError("Le fichier sélectionné est vide.");
  if (file.size > ROADMAP2_DRIVE_MAX_FILE_BYTES) throw new Roadmap2DriveValidationError("Fichier trop volumineux (10 Mo maximum).");
  const mimeType = file.type.toLowerCase().split(";", 1)[0] || "";
  if (!ROADMAP2_DRIVE_ALLOWED_FILE_TYPES.has(mimeType)) {
    throw new Roadmap2DriveValidationError("Format non pris en charge. Utilisez PDF, Word, Excel, PowerPoint, CSV, TXT, JPG, PNG ou WEBP.");
  }
  const extension = file.name.toLowerCase().match(/\.([a-z0-9]{1,8})$/)?.[1] ?? "";
  if (!ROADMAP2_DRIVE_ALLOWED_EXTENSIONS[mimeType]?.has(extension)) {
    throw new Roadmap2DriveValidationError("L’extension du fichier ne correspond pas à son format.");
  }
  return { name: safeResourceName(file.name), mimeType };
}

function parseFiles(data: DriveRecord): Roadmap2DriveFile[] {
  const rows = Array.isArray(data.files) ? data.files : Array.isArray(data.items) ? data.items : [];
  return rows.flatMap((row) => {
    const item = record(row);
    if (!item) return [];
    const id = typeof item.id === "string" && FILE_ID.test(item.id) ? item.id : null;
    const name = optionalString(item.name) ?? optionalString(item.title);
    const mimeType = optionalString(item.mimeType) ?? "application/octet-stream";
    if (!id || !name) return [];
    const candidateUrl = optionalString(item.webViewLink) ?? optionalString(item.display_url);
    let url = fileUrl(id, mimeType);
    if (candidateUrl) {
      try {
        const parsed = new URL(candidateUrl);
        if (parsed.protocol === "https:" && ["drive.google.com", "docs.google.com"].includes(parsed.hostname.toLowerCase())) url = parsed.toString();
      } catch {
        // L'URL calculée reste la valeur sûre.
      }
    }
    return [{ id, name, mimeType, url, isFolder: mimeType === FOLDER_MIME, modifiedAt: optionalString(item.modifiedTime), size: optionalString(item.size) }];
  });
}

async function ensureConnected(driver: Roadmap2DriveDriver, workspaceId: string) {
  if (!driver.enabled()) throw new Roadmap2DriveError("L’intégration Google Drive n’est pas configurée sur le serveur.");
  const status = await driver.status(entityId(workspaceId));
  if (!status.connected) throw new Roadmap2DriveAuthRequiredError();
}

async function metadata(driver: Roadmap2DriveDriver, workspaceId: string, fileId: string, fields = "id,name,mimeType,parents,trashed,webViewLink,modifiedTime,size") {
  const data = unwrapRoadmap2DriveResult(await driver.execute(entityId(workspaceId), TOOLS.metadata, { fileId: requireFileId(fileId), fields, supportsAllDrives: true }));
  return data;
}

async function findChild(driver: Roadmap2DriveDriver, workspaceId: string, parentId: string, name: string, mimeType?: string) {
  const conditions = [`name = '${escapedDriveQuery(name)}'`, "trashed = false"];
  if (mimeType) conditions.push(`mimeType = '${mimeType}'`);
  const result = unwrapRoadmap2DriveResult(await driver.execute(entityId(workspaceId), TOOLS.findFile, {
    folder_id: requireFileId(parentId, "Dossier parent"),
    q: conditions.join(" and "),
    pageSize: 10,
    fields: "files(id,name,mimeType,webViewLink,modifiedTime,size,parents,trashed)",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  }));
  return parseFiles(result).find((file) => file.name === name && (!mimeType || file.mimeType === mimeType)) ?? null;
}

async function createFolder(driver: Roadmap2DriveDriver, workspaceId: string, name: string, parentId?: string) {
  const data = unwrapRoadmap2DriveResult(await driver.execute(entityId(workspaceId), TOOLS.createFolder, { name: safeResourceName(name), ...(parentId ? { parent_id: requireFileId(parentId) } : {}) }));
  const id = requireFileId(data.id, "Identifiant du dossier créé");
  return { id, url: optionalString(data.display_url) ?? optionalString(data.webViewLink) ?? folderUrl(id) };
}

async function findOrCreateFolder(driver: Roadmap2DriveDriver, workspaceId: string, parentId: string, name: string) {
  const safeName = safeResourceName(name);
  const existing = await findChild(driver, workspaceId, parentId, safeName, FOLDER_MIME);
  if (existing) return { id: existing.id, created: false };
  const created = await createFolder(driver, workspaceId, safeName, parentId);
  return { id: created.id, created: true };
}

function nodeFolderName(title: string, nodeId: string, type: Roadmap2DriveNodeContext["type"] = "initiative", isWorkspaceRoot = false) {
  const marker = nodeFolderMarker(nodeId);
  const prefix = isWorkspaceRoot ? "ROADMAP" : type === "phase" ? "PHASE" : type === "milestone" ? "JALON" : type === "decision" ? "DÉCISION" : type === "action" ? "ACTION" : "PROJET";
  const titleLimit = Math.max(24, 120 - marker.length - prefix.length - 6);
  return `${prefix} — ${safeResourceName(title).slice(0, titleLimit)} · ${marker}`;
}

function isManagedNodeFolderName(name: unknown, nodeId: string) {
  return typeof name === "string" && name.endsWith(nodeFolderMarker(nodeId));
}

function nodeFolderMarker(nodeId: string) {
  return `[RM2-${createHash("sha256").update(requireFileId(nodeId, "Nœud")).digest("hex").slice(0, 10)}]`;
}

function operationMarker(operationId: string) {
  if (!/^[A-Za-z0-9_-]{3,200}$/.test(operationId)) throw new Roadmap2DriveValidationError("Identifiant d’opération Drive invalide.");
  return `RM2OP${createHash("sha256").update(operationId).digest("hex").slice(0, 20)}`;
}

function rootFolderName(workspaceName: string, workspaceId: string) {
  const marker = `[RM2-ROOT-${createHash("sha256").update(workspaceId).digest("hex").slice(0, 10)}]`;
  return safeResourceName(`${workspaceName} — Roadmap 2 ${marker}`);
}

async function findOrCreateNodeFolder(driver: Roadmap2DriveDriver, workspaceId: string, parentId: string, nodeId: string, title: string, type: Roadmap2DriveNodeContext["type"] = "initiative", isWorkspaceRoot = false) {
  const marker = nodeFolderMarker(nodeId);
  const result = unwrapRoadmap2DriveResult(await driver.execute(entityId(workspaceId), TOOLS.findFile, {
    folder_id: requireFileId(parentId, "Dossier de catégorie"),
    q: `name contains '${escapedDriveQuery(marker)}' and mimeType = '${FOLDER_MIME}' and trashed = false`,
    pageSize: 10,
    fields: "files(id,name,mimeType,webViewLink,modifiedTime,size,parents,trashed)",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  }));
  const existing = parseFiles(result).find((file) => file.isFolder && file.name.endsWith(marker));
  if (existing) return { id: existing.id, created: false };
  const created = await createFolder(driver, workspaceId, nodeFolderName(title, nodeId, type, isWorkspaceRoot), parentId);
  return { id: created.id, created: true };
}

async function assertWithinRoot(driver: Roadmap2DriveDriver, workspaceId: string, rootId: string, candidateId: string) {
  if (candidateId === rootId) return;
  const pending = [candidateId];
  const visited = new Set<string>();
  while (pending.length && visited.size < 80) {
    const current = pending.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    const item = await metadata(driver, workspaceId, current, "id,parents,mimeType,trashed");
    const parents = Array.isArray(item.parents) ? item.parents.filter((value): value is string => typeof value === "string" && FILE_ID.test(value)) : [];
    if (parents.includes(rootId)) return;
    pending.push(...parents.filter((parent) => !visited.has(parent)));
  }
  throw new Roadmap2DriveError("Ce dossier n’appartient pas à la roadmap sélectionnée.");
}

function nodeContextMap(nodes: Roadmap2DriveNodeContext[]) {
  return new Map(nodes.map((node) => [node.id, node]));
}

function nodeAncestors(node: Roadmap2DriveNodeContext, nodes: Map<string, Roadmap2DriveNodeContext>) {
  const result: Roadmap2DriveNodeContext[] = [];
  const visited = new Set([node.id]);
  let parentId = node.parentId;
  while (parentId) {
    if (visited.has(parentId)) throw new Roadmap2DriveError("La hiérarchie de la roadmap contient une boucle.");
    visited.add(parentId);
    const parent = nodes.get(parentId);
    if (!parent) break;
    result.unshift(parent);
    parentId = parent.parentId;
  }
  return result;
}

async function ensureCanonicalNodeParent(driver: Roadmap2DriveDriver, workspaceId: string, rootId: string, node: Roadmap2DriveNodeContext, allNodes: Roadmap2DriveNodeContext[]) {
  if (node.status === "archived") {
    const archives = await findOrCreateFolder(driver, workspaceId, rootId, "10_Archives");
    return findOrCreateFolder(driver, workspaceId, archives.id, CATEGORY_FOLDER[node.category]);
  }
  if (node.isWorkspaceRoot) return findOrCreateFolder(driver, workspaceId, rootId, "00_ROADMAP");
  const map = nodeContextMap(allNodes);
  const ancestors = nodeAncestors(node, map);
  const parent = node.parentId ? map.get(node.parentId) : null;
  if (!parent || parent.isWorkspaceRoot) return findOrCreateFolder(driver, workspaceId, rootId, CATEGORY_FOLDER[node.category]);

  let parentFolderId = (await findOrCreateFolder(driver, workspaceId, rootId, CATEGORY_FOLDER[node.category])).id;
  for (const ancestor of ancestors.filter((candidate) => !candidate.isWorkspaceRoot)) {
    const existingId = extractRoadmap2DriveFolderId(ancestor.driveFolderUrl);
    if (existingId) {
      await assertWithinRoot(driver, workspaceId, rootId, existingId);
      const existing = await metadata(driver, workspaceId, existingId, "id,name,mimeType,parents,trashed");
      if (existing.mimeType === FOLDER_MIME && existing.trashed !== true) {
        const expectedName = nodeFolderName(ancestor.title, ancestor.id, ancestor.type, ancestor.isWorkspaceRoot);
        const existingParents = Array.isArray(existing.parents) ? existing.parents.filter((value): value is string => typeof value === "string" && FILE_ID.test(value)) : [];
        if (!isManagedNodeFolderName(existing.name, ancestor.id) || existing.name !== expectedName || existingParents.length !== 1 || !existingParents.includes(parentFolderId)) {
          throw new Roadmap2DriveValidationError(`Réorganisez d’abord le dossier parent « ${ancestor.title} » dans Roadmap 2.`);
        }
        parentFolderId = existingId;
        continue;
      }
    }
    parentFolderId = (await findOrCreateNodeFolder(driver, workspaceId, parentFolderId, ancestor.id, ancestor.title, ancestor.type, ancestor.isWorkspaceRoot)).id;
  }
  return { id: parentFolderId, created: false };
}

function safePathLabel(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "Dossier Drive";
}

function canonicalPathSegments(node: Roadmap2DriveNodeContext, allNodes: Roadmap2DriveNodeContext[]) {
  if (node.status === "archived") return ["10_Archives", CATEGORY_FOLDER[node.category], nodeFolderName(node.title, node.id, node.type, node.isWorkspaceRoot)];
  if (node.isWorkspaceRoot) return ["00_ROADMAP", nodeFolderName(node.title, node.id, node.type, true)];
  const map = nodeContextMap(allNodes);
  const ancestors = nodeAncestors(node, map).filter((candidate) => !candidate.isWorkspaceRoot);
  return [CATEGORY_FOLDER[node.category], ...ancestors.map((candidate) => nodeFolderName(candidate.title, candidate.id, candidate.type, candidate.isWorkspaceRoot)), nodeFolderName(node.title, node.id, node.type, node.isWorkspaceRoot)];
}

async function resolveExistingCanonicalParent(driver: Roadmap2DriveDriver, workspaceId: string, rootId: string, node: Roadmap2DriveNodeContext, allNodes: Roadmap2DriveNodeContext[]) {
  const segments = canonicalPathSegments(node, allNodes).slice(0, -1);
  let currentId = rootId;
  for (const segment of segments) {
    const existing = await findChild(driver, workspaceId, currentId, segment, FOLDER_MIME);
    if (!existing) return null;
    currentId = existing.id;
  }
  return currentId;
}

async function describeCanonicalLayout(driver: Roadmap2DriveDriver, workspaceId: string, rootId: string, node: Roadmap2DriveNodeContext, allNodes: Roadmap2DriveNodeContext[]): Promise<Roadmap2DriveLayoutPreview> {
  const expectedParentId = await resolveExistingCanonicalParent(driver, workspaceId, rootId, node, allNodes);
  const expectedName = nodeFolderName(node.title, node.id, node.type, node.isWorkspaceRoot);
  const expectedPath = canonicalPathSegments(node, allNodes).join(" / ");
  const folderId = extractRoadmap2DriveFolderId(node.driveFolderUrl);
  if (!folderId) {
    return { inSync: false, currentPath: "Aucun dossier associé", expectedPath, willMove: false, willRename: false, managed: true, warning: null };
  }
  await assertWithinRoot(driver, workspaceId, rootId, folderId);
  const current = await metadata(driver, workspaceId, folderId, "id,name,mimeType,parents,trashed");
  if (current.mimeType !== FOLDER_MIME || current.trashed === true) throw new Roadmap2DriveError("Le dossier Drive associé au nœud n’est plus accessible.");
  const parents = Array.isArray(current.parents) ? current.parents.filter((value): value is string => typeof value === "string" && FILE_ID.test(value)) : [];
  const currentParent = parents[0] ? await metadata(driver, workspaceId, parents[0], "id,name,mimeType,trashed") : null;
  const managed = isManagedNodeFolderName(current.name, node.id);
  const willMove = expectedParentId === null || !parents.includes(expectedParentId) || parents.length !== 1;
  const willRename = current.name !== expectedName;
  return {
    inSync: !willMove && !willRename,
    currentPath: `${safePathLabel(currentParent?.name)} / ${safePathLabel(current.name)}`,
    expectedPath,
    willMove,
    willRename,
    managed,
    warning: managed ? null : "Ce dossier a été lié manuellement. Roadmap 2 ne le déplacera et ne le renommera qu’après votre confirmation explicite.",
  };
}

export type Roadmap2DrivePreviewFetcher = (input: { url: string; declaredType: string; declaredName: string }) => Promise<Roadmap2DrivePreviewPayload>;

async function fetchBoundedPreviewFile({ url: s3url, declaredType, declaredName }: Parameters<Roadmap2DrivePreviewFetcher>[0]): Promise<Roadmap2DrivePreviewPayload> {
  const parsed = new URL(s3url);
  if (parsed.protocol !== "https:" || !/(^|\.)(composio\.dev|amazonaws\.com|amazonaws\.com\.cn|blob\.core\.windows\.net)$/.test(parsed.hostname.toLowerCase())) {
    throw new Roadmap2DriveError("Le fournisseur a retourné un fichier temporaire invalide.");
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(parsed, { redirect: "error", cache: "no-store", signal: controller.signal });
    if (!response.ok || !response.body) throw new Roadmap2DriveError("Le fichier ne peut pas être prévisualisé pour le moment.");
    const announced = Number(response.headers.get("content-length") ?? 0);
    if (announced > ROADMAP2_DRIVE_MAX_FILE_BYTES) throw new Roadmap2DriveValidationError("Aperçu limité à 10 Mo.");
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > ROADMAP2_DRIVE_MAX_FILE_BYTES) { await reader.cancel(); throw new Roadmap2DriveValidationError("Aperçu limité à 10 Mo."); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const allowed = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "text/plain", "text/csv"]);
    const contentType = (allowed.has(declaredType) ? declaredType : "application/pdf") as Roadmap2DrivePreviewPayload["contentType"];
    return { bytes, contentType, fileName: safeResourceName(declaredName) };
  } finally {
    clearTimeout(timer);
  }
}

export function createRoadmap2DriveAutomation(driver: Roadmap2DriveDriver = composioDriver, previewFetcher: Roadmap2DrivePreviewFetcher = fetchBoundedPreviewFile) {
  return {
    async status(workspaceId: string): Promise<Roadmap2DriveStatus> {
      if (!driver.enabled()) return { enabled: false, connected: false, status: "DISABLED", account: null };
      const status = await driver.status(entityId(workspaceId));
      return { enabled: true, ...status };
    },

    async authLink(workspaceId: string, workspaceKey: string) {
      if (!driver.enabled()) throw new Roadmap2DriveError("L’intégration Google Drive n’est pas configurée sur le serveur.");
      const base = (process.env.APP_PUBLIC_URL || process.env.AUTH_URL || "http://localhost:3000").replace(/\/$/, "");
      const callback = `${base}/admin/roadmap-2/google-drive/callback?roadmap=${encodeURIComponent(workspaceKey)}`;
      const url = new URL(await driver.authLink(entityId(workspaceId), callback));
      if (url.protocol !== "https:" || !/(^|\.)(composio\.dev|composio\.ai|google\.com)$/.test(url.hostname.toLowerCase())) throw new Roadmap2DriveError("Lien d’autorisation Google invalide.");
      return url.toString();
    },

    async provisionWorkspace(input: { workspaceId: string; workspaceName: string; rootDriveUrl: string | null; operationId?: string }) {
      await ensureConnected(driver, input.workspaceId);
      let rootId = extractRoadmap2DriveFolderId(input.rootDriveUrl);
      let rootCreated = false;
      if (rootId) {
        const root = await metadata(driver, input.workspaceId, rootId, "id,name,mimeType,trashed,webViewLink");
        if (root.mimeType !== FOLDER_MIME || root.trashed === true) throw new Roadmap2DriveError("Le dossier Drive racine n’est plus accessible.");
      } else {
        const stableName = rootFolderName(input.workspaceName, input.workspaceId);
        const existingRoot = await findChild(driver, input.workspaceId, "root", stableName, FOLDER_MIME);
        if (existingRoot) {
          rootId = existingRoot.id;
        } else {
          const root = await createFolder(driver, input.workspaceId, stableName);
          rootId = root.id;
          rootCreated = true;
        }
      }
      let foldersCreated = 0;
      for (const entry of ROADMAP2_DRIVE_STRUCTURE) {
        const folder = await findOrCreateFolder(driver, input.workspaceId, rootId, entry.name);
        if (folder.created) foldersCreated += 1;
        for (const childName of "children" in entry ? entry.children : []) {
          const child = await findOrCreateFolder(driver, input.workspaceId, folder.id, childName);
          if (child.created) foldersCreated += 1;
        }
      }
      return { rootDriveUrl: folderUrl(rootId), rootId, rootCreated, foldersCreated };
    },

    async listFiles(input: { workspaceId: string; rootDriveUrl: string | null; folderId?: string }) {
      await ensureConnected(driver, input.workspaceId);
      const rootId = extractRoadmap2DriveFolderId(input.rootDriveUrl);
      if (!rootId) throw new Roadmap2DriveError("Configurez ou créez d’abord le dossier Drive racine.");
      const folderId = input.folderId ? requireFileId(input.folderId, "Dossier à afficher") : rootId;
      await assertWithinRoot(driver, input.workspaceId, rootId, folderId);
      const current = await metadata(driver, input.workspaceId, folderId, "id,name,mimeType,parents,trashed,webViewLink");
      if (current.mimeType !== FOLDER_MIME || current.trashed === true) throw new Roadmap2DriveError("Ce dossier Drive n’est plus disponible.");
      const result = unwrapRoadmap2DriveResult(await driver.execute(entityId(input.workspaceId), TOOLS.findFile, {
        folder_id: folderId,
        q: "trashed = false",
        pageSize: 100,
        orderBy: "folder,name_natural",
        fields: "files(id,name,mimeType,webViewLink,modifiedTime,size,parents,trashed)",
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      }));
      return {
        folder: { id: folderId, name: optionalString(current.name) ?? "Dossier Drive", url: optionalString(current.webViewLink) ?? folderUrl(folderId), parentIds: Array.isArray(current.parents) ? current.parents.filter((value): value is string => typeof value === "string") : [] },
        files: parseFiles(result).sort((a, b) => Number(b.isFolder) - Number(a.isFolder) || a.name.localeCompare(b.name, "fr")),
        rootId,
      };
    },

    async listNodeFiles(input: { workspaceId: string; rootDriveUrl: string | null; nodeFolderUrl: string | null }) {
      const nodeFolderId = extractRoadmap2DriveFolderId(input.nodeFolderUrl);
      if (!nodeFolderId) throw new Roadmap2DriveError("Préparez d’abord l’espace Drive de ce nœud.");
      const rootId = extractRoadmap2DriveFolderId(input.rootDriveUrl);
      if (rootId && nodeFolderId === rootId) throw new Roadmap2DriveValidationError("Le dossier du nœud ne peut pas être la racine Drive.");
      return this.listFiles({ workspaceId: input.workspaceId, rootDriveUrl: input.rootDriveUrl, folderId: nodeFolderId });
    },

    async uploadNodeFile(input: { workspaceId: string; rootDriveUrl: string | null; nodeFolderUrl: string | null; file: File; operationId?: string }) {
      await ensureConnected(driver, input.workspaceId);
      const rootId = extractRoadmap2DriveFolderId(input.rootDriveUrl);
      if (!rootId) throw new Roadmap2DriveError("Créez d’abord l’arborescence Drive de la roadmap.");
      const nodeFolderId = extractRoadmap2DriveFolderId(input.nodeFolderUrl);
      if (!nodeFolderId) throw new Roadmap2DriveError("Préparez d’abord l’espace Drive de ce nœud.");
      if (nodeFolderId === rootId) throw new Roadmap2DriveValidationError("Le dossier du nœud ne peut pas être la racine Drive.");
      await assertWithinRoot(driver, input.workspaceId, rootId, nodeFolderId);
      const folder = await metadata(driver, input.workspaceId, nodeFolderId, "id,mimeType,trashed");
      if (folder.mimeType !== FOLDER_MIME || folder.trashed === true) throw new Roadmap2DriveError("Le dossier Drive de ce nœud n’est plus disponible.");

      const validated = validatedUpload(input.file);
      const marker = input.operationId ? operationMarker(input.operationId) : null;
      if (marker) {
        const existing = unwrapRoadmap2DriveResult(await driver.execute(entityId(input.workspaceId), TOOLS.findFile, {
          folder_id: nodeFolderId,
          q: `name = '${escapedDriveQuery(validated.name)}' and fullText contains '${marker}' and trashed = false`,
          pageSize: 10,
          fields: "files(id,name,mimeType,webViewLink,modifiedTime,size,parents,trashed,description)",
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
        }));
        const recovered = parseFiles(existing).find((candidate) => candidate.name === validated.name && !candidate.isFolder);
        if (recovered) return recovered;
      }
      const staged = await driver.uploadFile(new File([await input.file.arrayBuffer()], validated.name, { type: validated.mimeType }));
      const created = unwrapRoadmap2DriveResult(await driver.execute(entityId(input.workspaceId), TOOLS.createFile, {
        name: validated.name,
        mimeType: validated.mimeType,
        parents: [nodeFolderId],
        file_to_upload: staged,
        description: marker ? `Fichier ajouté depuis Roadmap 2. Opération ${marker}.` : "Fichier ajouté depuis Roadmap 2.",
        fields: "id,name,mimeType,webViewLink,modifiedTime,size",
      }));
      const id = requireFileId(created.id, "Fichier Drive créé");
      return {
        id,
        name: optionalString(created.name) ?? validated.name,
        mimeType: optionalString(created.mimeType) ?? validated.mimeType,
        url: optionalString(created.webViewLink) ?? optionalString(created.display_url) ?? fileUrl(id, validated.mimeType),
        isFolder: false,
        modifiedAt: optionalString(created.modifiedTime) ?? new Date().toISOString(),
        size: optionalString(created.size) ?? String(input.file.size),
      } satisfies Roadmap2DriveFile;
    },

    async previewNodeLayout(input: { workspaceId: string; rootDriveUrl: string | null; node: Roadmap2DriveNodeContext; allNodes: Roadmap2DriveNodeContext[] }) {
      await ensureConnected(driver, input.workspaceId);
      const rootId = extractRoadmap2DriveFolderId(input.rootDriveUrl);
      if (!rootId) throw new Roadmap2DriveError("Créez d’abord l’arborescence Drive de la roadmap.");
      return describeCanonicalLayout(driver, input.workspaceId, rootId, input.node, input.allNodes);
    },

    async reconcileNodeLayout(input: { workspaceId: string; rootDriveUrl: string | null; node: Roadmap2DriveNodeContext; allNodes: Roadmap2DriveNodeContext[]; allowLinkedFolder: boolean; confirmedExpectedPath?: string }) {
      await ensureConnected(driver, input.workspaceId);
      const rootId = extractRoadmap2DriveFolderId(input.rootDriveUrl);
      if (!rootId) throw new Roadmap2DriveError("Créez d’abord l’arborescence Drive de la roadmap.");
      const before = await describeCanonicalLayout(driver, input.workspaceId, rootId, input.node, input.allNodes);
      if (input.confirmedExpectedPath !== undefined && input.confirmedExpectedPath !== before.expectedPath) {
        throw new Roadmap2DriveValidationError("L’organisation proposée a changé depuis votre confirmation. Vérifiez à nouveau le classement Drive.");
      }
      if (!before.managed && !input.allowLinkedFolder) throw new Roadmap2DriveValidationError("Confirmez explicitement la réorganisation de ce dossier lié manuellement.");
      const folderId = extractRoadmap2DriveFolderId(input.node.driveFolderUrl);
      if (!folderId) throw new Roadmap2DriveError("Préparez d’abord l’espace Drive de ce nœud.");
      if (folderId === rootId) throw new Roadmap2DriveValidationError("Le dossier d’un nœud ne peut pas être la racine Drive de la roadmap.");
      const destination = await ensureCanonicalNodeParent(driver, input.workspaceId, rootId, input.node, input.allNodes);
      const current = await metadata(driver, input.workspaceId, folderId, "id,name,mimeType,parents,trashed");
      const currentParents = Array.isArray(current.parents) ? current.parents.filter((value): value is string => typeof value === "string" && FILE_ID.test(value)) : [];
      for (const parentId of currentParents) await assertWithinRoot(driver, input.workspaceId, rootId, parentId);
      const expectedName = nodeFolderName(input.node.title, input.node.id, input.node.type, input.node.isWorkspaceRoot);
      const shouldMove = !currentParents.includes(destination.id) || currentParents.length !== 1;
      const shouldRename = current.name !== expectedName;
      let moved = false;
      let renamed = false;
      try {
        if (shouldMove) {
          await assertWithinRoot(driver, input.workspaceId, rootId, destination.id);
          unwrapRoadmap2DriveResult(await driver.execute(entityId(input.workspaceId), TOOLS.moveFile, {
            file_id: folderId,
            add_parents: destination.id,
            remove_parents: currentParents.join(","),
            supports_all_drives: true,
          }));
          moved = true;
        }
        if (shouldRename) {
          unwrapRoadmap2DriveResult(await driver.execute(entityId(input.workspaceId), TOOLS.renameFile, { fileId: folderId, title: expectedName, supportsAllDrives: true }));
          renamed = true;
        }
        const verified = await describeCanonicalLayout(driver, input.workspaceId, rootId, input.node, input.allNodes);
        if (!verified.inSync) throw new Roadmap2DriveError("Google Drive n’a pas confirmé toute la réorganisation.");
        return verified;
      } catch (error) {
        let rollbackFailed = false;
        if (renamed) {
          try {
            unwrapRoadmap2DriveResult(await driver.execute(entityId(input.workspaceId), TOOLS.renameFile, { fileId: folderId, title: safePathLabel(current.name), supportsAllDrives: true }));
          } catch {
            rollbackFailed = true;
          }
        }
        if (moved) {
          try {
            const movedMetadata = await metadata(driver, input.workspaceId, folderId, "id,parents");
            let movedParents = Array.isArray(movedMetadata.parents) ? movedMetadata.parents.filter((value): value is string => typeof value === "string" && FILE_ID.test(value)) : [];
            // Le contrat Composio n’accepte qu’un parent destination par appel.
            // On restaure donc les parents historiques un par un, sans compter sur
            // une chaîne CSV que le faux fournisseur pourrait accepter à tort.
            for (const [index, originalParentId] of currentParents.entries()) {
              unwrapRoadmap2DriveResult(await driver.execute(entityId(input.workspaceId), TOOLS.moveFile, {
                file_id: folderId,
                add_parents: originalParentId,
                remove_parents: index === 0 ? movedParents.join(",") : "",
                supports_all_drives: true,
              }));
              movedParents = [];
            }
            if (currentParents.length === 0) throw new Roadmap2DriveError("Le dossier n’avait aucun parent restaurable.");
          } catch {
            rollbackFailed = true;
          }
        }
        if (rollbackFailed) throw new Roadmap2DriveError("La réorganisation Drive n’a pas pu être annulée complètement. Vérifiez le dossier avant de réessayer.");
        throw error;
      }
    },

    async previewNodeFile(input: { workspaceId: string; rootDriveUrl: string | null; nodeFolderUrl: string | null; fileId: string }) {
      await ensureConnected(driver, input.workspaceId);
      const rootId = extractRoadmap2DriveFolderId(input.rootDriveUrl);
      const nodeFolderId = extractRoadmap2DriveFolderId(input.nodeFolderUrl);
      if (!rootId || !nodeFolderId) throw new Roadmap2DriveError("Le dossier Drive du nœud n’est pas configuré.");
      if (nodeFolderId === rootId) throw new Roadmap2DriveValidationError("Le dossier du nœud ne peut pas être la racine Drive.");
      await assertWithinRoot(driver, input.workspaceId, rootId, nodeFolderId);
      const fileId = requireFileId(input.fileId, "Fichier");
      const file = await metadata(driver, input.workspaceId, fileId, "id,name,mimeType,parents,trashed,size,capabilities(canDownload)");
      const parents = Array.isArray(file.parents) ? file.parents.filter((value): value is string => typeof value === "string") : [];
      if (!parents.includes(nodeFolderId) || file.trashed === true || file.mimeType === FOLDER_MIME) throw new Roadmap2DriveError("Ce fichier n’appartient pas au dossier de ce nœud.");
      if (record(file.capabilities)?.canDownload === false) throw new Roadmap2DriveValidationError("Google Drive n’autorise pas l’aperçu de ce fichier. Ouvrez-le directement dans Drive.");
      const nativeType = optionalString(file.mimeType) ?? "application/octet-stream";
      const previewable = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "text/plain", "text/csv"]);
      const googleWorkspace = GOOGLE_WORKSPACE_PREVIEW_TYPES.has(nativeType);
      if (!previewable.has(nativeType) && !googleWorkspace) throw new Roadmap2DriveValidationError("Ce format s’ouvre directement dans Google Drive.");
      const result = unwrapRoadmap2DriveResult(await driver.execute(entityId(input.workspaceId), TOOLS.downloadFile, { fileId, ...(googleWorkspace ? { mime_type: "application/pdf" } : {}) }));
      const downloadable = record(result.downloaded_file_content);
      if (!downloadable || result.export_size_limit_exceeded === true) throw new Roadmap2DriveValidationError("Ce fichier est trop volumineux pour l’aperçu. Ouvrez-le dans Google Drive.");
      const temporaryUrl = optionalString(downloadable.s3url);
      if (!temporaryUrl) throw new Roadmap2DriveError("Le fournisseur n’a pas retourné le contenu du fichier.");
      const contentType = googleWorkspace ? "application/pdf" : optionalString(downloadable.mimetype) ?? nativeType;
      return previewFetcher({ url: temporaryUrl, declaredType: contentType, declaredName: optionalString(downloadable.name) ?? safePathLabel(file.name) });
    },

    async createNodeResources(input: { workspaceId: string; rootDriveUrl: string | null; node: Roadmap2DriveNodeContext; allNodes: Roadmap2DriveNodeContext[]; existingTrackingDocUrl?: string | null }) {
      await ensureConnected(driver, input.workspaceId);
      const rootId = extractRoadmap2DriveFolderId(input.rootDriveUrl);
      if (!rootId) throw new Roadmap2DriveError("Créez d’abord l’arborescence Drive de la roadmap.");
      let nodeFolderId = extractRoadmap2DriveFolderId(input.node.driveFolderUrl);
      if (nodeFolderId) {
        if (nodeFolderId === rootId) throw new Roadmap2DriveValidationError("Le dossier d’un nœud ne peut pas être la racine Drive de la roadmap.");
        await assertWithinRoot(driver, input.workspaceId, rootId, nodeFolderId);
        const existingFolder = await metadata(driver, input.workspaceId, nodeFolderId, "id,mimeType,trashed");
        if (existingFolder.mimeType !== FOLDER_MIME || existingFolder.trashed === true) throw new Roadmap2DriveError("Le dossier Drive associé au nœud n’est plus accessible.");
      } else {
        const parent = await ensureCanonicalNodeParent(driver, input.workspaceId, rootId, input.node, input.allNodes);
        nodeFolderId = (await findOrCreateNodeFolder(driver, input.workspaceId, parent.id, input.node.id, input.node.title, input.node.type, input.node.isWorkspaceRoot)).id;
      }
      const trackingName = "00 - SUIVI & DÉCISIONS";
      let tracking: { url: string } | Roadmap2DriveFile | null = null;
      if (input.existingTrackingDocUrl) {
        const trackingId = extractRoadmap2DriveFileId(input.existingTrackingDocUrl);
        if (!trackingId) throw new Roadmap2DriveValidationError("Le document de suivi existant n’est pas une ressource Google Drive valide.");
        const existingTracking = await metadata(driver, input.workspaceId, trackingId, "id,name,mimeType,parents,trashed,webViewLink");
        const trackingParents = Array.isArray(existingTracking.parents) ? existingTracking.parents.filter((value): value is string => typeof value === "string") : [];
        if (existingTracking.mimeType !== DOC_MIME || existingTracking.trashed === true || !trackingParents.includes(nodeFolderId)) {
          throw new Roadmap2DriveValidationError("Le document de suivi existant doit être un Google Doc placé directement dans le dossier de ce nœud.");
        }
        tracking = { url: optionalString(existingTracking.webViewLink) ?? fileUrl(trackingId, DOC_MIME) };
      } else {
        tracking = await findChild(driver, input.workspaceId, nodeFolderId, trackingName, DOC_MIME);
      }
      let trackingPopulated = true;
      if (!tracking) {
        try {
          const upload = await driver.uploadText(trackingName, ROADMAP2_TRACKING_DOC_TEMPLATE);
          const created = unwrapRoadmap2DriveResult(await driver.execute(entityId(input.workspaceId), TOOLS.createFile, {
            name: trackingName,
            mimeType: DOC_MIME,
            parents: [nodeFolderId],
            file_to_upload: upload,
            description: "Document de suivi créé par Roadmap 2.",
            fields: "id,name,mimeType,webViewLink",
          }));
          const id = requireFileId(created.id, "Document de suivi créé");
          tracking = { id, name: trackingName, mimeType: DOC_MIME, url: optionalString(created.webViewLink) ?? optionalString(created.display_url) ?? fileUrl(id, DOC_MIME), isFolder: false, modifiedAt: null, size: null };
        } catch {
          const created = unwrapRoadmap2DriveResult(await driver.execute(entityId(input.workspaceId), TOOLS.createFile, {
            name: trackingName,
            mimeType: DOC_MIME,
            parents: [nodeFolderId],
            description: `Document de suivi créé par Roadmap 2. Modèle à copier :\n\n${ROADMAP2_TRACKING_DOC_TEMPLATE}`,
            fields: "id,name,mimeType,webViewLink",
          }));
          const id = requireFileId(created.id, "Document de suivi créé");
          tracking = { id, name: trackingName, mimeType: DOC_MIME, url: optionalString(created.webViewLink) ?? optionalString(created.display_url) ?? fileUrl(id, DOC_MIME), isFolder: false, modifiedAt: null, size: null };
          trackingPopulated = false;
        }
      }
      return { driveFolderUrl: folderUrl(nodeFolderId), trackingDocUrl: tracking.url, trackingPopulated };
    },

    async syncPermissions(input: { workspaceId: string; rootDriveUrl: string | null; emails: string[] }) {
      await ensureConnected(driver, input.workspaceId);
      const emails = z.array(z.string().trim().email()).min(1).max(10).parse(input.emails).map((email) => email.toLowerCase());
      const rootId = extractRoadmap2DriveFolderId(input.rootDriveUrl);
      if (!rootId) throw new Roadmap2DriveError("Créez d’abord le dossier Drive racine.");
      const root = await metadata(driver, input.workspaceId, rootId, "id,mimeType,trashed,owners(emailAddress),permissions(id,emailAddress,role,type)");
      if (root.mimeType !== FOLDER_MIME || root.trashed === true) throw new Roadmap2DriveError("Le dossier Drive racine n’est plus accessible.");
      const permissions = Array.isArray(root.permissions) ? root.permissions.map(record).filter(Boolean) as DriveRecord[] : [];
      const owners = Array.isArray(root.owners) ? root.owners.map(record).filter(Boolean) as DriveRecord[] : [];
      let created = 0;
      let updated = 0;
      let unchanged = 0;
      for (const email of [...new Set(emails)]) {
        if (owners.some((owner) => optionalString(owner.emailAddress)?.toLowerCase() === email)) { unchanged += 1; continue; }
        const existing = permissions.find((permission) => optionalString(permission.emailAddress)?.toLowerCase() === email);
        if (existing) {
          if (["writer", "organizer", "fileOrganizer", "owner"].includes(optionalString(existing.role) ?? "")) { unchanged += 1; continue; }
          unwrapRoadmap2DriveResult(await driver.execute(entityId(input.workspaceId), TOOLS.updatePermission, { fileId: rootId, permissionId: requireFileId(existing.id, "Permission Drive"), permission: { role: "writer" }, supportsAllDrives: true }));
          updated += 1;
          continue;
        }
        unwrapRoadmap2DriveResult(await driver.execute(entityId(input.workspaceId), TOOLS.createPermission, { file_id: rootId, type: "user", role: "writer", email_address: email, send_notification_email: true, supports_all_drives: true, email_message: "Accès au dossier de pilotage partagé depuis Roadmap 2." }));
        created += 1;
      }
      return { created, updated, unchanged };
    },
  };
}

export const roadmap2DriveAutomation = createRoadmap2DriveAutomation();
