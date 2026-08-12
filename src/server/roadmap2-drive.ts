import { Composio } from "@composio/core";
import { createHash } from "node:crypto";
import { z } from "zod";
import { ROADMAP2_TRACKING_DOC_TEMPLATE, type Roadmap2Category } from "@/lib/roadmap2";

const DRIVE_TOOLKIT = "googledrive";
const FOLDER_MIME = "application/vnd.google-apps.folder";
const DOC_MIME = "application/vnd.google-apps.document";
const FILE_ID = /^[A-Za-z0-9_-]{3,200}$/;

const TOOLS = {
  createFile: "GOOGLEDRIVE_CREATE_FILE",
  createFolder: "GOOGLEDRIVE_CREATE_FOLDER",
  createPermission: "GOOGLEDRIVE_CREATE_PERMISSION",
  updatePermission: "GOOGLEDRIVE_UPDATE_PERMISSION",
  findFile: "GOOGLEDRIVE_FIND_FILE",
  metadata: "GOOGLEDRIVE_GET_FILE_METADATA",
} as const;

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
  product_pedagogy: "03_Offres_Produits",
  buyers_funding: "04_Financements_FSE",
  partners_market: "06_Partenaires",
  operations_compliance: "02_Juridique_Association_Optiquant",
  technology_data: "08_Technologie_Data",
  pilot_execution: "07_Pilote_EmploiTon",
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
  status: string;
};

type DriveRecord = Record<string, unknown>;

export type Roadmap2DriveDriver = {
  enabled(): boolean;
  status(entityId: string): Promise<{ connected: boolean; status: string }>;
  authLink(entityId: string, callbackUrl: string): Promise<string>;
  execute(entityId: string, tool: string, args: Record<string, unknown>): Promise<unknown>;
  uploadText(name: string, content: string): Promise<{ name: string; mimetype: string; s3key: string }>;
};

export class Roadmap2DriveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "Roadmap2DriveError";
  }
}

export class Roadmap2DriveAuthRequiredError extends Roadmap2DriveError {
  constructor() {
    super("Connectez Google Drive à cette roadmap avant de continuer.");
    this.name = "Roadmap2DriveAuthRequiredError";
  }
}

let client: Composio | null = null;

function composio() {
  if (!process.env.COMPOSIO_API_KEY) throw new Roadmap2DriveError("L’intégration Google Drive n’est pas configurée sur le serveur.");
  if (!client) client = new Composio({ apiKey: process.env.COMPOSIO_API_KEY });
  return client;
}

function parseConnectedAccounts(accounts: unknown) {
  if (Array.isArray((accounts as { items?: unknown[] })?.items)) return (accounts as { items: unknown[] }).items;
  return Array.isArray(accounts) ? accounts : [];
}

const composioDriver: Roadmap2DriveDriver = {
  enabled: () => Boolean(process.env.COMPOSIO_API_KEY),
  async status(entityId) {
    if (!process.env.COMPOSIO_API_KEY) return { connected: false, status: "DISABLED" };
    const accounts = await composio().connectedAccounts.list({ userIds: [entityId] });
    const account = parseConnectedAccounts(accounts).find((item) => {
      const value = item as { status?: string; toolkit?: { slug?: string } };
      return value.toolkit?.slug === DRIVE_TOOLKIT && value.status === "ACTIVE";
    }) as { status?: string } | undefined;
    return { connected: Boolean(account), status: account?.status ?? "NOT_CONNECTED" };
  },
  async authLink(entityId, callbackUrl) {
    const session = await composio().create(entityId, { manageConnections: false, toolkits: [DRIVE_TOOLKIT] });
    const request = await session.authorize(DRIVE_TOOLKIT, { callbackUrl });
    if (!request.redirectUrl) throw new Roadmap2DriveError("Le fournisseur OAuth n’a pas retourné de lien d’autorisation.");
    return request.redirectUrl;
  },
  execute: (entityId, tool, args) => composio().tools.execute(tool, { userId: entityId, arguments: args }),
  async uploadText(name, content) {
    const file = new File([content], `${name}.txt`, { type: "text/plain;charset=utf-8" });
    return composio().files.upload({ file, toolSlug: TOOLS.createFile, toolkitSlug: DRIVE_TOOLKIT });
  },
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

function nodeFolderName(title: string, nodeId: string) {
  const marker = nodeFolderMarker(nodeId);
  const titleLimit = Math.max(24, 120 - marker.length - 3);
  return `${safeResourceName(title).slice(0, titleLimit)} · ${marker}`;
}

function nodeFolderMarker(nodeId: string) {
  return `[RM2-${createHash("sha256").update(requireFileId(nodeId, "Nœud")).digest("hex").slice(0, 10)}]`;
}

async function findOrCreateNodeFolder(driver: Roadmap2DriveDriver, workspaceId: string, parentId: string, nodeId: string, title: string) {
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
  const created = await createFolder(driver, workspaceId, nodeFolderName(title, nodeId), parentId);
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

export function createRoadmap2DriveAutomation(driver: Roadmap2DriveDriver = composioDriver) {
  return {
    async status(workspaceId: string): Promise<Roadmap2DriveStatus> {
      if (!driver.enabled()) return { enabled: false, connected: false, status: "DISABLED" };
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

    async provisionWorkspace(input: { workspaceId: string; workspaceName: string; rootDriveUrl: string | null }) {
      await ensureConnected(driver, input.workspaceId);
      let rootId = extractRoadmap2DriveFolderId(input.rootDriveUrl);
      let rootCreated = false;
      if (rootId) {
        const root = await metadata(driver, input.workspaceId, rootId, "id,name,mimeType,trashed,webViewLink");
        if (root.mimeType !== FOLDER_MIME || root.trashed === true) throw new Roadmap2DriveError("Le dossier Drive racine n’est plus accessible.");
      } else {
        const root = await createFolder(driver, input.workspaceId, safeResourceName(input.workspaceName));
        rootId = root.id;
        rootCreated = true;
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

    async createNodeResources(input: { workspaceId: string; rootDriveUrl: string | null; nodeId: string; nodeTitle: string; category: Roadmap2Category; existingFolderUrl?: string | null; existingTrackingDocUrl?: string | null }) {
      await ensureConnected(driver, input.workspaceId);
      const rootId = extractRoadmap2DriveFolderId(input.rootDriveUrl);
      if (!rootId) throw new Roadmap2DriveError("Créez d’abord l’arborescence Drive de la roadmap.");
      let nodeFolderId = extractRoadmap2DriveFolderId(input.existingFolderUrl);
      if (nodeFolderId) {
        await assertWithinRoot(driver, input.workspaceId, rootId, nodeFolderId);
        const existingFolder = await metadata(driver, input.workspaceId, nodeFolderId, "id,mimeType,trashed");
        if (existingFolder.mimeType !== FOLDER_MIME || existingFolder.trashed === true) throw new Roadmap2DriveError("Le dossier Drive associé au nœud n’est plus accessible.");
      } else {
        const category = await findOrCreateFolder(driver, input.workspaceId, rootId, CATEGORY_FOLDER[input.category]);
        nodeFolderId = (await findOrCreateNodeFolder(driver, input.workspaceId, category.id, input.nodeId, input.nodeTitle)).id;
      }
      const trackingName = "00 - SUIVI & DÉCISIONS";
      let tracking = input.existingTrackingDocUrl ? { url: input.existingTrackingDocUrl } : await findChild(driver, input.workspaceId, nodeFolderId, trackingName, DOC_MIME);
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
          await driver.execute(entityId(input.workspaceId), TOOLS.updatePermission, { fileId: rootId, permissionId: requireFileId(existing.id, "Permission Drive"), permission: { role: "writer" }, supportsAllDrives: true });
          updated += 1;
          continue;
        }
        await driver.execute(entityId(input.workspaceId), TOOLS.createPermission, { file_id: rootId, type: "user", role: "writer", email_address: email, send_notification_email: true, supports_all_drives: true, email_message: "Accès au dossier de pilotage partagé depuis Roadmap 2." });
        created += 1;
      }
      return { created, updated, unchanged };
    },
  };
}

export const roadmap2DriveAutomation = createRoadmap2DriveAutomation();
