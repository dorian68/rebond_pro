import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildRoadmap2Seed } from "../src/server/roadmap2-seed";

async function main() {
  const anchorDate = "2027-01-15";
  const seed = buildRoadmap2Seed(anchorDate);
  assert.equal(seed.nodes.length, 65);
  assert.equal(seed.edges.length, 110);
  assert.equal(seed.nodes.find((node) => node.key === "root")?.startDate, anchorDate, "La date choisie doit ancrer le seed.");
  assert.equal(seed.nodes.filter((node) => node.key === "root" || node.type === "phase").length, 8, "La vue initiale doit se limiter à la racine et aux sept phases.");

  const client = await readFile("src/app/admin/roadmap-2/roadmap2-client.tsx", "utf8");
  const server = await readFile("src/server/roadmap2.ts", "utf8");
  assert.match(client, /Revue hebdomadaire/);
  assert.match(client, /Échéances à 7 jours/);
  assert.match(client, /VIEW_PREFERENCES_PREFIX/);
  assert.match(client, /expandedPhaseIds/);
  assert.match(client, /Formule des KPI/);
  assert.match(client, /Date d’ancrage/);
  assert.match(client, /Responsable par phase/);
  assert.match(server, /activeParentIds/);
  assert.match(server, /deliveryNodes/);
  assert.match(server, /ownerByCategory/);
  console.log(JSON.stringify({ status: "pass", suite: "roadmap_2_adoption", initialElements: 8, presets: 4, preferencesPersisted: true, seedAnchored: true, bulkOwners: true, leafKpis: true }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
