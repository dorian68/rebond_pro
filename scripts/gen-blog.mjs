// One-shot : génère src/content/blog-data.ts depuis l'export HTML Claude Design.
// Usage : node scripts/gen-blog.mjs "<dossier export>"
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SRC = process.argv[2] || "C:/Users/Labry/Downloads/RebondPro8BLOG/export/blog-lebonrebond";

const SLUGS = [
  "changer-de-voie-a-40-ans",
  "bilan-de-competences-a-quoi-ca-sert",
  "parcoursup-aider-son-ado-sans-choisir",
  "cpf-financer-formation-2026",
  "reprendre-confiance-apres-doute-professionnel",
  "se-reconvertir-dans-le-numerique-mythes-realites",
  "se-former-pres-de-chez-soi-territoires-guadeloupe",
];

// .html (export) -> route Next
const HREF_MAP = {
  "accueil.html": "/",
  "formation.html": "/formation",
  "bilan-competences.html": "/bilan-de-competences",
  "bilan-orientation.html": "/bilan-orientation",
  "espace-partenaires.html": "/centres",
  "a-propos.html": "/a-propos",
  "contact.html": "/contact",
  "connexion.html": "/login",
  "blog.html": "/blog",
};
const SLUGSET = new Set(SLUGS);

function rewriteHrefs(html) {
  return html.replace(/href="([^"]+)"/g, (m, href) => {
    const [file, hash = ""] = href.split("#");
    const lower = file.toLowerCase();
    if (HREF_MAP[lower]) return `href="${HREF_MAP[lower]}${hash ? "#" + hash : ""}"`;
    if (lower.endsWith(".html")) {
      const base = file.replace(/\.html$/i, "");
      if (SLUGSET.has(base)) return `href="/blog/${base}${hash ? "#" + hash : ""}"`;
    }
    return m;
  });
}

const pick = (re, s, g = 1) => { const m = s.match(re); return m ? m[g].trim() : ""; };

// ---- excerpts depuis blog.html (les cartes) ----
const blogHtml = readFileSync(join(SRC, "blog.html"), "utf8");
const excerpts = {};
const featuredSlugs = new Set();
for (const m of blogHtml.matchAll(/<article class="(feat-post|post-card)">([\s\S]*?)<\/article>/g)) {
  const block = m[2];
  const slug = pick(/href="([^"]+)\.html"/, block);
  if (!slug) continue;
  excerpts[slug] = pick(/<p>([\s\S]*?)<\/p>/, block);
  if (m[1] === "feat-post") featuredSlugs.add(slug);
}

// ---- chaque article ----
const articles = SLUGS.map((slug) => {
  const html = readFileSync(join(SRC, `${slug}.html`), "utf8");
  const metaCenter = pick(/<div class="post-meta center">([\s\S]*?)<\/div>/, html);
  const readingMin = pick(/<span>([^<]*?min)<\/span>/, metaCenter);
  const date = pick(/<span>(\d{1,2}[^<]+20\d\d)<\/span>/, metaCenter);

  const related = [];
  const relBlock = pick(/<div class="related">([\s\S]*?)<\/article>/, html);
  for (const r of relBlock.matchAll(/<a class="rel-card" href="([^"]+)\.html">\s*<span class="rel-cat">([\s\S]*?)<\/span>\s*<span class="rel-t">([\s\S]*?)<\/span>/g)) {
    related.push({ slug: r[1], category: r[2].trim(), title: r[3].trim() });
  }

  return {
    slug,
    featured: featuredSlugs.has(slug),
    category: pick(/<div class="crumb">[\s\S]*?<b>([\s\S]*?)<\/b>/, html),
    title: pick(/<h1 class="article-title">([\s\S]*?)<\/h1>/, html),
    excerpt: excerpts[slug] || "",
    date,
    readingMin,
    coverAlt: pick(/<div class="article-cover">[\s\S]*?placeholder="([\s\S]*?)"/, html),
    metaTitle: pick(/<title>([\s\S]*?)<\/title>/, html),
    metaDescription: pick(/<meta name="description" content="([\s\S]*?)"\s*\/?>/, html),
    bodyHtml: rewriteHrefs(pick(/<div class="article-body">([\s\S]*?)<\/div>\s*<div class="article-cta">/, html)),
    ctaHtml: rewriteHrefs(pick(/<div class="article-cta">([\s\S]*)<\/div>\s*<div class="article-foot">/, html)),
    related,
  };
});

const out = `// ⚠️ Fichier GÉNÉRÉ par scripts/gen-blog.mjs — ne pas éditer à la main.
// Source : export Claude Design "blog-lebonrebond".

export type BlogRelated = { slug: string; category: string; title: string };
export type BlogArticle = {
  slug: string;
  featured: boolean;
  category: string;
  title: string;
  excerpt: string;
  date: string;
  readingMin: string;
  coverAlt: string;
  metaTitle: string;
  metaDescription: string;
  bodyHtml: string;
  ctaHtml: string;
  related: BlogRelated[];
};

export const blogArticles: BlogArticle[] = ${JSON.stringify(articles, null, 2)};

export const blogBySlug = (slug: string): BlogArticle | undefined =>
  blogArticles.find((a) => a.slug === slug);
`;

writeFileSync(join(process.cwd(), "src/content/blog-data.ts"), out, "utf8");
console.log(`✓ src/content/blog-data.ts généré — ${articles.length} articles`);
for (const a of articles) {
  console.log(`  - ${a.slug} | ${a.category} | ${a.readingMin} | ${a.date} | body ${a.bodyHtml.length}c | related ${a.related.length} | excerpt ${a.excerpt ? "ok" : "MANQUE"}`);
}
