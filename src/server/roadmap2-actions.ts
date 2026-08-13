"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/platform";
import { roadmap2DriveAutomation } from "@/server/roadmap2-drive";
import {
  Roadmap2DriveOperationConflictError,
  Roadmap2DriveOperationInProgressError,
  Roadmap2DriveOperationRepairRequiredError,
  roadmap2DriveRequestHash,
} from "@/server/roadmap2-drive-operation-runner";
import { runRoadmap2DriveOperation } from "@/server/roadmap2-drive-operations";
import {
  Roadmap2ConflictError,
  Roadmap2NotFoundError,
  Roadmap2SeedExistsError,
  Roadmap2ValidationError,
  Roadmap2WorkspaceNameExistsError,
  roadmap2EdgeInputSchema,
  roadmap2NodeInputSchema,
  resolveRoadmap2Context,
  roadmap2Repository,
} from "@/server/roadmap2";
import { roadmap2StructuralInputHash, verifyRoadmap2StructuralPreflightToken } from "@/server/roadmap2-structural-preflight";

export type Roadmap2ActionResult = {
  ok: boolean;
  id?: string;
  version?: number;
  key?: string;
  name?: string;
  error?: string;
  code?: "VALIDATION" | "CONFLICT" | "NOT_FOUND" | "PERSISTENCE";
  meta?: { nodes?: number; edges?: number };
};

function failure(error: unknown): Roadmap2ActionResult {
  if (error instanceof Roadmap2DriveOperationConflictError || error instanceof Roadmap2DriveOperationInProgressError) return { ok: false, code: "CONFLICT", error: error.message };
  if (error instanceof Roadmap2DriveOperationRepairRequiredError) return { ok: false, code: "PERSISTENCE", error: error.message };
  if (error instanceof Roadmap2ConflictError) return { ok: false, code: "CONFLICT", error: error.message };
  if (error instanceof Roadmap2NotFoundError) return { ok: false, code: "NOT_FOUND", error: error.message };
  if (error instanceof Roadmap2SeedExistsError) return { ok: false, code: "VALIDATION", error: error.message };
  if (error instanceof Roadmap2WorkspaceNameExistsError) return { ok: false, code: "VALIDATION", error: error.message };
  if (error instanceof Roadmap2ValidationError) return { ok: false, code: "VALIDATION", error: error.message };
  if (error instanceof z.ZodError) return { ok: false, code: "VALIDATION", error: error.issues[0]?.message ?? "Données invalides." };
  return { ok: false, code: "PERSISTENCE", error: "Action impossible. Réessayez ou actualisez la page." };
}

const operationKeySchema = z.string().trim().min(16, "Clé d’idempotence manquante.").max(120).regex(/^[A-Za-z0-9_-]+$/, "Clé d’idempotence invalide.");

function refreshRoadmap2() {
  revalidatePath("/admin/roadmap-2");
}

export async function createRoadmap2Workspace(name: unknown): Promise<Roadmap2ActionResult> {
  const admin = await requirePlatformAdmin();
  try {
    const workspace = await roadmap2Repository.createWorkspace(admin.userId, name);
    refreshRoadmap2();
    return { ok: true, id: workspace.id, key: workspace.key, name: workspace.name };
  } catch (error) {
    return failure(error);
  }
}

export async function renameRoadmap2Workspace(workspaceKey: string, name: unknown): Promise<Roadmap2ActionResult> {
  const { admin, workspaceId } = await resolveRoadmap2Context(workspaceKey);
  try {
    const workspace = await roadmap2Repository.renameWorkspace(workspaceId, admin.userId, name);
    refreshRoadmap2();
    return { ok: true, id: workspace.id, key: workspace.key, name: workspace.name };
  } catch (error) {
    return failure(error);
  }
}

export async function createRoadmap2Node(workspaceKey: string, input: unknown): Promise<Roadmap2ActionResult> {
  const { admin, workspaceId } = await resolveRoadmap2Context(workspaceKey);
  try {
    const created = await roadmap2Repository.createNode(workspaceId, admin.userId, input);
    refreshRoadmap2();
    return { ok: true, id: created.id, version: created.version };
  } catch (error) {
    return failure(error);
  }
}

export async function updateRoadmap2Node(workspaceKey: string, nodeId: string, expectedVersion: number, input: unknown, structuralPreflightToken?: unknown): Promise<Roadmap2ActionResult> {
  const { admin, workspaceId } = await resolveRoadmap2Context(workspaceKey);
  try {
    const parsed = roadmap2NodeInputSchema.parse(input);
    const [workspace, node, hierarchy] = await Promise.all([
      roadmap2Repository.getWorkspaceDriveContext(workspaceId),
      roadmap2Repository.getNodeDriveContext(workspaceId, nodeId),
      roadmap2Repository.getDriveHierarchy(workspaceId),
    ]);
    const preflightToken = verifyRoadmap2StructuralPreflightToken(structuralPreflightToken);
    const inputHash = roadmap2StructuralInputHash(parsed);
    const validPreflight = Boolean(preflightToken
      && preflightToken.workspaceId === workspaceId
      && preflightToken.nodeId === nodeId
      && preflightToken.expectedVersion === expectedVersion
      && preflightToken.inputHash === inputHash);
    if (node.version !== expectedVersion && !validPreflight) throw new Roadmap2ConflictError();
    const parent = parsed.parentId ? hierarchy.find((candidate) => candidate.id === parsed.parentId) : null;
    if (parsed.parentId && !parent) throw new Roadmap2NotFoundError("Parent introuvable dans ce workspace.");
    const effectiveParentId = node.isWorkspaceRoot ? null : parsed.parentId;
    const effectiveCategory = parent && !parent.isWorkspaceRoot ? parent.category : parsed.category;
    const structuralChange = node.title !== parsed.title || node.category !== effectiveCategory || node.parentId !== effectiveParentId;
    let updated: { id: string; version: number };
    if ((structuralChange || (validPreflight && node.version === expectedVersion + 1)) && node.driveFolderUrl) {
      const token = preflightToken;
      if (!validPreflight || !token) {
        throw new Roadmap2ValidationError("Prévisualisez et confirmez l’impact Google Drive avant cette modification structurelle.");
      }
      const proposedNode = { ...node, title: parsed.title, category: effectiveCategory, parentId: effectiveParentId };
      const proposedHierarchy = hierarchy.map((candidate) => candidate.id === nodeId ? proposedNode : candidate);
      const operation = await runRoadmap2DriveOperation({
        workspaceId,
        nodeId,
        actorUserId: admin.userId,
        operationType: "update_node_structure",
        idempotencyKey: `structure_${nodeId}_${expectedVersion}_${inputHash.slice(0, 24)}`,
        requestHash: roadmap2DriveRequestHash({ workspaceId, nodeId, expectedVersion, inputHash, expectedPath: token.expectedPath, allowLinkedFolder: token.allowLinkedFolder }),
        payload: { nodeId, expectedVersion, inputHash, expectedPath: token.expectedPath, allowLinkedFolder: token.allowLinkedFolder, input: parsed },
        executeProvider: () => {
          if (node.version !== expectedVersion) throw new Roadmap2ConflictError();
          return roadmap2DriveAutomation.reconcileNodeLayout({ workspaceId, rootDriveUrl: workspace.rootDriveUrl, node: proposedNode, allNodes: proposedHierarchy, allowLinkedFolder: token.allowLinkedFolder, confirmedExpectedPath: token.expectedPath });
        },
        finalize: async (_providerResult, { operationId }) => roadmap2Repository.updateNode(workspaceId, admin.userId, nodeId, expectedVersion, parsed, operationId),
      });
      updated = { id: String(operation.result.id), version: Number(operation.result.version) };
    } else {
      updated = await roadmap2Repository.updateNode(workspaceId, admin.userId, nodeId, expectedVersion, parsed);
    }
    refreshRoadmap2();
    return { ok: true, id: updated.id, version: updated.version };
  } catch (error) {
    return failure(error);
  }
}

export async function moveRoadmap2Node(workspaceKey: string, nodeId: string, expectedVersion: number, positionX: number, positionY: number): Promise<Roadmap2ActionResult> {
  const { admin, workspaceId } = await resolveRoadmap2Context(workspaceKey);
  try {
    const updated = await roadmap2Repository.updatePosition(workspaceId, admin.userId, nodeId, expectedVersion, positionX, positionY);
    refreshRoadmap2();
    return { ok: true, id: updated.id, version: updated.version };
  } catch (error) {
    return failure(error);
  }
}

export async function archiveRoadmap2Node(workspaceKey: string, nodeId: string, expectedVersion: number, allowLinkedFolder = false, rawIdempotencyKey?: unknown): Promise<Roadmap2ActionResult> {
  const { admin, workspaceId } = await resolveRoadmap2Context(workspaceKey);
  try {
    const [workspace, node, hierarchy, lifecycle] = await Promise.all([
      roadmap2Repository.getWorkspaceDriveContext(workspaceId),
      roadmap2Repository.getNodeDriveContext(workspaceId, nodeId),
      roadmap2Repository.getDriveHierarchy(workspaceId),
      roadmap2Repository.getNodeLifecycleContext(workspaceId, nodeId),
    ]);
    const clientKey = operationKeySchema.parse(rawIdempotencyKey);
    if (node.version !== expectedVersion && node.status !== "archived") throw new Roadmap2ConflictError();
    if (lifecycle.isWorkspaceRoot) return { ok: false, code: "VALIDATION", error: "Le nœud racine de la roadmap ne peut pas être archivé." };
    if (lifecycle._count.children > 0) return { ok: false, code: "VALIDATION", error: "Déplacez ou archivez d’abord les sous-nœuds actifs." };
    const requestHash = roadmap2DriveRequestHash({ workspaceId, nodeId, expectedVersion, allowLinkedFolder, purpose: "archive-node-v1" });
    const operation = await runRoadmap2DriveOperation({
      workspaceId,
      nodeId,
      actorUserId: admin.userId,
      operationType: "archive_node",
      idempotencyKey: `archive_${clientKey}`,
      requestHash,
      payload: { nodeId, expectedVersion, allowLinkedFolder },
      executeProvider: async () => {
        if (!node.driveFolderUrl) return { driveChanged: false };
        const archivedNode = { ...node, status: "archived" };
        const archivedHierarchy = hierarchy.map((candidate) => candidate.id === node.id ? archivedNode : candidate);
        const layout = await roadmap2DriveAutomation.reconcileNodeLayout({ workspaceId, rootDriveUrl: workspace.rootDriveUrl, node: archivedNode, allNodes: archivedHierarchy, allowLinkedFolder });
        return { driveChanged: true, expectedPath: layout.expectedPath };
      },
      finalize: async (_providerResult, { operationId }) => roadmap2Repository.finalizeArchiveNodeOperation(workspaceId, admin.userId, operationId, nodeId, expectedVersion),
    });
    refreshRoadmap2();
    return { ok: true, id: operation.result.id as string, version: operation.result.version as number };
  } catch (error) {
    return failure(error);
  }
}

export async function restoreRoadmap2Node(workspaceKey: string, nodeId: string, expectedVersion: number, allowLinkedFolder = false, rawIdempotencyKey?: unknown): Promise<Roadmap2ActionResult> {
  const { admin, workspaceId } = await resolveRoadmap2Context(workspaceKey);
  try {
    const [workspace, node, hierarchy, lifecycle] = await Promise.all([
      roadmap2Repository.getWorkspaceDriveContext(workspaceId),
      roadmap2Repository.getNodeDriveContext(workspaceId, nodeId),
      roadmap2Repository.getDriveHierarchy(workspaceId),
      roadmap2Repository.getNodeLifecycleContext(workspaceId, nodeId),
    ]);
    const clientKey = operationKeySchema.parse(rawIdempotencyKey);
    const requestHash = roadmap2DriveRequestHash({ workspaceId, nodeId, expectedVersion, allowLinkedFolder, purpose: "restore-node-v1" });
    const operation = await runRoadmap2DriveOperation({
      workspaceId,
      nodeId,
      actorUserId: admin.userId,
      operationType: "restore_node",
      idempotencyKey: `restore_${clientKey}`,
      requestHash,
      payload: { nodeId, expectedVersion, allowLinkedFolder },
      executeProvider: async () => {
        if (node.status !== "archived") throw new Roadmap2ConflictError("Ce nœud a déjà été restauré ou modifié.");
        if (node.version !== expectedVersion) throw new Roadmap2ConflictError();
        if (!node.driveFolderUrl) return { driveChanged: false };
        const restoredStatus = lifecycle.preArchiveStatus && lifecycle.preArchiveStatus !== "archived" ? lifecycle.preArchiveStatus : "not_started";
        const activeNode = { ...node, status: restoredStatus };
        const activeHierarchy = hierarchy.map((candidate) => candidate.id === node.id ? activeNode : candidate);
        const layout = await roadmap2DriveAutomation.reconcileNodeLayout({ workspaceId, rootDriveUrl: workspace.rootDriveUrl, node: activeNode, allNodes: activeHierarchy, allowLinkedFolder });
        return { driveChanged: true, expectedPath: layout.expectedPath };
      },
      finalize: async (_providerResult, { operationId }) => roadmap2Repository.finalizeRestoreNodeOperation(workspaceId, admin.userId, operationId, nodeId, expectedVersion),
    });
    refreshRoadmap2();
    return { ok: true, id: operation.result.id as string, version: operation.result.version as number };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteRoadmap2Node(workspaceKey: string, nodeId: string, expectedVersion: number, confirmation: string): Promise<Roadmap2ActionResult> {
  const { admin, workspaceId } = await resolveRoadmap2Context(workspaceKey);
  try {
    if (confirmation !== "preserve_drive_and_delete_node") return { ok: false, code: "VALIDATION", error: "Confirmez la conservation des documents Drive avant la suppression." };
    const deleted = await roadmap2Repository.deleteNode(workspaceId, admin.userId, nodeId, expectedVersion);
    refreshRoadmap2();
    return { ok: true, id: deleted.id };
  } catch (error) {
    return failure(error);
  }
}

export async function duplicateRoadmap2Node(workspaceKey: string, nodeId: string): Promise<Roadmap2ActionResult> {
  const { admin, workspaceId } = await resolveRoadmap2Context(workspaceKey);
  try {
    const duplicated = await roadmap2Repository.duplicateNode(workspaceId, admin.userId, nodeId);
    refreshRoadmap2();
    return { ok: true, id: duplicated.id, version: duplicated.version };
  } catch (error) {
    return failure(error);
  }
}

export async function createRoadmap2Edge(workspaceKey: string, input: unknown): Promise<Roadmap2ActionResult> {
  const { admin, workspaceId } = await resolveRoadmap2Context(workspaceKey);
  try {
    const relation = roadmap2EdgeInputSchema.parse(input);
    if (relation.relationType === "parent_child") {
      throw new Roadmap2ValidationError("Modifiez le parent depuis le formulaire du nœud afin de prévisualiser et réconcilier son classement Drive.");
    }
    const edge = await roadmap2Repository.createEdge(workspaceId, admin.userId, relation);
    refreshRoadmap2();
    return { ok: true, id: edge.id, version: edge.targetVersion };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteRoadmap2Edge(workspaceKey: string, edgeId: string): Promise<Roadmap2ActionResult> {
  const { admin, workspaceId } = await resolveRoadmap2Context(workspaceKey);
  try {
    const edge = await roadmap2Repository.deleteEdge(workspaceId, admin.userId, edgeId);
    refreshRoadmap2();
    return { ok: true, id: edge.id };
  } catch (error) {
    return failure(error);
  }
}

export async function addRoadmap2Update(workspaceKey: string, input: unknown): Promise<Roadmap2ActionResult> {
  const { admin, workspaceId } = await resolveRoadmap2Context(workspaceKey);
  try {
    const update = await roadmap2Repository.addUpdate(workspaceId, admin.userId, input);
    refreshRoadmap2();
    return { ok: true, id: update.id, version: update.version };
  } catch (error) {
    return failure(error);
  }
}

export async function setRoadmap2RootDriveUrl(workspaceKey: string, url: unknown): Promise<Roadmap2ActionResult> {
  const { admin, workspaceId } = await resolveRoadmap2Context(workspaceKey);
  try {
    await roadmap2Repository.setRootDriveUrl(workspaceId, admin.userId, url);
    refreshRoadmap2();
    return { ok: true, id: workspaceId };
  } catch (error) {
    return failure(error);
  }
}

export async function initializeRoadmap2(workspaceKey: string, setup?: unknown): Promise<Roadmap2ActionResult> {
  const { admin, workspaceId } = await resolveRoadmap2Context(workspaceKey);
  try {
    const seeded = await roadmap2Repository.seedWorkspace(workspaceId, admin.userId, setup);
    refreshRoadmap2();
    return { ok: true, id: workspaceId, meta: seeded };
  } catch (error) {
    return failure(error);
  }
}
