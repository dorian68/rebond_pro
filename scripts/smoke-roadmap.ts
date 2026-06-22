import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

function step(label: string, details?: unknown) {
  console.log(JSON.stringify({ step: label, status: "pass", ...(details ? { details } : {}) }));
}
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

try {
  const serverPath = "src/server/roadmap.ts";
  const actionsPath = "src/server/roadmap-actions.ts";
  const pagePath = "src/app/admin/roadmap/page.tsx";
  const clientPath = "src/app/admin/roadmap/roadmap-client.tsx";
  const navPath = "src/app/admin/admin-nav.tsx";
  const schemaPath = "prisma/schema.prisma";

  for (const p of [serverPath, actionsPath, pagePath, clientPath]) {
    assert(existsSync(join(process.cwd(), p)), `Fichier roadmap manquant : ${p}`);
  }
  step("files_exist");

  const server = read(serverPath);
  const actions = read(actionsPath);
  const nav = read(navPath);
  const schema = read(schemaPath);

  // Garde admin-only : lecture + chaque mutation exigent requirePlatformAdmin.
  assert(server.includes("requirePlatformAdmin"), "La lecture roadmap doit exiger requirePlatformAdmin.");
  const mutations = ["createMilestone", "updateMilestone", "deleteMilestone", "setMilestoneStatus", "moveMilestone"];
  for (const fn of mutations) {
    assert(actions.includes(`export async function ${fn}`), `Action roadmap manquante : ${fn}`);
  }
  // Autant de gardes requirePlatformAdmin que de mutations (chacune protégée).
  const guardCount = (actions.match(/requirePlatformAdmin/g) ?? []).length;
  assert(guardCount >= mutations.length, `Chaque mutation roadmap doit appeler requirePlatformAdmin (trouvé ${guardCount}/${mutations.length}).`);
  step("admin_only_guarded", { mutations: mutations.length, guards: guardCount });

  // Persistance partagée : modèle Prisma global (pas d'organizationId → visible par tous les admins).
  assert(schema.includes("model RoadmapMilestone"), "Le modèle RoadmapMilestone doit exister dans le schéma Prisma.");
  const modelBlock = schema.slice(schema.indexOf("model RoadmapMilestone"));
  const modelBody = modelBlock.slice(0, modelBlock.indexOf("}"));
  assert(!/organizationId/.test(modelBody), "RoadmapMilestone doit être global (aucun organizationId) pour être partagé entre admins.");
  for (const field of ["title", "status", "priority", "progress", "deadline", "contactEmail", "ownerName", "sortOrder"]) {
    assert(modelBody.includes(field), `Champ RoadmapMilestone manquant : ${field}`);
  }
  assert(actions.includes("revalidatePath(\"/admin/roadmap\")"), "Les mutations doivent revalider /admin/roadmap (mise à jour live).");
  step("shared_persistence");

  // Migration présente.
  assert(existsSync(join(process.cwd(), "prisma/migrations/20260622150000_add_roadmap_milestones/migration.sql")), "Migration RoadmapMilestone manquante.");
  step("migration_present");

  // Exposé uniquement dans la nav admin.
  assert(nav.includes("/admin/roadmap"), "La navigation admin doit exposer /admin/roadmap.");
  step("admin_nav_entry");

  step("roadmap_smoke_complete");
} catch (e) {
  console.error(JSON.stringify({ step: "roadmap_smoke", status: "fail", error: e instanceof Error ? e.message : String(e) }));
  process.exitCode = 1;
}
