"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Roadmap2ConflictError, Roadmap2NotFoundError, roadmap2NodeInputSchema, resolveRoadmap2Context, roadmap2Repository } from "@/server/roadmap2";
import { Roadmap2DriveAuthRequiredError, Roadmap2DriveError, Roadmap2DriveValidationError, roadmap2DriveAutomation, type Roadmap2DriveFile, type Roadmap2DriveLayoutPreview, type Roadmap2DriveStatus } from "@/server/roadmap2-drive";
import {
  Roadmap2DriveOperationConflictError,
  Roadmap2DriveOperationInProgressError,
  Roadmap2DriveOperationRepairRequiredError,
  roadmap2DriveRequestHash,
} from "@/server/roadmap2-drive-operation-runner";
import { runRoadmap2DriveOperation } from "@/server/roadmap2-drive-operations";
import { issueRoadmap2StructuralPreflightToken, roadmap2StructuralInputHash } from "@/server/roadmap2-structural-preflight";

type DriveFailureCode = "AUTH_REQUIRED" | "CONFLICT" | "NOT_FOUND" | "VALIDATION" | "UNAVAILABLE";
const operationKeySchema = z.string().trim().min(16, "Clé d’idempotence manquante.").max(120).regex(/^[A-Za-z0-9_-]+$/, "Clé d’idempotence invalide.");

export type Roadmap2DriveActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; code: DriveFailureCode; error: string };

function failure(error: unknown): Roadmap2DriveActionResult<never> {
  if (error instanceof Roadmap2DriveAuthRequiredError) return { ok: false, code: "AUTH_REQUIRED", error: error.message };
  if (error instanceof Roadmap2ConflictError) return { ok: false, code: "CONFLICT", error: error.message };
  if (error instanceof Roadmap2DriveOperationConflictError || error instanceof Roadmap2DriveOperationInProgressError) return { ok: false, code: "CONFLICT", error: error.message };
  if (error instanceof Roadmap2DriveOperationRepairRequiredError) return { ok: false, code: "UNAVAILABLE", error: error.message };
  if (error instanceof Roadmap2NotFoundError) return { ok: false, code: "NOT_FOUND", error: error.message };
  if (error instanceof Roadmap2DriveValidationError) return { ok: false, code: "VALIDATION", error: error.message };
  if (error instanceof z.ZodError) return { ok: false, code: "VALIDATION", error: error.issues[0]?.message ?? "Données Drive invalides." };
  if (error instanceof Roadmap2DriveError) return { ok: false, code: "UNAVAILABLE", error: error.message };
  return { ok: false, code: "UNAVAILABLE", error: "Google Drive est momentanément indisponible. Réessayez sans modifier les liens manuellement." };
}

function refresh() {
  revalidatePath("/admin/roadmap-2");
}

export async function getRoadmap2DriveStatus(workspaceKey: string): Promise<Roadmap2DriveActionResult<Roadmap2DriveStatus>> {
  const { workspaceId } = await resolveRoadmap2Context(workspaceKey);
  try {
    return { ok: true, data: await roadmap2DriveAutomation.status(workspaceId) };
  } catch (error) {
    return failure(error);
  }
}

export async function connectRoadmap2Drive(workspaceKey: string): Promise<Roadmap2DriveActionResult<{ url: string }>> {
  const { workspaceId } = await resolveRoadmap2Context(workspaceKey);
  try {
    return { ok: true, data: { url: await roadmap2DriveAutomation.authLink(workspaceId, workspaceKey) } };
  } catch (error) {
    return failure(error);
  }
}

export async function provisionRoadmap2Drive(workspaceKey: string, rawIdempotencyKey: unknown): Promise<Roadmap2DriveActionResult<{ rootDriveUrl: string; rootCreated: boolean; foldersCreated: number }>> {
  const { admin, workspaceId } = await resolveRoadmap2Context(workspaceKey);
  try {
    const clientKey = operationKeySchema.parse(rawIdempotencyKey);
    const workspace = await roadmap2Repository.getWorkspaceDriveContext(workspaceId);
    const requestHash = roadmap2DriveRequestHash({ workspaceId, purpose: "stable-workspace-provision-v1" });
    const operation = await runRoadmap2DriveOperation({
      workspaceId,
      nodeId: null,
      actorUserId: admin.userId,
      operationType: "provision_workspace",
      idempotencyKey: `provision_${clientKey}`,
      requestHash,
      payload: { workspaceName: workspace.name, rootConfigured: Boolean(workspace.rootDriveUrl) },
      executeProvider: ({ operationId }) => roadmap2DriveAutomation.provisionWorkspace({ workspaceId, workspaceName: workspace.name, rootDriveUrl: workspace.rootDriveUrl, operationId }),
      finalize: async (providerResult, { operationId }) => {
        await roadmap2Repository.finalizeDriveProvision(workspaceId, admin.userId, operationId, providerResult.rootDriveUrl);
        return { rootDriveUrl: String(providerResult.rootDriveUrl), rootCreated: providerResult.rootCreated === true, foldersCreated: Number(providerResult.foldersCreated ?? 0) };
      },
    });
    refresh();
    return { ok: true, data: operation.result };
  } catch (error) {
    return failure(error);
  }
}

export async function listRoadmap2DriveFiles(workspaceKey: string, folderId?: string): Promise<Roadmap2DriveActionResult<{ folder: { id: string; name: string; url: string; parentIds: string[] }; files: Roadmap2DriveFile[]; rootId: string }>> {
  const { workspaceId } = await resolveRoadmap2Context(workspaceKey);
  try {
    const workspace = await roadmap2Repository.getWorkspaceDriveContext(workspaceId);
    return { ok: true, data: await roadmap2DriveAutomation.listFiles({ workspaceId, rootDriveUrl: workspace.rootDriveUrl, folderId }) };
  } catch (error) {
    return failure(error);
  }
}

export async function listRoadmap2NodeDriveFiles(workspaceKey: string, nodeId: string): Promise<Roadmap2DriveActionResult<{ folder: { id: string; name: string; url: string; parentIds: string[] }; files: Roadmap2DriveFile[]; rootId: string }>> {
  const { workspaceId } = await resolveRoadmap2Context(workspaceKey);
  try {
    const [workspace, node] = await Promise.all([
      roadmap2Repository.getWorkspaceDriveContext(workspaceId),
      roadmap2Repository.getNodeDriveContext(workspaceId, nodeId),
    ]);
    return { ok: true, data: await roadmap2DriveAutomation.listNodeFiles({ workspaceId, rootDriveUrl: workspace.rootDriveUrl, nodeFolderUrl: node.driveFolderUrl }) };
  } catch (error) {
    return failure(error);
  }
}

export async function uploadRoadmap2NodeDriveFile(workspaceKey: string, nodeId: string, formData: FormData): Promise<Roadmap2DriveActionResult<{ file: Roadmap2DriveFile }>> {
  const { admin, workspaceId } = await resolveRoadmap2Context(workspaceKey);
  try {
    const file = formData.get("file");
    if (!(file instanceof File)) throw new Roadmap2DriveError("Sélectionnez un fichier à ajouter.");
    const clientKey = operationKeySchema.parse(formData.get("idempotencyKey"));
    const bytes = await file.arrayBuffer();
    const contentHash = createHash("sha256").update(new Uint8Array(bytes)).digest("hex");
    const stableFile = new File([bytes], file.name, { type: file.type, lastModified: file.lastModified });
    const [workspace, node] = await Promise.all([
      roadmap2Repository.getWorkspaceDriveContext(workspaceId),
      roadmap2Repository.getNodeDriveContext(workspaceId, nodeId),
    ]);
    const requestHash = roadmap2DriveRequestHash({ workspaceId, nodeId, name: file.name, type: file.type, size: file.size, contentHash });
    const operation = await runRoadmap2DriveOperation({
      workspaceId,
      nodeId,
      actorUserId: admin.userId,
      operationType: "upload_node_file",
      idempotencyKey: `upload_${clientKey}`,
      requestHash,
      payload: { nodeId, name: file.name, type: file.type, size: file.size, contentHash },
      executeProvider: ({ operationId }) => roadmap2DriveAutomation.uploadNodeFile({ workspaceId, rootDriveUrl: workspace.rootDriveUrl, nodeFolderUrl: node.driveFolderUrl, file: stableFile, operationId }),
      finalize: async (providerResult, { operationId }) => {
        await roadmap2Repository.recordDriveOperationAudit(workspaceId, admin.userId, operationId, "node.drive_file_uploaded");
        return { file: providerResult as unknown as Roadmap2DriveFile };
      },
    });
    return { ok: true, data: operation.result as { file: Roadmap2DriveFile } };
  } catch (error) {
    return failure(error);
  }
}

export async function createRoadmap2NodeDriveResources(workspaceKey: string, nodeId: string, expectedVersion: number, rawIdempotencyKey: unknown): Promise<Roadmap2DriveActionResult<{ version: number; driveFolderUrl: string; trackingDocUrl: string; trackingPopulated: boolean }>> {
  const { admin, workspaceId } = await resolveRoadmap2Context(workspaceKey);
  try {
    const [workspace, node, hierarchy] = await Promise.all([
      roadmap2Repository.getWorkspaceDriveContext(workspaceId),
      roadmap2Repository.getNodeDriveContext(workspaceId, nodeId),
      roadmap2Repository.getDriveHierarchy(workspaceId),
    ]);
    const clientKey = operationKeySchema.parse(rawIdempotencyKey);
    if ((!node.driveFolderUrl || !node.trackingDocUrl) && node.version !== expectedVersion) throw new Roadmap2ConflictError();
    const requestHash = roadmap2DriveRequestHash({ workspaceId, nodeId, purpose: "stable-node-resources-v1" });
    const operation = await runRoadmap2DriveOperation({
      workspaceId,
      nodeId,
      actorUserId: admin.userId,
      operationType: "create_node_resources",
      idempotencyKey: `node_resources_${nodeId}_${clientKey}`,
      requestHash,
      payload: { nodeId, expectedVersion },
      executeProvider: () => roadmap2DriveAutomation.createNodeResources({
        workspaceId,
        rootDriveUrl: workspace.rootDriveUrl,
        node,
        allNodes: hierarchy,
        existingTrackingDocUrl: node.trackingDocUrl,
      }),
      finalize: async (providerResult, { operationId }) => {
        const attached = await roadmap2Repository.finalizeNodeDriveResources(workspaceId, admin.userId, operationId, nodeId, providerResult.driveFolderUrl, providerResult.trackingDocUrl);
        return { version: attached.version, driveFolderUrl: attached.driveFolderUrl, trackingDocUrl: attached.trackingDocUrl, trackingPopulated: providerResult.trackingPopulated === true };
      },
    });
    refresh();
    return { ok: true, data: operation.result };
  } catch (error) {
    return failure(error);
  }
}

export async function previewRoadmap2NodeDriveLayout(workspaceKey: string, nodeId: string, expectedVersion: number): Promise<Roadmap2DriveActionResult<Roadmap2DriveLayoutPreview>> {
  const { workspaceId } = await resolveRoadmap2Context(workspaceKey);
  try {
    const [workspace, node, hierarchy] = await Promise.all([
      roadmap2Repository.getWorkspaceDriveContext(workspaceId),
      roadmap2Repository.getNodeDriveContext(workspaceId, nodeId),
      roadmap2Repository.getDriveHierarchy(workspaceId),
    ]);
    if (node.version !== expectedVersion) throw new Roadmap2ConflictError();
    return { ok: true, data: await roadmap2DriveAutomation.previewNodeLayout({ workspaceId, rootDriveUrl: workspace.rootDriveUrl, node, allNodes: hierarchy }) };
  } catch (error) {
    return failure(error);
  }
}

export async function previewRoadmap2NodeStructuralChange(workspaceKey: string, nodeId: string, expectedVersion: number, rawInput: unknown, allowLinkedFolder = false): Promise<Roadmap2DriveActionResult<{ preview: Roadmap2DriveLayoutPreview; token: string }>> {
  const { workspaceId } = await resolveRoadmap2Context(workspaceKey);
  try {
    const input = roadmap2NodeInputSchema.parse(rawInput);
    const [workspace, node, hierarchy] = await Promise.all([
      roadmap2Repository.getWorkspaceDriveContext(workspaceId),
      roadmap2Repository.getNodeDriveContext(workspaceId, nodeId),
      roadmap2Repository.getDriveHierarchy(workspaceId),
    ]);
    if (node.version !== expectedVersion) throw new Roadmap2ConflictError();
    const parent = input.parentId ? hierarchy.find((candidate) => candidate.id === input.parentId) : null;
    if (input.parentId && !parent) throw new Roadmap2NotFoundError("Parent introuvable dans ce workspace.");
    const effectiveParentId = node.isWorkspaceRoot ? null : input.parentId;
    const effectiveCategory = parent && !parent.isWorkspaceRoot ? parent.category : input.category;
    const proposedNode = { ...node, title: input.title, category: effectiveCategory, parentId: effectiveParentId };
    const proposedHierarchy = hierarchy.map((candidate) => candidate.id === nodeId ? proposedNode : candidate);
    const preview = await roadmap2DriveAutomation.previewNodeLayout({ workspaceId, rootDriveUrl: workspace.rootDriveUrl, node: proposedNode, allNodes: proposedHierarchy });
    const token = issueRoadmap2StructuralPreflightToken({
      workspaceId,
      nodeId,
      expectedVersion,
      inputHash: roadmap2StructuralInputHash(input),
      expectedPath: preview.expectedPath,
      allowLinkedFolder,
    });
    return { ok: true, data: { preview, token } };
  } catch (error) {
    return failure(error);
  }
}

export async function reconcileRoadmap2NodeDriveLayout(workspaceKey: string, nodeId: string, expectedVersion: number, confirmedExpectedPath: string, allowLinkedFolder = false): Promise<Roadmap2DriveActionResult<Roadmap2DriveLayoutPreview>> {
  const { admin, workspaceId } = await resolveRoadmap2Context(workspaceKey);
  try {
    const confirmedPath = z.string().trim().min(1, "Vérifiez d’abord l’organisation proposée.").max(1_500, "Chemin Drive trop long.").parse(confirmedExpectedPath);
    const [workspace, node, hierarchy] = await Promise.all([
      roadmap2Repository.getWorkspaceDriveContext(workspaceId),
      roadmap2Repository.getNodeDriveContext(workspaceId, nodeId),
      roadmap2Repository.getDriveHierarchy(workspaceId),
    ]);
    if (node.version !== expectedVersion) throw new Roadmap2ConflictError();
    const requestHash = roadmap2DriveRequestHash({ workspaceId, nodeId, expectedVersion, confirmedPath, allowLinkedFolder });
    const operation = await runRoadmap2DriveOperation({
      workspaceId,
      nodeId,
      actorUserId: admin.userId,
      operationType: "reconcile_node_layout",
      idempotencyKey: `layout_${nodeId}_${expectedVersion}_${requestHash.slice(0, 24)}`,
      requestHash,
      payload: { nodeId, expectedVersion, confirmedPath, allowLinkedFolder },
      executeProvider: () => roadmap2DriveAutomation.reconcileNodeLayout({ workspaceId, rootDriveUrl: workspace.rootDriveUrl, node, allNodes: hierarchy, allowLinkedFolder, confirmedExpectedPath: confirmedPath }),
      finalize: async (providerResult, { operationId }) => {
        await roadmap2Repository.recordDriveOperationAudit(workspaceId, admin.userId, operationId, "node.drive_layout_reconciled");
        return providerResult;
      },
    });
    return { ok: true, data: operation.result as unknown as Roadmap2DriveLayoutPreview };
  } catch (error) {
    return failure(error);
  }
}

export async function syncRoadmap2DrivePermissions(workspaceKey: string, rawEmails: unknown, rawIdempotencyKey: unknown): Promise<Roadmap2DriveActionResult<{ created: number; updated: number; unchanged: number }>> {
  const { admin, workspaceId } = await resolveRoadmap2Context(workspaceKey);
  try {
    const emails = z.array(z.string().trim().email("Adresse email invalide.")).min(1, "Ajoutez au moins une adresse.").max(10, "Maximum 10 collaborateurs.").parse(rawEmails);
    const clientKey = operationKeySchema.parse(rawIdempotencyKey);
    const normalizedEmails = [...new Set(emails.map((email) => email.toLowerCase()))].sort();
    const workspace = await roadmap2Repository.getWorkspaceDriveContext(workspaceId);
    const requestHash = roadmap2DriveRequestHash({ workspaceId, emails: normalizedEmails });
    const operation = await runRoadmap2DriveOperation({
      workspaceId,
      nodeId: null,
      actorUserId: admin.userId,
      operationType: "sync_permissions",
      idempotencyKey: `permissions_${clientKey}`,
      requestHash,
      payload: { emailHashes: normalizedEmails.map((email) => roadmap2DriveRequestHash(email)) },
      executeProvider: () => roadmap2DriveAutomation.syncPermissions({ workspaceId, rootDriveUrl: workspace.rootDriveUrl, emails: normalizedEmails }),
      finalize: async (providerResult, { operationId }) => {
        await roadmap2Repository.recordDriveOperationAudit(workspaceId, admin.userId, operationId, "workspace.drive_permissions_synced");
        return providerResult;
      },
    });
    return { ok: true, data: operation.result as { created: number; updated: number; unchanged: number } };
  } catch (error) {
    return failure(error);
  }
}
