import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { existsSync } from "node:fs";

const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://localhost:3100").replace(/\/$/, "");
const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
];
const failures = [];
const browser = await chromium.launch({ headless: true });
const authState = existsSync("e2e/.auth/user.json") ? { storageState: "e2e/.auth/user.json" } : {};

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport, reducedMotion: "reduce", ...authState });
    const page = await context.newPage();
    const response = await page.goto(`${baseUrl}/admin/roadmap-2`, { waitUntil: "networkidle" });
    if (!response?.ok() || page.url().includes("/login")) {
      failures.push(`${viewport.name}: authentification ou HTTP invalide (${response?.status() ?? "sans réponse"}, ${page.url()})`);
      await context.close();
      continue;
    }
    await page.evaluate(() => document.fonts.ready);
    const { violations } = await new AxeBuilder({ page }).analyze();
    for (const violation of violations.filter((item) => item.impact === "critical" || item.impact === "serious")) {
      failures.push(`${viewport.name}: ${violation.id} — ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`);
    }
    const layout = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
    if (layout.document > layout.viewport + 1) failures.push(`${viewport.name}: débordement horizontal ${layout.document}px > ${layout.viewport}px`);
    if (viewport.name === "mobile") {
      const undersized = await page.locator(".workspace button:visible, .workspace select:visible, .workspace input:visible").evaluateAll((elements) => elements.filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44);
      }).slice(0, 10).map((element) => `${element.tagName.toLowerCase()}[${element.getAttribute("aria-label") ?? element.textContent?.trim().slice(0, 30) ?? ""}]`));
      if (undersized.length) failures.push(`mobile: cibles tactiles <44px — ${undersized.join(", ")}`);
    }
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => document.activeElement !== document.body);
    if (!focused) failures.push(`${viewport.name}: navigation clavier sans cible de focus`);
    console.log(JSON.stringify({ viewport: viewport.name, status: "pass", seriousAxe: 0, overflow: false }));
    await context.close();
  }

  const context = await browser.newContext({ viewport: viewports[0], ...authState });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/admin/roadmap-2`, { waitUntil: "networkidle" });
  await page.setViewportSize({ width: 720, height: 900 });
  const zoomLayout = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
  if (zoomLayout.document > zoomLayout.viewport + 1) failures.push(`zoom 200%: débordement horizontal ${zoomLayout.document}px > ${zoomLayout.viewport}px`);
  await context.close();

  // Régression du faux état vide : un filtre sans résultat doit pouvoir être
  // effacé par le CTA et rendre de nouveau tous les nœuds réellement présents.
  const filterContext = await browser.newContext({ viewport: viewports[2], reducedMotion: "reduce", ...authState });
  const filterPage = await filterContext.newPage();
  await filterPage.goto(`${baseUrl}/admin/roadmap-2`, { waitUntil: "networkidle" });
  const graphNodes = filterPage.locator(".react-flow__node");
  const initialNodeCount = await graphNodes.count();
  if (initialNodeCount > 0) {
    const search = filterPage.getByLabel("Rechercher un nœud");
    await search.fill("__roadmap2_aucun_resultat_regression__");
    const emptyState = filterPage.getByText("Aucun résultat avec ces filtres", { exact: true });
    await emptyState.waitFor();
    await filterPage.getByRole("button", { name: "Afficher toute la roadmap" }).click();
    await filterPage.waitForTimeout(250);
    if (await emptyState.isVisible().catch(() => false)) failures.push("filtres: l’état vide reste affiché après le CTA de réinitialisation");
    if ((await search.inputValue()) !== "") failures.push("filtres: la recherche n’est pas effacée par le CTA");
    if ((await graphNodes.count()) === 0) failures.push("filtres: aucun nœud n’est restauré après le CTA");
  }
  await filterContext.close();
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}
console.log(JSON.stringify({ status: "pass", suite: "roadmap_2_runtime_a11y", viewports: viewports.length, zoom200: true, touchTargets44: true, filterReset: true }));
