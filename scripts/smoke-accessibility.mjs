import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://localhost:3100").replace(/\/$/, "");
const routes = [
  "/",
  "/formation",
  "/centres",
  "/pour-qui",
  "/bilan-de-competences",
  "/bilan-orientation",
  "/methode",
  "/deroulement",
  "/a-propos",
  "/contact",
  "/marketplace",
  "/legal/mentions",
  "/legal/cgu",
  "/legal/confidentialite",
];
const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

const browser = await chromium.launch({ headless: true });
const failures = [];

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport,
      reducedMotion: "reduce",
    });
    const page = await context.newPage();

    for (const route of routes) {
      const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "load" });
      if (!response?.ok()) {
        failures.push(`${route} (${viewport.name}): HTTP ${response?.status() ?? "inconnu"}`);
        continue;
      }

      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(1500);

      const { violations } = await new AxeBuilder({ page }).analyze();
      const overflow = await page.evaluate(() => ({
        viewport: window.innerWidth,
        document: document.documentElement.scrollWidth,
      }));

      if (violations.length > 0) {
        const details = violations
          .map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`)
          .join(" | ");
        failures.push(`${route} (${viewport.name}): ${details}`);
      }
      if (overflow.document > overflow.viewport + 1) {
        failures.push(`${route} (${viewport.name}): débordement horizontal ${overflow.document}px > ${overflow.viewport}px`);
      }

      if (violations.length === 0 && overflow.document <= overflow.viewport + 1) {
        console.log(`PASS ${viewport.name.padEnd(7)} ${route}`);
      }
    }

    await context.close();
  }
} finally {
  await browser.close();
}

if (failures.length > 0) {
  console.error("\nAccessibility smoke failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(`\nAccessibility smoke PASS (${routes.length * viewports.length} parcours).`);
