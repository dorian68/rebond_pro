import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Home from "../src/app/(site)/page";
import Header from "../src/components/site/Header";
import { PageBreadcrumbs } from "../src/components/site/PageBreadcrumbs";
import { breadcrumbData, centerPath, formationPath, jsonLd, siteIdentity } from "../src/lib/site-seo";
import { CATALOG_SITEMAP_FORMATION_LIMIT, publicCatalogSitemapPaths, publicCatalogSitemapQuery } from "../src/lib/catalog-sitemap";
import { VERIFIED_MARKETPLACE_ORGANIZATION } from "../src/lib/marketplace-publication";

let failures = 0;
async function check(step: string, run: () => unknown | Promise<unknown>) {
  try {
    await run();
    console.log(JSON.stringify({ step, status: "pass" }));
  } catch (error) {
    failures++;
    console.error(JSON.stringify({ step, status: "fail", error: error instanceof Error ? error.message : "Unknown error" }));
  }
}

function structuredData(html: string): Record<string, unknown>[] {
  return [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map((match) => JSON.parse(match[1]));
}

async function main() {
  const previousOrigin = process.env.APP_PUBLIC_URL;
  process.env.APP_PUBLIC_URL = "https://lebonrebond.fr";
  await check("homepage_hero_is_visible_before_hydration", () => {
    const html = renderToStaticMarkup(createElement(Home));
    const hero = html.match(/<section\b[\s\S]*?<\/section>/)?.[0];
    assert.ok(hero, "Missing homepage hero");
    assert.match(hero, /<h1\b[^>]*opacity:1/);
    assert.match(hero, /<p\b[^>]*opacity:1[^>]*>Le Bon Rebond accompagne/);
    assert.doesNotMatch(hero, /opacity:0(?:;|")|translateY\(24px\)/);
    for (const path of ["/marketplace", "/bilan-de-competences"]) {
      assert.ok(hero.includes(`href="${path}"`), `Missing hero journey: ${path}`);
    }
  });
  await check("identity_matches_public_legal_publisher", () => {
    const graph = siteIdentity()["@graph"];
    const publisher = graph.find((item) => item["@type"] === "Organization");
    const website = graph.find((item) => item["@type"] === "WebSite");
    const brand = graph.find((item) => item["@type"] === "Brand");
    assert.equal(publisher?.name, "OPTIQUANT IA");
    assert.equal(brand?.name, "Le Bon Rebond");
    assert.equal(website?.name, "Le Bon Rebond");
    assert.equal(website?.publisher?.["@id"], publisher?.["@id"]);
    assert.equal(website?.url, "https://lebonrebond.fr/");
    assert.doesNotMatch(JSON.stringify(graph), /SearchAction|aggregateRating|reviewRating|Qualiopi|CPF/);
  });
  await check("database_labels_cannot_close_jsonld_script", () => {
    const label = '</script><img src=x onerror="alert(1)">';
    const escaped = jsonLd(breadcrumbData([{ name: label, path: "/contact" }]));
    assert.ok(!escaped.includes("<"));
    assert.equal(JSON.parse(escaped).itemListElement[0].name, label);
  });
  await check("critical_navigation_exists_before_interaction", () => {
    const html = renderToStaticMarkup(createElement(Header));
    for (const path of ["/bilan-de-competences", "/bilan-orientation", "/methode", "/blog", "/a-propos", "/contact"]) {
      assert.ok(html.includes(`href="${path}"`), `Missing initial HTML link: ${path}`);
    }
    assert.ok(html.includes("<details"));
    assert.ok(html.includes("<summary"));
    assert.ok(html.includes('aria-label="Navigation principale"'));
  });
  await check("visible_breadcrumbs_match_structured_hierarchy", () => {
    const items = [{ name: "Accueil", path: "/" }, { name: "Le journal", path: "/blog" }, { name: "Article & repères", path: "/blog/article" }];
    const html = renderToStaticMarkup(createElement(PageBreadcrumbs, { items }));
    const data = structuredData(html)[0];
    assert.equal(data["@type"], "BreadcrumbList");
    assert.deepEqual(data.itemListElement, breadcrumbData(items).itemListElement);
    assert.ok(html.includes('aria-current="page"'));
    assert.ok(html.includes("Article &amp; repères"));
  });
  await check("catalogue_uses_publication_guard_and_selects_only_public_slugs", () => {
    assert.equal(publicCatalogSitemapQuery.where.organization, VERIFIED_MARKETPLACE_ORGANIZATION);
    assert.equal(publicCatalogSitemapQuery.where.isPublic, true);
    assert.equal(publicCatalogSitemapQuery.where.status, "PUBLIE");
    assert.equal(publicCatalogSitemapQuery.where.deletedAt, null);
    assert.deepEqual(Object.keys(publicCatalogSitemapQuery.select).sort(), ["organization", "publicSlug"]);
    assert.deepEqual(publicCatalogSitemapQuery.select.organization.select, { slug: true });
  });
  await check("catalogue_deduplicates_and_excludes_unresolvable_formation_urls", () => {
    const paths = publicCatalogSitemapPaths([
      { publicSlug: "formation-1", organization: { slug: "centre-1" } },
      { publicSlug: "formation-1", organization: { slug: "centre-1" } },
      { publicSlug: null, organization: { slug: "centre-2" } },
    ]);
    assert.deepEqual(paths, ["/centre-1", "/centre-1/f/formation-1", "/centre-2"]);
    assert.equal(centerPath("centre/ailleurs"), "/centre%2Failleurs");
    assert.equal(formationPath("centre", "cours?secret=1"), "/centre/f/cours%3Fsecret%3D1");
    assert.throws(() => publicCatalogSitemapPaths(Array.from({ length: CATALOG_SITEMAP_FORMATION_LIMIT + 1 }, () => ({ publicSlug: "a", organization: { slug: "b" } }))), /REQUIRES_PAGINATION/);
  });
  if (previousOrigin === undefined) delete process.env.APP_PUBLIC_URL;
  else process.env.APP_PUBLIC_URL = previousOrigin;

  const index = process.argv.indexOf("--base-url");
  if (index >= 0) {
    const base = process.argv[index + 1];
    assert.ok(base, "--base-url requires an explicit URL");
    const paths = ["/", "/bilan-de-competences", "/bilan-orientation", "/methode", "/formation", "/a-propos", "/contact", "/centres", "/blog", "/blog/changer-de-voie-a-40-ans"];
    for (const path of paths) {
      await check(`http_initial_html:${path}`, async () => {
        const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(25_000) });
        assert.equal(response.status, 200);
        const html = await response.text();
        assert.equal([...html.matchAll(/<h1\b/gi)].length, 1, "Expected exactly one H1");
        const canonicals = [...html.matchAll(/<link\b(?=[^>]*rel="canonical")(?=[^>]*href="([^"]+)")[^>]*>/gi)];
        assert.equal(canonicals.length, 1, "Expected one canonical");
        const canonical = new URL(canonicals[0][1]);
        assert.equal(canonical.hostname, "lebonrebond.fr");
        assert.equal(canonical.pathname, path);
        for (const destination of ["/bilan-orientation", "/methode", "/blog"]) assert.ok(html.includes(`href="${destination}"`));
        const data = structuredData(html);
        assert.ok(data.some((item) => Array.isArray(item["@graph"]) && item["@graph"].some((node: { "@type": string }) => node["@type"] === "WebSite")));
        if (path !== "/") assert.ok(data.some((item) => item["@type"] === "BreadcrumbList"));
      });
    }
    await check("http_sitemap_is_unique_canonical_and_keeps_editorial_pages", async () => {
      const response = await fetch(new URL("/sitemap.xml", base), { signal: AbortSignal.timeout(25_000) });
      assert.equal(response.status, 200);
      const xml = await response.text();
      const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => new URL(match[1]));
      assert.ok(urls.length >= 21 && urls.length <= 50_000);
      assert.equal(new Set(urls.map(String)).size, urls.length);
      for (const url of urls) {
        assert.equal(url.hostname, "lebonrebond.fr");
        assert.doesNotMatch(url.pathname, /^\/(admin|api|espace|trainer|onboarding)(\/|$)/);
      }
      for (const path of ["/", "/methode", "/bilan-orientation", "/blog/changer-de-voie-a-40-ans"]) assert.ok(urls.some((url) => url.pathname === path));
    });
    await check("http_unknown_article_remains_a_real_404", async () => {
      const response = await fetch(new URL("/blog/seo-smoke-article-inexistant", base), { signal: AbortSignal.timeout(25_000) });
      assert.equal(response.status, 404);
    });
  }
  console.log(JSON.stringify({ step: "summary", status: failures ? "fail" : "pass", failures, httpChecked: index >= 0 }));
  process.exitCode = failures ? 1 : 0;
}

main().catch((error) => {
  console.error(JSON.stringify({ step: "unexpected", status: "fail", error: error instanceof Error ? error.message : "Unknown error" }));
  process.exitCode = 1;
});
