// Read-only HTTP acceptance check. No credentials or form submissions.
import assert from "node:assert/strict";

const base = new URL(process.env.SMOKE_BASE_URL || "https://lebonrebond.fr");
const slug = "carif-digitalys-formation";
const removed = [`/${slug}`, ...Array.from({ length: 5 }, (_, i) => `/${slug}/f/carif-digitalys-f0${i + 1}`)];
let checks = 0;
function pass(step, details) {
  checks++;
  console.log(JSON.stringify({ step, status: "pass", details }));
}
async function get(path) {
  const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(20000) });
  return { status: response.status, body: await response.text() };
}
function noPublicReference(body) {
  // A search query can be echoed in the input and RSC payload; inspect actual links/content.
  assert(!new RegExp(`href=["'][^"']*${slug}`, "i").test(body), "Withdrawn center link remains");
  const html = body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  assert(!/Digitalys Formation|digitalysformation\.fr|La formation numérique au cœur de La Réunion/i.test(html), "Withdrawn center content remains");
}

try {
  const health = await get("/api/health");
  const state = JSON.parse(health.body);
  assert.equal(health.status, 200);
  assert(state.ok && state.db === "up");
  pass("health", { db: state.db });

  const sitemap = await get("/sitemap.xml");
  assert.equal(sitemap.status, 200);
  assert(!/digitalys/i.test(sitemap.body));
  const paths = [...sitemap.body.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  pass("sitemap", { urls: paths.length, removedUrls: removed.length });

  for (const path of ["/", "/formation", "/centres", "/marketplace", "/marketplace?allCenters=1", "/marketplace?q=Digitalys", "/marketplace?q=Digitalys&allCenters=1"]) {
    const page = await get(path);
    assert.equal(page.status, 200, path);
    noPublicReference(page.body);
    pass("public_page", { path });
  }
  for (const path of removed) {
    const page = await get(path);
    assert.equal(page.status, 404, path);
    noPublicReference(page.body);
    pass("withdrawn_url", { path, status: page.status });
  }
  const catalog = paths.filter((path) => /^\/carif-/.test(path));
  assert(catalog.length > 0, "Other centers disappeared from sitemap");
  // Verify all retained center/formation URLs, four requests at a time.
  for (let i = 0; i < catalog.length; i += 4) {
    await Promise.all(catalog.slice(i, i + 4).map(async (path) => {
      const page = await get(path);
      assert.equal(page.status, 200, path);
      noPublicReference(page.body);
    }));
  }
  pass("retained_catalog", { urls: catalog.length, centers: catalog.filter((p) => !p.includes("/f/")).length, formations: catalog.filter((p) => p.includes("/f/")).length });
  console.log(JSON.stringify({ step: "digitalys_removal", status: "pass", checks, origin: base.origin }));
} catch (error) {
  console.error(JSON.stringify({ step: "digitalys_removal", status: "fail", error: error.message }));
  process.exitCode = 1;
}
