import "./_env";

import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/lib/prisma";
import {
  Roadmap2ConflictError,
  Roadmap2NotFoundError,
  Roadmap2ValidationError,
  Roadmap2WorkspaceNameExistsError,
  roadmap2DriveUrlSchema,
  roadmap2Repository,
} from "../src/server/roadmap2";
import { assert, runner, step } from "./_tenant";
import { ROADMAP2_CATEGORIES } from "../src/lib/roadmap2";

const suffix = randomUUID().slice(0, 8);
const email = `roadmap2-${suffix}@smoke.invalid`;
let userId = "";
let organizationId = "";
const workspaceIds: string[] = [];

const baseNode = {
  title: "Résultat smoke Roadmap 2",
  description: "<img src=x onerror=alert(1)>",
  expectedOutcome: "Un résultat observable",
  type: "initiative" as const,
  category: "strategy_governance" as const,
  status: "in_progress" as const,
  priority: "P1" as const,
  progressPercent: 20,
  ownerUserId: null as string | null,
  startDate: "2026-08-11",
  dueDate: "2026-09-11",
  nextAction: "Tester la persistance",
  decisionRequired: false,
  definitionOfDone: "Toutes les assertions passent.",
  driveFolderUrl: "https://drive.google.com/drive/folders/smoke",
  trackingDocUrl: "https://docs.google.com/document/d/smoke/edit",
  parentId: null as string | null,
  positionX: 100,
  positionY: 150,
  width: 270,
};
const withoutDrive = { ...baseNode, driveFolderUrl: null, trackingDocUrl: null };

runner("roadmap_2_smoke", async () => {
  try {
    const organization = await prisma.organization.create({ data: { name: `Roadmap 2 Smoke ${suffix}`, slug: `roadmap-2-smoke-${suffix}` } });
    organizationId = organization.id;
    const user = await prisma.user.create({ data: { email, name: "Dorian Smoke", platformAdmin: true, emailVerified: new Date() } });
    userId = user.id;
    await prisma.membership.create({ data: { organizationId, userId, role: "OWNER", status: "ACTIVE" } });
    baseNode.ownerUserId = userId;
    step("fixture_created", { userId, organizationId });

    const workspaceAName = `Roadmap pilote A ${suffix}`;
    const workspaceBName = `Roadmap pilote B ${suffix}`;
    const workspaceA = await roadmap2Repository.createWorkspace(userId, workspaceAName);
    let duplicateNameRejected = false;
    try {
      await roadmap2Repository.createWorkspace(userId, workspaceAName.toUpperCase());
    } catch (error) {
      duplicateNameRejected = error instanceof Roadmap2WorkspaceNameExistsError;
    }
    assert(duplicateNameRejected, "Deux roadmaps ne doivent pas pouvoir porter le même nom, même avec une casse différente.");
    const workspaceB = await roadmap2Repository.createWorkspace(userId, workspaceBName);
    const seedWorkspace = await roadmap2Repository.createWorkspace(userId, `Roadmap seed ${suffix}`);
    workspaceIds.push(workspaceA.id, workspaceB.id, seedWorkspace.id);
    assert(workspaceA.key !== workspaceB.key, "Deux roadmaps doivent recevoir des clés distinctes.");
    assert(await prisma.roadmap2Node.count({ where: { workspaceId: workspaceA.id } }) === 0, "Une nouvelle roadmap doit être vide.");
    let duplicateRenameRejected = false;
    try {
      await roadmap2Repository.renameWorkspace(workspaceA.id, userId, workspaceBName.toUpperCase());
    } catch (error) {
      duplicateRenameRejected = error instanceof Roadmap2WorkspaceNameExistsError;
    }
    assert(duplicateRenameRejected, "Le renommage ne doit pas créer deux roadmaps ambiguës.");
    const renamedWorkspaceName = `Lancement Martinique 2027 ${suffix}`;
    const renamedWorkspace = await roadmap2Repository.renameWorkspace(workspaceA.id, userId, renamedWorkspaceName);
    assert(renamedWorkspace.name === renamedWorkspaceName && renamedWorkspace.key === workspaceA.key, "Renommer une roadmap ne doit pas changer sa clé ni son contenu.");
    step("independent_empty_workspace_created", { key: workspaceA.key });

    const rlsTables = await prisma.$queryRaw<Array<{ relname: string; relrowsecurity: boolean }>>`
      SELECT cls.relname, cls.relrowsecurity
      FROM pg_class cls
      JOIN pg_namespace ns ON ns.oid = cls.relnamespace
      WHERE cls.relkind = 'r'
        AND ns.nspname = current_schema()
        AND cls.relname IN ('Roadmap2Workspace', 'Roadmap2Node', 'Roadmap2Edge', 'Roadmap2Update', 'Roadmap2AuditLog', 'Roadmap2DriveOperation')
    `;
    const rlsMap = new Map(rlsTables.map((table) => [table.relname, table.relrowsecurity]));
    const requiredRoadmapTables = ['Roadmap2Workspace', 'Roadmap2Node', 'Roadmap2Edge', 'Roadmap2Update', 'Roadmap2AuditLog'];
    assert(requiredRoadmapTables.every((table) => rlsMap.get(table) === true), "RLS doit être actif sur les cinq tables Roadmap 2 historiques.");
    assert(!rlsMap.has('Roadmap2DriveOperation') || rlsMap.get('Roadmap2DriveOperation') === true, "Le registre Drive doit activer RLS dès qu’il est déployé.");
    const anonRole = await prisma.$queryRaw<Array<{ exists: boolean }>>`SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') AS exists`;
    let directAnonDenied = true;
    if (anonRole[0]?.exists) {
      directAnonDenied = false;
      try {
        const directRows = await prisma.$transaction(async (tx) => {
          await tx.$executeRawUnsafe('SET LOCAL ROLE anon');
          return tx.$queryRawUnsafe<Array<{ id: string }>>('SELECT id FROM "Roadmap2Workspace" LIMIT 1');
        });
        directAnonDenied = directRows.length === 0;
      } catch {
        directAnonDenied = true;
      }
    }
    assert(directAnonDenied, "Le rôle Supabase anon ne doit pas pouvoir lire Roadmap 2 directement.");
    step("row_level_security_enabled", { tables: rlsTables.length, directAnonDenied });

    assert(roadmap2DriveUrlSchema.safeParse(baseNode.driveFolderUrl).success, "URL Drive valide rejetée.");
    for (const invalid of ["javascript:alert(1)", "http://drive.google.com/x", "https://drive.google.com.evil.test/x", "https://example.com/x"]) {
      assert(!roadmap2DriveUrlSchema.safeParse(invalid).success, `URL interdite acceptée : ${invalid}`);
    }
    step("drive_url_validation");

    const root = await roadmap2Repository.createNode(workspaceA.id, userId, { ...withoutDrive, workspaceId: workspaceB.id, version: 999, archivedAt: new Date().toISOString() });
    const rootRow = await prisma.roadmap2Node.findUniqueOrThrow({ where: { id: root.id } });
    assert(rootRow.workspaceId === workspaceA.id && rootRow.version === 1 && rootRow.archivedAt === null, "Protection contre le mass assignment défaillante.");
    const child = await roadmap2Repository.createNode(workspaceA.id, userId, { ...withoutDrive, title: "Sous-nœud smoke", type: "action", parentId: root.id, positionX: 380 });
    const parentEdge = await prisma.roadmap2Edge.findFirst({ where: { workspaceId: workspaceA.id, sourceNodeId: root.id, targetNodeId: child.id, relationType: "parent_child" } });
    assert(parentEdge, "La création d'un sous-nœud doit persister la relation parent_child.");
    assert((await prisma.roadmap2Node.findUniqueOrThrow({ where: { id: child.id } })).category === rootRow.category, "Un sous-nœud doit hériter de la catégorie de son parent.");
    let cycleRejected = false;
    try {
      await roadmap2Repository.updateNode(workspaceA.id, userId, root.id, root.version, { ...withoutDrive, parentId: child.id });
    } catch {
      cycleRejected = true;
    }
    assert(cycleRejected, "Une boucle parent-enfant doit être refusée.");
    step("node_and_subnode_created", { rootId: root.id, childId: child.id });

    const dependency = await roadmap2Repository.createEdge(workspaceA.id, userId, { sourceNodeId: child.id, targetNodeId: root.id, relationType: "dependency" });
    assert(await prisma.roadmap2Edge.findFirst({ where: { id: dependency.id, workspaceId: workspaceA.id } }), "Dépendance non persistée.");
    let relationHierarchyRejected = false;
    try {
      await roadmap2Repository.createEdge(workspaceA.id, userId, { sourceNodeId: root.id, targetNodeId: child.id, relationType: "parent_child" });
    } catch (error) {
      relationHierarchyRejected = error instanceof Roadmap2ValidationError;
    }
    assert(relationHierarchyRejected, "L’API générique des relations ne doit jamais contourner le préflight Drive de la hiérarchie.");
    let parentEdgeDeletionRejected = false;
    try {
      await roadmap2Repository.deleteEdge(workspaceA.id, userId, parentEdge.id);
    } catch (error) {
      parentEdgeDeletionRejected = error instanceof Roadmap2ValidationError;
    }
    assert(parentEdgeDeletionRejected, "La suppression générique d’un lien parent-enfant doit passer par le formulaire structurel.");
    step("dependency_created", { edgeId: dependency.id });

    const moved = await roadmap2Repository.updatePosition(workspaceA.id, userId, child.id, child.version, 612.5, 284.25);
    const movedRow = await prisma.roadmap2Node.findUniqueOrThrow({ where: { id: child.id } });
    assert(movedRow.positionX === 612.5 && movedRow.positionY === 284.25, "Position non persistée.");
    step("position_persisted", { version: moved.version });

    let conflictCaught = false;
    try {
      await roadmap2Repository.updateNode(workspaceA.id, userId, child.id, child.version, { ...withoutDrive, title: "Écrasement interdit" });
    } catch (error) {
      conflictCaught = error instanceof Roadmap2ConflictError;
    }
    assert(conflictCaught, "Une version obsolète doit provoquer un conflit explicite.");
    const unchanged = await prisma.roadmap2Node.findUniqueOrThrow({ where: { id: child.id } });
    assert(unchanged.title === "Sous-nœud smoke", "Le conflit a écrasé une modification récente.");
    step("optimistic_conflict_rejected");

    const updated = await roadmap2Repository.updateNode(workspaceA.id, userId, child.id, moved.version, { ...withoutDrive, title: "Sous-nœud mis à jour", parentId: root.id, progressPercent: 45 });
    const note = await roadmap2Repository.addUpdate(workspaceA.id, userId, { nodeId: child.id, nodeVersion: updated.version, updateType: "blocker", body: "Attente de confirmation DEETS." });
    assert(await prisma.roadmap2Update.findFirst({ where: { id: note.id, workspaceId: workspaceA.id, body: "Attente de confirmation DEETS." } }), "Mise à jour non persistée.");
    step("node_update_and_followup", { version: note.version });

    let archiveByGenericUpdateRejected = false;
    try {
      await roadmap2Repository.updateNode(workspaceA.id, userId, child.id, note.version, { ...withoutDrive, title: "Archivage interdit", parentId: root.id, status: "archived" });
    } catch {
      archiveByGenericUpdateRejected = true;
    }
    assert(archiveByGenericUpdateRejected, "L’archivage ne doit jamais contourner l’action de cycle de vie dédiée.");

    let idorRejected = false;
    try {
      await roadmap2Repository.updatePosition(workspaceB.id, userId, child.id, note.version, 0, 0);
    } catch (error) {
      idorRejected = error instanceof Roadmap2NotFoundError;
    }
    assert(idorRejected, "Une mutation cross-workspace doit être refusée.");
    step("cross_workspace_idor_rejected");

    const drive = await roadmap2Repository.setRootDriveUrl(workspaceA.id, userId, "https://drive.google.com/drive/folders/root-smoke");
    assert(drive.rootDriveUrl?.includes("drive.google.com"), "Dossier racine non persisté.");
    const audits = await prisma.roadmap2AuditLog.findMany({ where: { workspaceId: workspaceA.id } });
    assert(audits.length >= 6, "Les mutations sensibles doivent être auditées.");
    assert(!JSON.stringify(audits).includes("drive.google.com"), "Une URL Drive a fuité dans l'audit.");
    step("audit_redacted", { auditCount: audits.length });

    const seedAnchor = "2027-01-15";
    const seeded = await roadmap2Repository.seedWorkspace(seedWorkspace.id, userId, {
      anchorDate: seedAnchor,
      ownerByCategory: Object.fromEntries(ROADMAP2_CATEGORIES.map((category) => [category, userId])),
    });
    assert(seeded.nodes === 65, `Le seed doit créer 65 nœuds (reçu ${seeded.nodes}).`);
    assert(seeded.edges >= 100, `Le seed doit créer les dépendances et contributions (reçu ${seeded.edges}).`);
    const seededRoot = await prisma.roadmap2Node.findFirstOrThrow({ where: { workspaceId: seedWorkspace.id, isWorkspaceRoot: true } });
    const seededPhases = await prisma.roadmap2Node.findMany({ where: { workspaceId: seedWorkspace.id, type: "phase" } });
    assert(seededRoot.startDate?.toISOString().slice(0, 10) === seedAnchor, "La date d’ancrage choisie doit piloter le calendrier du seed.");
    assert(seededPhases.length === 7 && seededPhases.every((phase) => phase.ownerUserId === userId), "L’attribution en masse doit couvrir les sept phases.");
    let setupRequired = false;
    try {
      await roadmap2Repository.seedWorkspace(workspaceA.id, userId);
    } catch (error) {
      setupRequired = error instanceof Roadmap2ValidationError;
    }
    assert(setupRequired, "Le repository doit exiger le setup du seed, même hors interface.");
    let duplicateSeedRejected = false;
    try {
      await roadmap2Repository.seedWorkspace(seedWorkspace.id, userId);
    } catch {
      duplicateSeedRejected = true;
    }
    assert(duplicateSeedRejected, "Le seed ne doit jamais être rejoué sur un workspace renseigné.");
    step("seed_idempotency", seeded);

    const archived = await roadmap2Repository.archiveNode(workspaceA.id, userId, child.id, note.version);
    const archivedRow = await prisma.roadmap2Node.findUniqueOrThrow({ where: { id: archived.id } });
    assert(archivedRow.status === "archived" && archivedRow.archivedAt, "Archivage incomplet.");
    const restored = await roadmap2Repository.restoreNode(workspaceA.id, userId, child.id, archivedRow.version);
    const restoredRow = await prisma.roadmap2Node.findUniqueOrThrow({ where: { id: restored.id } });
    assert(restoredRow.status === "in_progress" && restoredRow.archivedAt === null, "La restauration doit retrouver le statut actif antérieur.");
    await roadmap2Repository.archiveNode(workspaceA.id, userId, child.id, restored.version);
    const archivedVersion = restored.version + 1;
    let staleDeleteRejected = false;
    try {
      await roadmap2Repository.deleteNode(workspaceA.id, userId, child.id, restored.version);
    } catch (error) {
      staleDeleteRejected = error instanceof Roadmap2ConflictError;
    }
    assert(staleDeleteRejected, "Une suppression avec une version obsolète doit être refusée.");
    await roadmap2Repository.deleteNode(workspaceA.id, userId, child.id, archivedVersion);
    assert(!await prisma.roadmap2Node.findUnique({ where: { id: child.id } }), "Suppression définitive non persistée.");
    step("archive_and_delete");

    const required = [
      "src/app/admin/roadmap/page.tsx",
      "src/app/admin/roadmap-2/page.tsx",
      "src/server/roadmap.ts",
      "src/server/roadmap2.ts",
      "prisma/migrations/20260622150000_add_roadmap_milestones/migration.sql",
      "prisma/migrations/20260811120000_add_roadmap_2/migration.sql",
    ];
    for (const file of required) assert(existsSync(join(process.cwd(), file)), `Fichier requis manquant : ${file}`);
    const nav = readFileSync(join(process.cwd(), "src/app/admin/admin-nav.tsx"), "utf8");
    const sitemap = readFileSync(join(process.cwd(), "src/app/sitemap.ts"), "utf8");
    const actions = readFileSync(join(process.cwd(), "src/server/roadmap2-actions.ts"), "utf8");
    const clientSources = [
      "src/app/admin/roadmap-2/roadmap2-client.tsx",
      "src/app/admin/roadmap-2/roadmap2-graph.tsx",
      "src/app/admin/roadmap-2/roadmap2-timeline.tsx",
      "src/app/admin/roadmap-2/roadmap2-list.tsx",
      "src/app/admin/roadmap-2/roadmap2-detail.tsx",
    ].map((path) => readFileSync(join(process.cwd(), path), "utf8")).join("\n");
    assert(nav.includes('label: "Roadmap"') && nav.includes('label: "Roadmap 2"'), "Les deux rubriques doivent coexister.");
    assert(!sitemap.includes("roadmap-2"), "Roadmap 2 ne doit pas apparaître dans le sitemap public.");
    const actionNames = ["createRoadmap2Workspace", "renameRoadmap2Workspace", "createRoadmap2Node", "updateRoadmap2Node", "moveRoadmap2Node", "archiveRoadmap2Node", "deleteRoadmap2Node", "createRoadmap2Edge", "addRoadmap2Update", "initializeRoadmap2"];
    for (const name of actionNames) assert(actions.includes(`function ${name}`), `Action manquante : ${name}`);
    const guardCount = (actions.match(/resolveRoadmap2Context\(workspaceKey\)/g) ?? []).length;
    assert(guardCount >= 11 && actions.includes("await requirePlatformAdmin()"), "Chaque mutation doit résoudre la roadmap et le contexte admin privé côté serveur.");
    assert(!actions.includes("workspaceId: string"), "Les actions publiques ne doivent pas accepter workspaceId.");
    assert(!clientSources.includes("dangerouslySetInnerHTML"), "Les textes Roadmap 2 ne doivent pas être injectés comme HTML.");
    assert(clientSources.includes("Nouvelle roadmap") && clientSources.includes('aria-label="Choisir une roadmap"'), "Le sélecteur et la création d’une roadmap doivent être opérables dans l’interface.");
    step("private_route_and_legacy_roadmap_preserved");
  } finally {
    if (workspaceIds.length) await prisma.roadmap2Workspace.deleteMany({ where: { id: { in: workspaceIds } } }).catch(() => undefined);
    if (organizationId) await prisma.organization.delete({ where: { id: organizationId } }).catch(() => undefined);
    if (userId) await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
    step("fixtures_cleaned");
  }
});
