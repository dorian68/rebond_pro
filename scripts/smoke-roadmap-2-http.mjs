const baseUrl = (process.env.SMOKE_BASE_URL || "http://127.0.0.1:3114").replace(/\/$/, "");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function step(label, details) {
  console.log(JSON.stringify({ step: label, status: "pass", ...(details ? { details } : {}) }));
}

async function load(path) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: "follow" });
  return { response, body: await response.text() };
}

try {
  const legacy = await load("/admin/roadmap");
  assert(legacy.response.status === 200 && legacy.response.url.endsWith("/admin/roadmap"), "La Roadmap historique n'est plus accessible.");
  assert(legacy.body.includes("Roadmap"), "Le contenu Roadmap historique est absent.");
  step("legacy_roadmap_http", { status: legacy.response.status });

  const roadmap2 = await load("/admin/roadmap-2");
  assert(roadmap2.response.status === 200 && roadmap2.response.url.endsWith("/admin/roadmap-2"), "Roadmap 2 n'est pas accessible séparément.");
  for (const text of ["Roadmap 2", "Graphe", "Timeline", "Liste", "Nouveau nœud", "Nouvelle décision", "Nouvelle roadmap", "Choisir une roadmap"]) assert(roadmap2.body.includes(text), `Contenu SSR Roadmap 2 manquant : ${text}`);
  step("roadmap_2_http", { status: roadmap2.response.status, bytes: roadmap2.body.length });

  for (const path of ["/roadmap-2", "/api/roadmap-2"]) {
    const publicAttempt = await load(path);
    assert(publicAttempt.response.status === 404, `Une surface publique Roadmap 2 existe : ${path}.`);
  }
  step("public_surfaces_absent");

  step("roadmap_2_http_smoke_complete");
} catch (error) {
  console.error(JSON.stringify({ step: "roadmap_2_http_smoke", status: "fail", error: error instanceof Error ? error.message : String(error) }));
  process.exitCode = 1;
}
