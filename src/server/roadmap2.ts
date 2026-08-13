import "server-only";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin, type PlatformAdmin } from "@/lib/platform";
import {
  ROADMAP2_CATEGORIES,
  ROADMAP2_NODE_TYPES,
  ROADMAP2_PRIORITIES,
  ROADMAP2_RELATION_TYPES,
  ROADMAP2_STATUSES,
  ROADMAP2_UPDATE_TYPES,
  ROADMAP2_WORKSPACE_KEY,
  type Roadmap2Data,
  type Roadmap2NodeDto,
  type Roadmap2Owner,
} from "@/lib/roadmap2";
import { buildRoadmap2Seed } from "@/server/roadmap2-seed";

const MAX_DRIVE_URL_LENGTH = 2048;
const DRIVE_HOSTS = new Set(["drive.google.com", "docs.google.com"]);

function platformAdminEmails() {
  return (process.env.PLATFORM_ADMIN_EMAILS ?? "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
}

const optionalText = (max: number) => z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? null : value,
  z.union([z.string().trim().max(max), z.null()]),
);

const optionalDate = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? null : value,
  z.union([
    z.null(),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide.").refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)), "Date invalide."),
  ]),
);

export const roadmap2DriveUrlSchema = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? null : value,
  z.union([
    z.null(),
    z.string().trim().max(MAX_DRIVE_URL_LENGTH, "URL trop longue.").url("URL invalide.").refine((value) => {
      try {
        const url = new URL(value);
        return url.protocol === "https:" && DRIVE_HOSTS.has(url.hostname.toLowerCase());
      } catch {
        return false;
      }
    }, "Utilisez une URL HTTPS drive.google.com ou docs.google.com."),
  ]),
);

export const roadmap2WorkspaceNameSchema = z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères.").max(100, "Nom trop long.");
const roadmap2WorkspaceKeySchema = z.string().trim().min(1).max(120).regex(/^[a-z0-9-]+$/);

export const roadmap2NodeInputSchema = z.object({
  title: z.string().trim().min(1, "Le titre est obligatoire.").max(200, "Titre trop long."),
  description: optionalText(6000),
  expectedOutcome: optionalText(2000),
  type: z.enum(ROADMAP2_NODE_TYPES),
  category: z.enum(ROADMAP2_CATEGORIES),
  status: z.enum(ROADMAP2_STATUSES),
  priority: z.enum(ROADMAP2_PRIORITIES),
  progressPercent: z.coerce.number().int().min(0).max(100),
  ownerUserId: z.preprocess((value) => value === "" ? null : value, z.union([z.string().min(1).max(100), z.null()])),
  startDate: optionalDate,
  dueDate: optionalDate,
  nextAction: optionalText(1000),
  decisionRequired: z.coerce.boolean(),
  definitionOfDone: optionalText(2000),
  driveFolderUrl: roadmap2DriveUrlSchema,
  trackingDocUrl: roadmap2DriveUrlSchema,
  parentId: z.preprocess((value) => value === "" ? null : value, z.union([z.string().min(1).max(100), z.null()])),
  positionX: z.coerce.number().finite().min(-100000).max(100000),
  positionY: z.coerce.number().finite().min(-100000).max(100000),
  width: z.preprocess((value) => value === "" || value == null ? null : value, z.union([z.coerce.number().finite().min(180).max(800), z.null()])),
}).superRefine((value, ctx) => {
  if (value.startDate && value.dueDate && value.startDate > value.dueDate) {
    ctx.addIssue({ code: "custom", path: ["dueDate"], message: "L’échéance doit être postérieure à la date de début." });
  }
});

export type Roadmap2NodeInput = z.infer<typeof roadmap2NodeInputSchema>;

export const roadmap2EdgeInputSchema = z.object({
  sourceNodeId: z.string().min(1).max(100),
  targetNodeId: z.string().min(1).max(100),
  relationType: z.enum(ROADMAP2_RELATION_TYPES),
}).refine((value) => value.sourceNodeId !== value.targetNodeId, { message: "Un nœud ne peut pas être relié à lui-même." });

export const roadmap2UpdateInputSchema = z.object({
  nodeId: z.string().min(1).max(100),
  nodeVersion: z.coerce.number().int().positive(),
  updateType: z.enum(ROADMAP2_UPDATE_TYPES),
  body: z.string().trim().min(1, "La mise à jour est vide.").max(2000, "Mise à jour trop longue."),
});

export const roadmap2SeedSetupSchema = z.object({
  anchorDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date d’ancrage invalide.").refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)), "Date d’ancrage invalide."),
  ownerByCategory: z.record(z.enum(ROADMAP2_CATEGORIES), z.string().min(1).max(100)),
}).superRefine((value, ctx) => {
  for (const category of ROADMAP2_CATEGORIES) if (!value.ownerByCategory[category]) ctx.addIssue({ code: "custom", path: ["ownerByCategory", category], message: "Choisissez un responsable pour chaque phase." });
});

export class Roadmap2ConflictError extends Error {
  constructor(message = "Ce nœud a été modifié par une autre personne. Actualisez avant de réessayer.") {
    super(message);
    this.name = "Roadmap2ConflictError";
  }
}

export class Roadmap2NotFoundError extends Error {
  constructor(message = "Élément introuvable dans ce workspace.") {
    super(message);
    this.name = "Roadmap2NotFoundError";
  }
}

export class Roadmap2SeedExistsError extends Error {
  constructor() {
    super("La roadmap contient déjà des éléments. L’initialisation n’a pas été rejouée.");
    this.name = "Roadmap2SeedExistsError";
  }
}

export class Roadmap2WorkspaceNameExistsError extends Error {
  constructor() {
    super("Une roadmap porte déjà ce nom. Choisissez un nom distinct pour éviter toute confusion.");
    this.name = "Roadmap2WorkspaceNameExistsError";
  }
}

export class Roadmap2ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "Roadmap2ValidationError";
  }
}

function dateFromInput(value: string | null): Date | null {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

function dateToInput(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

function ownerDto(user: { id: string; name: string | null; email: string } | null): Roadmap2Owner | null {
  if (!user) return null;
  return { id: user.id, name: user.name?.trim() || user.email.split("@")[0], email: user.email };
}

type Roadmap2Db = Pick<Prisma.TransactionClient, "roadmap2Node">;

async function assertAcyclicParent(db: Roadmap2Db, workspaceId: string, nodeId: string, parentId: string | null) {
  if (!parentId) return;
  if (parentId === nodeId) throw new Roadmap2ValidationError("Un nœud ne peut pas être son propre parent.");
  const visited = new Set<string>([nodeId]);
  let cursor: string | null = parentId;
  for (let depth = 0; cursor && depth < 200; depth += 1) {
    if (visited.has(cursor)) throw new Roadmap2ValidationError("Cette hiérarchie créerait une boucle parent-enfant.");
    visited.add(cursor);
    const parent: { parentId: string | null } | null = await db.roadmap2Node.findFirst({ where: { id: cursor, workspaceId }, select: { parentId: true } });
    if (!parent) throw new Roadmap2NotFoundError("Parent introuvable dans ce workspace.");
    cursor = parent.parentId;
  }
  if (cursor) throw new Roadmap2ValidationError("La hiérarchie dépasse la profondeur autorisée.");
}

async function inheritedNodeInput(db: Roadmap2Db, workspaceId: string, input: Roadmap2NodeInput) {
  if (!input.parentId) return input;
  const parent = await db.roadmap2Node.findFirst({ where: { id: input.parentId, workspaceId }, select: { category: true, isWorkspaceRoot: true, archivedAt: true } });
  if (!parent) throw new Roadmap2NotFoundError("Parent introuvable dans ce workspace.");
  if (parent.archivedAt) throw new Roadmap2ValidationError("Un nœud actif ne peut pas être placé sous un parent archivé.");
  if (input.type === "phase" && !parent.isWorkspaceRoot) throw new Roadmap2ValidationError("Une phase doit être sans parent ou directement rattachée au nœud racine.");
  return parent.isWorkspaceRoot ? input : { ...input, category: parent.category };
}

async function descendantIds(db: Roadmap2Db, workspaceId: string, nodeId: string) {
  const ids: string[] = [];
  let frontier = [nodeId];
  const visited = new Set(frontier);
  for (let depth = 0; frontier.length && depth < 200; depth += 1) {
    const rows = await db.roadmap2Node.findMany({
      where: { workspaceId, parentId: { in: frontier } },
      select: { id: true },
    });
    frontier = [];
    for (const row of rows) {
      if (visited.has(row.id)) throw new Roadmap2ValidationError("La hiérarchie de la roadmap contient une boucle.");
      visited.add(row.id);
      ids.push(row.id);
      frontier.push(row.id);
    }
  }
  if (frontier.length) throw new Roadmap2ValidationError("La hiérarchie dépasse la profondeur autorisée.");
  return ids;
}

type IncludedNode = Prisma.Roadmap2NodeGetPayload<{
  include: {
    owner: { select: { id: true; name: true; email: true } };
    updatedBy: { select: { id: true; name: true; email: true } };
    updates: {
      include: { author: { select: { id: true; name: true; email: true } } };
      orderBy: { createdAt: "desc" };
    };
  };
}>;

function nodeDto(row: IncludedNode): Roadmap2NodeDto {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    expectedOutcome: row.expectedOutcome,
    type: row.type,
    category: row.category,
    status: row.status,
    priority: row.priority,
    progressPercent: Math.max(0, Math.min(100, row.progressPercent)),
    ownerUserId: row.ownerUserId,
    owner: ownerDto(row.owner),
    startDate: dateToInput(row.startDate),
    dueDate: dateToInput(row.dueDate),
    nextAction: row.nextAction,
    decisionRequired: row.decisionRequired,
    definitionOfDone: row.definitionOfDone,
    driveFolderUrl: row.driveFolderUrl,
    trackingDocUrl: row.trackingDocUrl,
    parentId: row.parentId,
    positionX: row.positionX,
    positionY: row.positionY,
    width: row.width,
    isWorkspaceRoot: row.isWorkspaceRoot,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    updatedBy: ownerDto(row.updatedBy),
    updates: row.updates.map((update) => ({
      id: update.id,
      nodeId: update.nodeId,
      updateType: update.updateType,
      body: update.body,
      author: ownerDto(update.author),
      createdAt: update.createdAt.toISOString(),
      editedAt: update.editedAt?.toISOString() ?? null,
    })),
  };
}

async function assertScopedNode(workspaceId: string, nodeId: string) {
  const node = await prisma.roadmap2Node.findFirst({ where: { id: nodeId, workspaceId }, select: { id: true, parentId: true, version: true } });
  if (!node) throw new Roadmap2NotFoundError();
  return node;
}

async function assertAllowedOwner(actorUserId: string, ownerUserId: string | null) {
  if (!ownerUserId || ownerUserId === actorUserId) return;
  const owner = await prisma.user.findUnique({ where: { id: ownerUserId }, select: { platformAdmin: true, email: true } });
  if (!owner || (!owner.platformAdmin && !platformAdminEmails().includes(owner.email.toLowerCase()))) throw new Roadmap2NotFoundError("Responsable non autorisé.");
}

async function writeAudit(tx: Prisma.TransactionClient, workspaceId: string, actorUserId: string, action: string, entityType: string, entityId?: string) {
  await tx.roadmap2AuditLog.create({ data: { workspaceId, actorUserId, action, entityType, entityId } });
}

function mutationData(input: Roadmap2NodeInput, actorUserId: string) {
  return {
    title: input.title,
    description: input.description,
    expectedOutcome: input.expectedOutcome,
    type: input.type,
    category: input.category,
    status: input.status,
    priority: input.priority,
    progressPercent: input.status === "completed" ? 100 : input.progressPercent,
    ownerUserId: input.ownerUserId,
    startDate: dateFromInput(input.startDate),
    dueDate: dateFromInput(input.dueDate),
    nextAction: input.nextAction,
    decisionRequired: input.decisionRequired,
    definitionOfDone: input.definitionOfDone,
    driveFolderUrl: input.driveFolderUrl,
    trackingDocUrl: input.trackingDocUrl,
    parentId: input.parentId,
    positionX: input.positionX,
    positionY: input.positionY,
    width: input.width,
    updatedById: actorUserId,
  };
}

export async function ensureRoadmap2Workspace() {
  return prisma.roadmap2Workspace.upsert({
    where: { key: ROADMAP2_WORKSPACE_KEY },
    create: { key: ROADMAP2_WORKSPACE_KEY, name: "Le Bon Rebond — Roadmap 2" },
    update: {},
  });
}

async function findRoadmap2Workspace(workspaceKey: string) {
  const parsedKey = roadmap2WorkspaceKeySchema.safeParse(workspaceKey);
  if (!parsedKey.success) throw new Roadmap2NotFoundError("Roadmap introuvable.");
  const workspace = await prisma.roadmap2Workspace.findUnique({ where: { key: parsedKey.data } });
  if (!workspace) throw new Roadmap2NotFoundError("Roadmap introuvable.");
  return workspace;
}

export async function getRoadmap2Data(workspaceKey?: string): Promise<Roadmap2Data> {
  const admin = await requirePlatformAdmin();
  const defaultWorkspace = await ensureRoadmap2Workspace();
  const workspace = workspaceKey ? await findRoadmap2Workspace(workspaceKey) : defaultWorkspace;
  const [rows, edges, platformOwners, currentUser, workspaces] = await Promise.all([
    prisma.roadmap2Node.findMany({
      where: { workspaceId: workspace.id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        updatedBy: { select: { id: true, name: true, email: true } },
        updates: {
          include: { author: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: [{ createdAt: "asc" }],
    }),
    prisma.roadmap2Edge.findMany({ where: { workspaceId: workspace.id }, orderBy: { createdAt: "asc" } }),
    prisma.user.findMany({ where: { OR: [{ platformAdmin: true }, { email: { in: platformAdminEmails(), mode: "insensitive" } }] }, select: { id: true, name: true, email: true }, orderBy: [{ name: "asc" }, { email: "asc" }] }),
    prisma.user.findUnique({ where: { id: admin.userId }, select: { id: true, name: true, email: true } }),
    prisma.roadmap2Workspace.findMany({
      select: { key: true, name: true, updatedAt: true, _count: { select: { nodes: true } } },
      orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
    }),
  ]);
  const ownerMap = new Map<string, Roadmap2Owner>();
  for (const user of [...platformOwners, ...(currentUser ? [currentUser] : [])]) {
    const mapped = ownerDto(user);
    if (mapped) ownerMap.set(mapped.id, mapped);
  }
  const nodes = rows.map(nodeDto);
  const active = nodes.filter((node) => node.status !== "archived" && node.archivedAt === null);
  const activeParentIds = new Set(active.map((node) => node.parentId).filter((id): id is string => Boolean(id)));
  const deliveryNodes = active.filter((node) => !node.isWorkspaceRoot && node.type !== "phase" && !activeParentIds.has(node.id));
  const now = new Date();
  const inSevenDays = new Date(now.getTime() + 7 * 86400000);
  const lastUpdated = [...active].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null;
  return {
    workspace: { key: workspace.key, name: workspace.name, rootDriveUrl: workspace.rootDriveUrl, updatedAt: workspace.updatedAt.toISOString() },
    workspaces: workspaces.map((item) => ({ key: item.key, name: item.name, nodeCount: item._count.nodes, updatedAt: item.updatedAt.toISOString() })),
    nodes,
    edges: edges.map((edge) => ({ id: edge.id, sourceNodeId: edge.sourceNodeId, targetNodeId: edge.targetNodeId, relationType: edge.relationType, createdAt: edge.createdAt.toISOString() })),
    owners: [...ownerMap.values()],
    stats: {
      activeInitiatives: deliveryNodes.filter((node) => node.status !== "completed").length,
      blocked: deliveryNodes.filter((node) => node.status === "blocked").length,
      dueSoon: deliveryNodes.filter((node) => node.dueDate && new Date(`${node.dueDate}T23:59:59`) >= now && new Date(`${node.dueDate}T23:59:59`) <= inSevenDays && node.status !== "completed").length,
      globalProgress: deliveryNodes.length ? Math.round(deliveryNodes.reduce((sum, node) => sum + node.progressPercent, 0) / deliveryNodes.length) : 0,
      basisCount: deliveryNodes.length,
      pendingDecisions: deliveryNodes.filter((node) => node.decisionRequired && node.status !== "completed").length,
      lastUpdatedAt: lastUpdated?.updatedAt ?? null,
      lastUpdatedBy: lastUpdated?.updatedBy?.name ?? null,
    },
  };
}

export const roadmap2Repository = {
  async createWorkspace(actorUserId: string, rawName: unknown) {
    const name = roadmap2WorkspaceNameSchema.parse(rawName);
    const baseKey = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 72) || "roadmap";
    const key = `${baseKey}-${randomUUID().slice(0, 8)}`;
    return prisma.$transaction(async (tx) => {
      const duplicate = await tx.roadmap2Workspace.findFirst({ where: { name: { equals: name, mode: "insensitive" } }, select: { id: true } });
      if (duplicate) throw new Roadmap2WorkspaceNameExistsError();
      const workspace = await tx.roadmap2Workspace.create({ data: { key, name }, select: { id: true, key: true, name: true } });
      await writeAudit(tx, workspace.id, actorUserId, "workspace.created", "Roadmap2Workspace", workspace.id);
      return workspace;
    }, { isolationLevel: "Serializable" });
  },

  async renameWorkspace(workspaceId: string, actorUserId: string, rawName: unknown) {
    const name = roadmap2WorkspaceNameSchema.parse(rawName);
    return prisma.$transaction(async (tx) => {
      const duplicate = await tx.roadmap2Workspace.findFirst({ where: { id: { not: workspaceId }, name: { equals: name, mode: "insensitive" } }, select: { id: true } });
      if (duplicate) throw new Roadmap2WorkspaceNameExistsError();
      const workspace = await tx.roadmap2Workspace.update({ where: { id: workspaceId }, data: { name }, select: { id: true, key: true, name: true } });
      await writeAudit(tx, workspaceId, actorUserId, "workspace.renamed", "Roadmap2Workspace", workspaceId);
      return workspace;
    }, { isolationLevel: "Serializable" });
  },

  async createNode(workspaceId: string, actorUserId: string, rawInput: unknown) {
    const parsed = roadmap2NodeInputSchema.parse(rawInput);
    if (parsed.status === "archived") throw new Roadmap2ValidationError("Créez le nœud actif puis utilisez l’action Archiver.");
    await assertAllowedOwner(actorUserId, parsed.ownerUserId);
    return prisma.$transaction(async (tx) => {
      const input = await inheritedNodeInput(tx, workspaceId, parsed);
      const node = await tx.roadmap2Node.create({
        data: { workspaceId, ...mutationData(input, actorUserId), createdById: actorUserId },
        select: { id: true, version: true },
      });
      if (input.parentId) {
        await tx.roadmap2Edge.create({ data: { workspaceId, sourceNodeId: input.parentId, targetNodeId: node.id, relationType: "parent_child", createdById: actorUserId } });
      }
      await writeAudit(tx, workspaceId, actorUserId, "node.created", "Roadmap2Node", node.id);
      return node;
    }, { isolationLevel: "Serializable" });
  },

  async updateNode(workspaceId: string, actorUserId: string, nodeId: string, expectedVersion: number, rawInput: unknown, structuralOperationId?: string) {
    const parsed = roadmap2NodeInputSchema.parse(rawInput);
    await assertAllowedOwner(actorUserId, parsed.ownerUserId);
    return prisma.$transaction(async (tx) => {
      const current = await tx.roadmap2Node.findFirst({ where: { id: nodeId, workspaceId }, select: { id: true, version: true, category: true, parentId: true, title: true, driveFolderUrl: true, isWorkspaceRoot: true, status: true } });
      if (!current) throw new Roadmap2NotFoundError();
      if (current.version !== expectedVersion) {
        if (structuralOperationId && current.version === expectedVersion + 1) {
          const audited = await tx.roadmap2AuditLog.count({
            where: { workspaceId, action: "node.structure_updated", entityType: "Roadmap2DriveOperation", entityId: structuralOperationId },
          });
          if (audited) return { id: current.id, version: current.version, updatedAt: new Date() };
        }
        throw new Roadmap2ConflictError();
      }
      if (current.status === "archived" || parsed.status === "archived") throw new Roadmap2ValidationError("Utilisez les actions Archiver ou Restaurer pour changer cet état.");
      if (current.isWorkspaceRoot && parsed.parentId) throw new Roadmap2ValidationError("Le nœud racine ne peut pas avoir de parent.");
      const input = current.isWorkspaceRoot ? { ...parsed, parentId: null } : await inheritedNodeInput(tx, workspaceId, parsed);
      const structuralChange = current.title !== input.title || current.category !== input.category || current.parentId !== input.parentId;
      if (structuralChange && current.driveFolderUrl) {
        if (!structuralOperationId) throw new Roadmap2ValidationError("Prévisualisez et confirmez l’impact Google Drive avant cette modification structurelle.");
        const operation = await tx.roadmap2DriveOperation.findFirst({
          where: { id: structuralOperationId, workspaceId, nodeId, operationType: "update_node_structure", status: { in: ["running", "provider_succeeded", "needs_repair"] } },
          select: { id: true },
        });
        if (!operation) throw new Roadmap2ValidationError("La confirmation Google Drive a expiré ou ne correspond plus à cette modification.");
      }
      await assertAcyclicParent(tx, workspaceId, nodeId, input.parentId);
      const updated = await tx.roadmap2Node.updateMany({
        where: { id: nodeId, workspaceId, version: expectedVersion },
        data: { ...mutationData(input, actorUserId), archivedAt: input.status === "archived" ? new Date() : null, version: { increment: 1 } },
      });
      if (updated.count !== 1) {
        const exists = await tx.roadmap2Node.count({ where: { id: nodeId, workspaceId } });
        if (!exists) throw new Roadmap2NotFoundError();
        throw new Roadmap2ConflictError();
      }
      await tx.roadmap2Edge.deleteMany({ where: { workspaceId, targetNodeId: nodeId, relationType: "parent_child" } });
      if (input.parentId) {
        await tx.roadmap2Edge.create({ data: { workspaceId, sourceNodeId: input.parentId, targetNodeId: nodeId, relationType: "parent_child", createdById: actorUserId } });
      }
      if (current.category !== input.category || current.parentId !== input.parentId) {
        const descendants = await descendantIds(tx, workspaceId, nodeId);
        if (descendants.length) {
          await tx.roadmap2Node.updateMany({
            where: { workspaceId, id: { in: descendants }, type: { not: "phase" }, archivedAt: null },
            data: { category: input.category, updatedById: actorUserId, version: { increment: 1 } },
          });
        }
      }
      if (structuralOperationId && structuralChange) {
        await writeAudit(tx, workspaceId, actorUserId, "node.structure_updated", "Roadmap2DriveOperation", structuralOperationId);
      } else {
        await writeAudit(tx, workspaceId, actorUserId, "node.updated", "Roadmap2Node", nodeId);
      }
      return tx.roadmap2Node.findUniqueOrThrow({ where: { id: nodeId }, select: { id: true, version: true, updatedAt: true } });
    }, { isolationLevel: "Serializable" });
  },

  async updatePosition(workspaceId: string, actorUserId: string, nodeId: string, expectedVersion: number, positionX: number, positionY: number) {
    const position = z.object({ positionX: z.number().finite().min(-100000).max(100000), positionY: z.number().finite().min(-100000).max(100000) }).parse({ positionX, positionY });
    return prisma.$transaction(async (tx) => {
      const updated = await tx.roadmap2Node.updateMany({
        where: { id: nodeId, workspaceId, version: expectedVersion },
        data: { ...position, updatedById: actorUserId, version: { increment: 1 } },
      });
      if (updated.count !== 1) {
        const exists = await tx.roadmap2Node.count({ where: { id: nodeId, workspaceId } });
        if (!exists) throw new Roadmap2NotFoundError();
        throw new Roadmap2ConflictError();
      }
      await writeAudit(tx, workspaceId, actorUserId, "node.moved", "Roadmap2Node", nodeId);
      return tx.roadmap2Node.findUniqueOrThrow({ where: { id: nodeId }, select: { id: true, version: true, updatedAt: true } });
    });
  },

  async archiveNode(workspaceId: string, actorUserId: string, nodeId: string, expectedVersion: number) {
    return prisma.$transaction(async (tx) => {
      const current = await tx.roadmap2Node.findFirst({ where: { id: nodeId, workspaceId, version: expectedVersion }, select: { status: true } });
      if (!current) {
        const exists = await tx.roadmap2Node.count({ where: { id: nodeId, workspaceId } });
        if (!exists) throw new Roadmap2NotFoundError();
        throw new Roadmap2ConflictError();
      }
      if (current.status === "archived") throw new Roadmap2ValidationError("Ce nœud est déjà archivé.");
      const updated = await tx.roadmap2Node.updateMany({
        where: { id: nodeId, workspaceId, version: expectedVersion },
        data: { status: "archived", archivedAt: new Date(), preArchiveStatus: current.status, updatedById: actorUserId, version: { increment: 1 } },
      });
      if (updated.count !== 1) {
        const exists = await tx.roadmap2Node.count({ where: { id: nodeId, workspaceId } });
        if (!exists) throw new Roadmap2NotFoundError();
        throw new Roadmap2ConflictError();
      }
      await writeAudit(tx, workspaceId, actorUserId, "node.archived", "Roadmap2Node", nodeId);
      return { id: nodeId };
    });
  },

  async restoreNode(workspaceId: string, actorUserId: string, nodeId: string, expectedVersion: number) {
    return prisma.$transaction(async (tx) => {
      const current = await tx.roadmap2Node.findFirst({ where: { id: nodeId, workspaceId, version: expectedVersion }, select: { status: true, preArchiveStatus: true } });
      if (!current) {
        const exists = await tx.roadmap2Node.count({ where: { id: nodeId, workspaceId } });
        if (!exists) throw new Roadmap2NotFoundError();
        throw new Roadmap2ConflictError();
      }
      if (current.status !== "archived") throw new Roadmap2ValidationError("Ce nœud n’est pas archivé.");
      const restoredStatus = current.preArchiveStatus && current.preArchiveStatus !== "archived" ? current.preArchiveStatus : "not_started";
      const updated = await tx.roadmap2Node.updateMany({
        where: { id: nodeId, workspaceId, version: expectedVersion },
        data: { status: restoredStatus, archivedAt: null, preArchiveStatus: null, updatedById: actorUserId, version: { increment: 1 } },
      });
      if (updated.count !== 1) {
        const exists = await tx.roadmap2Node.count({ where: { id: nodeId, workspaceId } });
        if (!exists) throw new Roadmap2NotFoundError();
        throw new Roadmap2ConflictError();
      }
      await writeAudit(tx, workspaceId, actorUserId, "node.archive_reverted", "Roadmap2Node", nodeId);
      return tx.roadmap2Node.findUniqueOrThrow({ where: { id: nodeId }, select: { id: true, version: true } });
    });
  },

  async finalizeArchiveNodeOperation(workspaceId: string, actorUserId: string, operationId: string, nodeId: string, expectedVersion: number) {
    return prisma.$transaction(async (tx) => {
      const operation = await tx.roadmap2DriveOperation.findFirst({ where: { id: operationId, workspaceId, nodeId, operationType: "archive_node" }, select: { id: true } });
      if (!operation) throw new Roadmap2NotFoundError("Opération d’archivage Drive introuvable.");
      const node = await tx.roadmap2Node.findFirst({
        where: { id: nodeId, workspaceId },
        select: { id: true, version: true, status: true, isWorkspaceRoot: true, _count: { select: { children: { where: { archivedAt: null } } } } },
      });
      if (!node) throw new Roadmap2NotFoundError();
      if (node.isWorkspaceRoot) throw new Roadmap2ValidationError("Le nœud racine de la roadmap ne peut pas être archivé.");
      if (node.status !== "archived") {
        if (node.version !== expectedVersion) throw new Roadmap2ConflictError();
        if (node._count.children > 0) throw new Roadmap2ValidationError("Déplacez ou archivez d’abord les sous-nœuds actifs.");
        const updated = await tx.roadmap2Node.updateMany({
          where: { id: nodeId, workspaceId, version: expectedVersion, status: { not: "archived" } },
          data: { status: "archived", archivedAt: new Date(), preArchiveStatus: node.status, updatedById: actorUserId, version: { increment: 1 } },
        });
        if (updated.count !== 1) throw new Roadmap2ConflictError();
        await writeAudit(tx, workspaceId, actorUserId, "node.archived", "Roadmap2Node", nodeId);
      }
      const audited = await tx.roadmap2AuditLog.count({ where: { workspaceId, action: "node.drive_folder_archived", entityType: "Roadmap2DriveOperation", entityId: operationId } });
      if (!audited) await writeAudit(tx, workspaceId, actorUserId, "node.drive_folder_archived", "Roadmap2DriveOperation", operationId);
      const finalized = await tx.roadmap2Node.findUniqueOrThrow({ where: { id: nodeId }, select: { id: true, version: true } });
      return finalized;
    }, { isolationLevel: "Serializable" });
  },

  async finalizeRestoreNodeOperation(workspaceId: string, actorUserId: string, operationId: string, nodeId: string, expectedVersion: number) {
    return prisma.$transaction(async (tx) => {
      const operation = await tx.roadmap2DriveOperation.findFirst({ where: { id: operationId, workspaceId, nodeId, operationType: "restore_node" }, select: { id: true } });
      if (!operation) throw new Roadmap2NotFoundError("Opération de restauration Drive introuvable.");
      const node = await tx.roadmap2Node.findFirst({ where: { id: nodeId, workspaceId }, select: { id: true, version: true, status: true, preArchiveStatus: true } });
      if (!node) throw new Roadmap2NotFoundError();
      if (node.status === "archived") {
        if (node.version !== expectedVersion) throw new Roadmap2ConflictError();
        const restoredStatus = node.preArchiveStatus && node.preArchiveStatus !== "archived" ? node.preArchiveStatus : "not_started";
        const updated = await tx.roadmap2Node.updateMany({
          where: { id: nodeId, workspaceId, version: expectedVersion, status: "archived" },
          data: { status: restoredStatus, archivedAt: null, preArchiveStatus: null, updatedById: actorUserId, version: { increment: 1 } },
        });
        if (updated.count !== 1) throw new Roadmap2ConflictError();
        await writeAudit(tx, workspaceId, actorUserId, "node.archive_reverted", "Roadmap2Node", nodeId);
      }
      const audited = await tx.roadmap2AuditLog.count({ where: { workspaceId, action: "node.drive_folder_restored", entityType: "Roadmap2DriveOperation", entityId: operationId } });
      if (!audited) await writeAudit(tx, workspaceId, actorUserId, "node.drive_folder_restored", "Roadmap2DriveOperation", operationId);
      return tx.roadmap2Node.findUniqueOrThrow({ where: { id: nodeId }, select: { id: true, version: true } });
    }, { isolationLevel: "Serializable" });
  },

  async deleteNode(workspaceId: string, actorUserId: string, nodeId: string, expectedVersion: number) {
    return prisma.$transaction(async (tx) => {
      const node = await tx.roadmap2Node.findFirst({
        where: { id: nodeId, workspaceId },
        select: { version: true, isWorkspaceRoot: true, _count: { select: { children: { where: { archivedAt: null } } } } },
      });
      if (!node) throw new Roadmap2NotFoundError();
      if (node.version !== expectedVersion) throw new Roadmap2ConflictError();
      if (node.isWorkspaceRoot) throw new Roadmap2ValidationError("Le nœud racine de la roadmap ne peut pas être supprimé.");
      if (node._count.children > 0) throw new Roadmap2ValidationError("Déplacez ou archivez d’abord les sous-nœuds actifs.");
      const deleted = await tx.roadmap2Node.deleteMany({ where: { id: nodeId, workspaceId, version: expectedVersion } });
      if (deleted.count !== 1) throw new Roadmap2ConflictError();
      await writeAudit(tx, workspaceId, actorUserId, "node.deleted", "Roadmap2Node", nodeId);
      return { id: nodeId };
    }, { isolationLevel: "Serializable" });
  },

  async getNodeLifecycleContext(workspaceId: string, nodeId: string) {
    const node = await prisma.roadmap2Node.findFirst({ where: { id: nodeId, workspaceId }, select: { id: true, version: true, status: true, preArchiveStatus: true, isWorkspaceRoot: true, driveFolderUrl: true, _count: { select: { children: { where: { archivedAt: null } } } } } });
    if (!node) throw new Roadmap2NotFoundError();
    return node;
  },

  async duplicateNode(workspaceId: string, actorUserId: string, nodeId: string) {
    const source = await prisma.roadmap2Node.findFirst({ where: { id: nodeId, workspaceId } });
    if (!source) throw new Roadmap2NotFoundError();
    return prisma.$transaction(async (tx) => {
      const node = await tx.roadmap2Node.create({
        data: {
          workspaceId,
          title: `${source.title} — copie`,
          description: source.description,
          expectedOutcome: source.expectedOutcome,
          type: source.type,
          category: source.category,
          status: "not_started",
          priority: source.priority,
          progressPercent: 0,
          ownerUserId: source.ownerUserId,
          startDate: source.startDate,
          dueDate: source.dueDate,
          nextAction: source.nextAction,
          decisionRequired: source.decisionRequired,
          definitionOfDone: source.definitionOfDone,
          driveFolderUrl: null,
          trackingDocUrl: null,
          parentId: source.parentId,
          positionX: source.positionX + 48,
          positionY: source.positionY + 48,
          width: source.width,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        select: { id: true, version: true },
      });
      if (source.parentId) {
        await tx.roadmap2Edge.create({ data: { workspaceId, sourceNodeId: source.parentId, targetNodeId: node.id, relationType: "parent_child", createdById: actorUserId } });
      }
      await writeAudit(tx, workspaceId, actorUserId, "node.duplicated", "Roadmap2Node", node.id);
      return node;
    });
  },

  async createEdge(workspaceId: string, actorUserId: string, rawInput: unknown) {
    const input = roadmap2EdgeInputSchema.parse(rawInput);
    if (input.relationType === "parent_child") {
      throw new Roadmap2ValidationError("Modifiez le parent depuis le formulaire du nœud afin de prévisualiser et réconcilier son classement Drive.");
    }
    await Promise.all([assertScopedNode(workspaceId, input.sourceNodeId), assertScopedNode(workspaceId, input.targetNodeId)]);
    return prisma.$transaction(async (tx) => {
      const edge = await tx.roadmap2Edge.create({ data: { workspaceId, ...input, createdById: actorUserId }, select: { id: true } });
      await writeAudit(tx, workspaceId, actorUserId, "edge.created", "Roadmap2Edge", edge.id);
      return { ...edge, targetVersion: undefined };
    }, { isolationLevel: "Serializable" });
  },

  async deleteEdge(workspaceId: string, actorUserId: string, edgeId: string) {
    const edge = await prisma.roadmap2Edge.findFirst({ where: { id: edgeId, workspaceId } });
    if (!edge) throw new Roadmap2NotFoundError("Relation introuvable dans ce workspace.");
    if (edge.relationType === "parent_child") {
      throw new Roadmap2ValidationError("Retirez ou changez le parent depuis le formulaire du nœud afin de prévisualiser et réconcilier son classement Drive.");
    }
    return prisma.$transaction(async (tx) => {
      await tx.roadmap2Edge.deleteMany({ where: { id: edgeId, workspaceId } });
      await writeAudit(tx, workspaceId, actorUserId, "edge.deleted", "Roadmap2Edge", edgeId);
      return { id: edgeId };
    });
  },

  async addUpdate(workspaceId: string, actorUserId: string, rawInput: unknown) {
    const input = roadmap2UpdateInputSchema.parse(rawInput);
    return prisma.$transaction(async (tx) => {
      const updated = await tx.roadmap2Node.updateMany({
        where: { id: input.nodeId, workspaceId, version: input.nodeVersion },
        data: { updatedById: actorUserId, version: { increment: 1 } },
      });
      if (updated.count !== 1) {
        const exists = await tx.roadmap2Node.count({ where: { id: input.nodeId, workspaceId } });
        if (!exists) throw new Roadmap2NotFoundError();
        throw new Roadmap2ConflictError();
      }
      const note = await tx.roadmap2Update.create({
        data: { workspaceId, nodeId: input.nodeId, authorUserId: actorUserId, updateType: input.updateType, body: input.body },
        select: { id: true, createdAt: true },
      });
      await writeAudit(tx, workspaceId, actorUserId, "update.created", "Roadmap2Update", note.id);
      return { ...note, version: input.nodeVersion + 1 };
    });
  },

  async setRootDriveUrl(workspaceId: string, actorUserId: string, rawUrl: unknown) {
    const rootDriveUrl = roadmap2DriveUrlSchema.parse(rawUrl);
    return prisma.$transaction(async (tx) => {
      await tx.roadmap2Workspace.update({ where: { id: workspaceId }, data: { rootDriveUrl } });
      await writeAudit(tx, workspaceId, actorUserId, "workspace.drive_root_updated", "Roadmap2Workspace", workspaceId);
      return { rootDriveUrl };
    });
  },

  async finalizeDriveProvision(workspaceId: string, actorUserId: string, operationId: string, rawUrl: unknown) {
    const rootDriveUrl = roadmap2DriveUrlSchema.parse(rawUrl);
    if (!rootDriveUrl) throw new Roadmap2NotFoundError("Le dossier Drive créé est incomplet.");
    return prisma.$transaction(async (tx) => {
      const operation = await tx.roadmap2DriveOperation.findFirst({ where: { id: operationId, workspaceId, operationType: "provision_workspace" }, select: { id: true } });
      if (!operation) throw new Roadmap2NotFoundError("Opération de provisioning Drive introuvable.");
      const workspace = await tx.roadmap2Workspace.findUnique({ where: { id: workspaceId }, select: { rootDriveUrl: true } });
      if (!workspace) throw new Roadmap2NotFoundError("Roadmap introuvable.");
      if (workspace.rootDriveUrl && workspace.rootDriveUrl !== rootDriveUrl) throw new Roadmap2ConflictError("Un autre dossier Drive racine a été configuré pendant l’opération.");
      if (workspace.rootDriveUrl !== rootDriveUrl) await tx.roadmap2Workspace.update({ where: { id: workspaceId }, data: { rootDriveUrl } });
      const audited = await tx.roadmap2AuditLog.count({ where: { workspaceId, action: "workspace.drive_provisioned", entityType: "Roadmap2DriveOperation", entityId: operationId } });
      if (!audited) await writeAudit(tx, workspaceId, actorUserId, "workspace.drive_provisioned", "Roadmap2DriveOperation", operationId);
      return { rootDriveUrl };
    });
  },

  async getWorkspaceDriveContext(workspaceId: string) {
    const workspace = await prisma.roadmap2Workspace.findUnique({ where: { id: workspaceId }, select: { id: true, key: true, name: true, rootDriveUrl: true } });
    if (!workspace) throw new Roadmap2NotFoundError("Roadmap introuvable.");
    return workspace;
  },

  async getNodeDriveContext(workspaceId: string, nodeId: string) {
    const node = await prisma.roadmap2Node.findFirst({ where: { id: nodeId, workspaceId }, select: { id: true, title: true, type: true, category: true, status: true, parentId: true, isWorkspaceRoot: true, version: true, driveFolderUrl: true, trackingDocUrl: true } });
    if (!node) throw new Roadmap2NotFoundError();
    return node;
  },

  async getDriveHierarchy(workspaceId: string) {
    return prisma.roadmap2Node.findMany({
      where: { workspaceId },
      select: { id: true, title: true, type: true, category: true, status: true, parentId: true, isWorkspaceRoot: true, driveFolderUrl: true, trackingDocUrl: true },
    });
  },

  async attachDriveResources(workspaceId: string, actorUserId: string, nodeId: string, expectedVersion: number, rawFolderUrl: unknown, rawTrackingUrl: unknown) {
    const driveFolderUrl = roadmap2DriveUrlSchema.parse(rawFolderUrl);
    const trackingDocUrl = roadmap2DriveUrlSchema.parse(rawTrackingUrl);
    if (!driveFolderUrl || !trackingDocUrl) throw new Roadmap2NotFoundError("Les ressources Drive créées sont incomplètes.");
    return prisma.$transaction(async (tx) => {
      const updated = await tx.roadmap2Node.updateMany({
        where: { id: nodeId, workspaceId, version: expectedVersion },
        data: { driveFolderUrl, trackingDocUrl, updatedById: actorUserId, version: { increment: 1 } },
      });
      if (updated.count !== 1) {
        const exists = await tx.roadmap2Node.count({ where: { id: nodeId, workspaceId } });
        if (!exists) throw new Roadmap2NotFoundError();
        throw new Roadmap2ConflictError();
      }
      await writeAudit(tx, workspaceId, actorUserId, "node.drive_resources_attached", "Roadmap2Node", nodeId);
      return tx.roadmap2Node.findUniqueOrThrow({ where: { id: nodeId }, select: { id: true, version: true, driveFolderUrl: true, trackingDocUrl: true } });
    });
  },

  async finalizeNodeDriveResources(workspaceId: string, actorUserId: string, operationId: string, nodeId: string, rawFolderUrl: unknown, rawTrackingUrl: unknown) {
    const driveFolderUrl = roadmap2DriveUrlSchema.parse(rawFolderUrl);
    const trackingDocUrl = roadmap2DriveUrlSchema.parse(rawTrackingUrl);
    if (!driveFolderUrl || !trackingDocUrl) throw new Roadmap2NotFoundError("Les ressources Drive créées sont incomplètes.");
    return prisma.$transaction(async (tx) => {
      const operation = await tx.roadmap2DriveOperation.findFirst({ where: { id: operationId, workspaceId, nodeId, operationType: "create_node_resources" }, select: { id: true } });
      if (!operation) throw new Roadmap2NotFoundError("Opération de création des ressources Drive introuvable.");
      const node = await tx.roadmap2Node.findFirst({ where: { id: nodeId, workspaceId }, select: { id: true, version: true, driveFolderUrl: true, trackingDocUrl: true } });
      if (!node) throw new Roadmap2NotFoundError();
      if ((node.driveFolderUrl && node.driveFolderUrl !== driveFolderUrl) || (node.trackingDocUrl && node.trackingDocUrl !== trackingDocUrl)) {
        throw new Roadmap2ConflictError("D’autres ressources Drive ont été associées à ce nœud pendant l’opération.");
      }
      let version = node.version;
      if (node.driveFolderUrl !== driveFolderUrl || node.trackingDocUrl !== trackingDocUrl) {
        const updated = await tx.roadmap2Node.updateMany({
          where: { id: nodeId, workspaceId, version: node.version },
          data: { driveFolderUrl, trackingDocUrl, updatedById: actorUserId, version: { increment: 1 } },
        });
        if (updated.count !== 1) throw new Roadmap2ConflictError();
        version += 1;
      }
      const audited = await tx.roadmap2AuditLog.count({ where: { workspaceId, action: "node.drive_resources_attached", entityType: "Roadmap2DriveOperation", entityId: operationId } });
      if (!audited) await writeAudit(tx, workspaceId, actorUserId, "node.drive_resources_attached", "Roadmap2DriveOperation", operationId);
      return { id: nodeId, version, driveFolderUrl, trackingDocUrl };
    }, { isolationLevel: "Serializable" });
  },

  async recordWorkspaceAudit(workspaceId: string, actorUserId: string, action: string) {
    const safeAction = z.string().regex(/^workspace\.drive_[a-z_]+$/).max(80).parse(action);
    await prisma.$transaction((tx) => writeAudit(tx, workspaceId, actorUserId, safeAction, "Roadmap2Workspace", workspaceId));
  },

  async recordNodeDriveAudit(workspaceId: string, actorUserId: string, nodeId: string, action: string) {
    const safeAction = z.string().regex(/^node\.drive_[a-z_]+$/).max(80).parse(action);
    const exists = await prisma.roadmap2Node.count({ where: { id: nodeId, workspaceId } });
    if (!exists) throw new Roadmap2NotFoundError();
    await prisma.$transaction((tx) => writeAudit(tx, workspaceId, actorUserId, safeAction, "Roadmap2Node", nodeId));
  },

  async recordDriveOperationAudit(workspaceId: string, actorUserId: string, operationId: string, action: string) {
    const safeAction = z.string().regex(/^(?:workspace|node)\.drive_[a-z_]+$/).max(80).parse(action);
    return prisma.$transaction(async (tx) => {
      const operation = await tx.roadmap2DriveOperation.findFirst({ where: { id: operationId, workspaceId }, select: { id: true } });
      if (!operation) throw new Roadmap2NotFoundError("Opération Drive introuvable.");
      const audited = await tx.roadmap2AuditLog.count({ where: { workspaceId, action: safeAction, entityType: "Roadmap2DriveOperation", entityId: operationId } });
      if (!audited) await writeAudit(tx, workspaceId, actorUserId, safeAction, "Roadmap2DriveOperation", operationId);
      return { operationId };
    });
  },

  async seedWorkspace(workspaceId: string, actorUserId: string, rawSetup?: unknown) {
    if (rawSetup === undefined) throw new Roadmap2ValidationError("Choisissez une date d’ancrage et un responsable pour chacune des sept phases.");
    const setup = roadmap2SeedSetupSchema.parse(rawSetup);
    const seed = buildRoadmap2Seed(setup.anchorDate);
    return prisma.$transaction(async (tx) => {
      const existing = await tx.roadmap2Node.count({ where: { workspaceId } });
      if (existing > 0) throw new Roadmap2SeedExistsError();
      const requestedOwners = [...new Set(Object.values(setup.ownerByCategory))];
      const allowedOwners = await tx.user.findMany({
        where: { id: { in: requestedOwners }, OR: [{ id: actorUserId }, { platformAdmin: true }, { email: { in: platformAdminEmails(), mode: "insensitive" } }] },
        select: { id: true },
      });
      if (allowedOwners.length !== requestedOwners.length) throw new Roadmap2ValidationError("Un responsable choisi n’est pas autorisé pour Roadmap 2.");
      const ids = new Map(seed.nodes.map((item) => [item.key, randomUUID()]));
      await tx.roadmap2Node.createMany({
        data: seed.nodes.map((item) => ({
            id: ids.get(item.key)!,
            workspaceId,
            seedKey: item.key,
            isWorkspaceRoot: item.key === "root",
            title: item.title,
            description: item.type === "phase" ? `Chantier stratégique — ${item.title}.` : null,
            expectedOutcome: item.definitionOfDone ?? null,
            type: item.type,
            category: item.category,
            status: item.status ?? "not_started",
            priority: item.priority ?? "P1",
            progressPercent: item.progressPercent ?? 0,
            ownerUserId: item.key === "root" ? actorUserId : setup.ownerByCategory[item.category],
            startDate: dateFromInput(item.startDate),
            dueDate: dateFromInput(item.dueDate),
            nextAction: item.nextAction ?? null,
            decisionRequired: item.decisionRequired ?? false,
            definitionOfDone: item.definitionOfDone ?? null,
            parentId: item.parentKey ? ids.get(item.parentKey) ?? null : null,
            positionX: item.positionX,
            positionY: item.positionY,
            width: item.type === "phase" ? 480 : item.type === "milestone" ? 230 : 260,
            createdById: actorUserId,
            updatedById: actorUserId,
          })),
      });
      const edgeData = seed.edges.map((relation) => {
        const sourceNodeId = ids.get(relation.sourceKey);
        const targetNodeId = ids.get(relation.targetKey);
        if (!sourceNodeId || !targetNodeId) throw new Error(`Seed Roadmap 2 invalide : ${relation.sourceKey} → ${relation.targetKey}`);
        return { id: randomUUID(), workspaceId, sourceNodeId, targetNodeId, relationType: relation.relationType, createdById: actorUserId };
      });
      await tx.roadmap2Edge.createMany({ data: edgeData });
      await writeAudit(tx, workspaceId, actorUserId, "workspace.seeded", "Roadmap2Workspace", workspaceId);
      return { nodes: seed.nodes.length, edges: seed.edges.length };
    }, { timeout: 30000 });
  },
};

export async function resolveRoadmap2Context(workspaceKey?: string): Promise<{ admin: PlatformAdmin; workspaceId: string }> {
  const admin = await requirePlatformAdmin();
  const workspace = workspaceKey ? await findRoadmap2Workspace(workspaceKey) : await ensureRoadmap2Workspace();
  return { admin, workspaceId: workspace.id };
}
