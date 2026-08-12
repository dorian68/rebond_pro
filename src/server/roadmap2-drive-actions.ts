"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Roadmap2ConflictError, Roadmap2NotFoundError, resolveRoadmap2Context, roadmap2Repository } from "@/server/roadmap2";
import { Roadmap2DriveAuthRequiredError, Roadmap2DriveError, Roadmap2DriveValidationError, roadmap2DriveAutomation, type Roadmap2DriveFile, type Roadmap2DriveStatus } from "@/server/roadmap2-drive";

type DriveFailureCode = "AUTH_REQUIRED" | "CONFLICT" | "NOT_FOUND" | "VALIDATION" | "UNAVAILABLE";

export type Roadmap2DriveActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; code: DriveFailureCode; error: string };

function failure(error: unknown): Roadmap2DriveActionResult<never> {
  if (error instanceof Roadmap2DriveAuthRequiredError) return { ok: false, code: "AUTH_REQUIRED", error: error.message };
  if (error instanceof Roadmap2ConflictError) return { ok: false, code: "CONFLICT", error: error.message };
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

export async function provisionRoadmap2Drive(workspaceKey: string): Promise<Roadmap2DriveActionResult<{ rootDriveUrl: string; rootCreated: boolean; foldersCreated: number }>> {
  const { admin, workspaceId } = await resolveRoadmap2Context(workspaceKey);
  try {
    const workspace = await roadmap2Repository.getWorkspaceDriveContext(workspaceId);
    const result = await roadmap2DriveAutomation.provisionWorkspace({ workspaceId, workspaceName: workspace.name, rootDriveUrl: workspace.rootDriveUrl });
    await roadmap2Repository.setRootDriveUrl(workspaceId, admin.userId, result.rootDriveUrl);
    refresh();
    return { ok: true, data: { rootDriveUrl: result.rootDriveUrl, rootCreated: result.rootCreated, foldersCreated: result.foldersCreated } };
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
    const [workspace, node] = await Promise.all([
      roadmap2Repository.getWorkspaceDriveContext(workspaceId),
      roadmap2Repository.getNodeDriveContext(workspaceId, nodeId),
    ]);
    const uploaded = await roadmap2DriveAutomation.uploadNodeFile({ workspaceId, rootDriveUrl: workspace.rootDriveUrl, nodeFolderUrl: node.driveFolderUrl, file });
    await roadmap2Repository.recordNodeDriveAudit(workspaceId, admin.userId, node.id, "node.drive_file_uploaded");
    return { ok: true, data: { file: uploaded } };
  } catch (error) {
    return failure(error);
  }
}

export async function createRoadmap2NodeDriveResources(workspaceKey: string, nodeId: string, expectedVersion: number): Promise<Roadmap2DriveActionResult<{ version: number; driveFolderUrl: string; trackingDocUrl: string; trackingPopulated: boolean }>> {
  const { admin, workspaceId } = await resolveRoadmap2Context(workspaceKey);
  try {
    const [workspace, node] = await Promise.all([
      roadmap2Repository.getWorkspaceDriveContext(workspaceId),
      roadmap2Repository.getNodeDriveContext(workspaceId, nodeId),
    ]);
    if (node.version !== expectedVersion) throw new Roadmap2ConflictError();
    const resources = await roadmap2DriveAutomation.createNodeResources({
      workspaceId,
      rootDriveUrl: workspace.rootDriveUrl,
      nodeId: node.id,
      nodeTitle: node.title,
      category: node.category,
      existingFolderUrl: node.driveFolderUrl,
      existingTrackingDocUrl: node.trackingDocUrl,
    });
    const attached = await roadmap2Repository.attachDriveResources(workspaceId, admin.userId, nodeId, expectedVersion, resources.driveFolderUrl, resources.trackingDocUrl);
    refresh();
    return { ok: true, data: { version: attached.version, driveFolderUrl: attached.driveFolderUrl!, trackingDocUrl: attached.trackingDocUrl!, trackingPopulated: resources.trackingPopulated } };
  } catch (error) {
    return failure(error);
  }
}

export async function syncRoadmap2DrivePermissions(workspaceKey: string, rawEmails: unknown): Promise<Roadmap2DriveActionResult<{ created: number; updated: number; unchanged: number }>> {
  const { admin, workspaceId } = await resolveRoadmap2Context(workspaceKey);
  try {
    const emails = z.array(z.string().trim().email("Adresse email invalide.")).min(1, "Ajoutez au moins une adresse.").max(10, "Maximum 10 collaborateurs.").parse(rawEmails);
    const workspace = await roadmap2Repository.getWorkspaceDriveContext(workspaceId);
    const result = await roadmap2DriveAutomation.syncPermissions({ workspaceId, rootDriveUrl: workspace.rootDriveUrl, emails });
    await roadmap2Repository.recordWorkspaceAudit(workspaceId, admin.userId, "workspace.drive_permissions_synced");
    return { ok: true, data: result };
  } catch (error) {
    return failure(error);
  }
}
