"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/platform";
import {
  Roadmap2ConflictError,
  Roadmap2NotFoundError,
  Roadmap2SeedExistsError,
  Roadmap2WorkspaceNameExistsError,
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

export async function archiveRoadmap2Node(workspaceKey: string, nodeId: string, expectedVersion: number): Promise<Roadmap2ActionResult> {
  const { admin, workspaceId } = await resolveRoadmap2Context(workspaceKey);
  try {
    const archived = await roadmap2Repository.archiveNode(workspaceId, admin.userId, nodeId, expectedVersion);
    refreshRoadmap2();
    return { ok: true, id: archived.id };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteRoadmap2Node(workspaceKey: string, nodeId: string): Promise<Roadmap2ActionResult> {
  const { admin, workspaceId } = await resolveRoadmap2Context(workspaceKey);
  try {
    const deleted = await roadmap2Repository.deleteNode(workspaceId, admin.userId, nodeId);
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
    const edge = await roadmap2Repository.createEdge(workspaceId, admin.userId, input);
    refreshRoadmap2();
    return { ok: true, id: edge.id };
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
