import "./_env";

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ROADMAP2_DRIVE_STRUCTURE,
  ROADMAP2_REQUIRED_DRIVE_EDITORS,
  Roadmap2DriveError,
  Roadmap2DriveValidationError,
  createRoadmap2DriveAutomation,
  extractRoadmap2DriveFileId,
  extractRoadmap2DriveFolderId,
  unwrapRoadmap2DriveResult,
  selectRoadmap2DriveConnection,
  type Roadmap2DriveDriver,
  type Roadmap2DrivePreviewPayload,
} from "../src/server/roadmap2-drive";
import { assert, runner, step } from "./_tenant";

const FOLDER_MIME = "application/vnd.google-apps.folder";
const DOC_MIME = "application/vnd.google-apps.document";

function driveNode(id: string, title: string, category: "strategy_governance" | "product_pedagogy" = "strategy_governance", overrides: Partial<import("../src/server/roadmap2-drive").Roadmap2DriveNodeContext> = {}): import("../src/server/roadmap2-drive").Roadmap2DriveNodeContext {
  return { id, title, type: "action", category, status: "not_started", parentId: null, driveFolderUrl: null, trackingDocUrl: null, isWorkspaceRoot: false, ...overrides };
}

type FakeItem = {
  id: string;
  name: string;
  mimeType: string;
  parents: string[];
  trashed: boolean;
  webViewLink: string;
  modifiedTime: string;
  size: string | null;
  description?: string;
  owners?: Array<{ emailAddress: string }>;
  permissions?: Array<{ id: string; emailAddress: string; role: string; type: string }>;
  capabilities?: { canDownload: boolean };
};

class FakeDrive implements Roadmap2DriveDriver {
  items = new Map<string, FakeItem>();
  uploads = 0;
  downloadCalls: Array<{ fileId: string; mimeType: string | null }> = [];
  downloadUrl = "https://storage.composio.dev/roadmap2-preview";
  failNextRename = false;
  failNextPermission = false;
  private sequence = 0;

  constructor() {
    this.items.set("unrelated-root", this.item("unrelated-root", "Privé hors Roadmap", FOLDER_MIME, []));
  }

  private item(id: string, name: string, mimeType: string, parents: string[]): FakeItem {
    return {
      id,
      name,
      mimeType,
      parents,
      trashed: false,
      webViewLink: mimeType === DOC_MIME ? `https://docs.google.com/document/d/${id}/edit` : `https://drive.google.com/drive/folders/${id}`,
      modifiedTime: "2026-08-11T10:00:00.000Z",
      size: null,
    };
  }

  enabled() { return true; }
  async status() { return { connected: true, status: "ACTIVE" as const, account: { displayName: "Dorian", emailAddress: "dorian@example.com", alias: null, verified: true } }; }
  async authLink() { return "https://auth.composio.dev/connect/roadmap2-test"; }
  async uploadText(name: string) {
    this.uploads += 1;
    return { name: `${name}.txt`, mimetype: "text/plain", s3key: `roadmap2/${name}.txt` };
  }
  async uploadFile(file: File) {
    this.uploads += 1;
    return { name: file.name, mimetype: file.type, s3key: `roadmap2/${file.name}` };
  }

  addFile(name: string, mimeType: string, parentId: string) {
    const id = `file-${++this.sequence}`;
    const created = this.item(id, name, mimeType, [parentId]);
    created.webViewLink = `https://drive.google.com/file/d/${id}/view`;
    created.size = "128";
    this.items.set(id, created);
    return created;
  }

  async execute(_entityId: string, tool: string, args: Record<string, unknown>): Promise<unknown> {
    if (tool === "GOOGLEDRIVE_CREATE_FOLDER") {
      const id = `folder-${++this.sequence}`;
      const parent = typeof args.parent_id === "string" ? [args.parent_id] : [];
      const created = this.item(id, String(args.name), FOLDER_MIME, parent);
      if (parent.length === 0) {
        created.owners = [{ emailAddress: "owner@example.com" }];
        created.permissions = [{ id: "permission-reader", emailAddress: "mathurin@example.com", role: "reader", type: "user" }];
      }
      this.items.set(id, created);
      return { successful: true, data: created };
    }
    if (tool === "GOOGLEDRIVE_CREATE_FILE") {
      const id = `document-${++this.sequence}`;
      const created = this.item(id, String(args.name), String(args.mimeType), Array.isArray(args.parents) ? args.parents.map(String) : []);
      created.description = typeof args.description === "string" ? args.description : undefined;
      this.items.set(id, created);
      return { successful: true, data: created };
    }
    if (tool === "GOOGLEDRIVE_GET_FILE_METADATA") {
      const item = this.items.get(String(args.fileId));
      if (!item) return { successful: false, error: "not found" };
      return { successful: true, data: item };
    }
    if (tool === "GOOGLEDRIVE_FIND_FILE") {
      const parentId = String(args.folder_id);
      const query = typeof args.q === "string" ? args.q : "";
      const nameMatch = query.match(/name = '((?:\\'|[^'])+)'/);
      const requestedName = nameMatch?.[1]?.replace(/\\'/g, "'").replace(/\\\\/g, "\\");
      const containsMatch = query.match(/name contains '((?:\\'|[^'])+)'/);
      const containedName = containsMatch?.[1]?.replace(/\\'/g, "'").replace(/\\\\/g, "\\");
      const mimeMatch = query.match(/mimeType = '([^']+)'/);
      const fullTextMatch = query.match(/fullText contains '([A-Za-z0-9]+)'/);
      const files = [...this.items.values()].filter((item) => (parentId === "root" ? item.parents.length === 0 : item.parents.includes(parentId))
        && (!requestedName || item.name === requestedName)
        && (!containedName || item.name.includes(containedName))
        && (!fullTextMatch?.[1] || item.description?.includes(fullTextMatch[1]))
        && (!mimeMatch?.[1] || item.mimeType === mimeMatch[1])
        && !item.trashed);
      return { successful: true, data: { files } };
    }
    if (tool === "GOOGLEDRIVE_CREATE_PERMISSION") {
      if (this.failNextPermission) { this.failNextPermission = false; return { successful: false, error: "simulated permission failure" }; }
      const root = this.items.get(String(args.file_id));
      if (!root) return { successful: false, error: "not found" };
      root.permissions ??= [];
      root.permissions.push({ id: `permission-${++this.sequence}`, emailAddress: String(args.email_address), role: String(args.role), type: String(args.type) });
      return { successful: true, data: { id: root.permissions.at(-1)?.id } };
    }
    if (tool === "GOOGLEDRIVE_UPDATE_PERMISSION") {
      if (this.failNextPermission) { this.failNextPermission = false; return { successful: false, error: "simulated permission failure" }; }
      const root = this.items.get(String(args.fileId));
      const permission = root?.permissions?.find((candidate) => candidate.id === args.permissionId);
      if (!permission) return { successful: false, error: "not found" };
      const payload = args.permission as { role?: string };
      permission.role = payload.role ?? permission.role;
      return { successful: true, data: permission };
    }
    if (tool === "GOOGLEDRIVE_MOVE_FILE") {
      const item = this.items.get(String(args.file_id));
      if (!item) return { successful: false, error: "not found" };
      const removed = String(args.remove_parents ?? "").split(",").filter(Boolean);
      item.parents = item.parents.filter((parent) => !removed.includes(parent));
      const added = String(args.add_parents ?? "").split(",").filter(Boolean);
      for (const parentId of added) if (!item.parents.includes(parentId)) item.parents.push(parentId);
      return { successful: true, data: item };
    }
    if (tool === "GOOGLEDRIVE_UPDATE_FILE_METADATA_PATCH") {
      const item = this.items.get(String(args.fileId));
      if (!item) return { successful: false, error: "not found" };
      if (this.failNextRename) { this.failNextRename = false; return { successful: false, error: "simulated rename failure" }; }
      item.name = String(args.title);
      return { successful: true, data: item };
    }
    if (tool === "GOOGLEDRIVE_DOWNLOAD_FILE") {
      const fileId = String(args.fileId);
      const item = this.items.get(fileId);
      if (!item) return { successful: false, error: "not found" };
      const exportedAsPdf = typeof args.mime_type === "string";
      this.downloadCalls.push({ fileId, mimeType: exportedAsPdf ? String(args.mime_type) : null });
      return {
        successful: true,
        data: {
          downloaded_file_content: {
            name: exportedAsPdf ? `${item.name}.pdf` : item.name,
            mimetype: exportedAsPdf ? "application/pdf" : item.mimeType,
            s3url: this.downloadUrl,
          },
        },
      };
    }
    return { successful: false, error: `unsupported ${tool}` };
  }
}

runner("roadmap_2_drive_smoke", async () => {
  const driver = new FakeDrive();
  const drive = createRoadmap2DriveAutomation(driver);
  const workspaceId = "workspace-drive-smoke";

  const status = await drive.status(workspaceId);
  assert(status.connected && status.enabled && status.status === "ACTIVE" && status.account?.emailAddress === "dorian@example.com" && status.account.verified, "Le statut et l’identité du compte connecté doivent être renvoyés sans exposer de jeton.");
  const activeSelected = selectRoadmap2DriveConnection({ items: [
    { id: "expired", status: "EXPIRED", toolkit: { slug: "googledrive" }, updatedAt: "2026-08-12T12:00:00.000Z" },
    { id: "active", alias: "Compte de pilotage", status: "ACTIVE", toolkit: { slug: "googledrive" }, updatedAt: "2026-08-11T12:00:00.000Z" },
  ] });
  assert(activeSelected.connected && activeSelected.status === "ACTIVE" && activeSelected.accountId === "active", "Une connexion ACTIVE doit primer sur un ancien compte expiré.");
  const expiredSelected = selectRoadmap2DriveConnection({ items: [{ id: "expired", status: "EXPIRED", toolkit: { slug: "googledrive" } }] });
  assert(!expiredSelected.connected && expiredSelected.status === "EXPIRED", "Une autorisation expirée doit rester distincte d’une absence de connexion.");
  assert(selectRoadmap2DriveConnection({ items: [] }).status === "NOT_CONNECTED", "L’absence de compte doit seule produire NOT_CONNECTED.");
  assert(selectRoadmap2DriveConnection({ items: [{ status: "ACTIVE", toolkit: { slug: "googledrive" } }] }).status === "UNKNOWN", "Une réponse ACTIVE sans identifiant ne doit pas autoriser des mutations sur un compte implicite.");
  step("oauth_status_machine_and_identity");
  assert((await drive.authLink(workspaceId, "roadmap-test")).startsWith("https://auth.composio.dev/"), "Le lien OAuth doit être HTTPS et limité à un hôte autorisé.");
  step("oauth_status_and_redirect_validated");

  const first = await drive.provisionWorkspace({ workspaceId, workspaceName: "LE BON REBOND", rootDriveUrl: null });
  const expectedFolders = ROADMAP2_DRIVE_STRUCTURE.reduce((count, entry) => count + 1 + ("children" in entry ? entry.children.length : 0), 0);
  assert(first.rootCreated && first.foldersCreated === expectedFolders, `L’arborescence complète doit être créée (${expectedFolders} dossiers attendus).`);
  const requiredEditor = driver.items.get(first.rootId)?.permissions?.find((permission) => permission.emailAddress === ROADMAP2_REQUIRED_DRIVE_EDITORS[0]);
  assert(requiredEditor?.role === "writer", "Le collaborateur permanent doit devenir éditeur du dossier racine dès le provisionnement.");
  const recoveredProvision = await drive.provisionWorkspace({ workspaceId, workspaceName: "LE BON REBOND", rootDriveUrl: null, operationId: "provider-succeeded-before-db-commit" });
  assert(!recoveredProvision.rootCreated && recoveredProvision.foldersCreated === 0 && recoveredProvision.rootId === first.rootId, "Après une panne avant commit DB, une reprise sans URL locale doit retrouver la racine déterministe au lieu de la dupliquer.");
  const second = await drive.provisionWorkspace({ workspaceId, workspaceName: "LE BON REBOND", rootDriveUrl: first.rootDriveUrl });
  assert(!second.rootCreated && second.foldersCreated === 0 && second.rootId === first.rootId, "Une seconde initialisation doit réutiliser l’arborescence sans doublon.");
  let rootAsNodeRejected = false;
  try {
    await drive.createNodeResources({
      workspaceId,
      rootDriveUrl: first.rootDriveUrl,
      node: driveNode("node-root-alias", "Alias racine", "strategy_governance", { driveFolderUrl: first.rootDriveUrl }),
      allNodes: [],
    });
  } catch (error) {
    rootAsNodeRejected = error instanceof Roadmap2DriveValidationError;
  }
  assert(rootAsNodeRejected && ![...driver.items.values()].some((item) => item.parents.includes(first.rootId) && item.mimeType === DOC_MIME && item.name === "00 - SUIVI & DÉCISIONS"), "La racine workspace ne doit jamais être acceptée comme dossier de nœud ni recevoir son document de suivi.");
  step("folder_tree_idempotent", { folders: expectedFolders });

  const rootListing = await drive.listFiles({ workspaceId, rootDriveUrl: first.rootDriveUrl });
  assert(rootListing.files.filter((item) => item.isFolder).length === ROADMAP2_DRIVE_STRUCTURE.length, "L’explorateur doit afficher les dossiers racine persistés dans Drive.");
  let unrelatedRejected = false;
  try {
    await drive.listFiles({ workspaceId, rootDriveUrl: first.rootDriveUrl, folderId: "unrelated-root" });
  } catch (error) {
    unrelatedRejected = error instanceof Roadmap2DriveError;
  }
  assert(unrelatedRejected, "L’explorateur doit refuser tout dossier extérieur à la racine Roadmap 2.");
  step("root_scoped_explorer");

  const auditNode = driveNode("node-audit-1", "Audit association");
  const resources = await drive.createNodeResources({ workspaceId, rootDriveUrl: first.rootDriveUrl, node: auditNode, allNodes: [auditNode] });
  const renamedAuditNode = { ...auditNode, title: "Audit association renommé", driveFolderUrl: resources.driveFolderUrl, trackingDocUrl: resources.trackingDocUrl };
  const repeatedResources = await drive.createNodeResources({ workspaceId, rootDriveUrl: first.rootDriveUrl, node: renamedAuditNode, allNodes: [renamedAuditNode], existingTrackingDocUrl: resources.trackingDocUrl });
  assert(resources.driveFolderUrl === repeatedResources.driveFolderUrl && resources.trackingDocUrl === repeatedResources.trackingDocUrl, "Les ressources d’un nœud doivent être retrouvées plutôt que dupliquées.");
  assert(driver.uploads === 1 && resources.trackingPopulated, "Le modèle de suivi doit être importé une seule fois dans un Google Doc natif.");
  const secondAuditNode = driveNode("node-audit-2", "Audit association");
  const sameTitleOtherNode = await drive.createNodeResources({ workspaceId, rootDriveUrl: first.rootDriveUrl, node: secondAuditNode, allNodes: [auditNode, secondAuditNode] });
  assert(sameTitleOtherNode.driveFolderUrl !== resources.driveFolderUrl, "Deux nœuds distincts de même titre doivent conserver des dossiers Drive distincts.");
  let foreignTrackingRejected = false;
  try {
    await drive.createNodeResources({ workspaceId, rootDriveUrl: first.rootDriveUrl, node: renamedAuditNode, allNodes: [renamedAuditNode], existingTrackingDocUrl: sameTitleOtherNode.trackingDocUrl });
  } catch (error) {
    foreignTrackingRejected = error instanceof Roadmap2DriveValidationError;
  }
  assert(foreignTrackingRejected, "Le document de suivi d’un autre nœud doit être refusé même si son URL Google est valide.");
  step("node_folder_and_tracking_doc_idempotent");

  const rootNode = driveNode("node-root", "LE BON REBOND", "strategy_governance", { type: "initiative", isWorkspaceRoot: true });
  const rootResources = await drive.createNodeResources({ workspaceId, rootDriveUrl: first.rootDriveUrl, node: rootNode, allNodes: [rootNode] });
  const phaseNode = driveNode("node-phase-product", "PRODUIT & PÉDAGOGIE", "product_pedagogy", { type: "phase", parentId: rootNode.id });
  const phaseResources = await drive.createNodeResources({ workspaceId, rootDriveUrl: first.rootDriveUrl, node: phaseNode, allNodes: [rootNode, phaseNode] });
  const initiativeNode = driveNode("node-offer", "Finaliser l’offre", "product_pedagogy", { type: "initiative", parentId: phaseNode.id });
  const initiativeResources = await drive.createNodeResources({ workspaceId, rootDriveUrl: first.rootDriveUrl, node: initiativeNode, allNodes: [rootNode, { ...phaseNode, driveFolderUrl: phaseResources.driveFolderUrl }, initiativeNode] });
  const rootFolder = driver.items.get(extractRoadmap2DriveFolderId(rootResources.driveFolderUrl)!);
  const phaseFolder = driver.items.get(extractRoadmap2DriveFolderId(phaseResources.driveFolderUrl)!);
  const initiativeFolder = driver.items.get(extractRoadmap2DriveFolderId(initiativeResources.driveFolderUrl)!);
  assert(rootFolder?.name.startsWith("ROADMAP —") && phaseFolder?.name.startsWith("PHASE —") && initiativeFolder?.parents.includes(phaseFolder!.id), "Le root, la phase et son initiative doivent suivre la hiérarchie canonique.");
  const movedNode = { ...initiativeNode, title: "Offre achetable", category: "strategy_governance" as const, parentId: null, driveFolderUrl: initiativeResources.driveFolderUrl, trackingDocUrl: initiativeResources.trackingDocUrl };
  const drift = await drive.previewNodeLayout({ workspaceId, rootDriveUrl: first.rootDriveUrl, node: movedNode, allNodes: [rootNode, phaseNode, movedNode] });
  assert(!drift.inSync && drift.willMove && drift.willRename, "Un reparenting et renommage doivent produire un aperçu sans déplacer silencieusement le dossier.");
  let stalePlanRejected = false;
  try {
    await drive.reconcileNodeLayout({ workspaceId, rootDriveUrl: first.rootDriveUrl, node: movedNode, allNodes: [rootNode, phaseNode, movedNode], allowLinkedFolder: false, confirmedExpectedPath: `${drift.expectedPath} / ancien` });
  } catch (error) {
    stalePlanRejected = error instanceof Roadmap2DriveValidationError;
  }
  assert(stalePlanRejected, "Un chemin de classement différent de celui confirmé doit être refusé avant toute mutation Drive.");
  const reconciled = await drive.reconcileNodeLayout({ workspaceId, rootDriveUrl: first.rootDriveUrl, node: movedNode, allNodes: [rootNode, phaseNode, movedNode], allowLinkedFolder: false, confirmedExpectedPath: drift.expectedPath });
  assert(reconciled.inSync && initiativeFolder?.name.includes("Offre achetable"), "La confirmation doit converger vers le chemin canonique et renommer le dossier géré.");
  const rollbackNode = { ...movedNode, title: "Renommage interrompu", category: "product_pedagogy" as const };
  const originalName = initiativeFolder?.name;
  const originalParents = [...(initiativeFolder?.parents ?? [])];
  const rollbackPreview = await drive.previewNodeLayout({ workspaceId, rootDriveUrl: first.rootDriveUrl, node: rollbackNode, allNodes: [rootNode, phaseNode, rollbackNode] });
  driver.failNextRename = true;
  let compensatedFailure = false;
  try {
    await drive.reconcileNodeLayout({ workspaceId, rootDriveUrl: first.rootDriveUrl, node: rollbackNode, allNodes: [rootNode, phaseNode, rollbackNode], allowLinkedFolder: false, confirmedExpectedPath: rollbackPreview.expectedPath });
  } catch (error) {
    compensatedFailure = error instanceof Roadmap2DriveError;
  }
  assert(compensatedFailure && initiativeFolder?.name === originalName && JSON.stringify(initiativeFolder?.parents) === JSON.stringify(originalParents), "Un échec de renommage après déplacement doit restaurer le dossier à son emplacement initial.");
  const archivedNode = { ...movedNode, status: "archived" };
  const archived = await drive.reconcileNodeLayout({ workspaceId, rootDriveUrl: first.rootDriveUrl, node: archivedNode, allNodes: [rootNode, phaseNode, archivedNode], allowLinkedFolder: false });
  assert(archived.inSync && archived.expectedPath.startsWith("10_Archives / 01_Strategie_Gouvernance"), "L’archivage doit déplacer le dossier sous 10_Archives et sa catégorie.");
  step("hierarchical_layout_preview_reconcile_and_archive");

  const beforeUpload = await drive.listNodeFiles({ workspaceId, rootDriveUrl: first.rootDriveUrl, nodeFolderUrl: resources.driveFolderUrl });
  assert(beforeUpload.files.some((file) => file.url === resources.trackingDocUrl), "Le contenu du dossier d’un nœud doit être listable sans sortir de sa racine.");
  const uploadOperationId = "upload-operation-stable-1";
  const uploaded = await drive.uploadNodeFile({ workspaceId, rootDriveUrl: first.rootDriveUrl, nodeFolderUrl: resources.driveFolderUrl, file: new File(["preuve"], "decision.pdf", { type: "application/pdf" }), operationId: uploadOperationId });
  assert(uploaded.name === "decision.pdf" && uploaded.url.startsWith("https://drive.google.com/"), "Un fichier utilisateur doit être ajouté directement au dossier Drive du nœud.");
  const uploadsAfterProviderSuccess = driver.uploads;
  const retriedUpload = await drive.uploadNodeFile({ workspaceId, rootDriveUrl: first.rootDriveUrl, nodeFolderUrl: resources.driveFolderUrl, file: new File(["preuve"], "decision.pdf", { type: "application/pdf" }), operationId: uploadOperationId });
  assert(retriedUpload.id === uploaded.id && driver.uploads === uploadsAfterProviderSuccess, "Un retry après succès fournisseur doit retrouver le fichier marqué par l’opération sans recharger ni dupliquer les octets.");
  const afterUpload = await drive.listNodeFiles({ workspaceId, rootDriveUrl: first.rootDriveUrl, nodeFolderUrl: resources.driveFolderUrl });
  assert(afterUpload.files.some((file) => file.id === uploaded.id), "Le fichier ajouté doit être immédiatement consultable depuis le nœud.");
  let dangerousUploadRejected = false;
  try {
    await drive.uploadNodeFile({ workspaceId, rootDriveUrl: first.rootDriveUrl, nodeFolderUrl: resources.driveFolderUrl, file: new File(["<script>"], "attaque.html", { type: "text/html" }) });
  } catch (error) {
    dangerousUploadRejected = error instanceof Roadmap2DriveValidationError;
  }
  assert(dangerousUploadRejected, "Un format actif non autorisé doit être refusé avant tout transfert.");
  let spoofedUploadRejected = false;
  try {
    await drive.uploadNodeFile({ workspaceId, rootDriveUrl: first.rootDriveUrl, nodeFolderUrl: resources.driveFolderUrl, file: new File(["<script>"], "attaque.html", { type: "application/pdf" }) });
  } catch (error) {
    spoofedUploadRejected = error instanceof Roadmap2DriveValidationError;
  }
  assert(spoofedUploadRejected, "Une extension active maquillée avec un MIME autorisé doit être refusée avant transfert.");
  let oversizedUploadRejected = false;
  try {
    await drive.uploadNodeFile({ workspaceId, rootDriveUrl: first.rootDriveUrl, nodeFolderUrl: resources.driveFolderUrl, file: new File([new Uint8Array(10 * 1024 * 1024 + 1)], "trop-lourd.pdf", { type: "application/pdf" }) });
  } catch (error) {
    oversizedUploadRejected = error instanceof Roadmap2DriveValidationError;
  }
  assert(oversizedUploadRejected, "Un fichier de plus de 10 Mo doit être refusé avant transfert.");
  step("node_files_list_and_upload");

  const previewFetches: Array<{ url: string; declaredType: string; declaredName: string }> = [];
  const previewBytes = new TextEncoder().encode("roadmap-2-private-preview");
  const previewFetcher = async (input: { url: string; declaredType: string; declaredName: string }): Promise<Roadmap2DrivePreviewPayload> => {
    previewFetches.push(input);
    return { bytes: previewBytes, contentType: input.declaredType as Roadmap2DrivePreviewPayload["contentType"], fileName: input.declaredName };
  };
  const previewDrive = createRoadmap2DriveAutomation(driver, previewFetcher);
  const pdfPreview = await previewDrive.previewNodeFile({ workspaceId, rootDriveUrl: first.rootDriveUrl, nodeFolderUrl: resources.driveFolderUrl, fileId: uploaded.id });
  assert(pdfPreview.contentType === "application/pdf" && pdfPreview.bytes.byteLength === previewBytes.byteLength, "Le lecteur doit transmettre un PDF direct via le fetch serveur borné.");
  assert(previewFetches.at(-1)?.declaredType === "application/pdf" && previewFetches.at(-1)?.declaredName === "decision.pdf", "Le fetcher privé doit recevoir le type et le nom issus des métadonnées Drive.");

  const trackingDocId = [...driver.items.values()].find((item) => item.webViewLink === resources.trackingDocUrl)?.id;
  assert(Boolean(trackingDocId), "Le Google Doc de suivi doit exister dans le faux Drive.");
  const docPreview = await previewDrive.previewNodeFile({ workspaceId, rootDriveUrl: first.rootDriveUrl, nodeFolderUrl: resources.driveFolderUrl, fileId: trackingDocId! });
  assert(docPreview.contentType === "application/pdf" && driver.downloadCalls.at(-1)?.mimeType === "application/pdf", "Un Google Doc doit être explicitement exporté en PDF pour l’aperçu isolé.");

  const siblingDocId = [...driver.items.values()].find((item) => item.webViewLink === sameTitleOtherNode.trackingDocUrl)?.id;
  const downloadsBeforeSiblingAttempt = driver.downloadCalls.length;
  let siblingPreviewRejected = false;
  try {
    await previewDrive.previewNodeFile({ workspaceId, rootDriveUrl: first.rootDriveUrl, nodeFolderUrl: resources.driveFolderUrl, fileId: siblingDocId! });
  } catch (error) {
    siblingPreviewRejected = error instanceof Roadmap2DriveError;
  }
  assert(siblingPreviewRejected && driver.downloadCalls.length === downloadsBeforeSiblingAttempt, "Un fichier d’un nœud frère doit être refusé avant tout téléchargement fournisseur (anti-IDOR).");

  const protectedFile = driver.addFile("lecture-interdite.pdf", "application/pdf", extractRoadmap2DriveFolderId(resources.driveFolderUrl)!);
  protectedFile.capabilities = { canDownload: false };
  const downloadsBeforeProtectedAttempt = driver.downloadCalls.length;
  let protectedPreviewRejected = false;
  try {
    await previewDrive.previewNodeFile({ workspaceId, rootDriveUrl: first.rootDriveUrl, nodeFolderUrl: resources.driveFolderUrl, fileId: protectedFile.id });
  } catch (error) {
    protectedPreviewRejected = error instanceof Roadmap2DriveValidationError;
  }
  assert(protectedPreviewRejected && driver.downloadCalls.length === downloadsBeforeProtectedAttempt, "Le lecteur doit respecter canDownload=false avant tout transfert fournisseur.");

  const auditFolderId = extractRoadmap2DriveFolderId(resources.driveFolderUrl)!;
  const officeFile = driver.addFile("budget.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", auditFolderId);
  const formFile = driver.addFile("Questionnaire", "application/vnd.google-apps.form", auditFolderId);
  for (const candidate of [officeFile, formFile]) {
    let unsupportedPreviewRejected = false;
    try {
      await previewDrive.previewNodeFile({ workspaceId, rootDriveUrl: first.rootDriveUrl, nodeFolderUrl: resources.driveFolderUrl, fileId: candidate.id });
    } catch (error) {
      unsupportedPreviewRejected = error instanceof Roadmap2DriveValidationError;
    }
    assert(unsupportedPreviewRejected, `${candidate.name} doit rester consultable dans Drive sans être injecté dans le lecteur interne.`);
  }

  const defaultPreviewDrive = createRoadmap2DriveAutomation(driver);
  const originalFetch = globalThis.fetch;
  try {
    driver.downloadUrl = "https://malveillant.example/preview.pdf";
    let forbiddenHostRejected = false;
    try {
      await defaultPreviewDrive.previewNodeFile({ workspaceId, rootDriveUrl: first.rootDriveUrl, nodeFolderUrl: resources.driveFolderUrl, fileId: uploaded.id });
    } catch (error) {
      forbiddenHostRejected = error instanceof Roadmap2DriveError;
    }
    assert(forbiddenHostRejected, "Le lecteur doit refuser une URL temporaire située hors de l’allowlist serveur.");

    driver.downloadUrl = "https://temp.account-id.r2.cloudflarestorage.com/roadmap2-preview.pdf";
    globalThis.fetch = async () => new Response(previewBytes, { status: 200, headers: { "content-length": String(previewBytes.byteLength), "content-type": "application/pdf" } });
    const cloudflarePreview = await defaultPreviewDrive.previewNodeFile({ workspaceId, rootDriveUrl: first.rootDriveUrl, nodeFolderUrl: resources.driveFolderUrl, fileId: uploaded.id });
    assert(cloudflarePreview.bytes.byteLength === previewBytes.byteLength, "Le lecteur doit accepter les URL signées du domaine officiel Cloudflare R2.");

    driver.downloadUrl = "https://r2.cloudflarestorage.com.malveillant.example/preview.pdf";
    let cloudflareSuffixRejected = false;
    try {
      await defaultPreviewDrive.previewNodeFile({ workspaceId, rootDriveUrl: first.rootDriveUrl, nodeFolderUrl: resources.driveFolderUrl, fileId: uploaded.id });
    } catch (error) {
      cloudflareSuffixRejected = error instanceof Roadmap2DriveError;
    }
    assert(cloudflareSuffixRejected, "Un faux suffixe ressemblant à Cloudflare R2 doit être refusé.");

    driver.downloadUrl = "https://storage.composio.dev/oversized-preview.pdf";
    globalThis.fetch = async () => new Response(new Uint8Array(0), { status: 200, headers: { "content-length": String(10 * 1024 * 1024 + 1), "content-type": "application/pdf" } });
    let oversizedPreviewRejected = false;
    try {
      await defaultPreviewDrive.previewNodeFile({ workspaceId, rootDriveUrl: first.rootDriveUrl, nodeFolderUrl: resources.driveFolderUrl, fileId: uploaded.id });
    } catch (error) {
      oversizedPreviewRejected = error instanceof Roadmap2DriveValidationError;
    }
    assert(oversizedPreviewRejected, "Le lecteur doit refuser un contenu annoncé au-delà de 10 Mo avant de le mettre en mémoire.");
  } finally {
    globalThis.fetch = originalFetch;
    driver.downloadUrl = "https://storage.composio.dev/roadmap2-preview";
  }
  step("private_file_reader_and_idor_guards");

  const permissions = await drive.syncPermissions({ workspaceId, rootDriveUrl: first.rootDriveUrl, emails: ["owner@example.com", "mathurin@example.com", "dorian@example.com"] });
  assert(permissions.created === 1 && permissions.updated === 1 && permissions.unchanged === 2, "La synchronisation doit créer, promouvoir ou conserver chaque permission, y compris l’éditeur permanent.");
  const permissionsAgain = await drive.syncPermissions({ workspaceId, rootDriveUrl: first.rootDriveUrl, emails: ["owner@example.com", "mathurin@example.com", "dorian@example.com"] });
  assert(permissionsAgain.unchanged === 4, "La synchronisation des permissions doit être idempotente et préserver l’éditeur permanent.");
  const rootBeforeFailures = driver.items.get(first.rootId);
  const mathurinPermission = rootBeforeFailures?.permissions?.find((permission) => permission.emailAddress === "mathurin@example.com");
  assert(Boolean(mathurinPermission), "La permission de Mathurin doit exister avant le test d’échec de promotion.");
  mathurinPermission!.role = "reader";
  driver.failNextPermission = true;
  let permissionUpdateFailureRejected = false;
  try {
    await drive.syncPermissions({ workspaceId, rootDriveUrl: first.rootDriveUrl, emails: ["mathurin@example.com"] });
  } catch (error) {
    permissionUpdateFailureRejected = error instanceof Roadmap2DriveError;
  }
  assert(permissionUpdateFailureRejected && mathurinPermission?.role === "reader", "Une promotion unsuccessful ne doit jamais être comptée ni annoncée comme réussie.");
  driver.failNextPermission = true;
  let permissionCreateFailureRejected = false;
  try {
    await drive.syncPermissions({ workspaceId, rootDriveUrl: first.rootDriveUrl, emails: ["refus@example.com"] });
  } catch (error) {
    permissionCreateFailureRejected = error instanceof Roadmap2DriveError;
  }
  const rootAfterFailure = driver.items.get(first.rootId);
  assert(permissionCreateFailureRejected && !rootAfterFailure?.permissions?.some((permission) => permission.emailAddress === "refus@example.com"), "Une création unsuccessful ne doit jamais être comptée ni annoncée comme un partage réussi.");
  step("shared_permissions_idempotent");

  assert(extractRoadmap2DriveFolderId(first.rootDriveUrl) === first.rootId, "L’identifiant du dossier racine doit être extrait d’une URL Drive valide.");
  assert(Boolean(extractRoadmap2DriveFileId(resources.trackingDocUrl)), "L’identifiant d’un Google Doc de suivi valide doit être extrait.");
  assert(extractRoadmap2DriveFileId("https://docs.google.com.evil.invalid/document/d/document-1/edit") === null, "Un faux domaine Google Docs doit être rejeté.");
  assert(extractRoadmap2DriveFolderId("https://drive.google.com.evil.invalid/drive/folders/root") === null, "Un faux domaine Drive doit être rejeté.");
  assert(unwrapRoadmap2DriveResult({ successful: true, data: { data: { id: "nested" } } }).id === "nested", "Les réponses imbriquées du fournisseur doivent être normalisées.");

  const actions = readFileSync(join(process.cwd(), "src/server/roadmap2-drive-actions.ts"), "utf8");
  const driveService = readFileSync(join(process.cwd(), "src/server/roadmap2-drive.ts"), "utf8");
  const driveStatusUi = readFileSync(join(process.cwd(), "src/lib/roadmap2-drive-status.ts"), "utf8");
  const client = readFileSync(join(process.cwd(), "src/app/admin/roadmap-2/roadmap2-client.tsx"), "utf8");
  const detail = readFileSync(join(process.cwd(), "src/app/admin/roadmap-2/roadmap2-detail.tsx"), "utf8");
  const callback = readFileSync(join(process.cwd(), "src/app/admin/roadmap-2/google-drive/callback/page.tsx"), "utf8");
  const uploadRoute = readFileSync(join(process.cwd(), "src/app/api/admin/roadmap-2/drive/upload/route.ts"), "utf8");
  const previewRoute = readFileSync(join(process.cwd(), "src/app/api/admin/roadmap-2/drive/preview/route.ts"), "utf8");
  const actionNames = ["getRoadmap2DriveStatus", "connectRoadmap2Drive", "provisionRoadmap2Drive", "listRoadmap2DriveFiles", "listRoadmap2NodeDriveFiles", "uploadRoadmap2NodeDriveFile", "createRoadmap2NodeDriveResources", "previewRoadmap2NodeDriveLayout", "previewRoadmap2NodeStructuralChange", "reconcileRoadmap2NodeDriveLayout", "syncRoadmap2DrivePermissions"];
  for (const name of actionNames) assert(actions.includes(`function ${name}`), `Action Drive manquante : ${name}`);
  assert((actions.match(/resolveRoadmap2Context\(workspaceKey\)/g) ?? []).length === actionNames.length, "Chaque action Drive doit recalculer côté serveur le workspace et le rôle admin.");
  assert(!actions.includes("console.") && !client.includes("COMPOSIO_API_KEY"), "Les secrets et réponses Drive ne doivent pas être journalisés ni envoyés au client.");
  assert(uploadRoute.includes("getPlatformAdmin") && uploadRoute.indexOf("getPlatformAdmin") < uploadRoute.indexOf("request.formData()"), "La route d’upload doit refuser un utilisateur non admin avant de lire son fichier.");
  assert(uploadRoute.includes("uploadRoadmap2NodeDriveFile") && uploadRoute.includes('"Cache-Control": "private, no-store"'), "L’upload doit passer par une route admin privée sans cache et réutiliser les gardes serveur.");
  assert(detail.includes('/api/admin/roadmap-2/drive/upload') && !detail.includes("COMPOSIO_API_KEY"), "Le navigateur ne doit transmettre le fichier qu’à la route admin privée, jamais directement au fournisseur avec un secret.");
  assert(detail.includes("onDrop={handleDrop}") && detail.includes("Glissez-déposez vos fichiers") && detail.includes("Aperçu privé · Google Drive"), "Le détail doit exposer une vraie dropzone clavier/souris et un lecteur identifiable.");
  assert(detail.includes("canUploadToDrive") && detail.includes("Zone désactivée") && detail.includes("Ajout disponible après création") && detail.includes("Préparez l’espace Drive de ce nœud"), "La zone de dépôt doit rester visible et expliquer chaque prérequis lorsqu’elle est désactivée.");
  assert(detail.includes("disabled={!canUploadToDrive || Boolean(nodeDriveBusy)}") && detail.includes("if (canUploadToDrive && !nodeDriveBusy)"), "Une zone désactivée ne doit ouvrir ni sélecteur ni upload par glisser-déposer.");
  assert(client.includes("LAST_WORKSPACE_STORAGE_KEY") && client.includes("encodeURIComponent(rememberedWorkspace)") && client.includes('openDriveOnLoad ? "&drive=setup" : ""'), "La dernière roadmap choisie doit être restaurée sans perdre l’intention d’ouvrir la configuration Drive.");
  assert(previewRoute.includes("getPlatformAdmin") && previewRoute.indexOf("getPlatformAdmin") < previewRoute.indexOf("request.json()") && previewRoute.includes('"Cache-Control": "private, no-store') && previewRoute.includes('"X-Content-Type-Options": "nosniff"'), "Le lecteur doit authentifier avant le payload et renvoyer des octets privés sans sniffing.");
  assert(driveService.includes("/admin/roadmap-2/google-drive/callback") && !driveService.includes("/integrations/composio/callback?connector=google_drive"), "Le retour OAuth doit rester dans le layout admin privé, même sans tenant centre.");
  assert(driveService.includes("activeComposioConnections") && driveService.includes("connectedAccountId"), "Toutes les mutations doivent être épinglées sur le même compte que l’identité Drive affichée.");
  assert(callback.includes("drive=setup") && callback.includes("Créer l’arborescence Drive"), "Après OAuth, l’utilisateur doit revenir directement dans le parcours de configuration Drive.");
  assert(callback.includes("getRoadmap2DriveStatus") && callback.includes("verified.data.connected") && callback.includes("{0,119}"), "Le callback doit vérifier la connexion active et accepter toute clé de workspace valide avant d’annoncer un succès.");
  for (const statusLabel of ["Connexion en cours", "Connexion échouée", "Autorisation expirée", "Connexion inactive", "Autorisation révoquée"]) {
    assert(driveStatusUi.includes(statusLabel), `Le statut OAuth ${statusLabel} doit être présenté distinctement.`);
  }
  assert(client.includes("Compte confirmé par Google Drive") && client.includes("Changer / reconnecter") && client.includes("Afficher le contenu"), "Le statut Drive et l’identité confirmée doivent être visibles, avec un parcours de reconnexion explicite.");
  assert(detail.includes("Choisir des fichiers") && detail.includes("Fichiers du nœud") && detail.includes("Préparer l’espace Drive") && detail.includes("aucune copie persistée"), "Le détail d’un nœud doit permettre de préparer, alimenter et consulter son espace Drive.");
  assert(client.includes("Aucun accès Drive existant ne sera retiré") && client.includes("Ajouter / mettre à niveau") && client.includes('useState("")'), "Le partage doit être explicitement additif et ne pas préremplir arbitrairement les deux premiers comptes.");
  step("server_guards_and_ui_contract");
});
