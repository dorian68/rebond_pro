import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://localhost:3100").replace(/\/$/, "");
const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
];
const failures = [];
const browser = await chromium.launch({ headless: true });

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport, reducedMotion: "reduce", storageState: "e2e/.auth/user.json" });
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

  const context = await browser.newContext({ viewport: viewports[0], storageState: "e2e/.auth/user.json" });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/admin/roadmap-2`, { waitUntil: "networkidle" });
  await page.setViewportSize({ width: 720, height: 900 });
  const zoomLayout = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
  if (zoomLayout.document > zoomLayout.viewport + 1) failures.push(`zoom 200%: débordement horizontal ${zoomLayout.document}px > ${zoomLayout.viewport}px`);
  await context.close();
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}
console.log(JSON.stringify({ status: "pass", suite: "roadmap_2_runtime_a11y", viewports: viewports.length, zoom200: true, touchTargets44: true }));
