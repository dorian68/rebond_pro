import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

const baseUrl = process.env.ORCHESTRATION_BASE_URL ?? "http://localhost:3400";
const outputDir = resolve(process.cwd(), ".run", "orchestration-captures");

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1720, height: 1100 }, deviceScaleFactor: 1 });

async function openStudioView(name) {
  const tab = page.getByRole("button", { name, exact: true });
  await tab.click();
  await tab.evaluate((element) => new Promise((resolve) => {
    const startedAt = Date.now();
    const poll = () => {
      if (element.getAttribute("aria-current") === "page" || Date.now() - startedAt > 10_000) resolve();
      else window.setTimeout(poll, 50);
    };
    poll();
  }));
  await page.waitForTimeout(400);
}

try {
  await page.goto(`${baseUrl}/admin/orchestration`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.evaluate(() => {
    window.localStorage.removeItem("le-bon-rebond:orchestration:mixed-sources:v4");
    window.sessionStorage.setItem("socrate-nudge-count", "30");
  });
  await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByRole("heading", { name: "Orchestration des parcours" }).waitFor({ timeout: 30_000 });
  await page.addStyleTag({ content: "nextjs-portal, .socrate-fab { display: none !important; }" });
  // Le serveur de capture démarre à froid ; laisser React terminer son hydratation
  // avant les clics évite de capturer l'état HTML initial sans gestionnaires.
  await page.waitForTimeout(2_500);

  await page.screenshot({ path: resolve(outputDir, "01-vue-ensemble.png"), fullPage: true });

  await openStudioView("Parcours");
  await page.screenshot({ path: resolve(outputDir, "03-parcours-plan-a-b.png"), fullPage: true });
  await page.locator('aside[aria-label="Passeport Rebond de Sarah"]').screenshot({ path: resolve(outputDir, "02-passeport-sarah.png") });
  await page.locator('aside[aria-label="Passeport Rebond de Sarah"]').getByRole("button", { name: "Modifier", exact: true }).click();
  await page.locator('aside[aria-label="Passeport Rebond de Sarah"]').screenshot({ path: resolve(outputDir, "08-selecteur-metiers-bmo.png") });
  await page.locator('aside[aria-label="Passeport Rebond de Sarah"]').getByLabel("Plan A · métier référencé").selectOption("bmo-2026-a1x41");
  await page.locator('aside[aria-label="Passeport Rebond de Sarah"]').getByRole("button", { name: "Recalculer en brouillon", exact: true }).click();
  await page.getByText("Jardiniers des espaces verts et naturels · FAP A1X41", { exact: true }).waitFor({ timeout: 10_000 });
  await page.getByText("Compléter l’ingénierie du métier", { exact: true }).first().waitFor({ timeout: 10_000 });
  await page.screenshot({ path: resolve(outputDir, "09-parcours-cible-bmo-recalculee.png"), fullPage: true });
  await page.evaluate(() => window.localStorage.removeItem("le-bon-rebond:orchestration:mixed-sources:v4"));
  await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByRole("heading", { name: "Orchestration des parcours" }).waitFor({ timeout: 30_000 });
  await page.addStyleTag({ content: "nextjs-portal, .socrate-fab { display: none !important; }" });
  await page.waitForTimeout(800);

  await openStudioView("Écosystème local");
  await page.screenshot({ path: resolve(outputDir, "04-ecosysteme-local.png"), fullPage: true });

  await page.getByRole("button", { name: /Mission Locale/i }).first().click();
  await page.waitForTimeout(250);
  await page.locator('aside[aria-labelledby="actor-title"]').screenshot({ path: resolve(outputDir, "05-fiche-acteur.png") });
  await page.getByRole("button", { name: "Fermer la fiche acteur" }).click();

  await openStudioView("Coûts & financements");
  await page.screenshot({ path: resolve(outputDir, "06-couts-financements.png"), fullPage: true });

  await openStudioView("Référentiel");
  await page.getByRole("tab", { name: "BMO 2026", exact: true }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: resolve(outputDir, "07-bmo-2026.png"), fullPage: true });

  process.stdout.write(`${outputDir}\n`);
} finally {
  await browser.close();
}
