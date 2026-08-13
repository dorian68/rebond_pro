import "./_env";

import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/prisma";
import { roadmap2Repository } from "../src/server/roadmap2";
import { roadmap2DriveOperationRepository, getRoadmap2DriveOperationForRepair, listRoadmap2DriveOperationsNeedingRepair } from "../src/server/roadmap2-drive-operations";
import { sanitizeRoadmap2DriveOperationError, type Roadmap2DriveOperationJson } from "../src/server/roadmap2-drive-operation-runner";

function stringValue(value: unknown, name: string) {
  if (typeof value !== "string" || !value) throw new Error(`Résultat fournisseur incomplet : ${name}.`);
  return value;
}

function numberValue(value: unknown, name: string) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) throw new Error(`Payload de réparation incomplet : ${name}.`);
  return value;
}

async function operationLedgerAvailable() {
  const rows = await prisma.$queryRaw<Array<{ available: boolean }>>`
    SELECT to_regclass(format('%I.%I', current_schema(), 'Roadmap2DriveOperation')) IS NOT NULL AS available
  `;
  return rows[0]?.available === true;
}

async function finalizeOperation(operationId: string) {
  const operation = await getRoadmap2DriveOperationForRepair(operationId);
  if (!operation) throw new Error("Opération Drive introuvable.");
  if (!operation.actorUserId) throw new Error("L’acteur d’origine a été supprimé : assignez explicitement un acteur avant réparation.");
  if (!["provider_succeeded", "needs_repair"].includes(operation.status)) throw new Error(`Cette opération n’est pas finalisable hors fournisseur (statut ${operation.status}).`);
  const payload = operation.payload as Roadmap2DriveOperationJson;
  const providerResult = operation.providerResult as Roadmap2DriveOperationJson | null;
  if (!providerResult) throw new Error("Aucun résultat fournisseur durable n’est disponible. Le client doit réessayer avec la même clé.");
  const token = `repair-cli-${randomUUID()}`;
  const acquired = await roadmap2DriveOperationRepository.acquire(operation.id, token, new Date(), new Date(Date.now() + 120_000));
  if (!acquired) throw new Error("L’opération est actuellement louée par un autre processus.");

  try {
    let result: Roadmap2DriveOperationJson;
    if (operation.operationType === "provision_workspace") {
      const rootDriveUrl = stringValue(providerResult.rootDriveUrl, "rootDriveUrl");
      await roadmap2Repository.finalizeDriveProvision(operation.workspaceId, operation.actorUserId, operation.id, rootDriveUrl);
      result = { rootDriveUrl, rootCreated: providerResult.rootCreated === true, foldersCreated: Number(providerResult.foldersCreated ?? 0) };
    } else if (operation.operationType === "create_node_resources") {
      if (!operation.nodeId) throw new Error("nodeId absent de l’opération.");
      const attached = await roadmap2Repository.finalizeNodeDriveResources(operation.workspaceId, operation.actorUserId, operation.id, operation.nodeId, providerResult.driveFolderUrl, providerResult.trackingDocUrl);
      result = { version: attached.version, driveFolderUrl: attached.driveFolderUrl, trackingDocUrl: attached.trackingDocUrl, trackingPopulated: providerResult.trackingPopulated === true };
    } else if (operation.operationType === "archive_node") {
      if (!operation.nodeId) throw new Error("nodeId absent de l’opération.");
      result = await roadmap2Repository.finalizeArchiveNodeOperation(operation.workspaceId, operation.actorUserId, operation.id, operation.nodeId, numberValue(payload.expectedVersion, "expectedVersion"));
    } else if (operation.operationType === "restore_node") {
      if (!operation.nodeId) throw new Error("nodeId absent de l’opération.");
      result = await roadmap2Repository.finalizeRestoreNodeOperation(operation.workspaceId, operation.actorUserId, operation.id, operation.nodeId, numberValue(payload.expectedVersion, "expectedVersion"));
    } else if (operation.operationType === "update_node_structure") {
      if (!operation.nodeId) throw new Error("nodeId absent de l’opération.");
      if (!payload.input || typeof payload.input !== "object" || Array.isArray(payload.input)) throw new Error("Input structurel absent de l’opération.");
      result = await roadmap2Repository.updateNode(operation.workspaceId, operation.actorUserId, operation.nodeId, numberValue(payload.expectedVersion, "expectedVersion"), payload.input, operation.id);
    } else {
      const action = operation.operationType === "upload_node_file"
        ? "node.drive_file_uploaded"
        : operation.operationType === "reconcile_node_layout"
          ? "node.drive_layout_reconciled"
          : "workspace.drive_permissions_synced";
      await roadmap2Repository.recordDriveOperationAudit(operation.workspaceId, operation.actorUserId, operation.id, action);
      result = operation.operationType === "upload_node_file" ? { file: providerResult } : providerResult;
    }

    await roadmap2DriveOperationRepository.markSucceeded(operation.id, token, result, new Date());
    return { id: operation.id, status: "succeeded", operationType: operation.operationType };
  } catch (error) {
    await roadmap2DriveOperationRepository.markNeedsRepair(operation.id, token, error instanceof Error ? error.name : "REPAIR_ERROR", sanitizeRoadmap2DriveOperationError(error));
    throw error;
  }
}

async function main() {
  const operationId = process.argv.find((argument) => argument.startsWith("--finalize="))?.slice("--finalize=".length).trim();
  if (!await operationLedgerAvailable()) {
    console.log(JSON.stringify({ step: "roadmap2_drive_repair_unavailable", status: "pass", available: false, reason: "ROADMAP2_DRIVE_OPERATION_NOT_DEPLOYED", nextAction: "Confirmer une sauvegarde restaurable puis exécuter la procédure de baseline/migration validée sur clone." }));
    return;
  }
  if (operationId) {
    console.log(JSON.stringify({ step: "roadmap2_drive_repair", status: "pass", operation: await finalizeOperation(operationId) }));
    return;
  }
  const workspaceId = process.argv.find((argument) => argument.startsWith("--workspace-id="))?.slice("--workspace-id=".length).trim();
  const operations = await listRoadmap2DriveOperationsNeedingRepair(workspaceId);
  console.log(JSON.stringify({ step: "roadmap2_drive_repair_queue", status: "pass", count: operations.length, operations }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ step: "roadmap2_drive_repair", status: "fail", error: error instanceof Error ? error.message : "Erreur inconnue" }));
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());
