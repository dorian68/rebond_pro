import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

// Run only on an isolated CI runner: anonymous GETs, no form submissions or DB.
const toolsDirectory = process.env.PERFORMANCE_AUDIT_TOOLS;
assert.ok(toolsDirectory, "PERFORMANCE_AUDIT_TOOLS is required");
const requireTool = createRequire(join(toolsDirectory, "package.json"));
const { chromium } = requireTool("playwright");
const lighthouse = (await import(pathToFileURL(requireTool.resolve("lighthouse")).href)).default;
const chromeLauncher = await import(pathToFileURL(requireTool.resolve("chrome-launcher")).href);
const output = process.env.PERFORMANCE_OUTPUT_DIR;
assert.ok(output, "PERFORMANCE_OUTPUT_DIR is required");
const urls = {
  baseline: process.env.PERFORMANCE_BASELINE_URL,
  candidate: process.env.PERFORMANCE_CANDIDATE_URL,
};
for (const url of Object.values(urls)) {
  assert.ok(url && new URL(url).hostname === "127.0.0.1", "Only runner-local URLs are allowed");
}
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const report = {
  candidateSha: process.env.GITHUB_SHA,
  baselineSha: process.env.PERFORMANCE_BASELINE_SHA,
  chrome: browser.version(),
  lighthouse: "13.6.0",
  scope: "Isolated Linux CI runtimes with no reachable database. Anonymous GETs and remote headless rendering only. Lab results are not field Core Web Vitals or a production measurement.",
  renders: [],
  audits: [],
};

async function snapshot(page) {
  await page.evaluate(() => document.fonts.ready);
  return page.evaluate(() => {
    const hero = document.querySelector("main > section");
    const describe = (element) => {
      const { x, y, width, height } = element.getBoundingClientRect();
      return {
        text: element.textContent.replace(/\s+/g, " ").trim(),
        visible: element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }),
        opacity: getComputedStyle(element).opacity,
        bounds: { x, y, width, height },
      };
    };
    return {
      heading: describe(hero.querySelector("h1")),
      introduction: describe(hero.querySelector("p")),
      journeys: [...hero.querySelectorAll('a[href="/marketplace"], a[href="/bilan-de-competences"]')].map((link) => ({ ...describe(link), href: link.getAttribute("href") })),
      content: hero.textContent.replace(/\s+/g, " ").trim(),
      links: [...document.querySelectorAll("main a")].map((link) => ({ href: link.getAttribute("href"), text: link.textContent.replace(/\s+/g, " ").trim() })),
      canonical: document.querySelector('link[rel="canonical"]').href,
      identity: [...document.querySelectorAll('script[type="application/ld+json"]')].map((script) => JSON.parse(script.textContent)),
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
    };
  });
}

try {
  for (const [viewportName, viewport] of Object.entries({ mobile: { width: 412, height: 823 }, desktop: { width: 1440, height: 900 } })) {
    const pair = {};
    for (const javaScriptEnabled of [false, true]) {
      for (const [label, url] of Object.entries(urls)) {
        const context = await browser.newContext({ viewport, javaScriptEnabled });
        const page = await context.newPage();
        await page.goto(url, { waitUntil: "networkidle" });
        if (javaScriptEnabled) {
          await page.waitForFunction(() => [...document.querySelectorAll("main > section:first-child h1, main > section:first-child p")].every((element) => getComputedStyle(element).opacity === "1"));
        }
        const result = await snapshot(page);
        pair[`${label}-${javaScriptEnabled}`] = result;
        report.renders.push({ label, viewportName, javaScriptEnabled, ...result });
        await page.screenshot({ path: join(output, `${label}-${viewportName}-${javaScriptEnabled ? "hydrated" : "no-js"}.png`) });
        await context.close();
      }
      const baseline = pair[`baseline-${javaScriptEnabled}`];
      const candidate = pair[`candidate-${javaScriptEnabled}`];
      for (const key of ["content", "links", "canonical", "identity"]) assert.deepEqual(candidate[key], baseline[key], `${key} changed`);
      assert.ok(candidate.heading.visible && candidate.introduction.visible, "Candidate hero text is hidden");
      assert.equal(candidate.journeys.length, 2);
      assert.ok(candidate.journeys.every((journey) => journey.visible), "Candidate journeys are hidden");
      assert.equal(candidate.horizontalOverflow, false);
      if (!javaScriptEnabled) {
        assert.equal(baseline.heading.visible, false, "Baseline no longer reproduces hidden hero");
        assert.equal(baseline.introduction.visible, false, "Baseline no longer reproduces hidden LCP");
      } else {
        for (const key of ["heading", "introduction"]) {
          for (const dimension of ["x", "y", "width", "height"]) {
            assert.ok(Math.abs(candidate[key].bounds[dimension] - baseline[key].bounds[dimension]) <= 2, `Final ${key} ${dimension} changed`);
          }
        }
      }
    }
  }
} finally {
  await browser.close();
  await writeFile(join(output, "render-evidence.json"), JSON.stringify(report, null, 2));
}

for (let round = 1; round <= 3; round++) {
  for (const [label, url] of Object.entries(urls)) {
    const chrome = await chromeLauncher.launch({
      chromePath: chromium.executablePath(),
      chromeFlags: ["--headless=new", "--no-sandbox", "--disable-dev-shm-usage"],
    });
    try {
      const result = await lighthouse(url, {
        port: chrome.port,
        onlyCategories: ["performance", "seo", "accessibility"],
        output: ["json", "html"],
        formFactor: "mobile",
        throttlingMethod: "simulate",
        logLevel: "error",
      });
      const lhr = result.lhr;
      assert.equal(lhr.runtimeError, undefined, JSON.stringify(lhr.runtimeError));
      await writeFile(join(output, `${label}-${round}.json`), result.report[0]);
      await writeFile(join(output, `${label}-${round}.html`), result.report[1]);
      const audit = {
        label, round,
        performance: lhr.categories.performance.score,
        seo: lhr.categories.seo.score,
        accessibility: lhr.categories.accessibility.score,
        lcpMs: lhr.audits["largest-contentful-paint"].numericValue,
        fcpMs: lhr.audits["first-contentful-paint"].numericValue,
        tbtMs: lhr.audits["total-blocking-time"].numericValue,
        cls: lhr.audits["cumulative-layout-shift"].numericValue,
        lcpElement: lhr.audits["lcp-breakdown-insight"].details,
      };
      report.audits.push(audit);
      console.log(JSON.stringify({ step: "lighthouse", ...audit, lcpElement: undefined }));
    } finally {
      await chrome.kill();
    }
  }
}

const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
report.medians = Object.fromEntries(Object.keys(urls).map((label) => [label,
  Object.fromEntries(["performance", "seo", "accessibility", "lcpMs", "fcpMs", "tbtMs", "cls"].map((key) => [key, median(report.audits.filter((audit) => audit.label === label).map((audit) => audit[key]))])),
]));
const { baseline, candidate } = report.medians;
report.checks = {
  lcpImprovesAtLeast20Percent: candidate.lcpMs <= baseline.lcpMs * 0.8,
  seoPreserved: candidate.seo >= baseline.seo,
  accessibilityPreserved: candidate.accessibility >= baseline.accessibility,
  noLayoutShiftRegression: candidate.cls <= baseline.cls + 0.02,
};
report.passed = Object.values(report.checks).every(Boolean);
await writeFile(join(output, "summary.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ step: "summary", medians: report.medians, checks: report.checks, status: report.passed ? "pass" : "fail" }));
assert.ok(report.passed, "Performance acceptance checks failed; see summary.json");
