// Construit un bundle DesignSync (cartes HTML + assets webp) depuis les captures /tmp/shots.
import sharp from "sharp";
import { mkdirSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const SHOTS = "C:/Users/Labry/AppData/Local/Temp/shots";
const OUT = ".dsbundle";
mkdirSync(`${OUT}/assets`, { recursive: true });

const META = {
  "01-accueil": ["Accueil", "Hero — orientation, formation, reconversion"],
  "02-marketplace": ["Marketplace", "Catalogue formations + centres partenaires"],
  "03-blog": ["Blog — liste", "Le journal du rebond, filtres + cartes"],
  "04-blog-article": ["Blog — article", "Gabarit article (Changer de voie à 40 ans)"],
  "05-bilan-competences": ["Bilan de compétences", "Page B2C accompagnement"],
  "06-bilan-orientation": ["Bilan d'orientation", "Page B2C orientation"],
  "07-centres": ["Pour les centres", "Landing B2B — rejoindre le réseau"],
  "08-a-propos": ["Qui sommes-nous", "Présentation fondateurs / mission"],
  "09-contact": ["Nous contacter", "Formulaire de contact"],
};

const kb = (p) => Math.round(statSync(p).size / 1024) + " Ko";
const cards = [];

for (const png of readdirSync(SHOTS).filter((f) => f.endsWith(".png")).sort()) {
  const name = png.replace(/\.png$/, "");
  const meta = META[name];
  if (!meta) continue;
  const [title, subtitle] = meta;
  const webp = `assets/${name}.webp`;
  const outWebp = join(OUT, webp);
  const img = sharp(join(SHOTS, png));
  const { width, height } = await img.metadata();
  await img.webp({ quality: 82 }).toFile(outWebp);

  const html = `<!-- @dsCard group="Site public — Le Bon Rebond" -->
<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>${title}</title><meta name="description" content="${subtitle}">
<style>html,body{margin:0;background:#FAF5EC;font-family:'Plus Jakarta Sans',system-ui,sans-serif}
.cap{display:block;width:100%;height:auto}</style></head>
<body><img class="cap" src="${webp}" width="${width}" height="${height}" alt="${title} — ${subtitle}"></body></html>`;
  writeFileSync(join(OUT, `${name}.html`), html, "utf8");
  cards.push({ name, title, webp });
  console.log(`${name}.webp  ${kb(outWebp)}  (${width}x${height})`);
}

// Index galerie
const items = cards.map((c) => `<a href="${c.name}.html"><img src="${c.webp}" alt="${c.title}"><span>${c.title}</span></a>`).join("\n");
const index = `<!-- @dsCard group="Site public — Le Bon Rebond" -->
<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>RebondPro — Visuels du site</title>
<style>body{margin:0;padding:32px;background:#FAF5EC;font-family:'Plus Jakarta Sans',sans-serif;color:#15314C}
h1{font-family:'Newsreader',Georgia,serif;font-weight:500}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:24px}
a{display:block;text-decoration:none;color:#15314C;border:1px solid rgba(21,49,76,.12);border-radius:14px;overflow:hidden;background:#fff}
img{display:block;width:100%;height:auto}span{display:block;padding:12px 14px;font-weight:700;font-size:14px}</style></head>
<body><h1>Le Bon Rebond — visuels récents du site</h1><div class="grid">${items}</div></body></html>`;
writeFileSync(join(OUT, "index.html"), index, "utf8");
console.log(`✓ bundle prêt : ${cards.length} écrans + index`);
