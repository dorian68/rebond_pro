"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/platform";
import { Roadmap2DriveError, roadmap2DriveAutomation } from "@/server/roadmap2-drive";
import {
  Roadmap2ConflictError,
  Roadmap2NotFoundError,
  Roadmap2SeedExistsError,
  Roadmap2ValidationError,
  Roadmap2WorkspaceNameExistsError,
  roadmap2EdgeInputSchema,
  resolveRoadmap2Context,
  roadmap2Repository,
} from "@/server/roadmap2";

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
  if (error instanceof Roadmap2ConflictError) return { ok: false, code: "CONFLICT", error: error.message };
  if (error instanceof Roadmap2NotFoundError) return { ok: false, code: "NOT_FOUND", error: error.message };
  if (error instanceof Roadmap2SeedExistsError) return { ok: false, code: "VALIDATION", error: error.message };
  if (error instanceof Roadmap2WorkspaceNameExistsError) return { ok: false, code: "VALIDATION", error: error.message };
  if (error instanceof Roadmap2ValidationError) return { ok: false, code: "VALIDATION", error: error.message };
  if (error instanceof z.ZodError) return { ok: false, code: "VALIDATION", error: error.issues[0]?.message ?? "Données invalides." };
  return { ok: false, code: "PERSISTENCE", error: "Action impossible. Réessayez ou actualisez la page." };
}

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

export async function updateRoadmap2Node(workspaceKey: string, nodeId: string, expectedVersion: number, input: unknown): Promise<Roadmap2ActionResult> {
  const { admin, workspaceId } = await resolveRoadmap2Context(workspaceKey);
  try {
    const updated = await roadmap2Repository.updateNode(workspaceId, admin.userId, nodeId, expectedVersion, input);
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

export async function archiveRoadmap2Node(workspaceKey: string, nodeId: string, expectedVersion: number, allowLinkedFolder = false): Promise<Roadmap2ActionResult> {
  const { admin, workspaceId } = await resolveRoadmap2Context(workspaceKey);
  try {
    const [workspace, node, hierarchy, lifecycle] = await Promise.all([
      roadmap2Repository.getWorkspaceDriveContext(workspaceId),
      roadmap2Repository.getNodeDriveContext(workspaceId, nodeId),
      roadmap2Repository.getDriveHierarchy(workspaceId),
      roadmap2Repository.getNodeLifecycleContext(workspaceId, nodeId),
    ]);
    if (node.version !== expectedVersion) throw new Roadmap2ConflictError();
    if (lifecycle.isWorkspaceRoot) return { ok: false, code: "VALIDATION", error: "Le nœud racine de la roadmap ne peut pas être archivé." };
    if (lifecycle._count.children > 0) return { ok: false, code: "VALIDATION", error: "Déplacez ou archivez d’abord les sous-nœuds actifs." };
    const archived = await roadmap2Repository.archiveNode(workspaceId, admin.userId, nodeId, expectedVersion);
    if (node.driveFolderUrl) {
      const archivedNode = { ...node, status: "archived" };
      const archivedHierarchy = hierarchy.map((candidate) => candidate.id === node.id ? archivedNode : candidate);
      try {
        await roadmap2DriveAutomation.reconcileNodeLayout({ workspaceId, rootDriveUrl: workspace.rootDriveUrl, node: archivedNode, allNodes: archivedHierarchy, allowLinkedFolder });
      } catch (error) {
        try {
          await roadmap2Repository.restoreNode(workspaceId, admin.userId, nodeId, expectedVersion + 1);
        } catch {
          throw new Roadmap2DriveError("L’archivage Drive a échoué et l’état du nœud n’a pas pu être restauré automatiquement. Actualisez la roadmap avant toute nouvelle action.");
        }
        throw error;
      }
      // L’archivage métier est déjà audité dans la transaction DB. Cet audit
      // complémentaire ne doit jamais déclencher une compensation Drive après succès.
      await roadmap2Repository.recordNodeDriveAudit(workspaceId, admin.userId, node.id, "node.drive_folder_archived").catch((error: unknown) => {
        console.error(JSON.stringify({ event: "roadmap2.drive_audit_failed", action: "archive", workspaceId, nodeId, error: error instanceof Error ? error.name : "unknown" }));
      });
    }
    refreshRoadmap2();
    return { ok: true, id: archived.id };
  } catch (error) {
    return failure(error);
  }
}

export async function restoreRoadmap2Node(workspaceKey: string, nodeId: string, expectedVersion: number, allowLinkedFolder = false): Promise<Roadmap2ActionResult> {
  const { admin, workspaceId } = await resolveRoadmap2Context(workspaceKey);
  try {
    const [workspace, node, hierarchy] = await Promise.all([
      roadmap2Repository.getWorkspaceDriveContext(workspaceId),
      roadmap2Repository.getNodeDriveContext(workspaceId, nodeId),
      roadmap2Repository.getDriveHierarchy(workspaceId),
    ]);
    if (node.version !== expectedVersion || node.status !== "archived") throw new Roadmap2ConflictError();
    const restored = await roadmap2Repository.restoreNode(workspaceId, admin.userId, nodeId, expectedVersion);
    if (node.driveFolderUrl) {
      const activeNode = { ...node, status: "not_started" };
      const activeHierarchy = hierarchy.map((candidate) => candidate.id === node.id ? activeNode : candidate);
      try {
        await roadmap2DriveAutomation.reconcileNodeLayout({ workspaceId, rootDriveUrl: workspace.rootDriveUrl, node: activeNode, allNodes: activeHierarchy, allowLinkedFolder });
      } catch (error) {
        try {
          await roadmap2Repository.archiveNode(workspaceId, admin.userId, nodeId, restored.version);
        } catch {
          throw new Roadmap2DriveError("La restauration Drive a échoué et l’état archivé n’a pas pu être rétabli automatiquement. Actualisez la roadmap avant toute nouvelle action.");
        }
        throw error;
      }
      await roadmap2Repository.recordNodeDriveAudit(workspaceId, admin.userId, node.id, "node.drive_folder_restored").catch((error: unknown) => {
        console.error(JSON.stringify({ event: "roadmap2.drive_audit_failed", action: "restore", workspaceId, nodeId, error: error instanceof Error ? error.name : "unknown" }));
      });
    }
    refreshRoadmap2();
    return { ok: true, id: restored.id, version: restored.version };
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

export async function createRoadmap2Edge(workspaceKey: string, input: unknown, expectedTargetVersion?: number): Promise<Roadmap2ActionResult> {
  const { admin, workspaceId } = await resolveRoadmap2Context(workspaceKey);
  try {
    const relation = roadmap2EdgeInputSchema.parse(input);
    const targetVersion = relation.relationType === "parent_child"
      ? z.number().int().positive().parse(expectedTargetVersion)
      : undefined;
    const edge = await roadmap2Repository.createEdge(workspaceId, admin.userId, relation, targetVersion);
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

export async function initializeRoadmap2(workspaceKey: string): Promise<Roadmap2ActionResult> {
  const { admin, workspaceId } = await resolveRoadmap2Context(workspaceKey);
  try {
    const seeded = await roadmap2Repository.seedWorkspace(workspaceId, admin.userId);
    refreshRoadmap2();
    return { ok: true, id: workspaceId, meta: seeded };
  } catch (error) {
    return failure(error);
  }
}
