// Read-only exact-asset and public journey check; never submits a form.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, relative } from "node:path";

const base = process.env.SMOKE_BASE_URL || "https://lebonrebond.fr";
const root = resolve("public");
function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? files(resolve(dir, entry.name)) : [resolve(dir, entry.name)]);
}
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const paths = ["/salon.html", "/salon-affiche.html", ...files(resolve(root, "salon")).map((file) => `/${relative(root, file).replaceAll("\\", "/")}`)];
try {
  for (const path of paths) {
    const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(20000) });
    assert.equal(response.status, 200, path);
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(hash(bytes), hash(readFileSync(resolve(root, `.${path}`))), `Asset mismatch: ${path}`);
  }
  const html = readFileSync(resolve(root, "salon.html"), "utf8");
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert(!/Digitalys|Bourguignon|Bourguibon|TODO|placeholder/i.test(html));
  assert(/noindex,follow/.test(html));
  const origin = new URL(base).hostname;
  if (origin !== "127.0.0.1" && origin !== "localhost") {
    for (const path of ["/questionnaire", "/marketplace", "/bilan-de-competences", "/contact", "/legal/confidentialite", "/legal/mentions"]) {
      const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(20000) });
      assert.equal(response.status, 200, path);
      await response.arrayBuffer();
    }
    const response = await fetch(new URL("/api/health", base));
    const state = await response.json();
    assert(response.ok && state.ok && state.db === "up");
  }
  console.log(JSON.stringify({ step: "salon", status: "pass", base, exactAssets: paths.length, formSubmissions: 0 }));
} catch (error) {
  console.error(JSON.stringify({ step: "salon", status: "fail", error: error.message }));
  process.exitCode = 1;
}
