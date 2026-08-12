import "./_env";

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ROADMAP2_DRIVE_STRUCTURE,
  Roadmap2DriveError,
  Roadmap2DriveValidationError,
  createRoadmap2DriveAutomation,
  extractRoadmap2DriveFolderId,
  unwrapRoadmap2DriveResult,
  type Roadmap2DriveDriver,
} from "../src/server/roadmap2-drive";
import { assert, runner, step } from "./_tenant";

const FOLDER_MIME = "application/vnd.google-apps.folder";
const DOC_MIME = "application/vnd.google-apps.document";

type FakeItem = {
  id: string;
  name: string;
  mimeType: string;
  parents: string[];
  trashed: boolean;
  webViewLink: string;
  modifiedTime: string;
  size: string | null;
  owners?: Array<{ emailAddress: string }>;
  permissions?: Array<{ id: string; emailAddress: string; role: string; type: string }>;
};

class FakeDrive implements Roadmap2DriveDriver {
  items = new Map<string, FakeItem>();
  uploads = 0;
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
  async status() { return { connected: true, status: "ACTIVE" }; }
  async authLink() { return "https://auth.composio.dev/connect/roadmap2-test"; }
  async uploadText(name: string) {
    this.uploads += 1;
    return { name: `${name}.txt`, mimetype: "text/plain", s3key: `roadmap2/${name}.txt` };
  }
  async uploadFile(file: File) {
    this.uploads += 1;
    return { name: file.name, mimetype: file.type, s3key: `roadmap2/${file.name}` };
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
      const files = [...this.items.values()].filter((item) => item.parents.includes(parentId)
        && (!requestedName || item.name === requestedName)
        && (!containedName || item.name.includes(containedName))
        && (!mimeMatch?.[1] || item.mimeType === mimeMatch[1])
        && !item.trashed);
      return { successful: true, data: { files } };
    }
    if (tool === "GOOGLEDRIVE_CREATE_PERMISSION") {
      const root = this.items.get(String(args.file_id));
      if (!root) return { successful: false, error: "not found" };
      root.permissions ??= [];
      root.permissions.push({ id: `permission-${++this.sequence}`, emailAddress: String(args.email_address), role: String(args.role), type: String(args.type) });
      return { successful: true, data: { id: root.permissions.at(-1)?.id } };
    }
    if (tool === "GOOGLEDRIVE_UPDATE_PERMISSION") {
      const root = this.items.get(String(args.fileId));
      const permission = root?.permissions?.find((candidate) => candidate.id === args.permissionId);
      if (!permission) return { successful: false, error: "not found" };
      const payload = args.permission as { role?: string };
      permission.role = payload.role ?? permission.role;
      return { successful: true, data: permission };
    }
    return { successful: false, error: `unsupported ${tool}` };
  }
}

runner("roadmap_2_drive_smoke", async () => {
  const driver = new FakeDrive();
  const drive = createRoadmap2DriveAutomation(driver);
  const workspaceId = "workspace-drive-smoke";

  const status = await drive.status(workspaceId);
  assert(status.connected && status.enabled, "Le statut connecté doit être renvoyé sans exposer de jeton.");
  assert((await drive.authLink(workspaceId, "roadmap-test")).startsWith("https://auth.composio.dev/"), "Le lien OAuth doit être HTTPS et limité à un hôte autorisé.");
  step("oauth_status_and_redirect_validated");

  const first = await drive.provisionWorkspace({ workspaceId, workspaceName: "LE BON REBOND", rootDriveUrl: null });
  const expectedFolders = ROADMAP2_DRIVE_STRUCTURE.reduce((count, entry) => count + 1 + ("children" in entry ? entry.children.length : 0), 0);
  assert(first.rootCreated && first.foldersCreated === expectedFolders, `L’arborescence complète doit être créée (${expectedFolders} dossiers attendus).`);
  const second = await drive.provisionWorkspace({ workspaceId, workspaceName: "LE BON REBOND", rootDriveUrl: first.rootDriveUrl });
  assert(!second.rootCreated && second.foldersCreated === 0 && second.rootId === first.rootId, "Une seconde initialisation doit réutiliser l’arborescence sans doublon.");
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

  const resources = await drive.createNodeResources({ workspaceId, rootDriveUrl: first.rootDriveUrl, nodeId: "node-audit-1", nodeTitle: "Audit association", category: "strategy_governance" });
  const repeatedResources = await drive.createNodeResources({ workspaceId, rootDriveUrl: first.rootDriveUrl, nodeId: "node-audit-1", nodeTitle: "Audit association renommé", category: "strategy_governance" });
  assert(resources.driveFolderUrl === repeatedResources.driveFolderUrl && resources.trackingDocUrl === repeatedResources.trackingDocUrl, "Les ressources d’un nœud doivent être retrouvées plutôt que dupliquées.");
  assert(driver.uploads === 1 && resources.trackingPopulated, "Le modèle de suivi doit être importé une seule fois dans un Google Doc natif.");
  const sameTitleOtherNode = await drive.createNodeResources({ workspaceId, rootDriveUrl: first.rootDriveUrl, nodeId: "node-audit-2", nodeTitle: "Audit association", category: "strategy_governance" });
  assert(sameTitleOtherNode.driveFolderUrl !== resources.driveFolderUrl, "Deux nœuds distincts de même titre doivent conserver des dossiers Drive distincts.");
  step("node_folder_and_tracking_doc_idempotent");

  const beforeUpload = await drive.listNodeFiles({ workspaceId, rootDriveUrl: first.rootDriveUrl, nodeFolderUrl: resources.driveFolderUrl });
  assert(beforeUpload.files.some((file) => file.url === resources.trackingDocUrl), "Le contenu du dossier d’un nœud doit être listable sans sortir de sa racine.");
  const uploaded = await drive.uploadNodeFile({ workspaceId, rootDriveUrl: first.rootDriveUrl, nodeFolderUrl: resources.driveFolderUrl, file: new File(["preuve"], "decision.pdf", { type: "application/pdf" }) });
  assert(uploaded.name === "decision.pdf" && uploaded.url.startsWith("https://drive.google.com/"), "Un fichier utilisateur doit être ajouté directement au dossier Drive du nœud.");
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

  const permissions = await drive.syncPermissions({ workspaceId, rootDriveUrl: first.rootDriveUrl, emails: ["owner@example.com", "mathurin@example.com", "dorian@example.com"] });
  assert(permissions.created === 1 && permissions.updated === 1 && permissions.unchanged === 1, "La synchronisation doit créer, promouvoir ou conserver chaque permission selon son état.");
  const permissionsAgain = await drive.syncPermissions({ workspaceId, rootDriveUrl: first.rootDriveUrl, emails: ["owner@example.com", "mathurin@example.com", "dorian@example.com"] });
  assert(permissionsAgain.unchanged === 3, "La synchronisation des permissions doit être idempotente.");
  step("shared_permissions_idempotent");

  assert(extractRoadmap2DriveFolderId(first.rootDriveUrl) === first.rootId, "L’identifiant du dossier racine doit être extrait d’une URL Drive valide.");
  assert(extractRoadmap2DriveFolderId("https://drive.google.com.evil.invalid/drive/folders/root") === null, "Un faux domaine Drive doit être rejeté.");
  assert(unwrapRoadmap2DriveResult({ successful: true, data: { data: { id: "nested" } } }).id === "nested", "Les réponses imbriquées du fournisseur doivent être normalisées.");

  const actions = readFileSync(join(process.cwd(), "src/server/roadmap2-drive-actions.ts"), "utf8");
  const driveService = readFileSync(join(process.cwd(), "src/server/roadmap2-drive.ts"), "utf8");
  const client = readFileSync(join(process.cwd(), "src/app/admin/roadmap-2/roadmap2-client.tsx"), "utf8");
  const detail = readFileSync(join(process.cwd(), "src/app/admin/roadmap-2/roadmap2-detail.tsx"), "utf8");
  const callback = readFileSync(join(process.cwd(), "src/app/admin/roadmap-2/google-drive/callback/page.tsx"), "utf8");
  const uploadRoute = readFileSync(join(process.cwd(), "src/app/api/admin/roadmap-2/drive/upload/route.ts"), "utf8");
  const actionNames = ["getRoadmap2DriveStatus", "connectRoadmap2Drive", "provisionRoadmap2Drive", "listRoadmap2DriveFiles", "listRoadmap2NodeDriveFiles", "uploadRoadmap2NodeDriveFile", "createRoadmap2NodeDriveResources", "syncRoadmap2DrivePermissions"];
  for (const name of actionNames) assert(actions.includes(`function ${name}`), `Action Drive manquante : ${name}`);
  assert((actions.match(/resolveRoadmap2Context\(workspaceKey\)/g) ?? []).length === actionNames.length, "Chaque action Drive doit recalculer côté serveur le workspace et le rôle admin.");
  assert(!actions.includes("console.") && !client.includes("COMPOSIO_API_KEY"), "Les secrets et réponses Drive ne doivent pas être journalisés ni envoyés au client.");
  assert(uploadRoute.includes("getPlatformAdmin") && uploadRoute.indexOf("getPlatformAdmin") < uploadRoute.indexOf("request.formData()"), "La route d’upload doit refuser un utilisateur non admin avant de lire son fichier.");
  assert(uploadRoute.includes("uploadRoadmap2NodeDriveFile") && uploadRoute.includes('"Cache-Control": "private, no-store"'), "L’upload doit passer par une route admin privée sans cache et réutiliser les gardes serveur.");
  assert(detail.includes('/api/admin/roadmap-2/drive/upload') && !detail.includes("COMPOSIO_API_KEY"), "Le navigateur ne doit transmettre le fichier qu’à la route admin privée, jamais directement au fournisseur avec un secret.");
  assert(driveService.includes("/admin/roadmap-2/google-drive/callback") && !driveService.includes("/integrations/composio/callback?connector=google_drive"), "Le retour OAuth doit rester dans le layout admin privé, même sans tenant centre.");
  assert(callback.includes("drive=setup") && callback.includes("Créer l’arborescence Drive"), "Après OAuth, l’utilisateur doit revenir directement dans le parcours de configuration Drive.");
  assert(callback.includes("getRoadmap2DriveStatus") && callback.includes("verified.data.connected") && callback.includes("{0,119}"), "Le callback doit vérifier la connexion active et accepter toute clé de workspace valide avant d’annoncer un succès.");
  assert(client.includes("Connecté") && client.includes("Reconnexion requise") && client.includes("Changer / reconnecter") && client.includes("Afficher le contenu"), "Le statut Drive doit être visible en permanence et le parcours de reconnexion explicite.");
  assert(detail.includes("Ajouter des fichiers") && detail.includes("Fichiers du nœud") && detail.includes("Préparer l’espace Drive") && detail.includes("Roadmap 2 ne conserve aucune copie"), "Le détail d’un nœud doit permettre de préparer, alimenter et consulter son espace Drive.");
  assert(client.includes("Aucun accès Drive existant ne sera retiré") && client.includes("Ajouter / mettre à niveau") && client.includes('useState("")'), "Le partage doit être explicitement additif et ne pas préremplir arbitrairement les deux premiers comptes.");
  step("server_guards_and_ui_contract");
});
