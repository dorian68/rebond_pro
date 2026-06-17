import sharp from "sharp";
import { mkdirSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const SHOTS = "C:/Users/Labry/AppData/Local/Temp/cockpit";
const OUT = ".dsbundle";
mkdirSync(`${OUT}/assets`, { recursive: true });

const META = {
  "20-dashboard": ["Cockpit — Tableau de bord", "KPIs CA, remplissage, prospects, relances + reco IA"],
  "21-planning": ["Planning", "Calendrier des sessions"],
  "22-sessions": ["Sessions", "Sessions, capacité, remplissage, rentabilité"],
  "23-prospects": ["CRM Prospects", "Pipeline commercial + relances"],
  "24-formations": ["Catalogue formations", "Gestion des formations du centre"],
  "25-apprenants": ["Apprenants", "Suivi des inscrits"],
  "26-formateurs": ["Formateurs", "Équipe pédagogique"],
  "27-documents": ["Documents", "Génération conventions / attestations (Qualiopi)"],
  "28-parametres": ["Paramètres du centre", "Profil public, membres, abonnement"],
  "29-socrate": ["Assistant IA — Socrate", "Analyse & actions guidées"],
};
const kb = (p) => Math.round(statSync(p).size / 1024) + " Ko";

for (const png of readdirSync(SHOTS).filter((f) => f.endsWith(".png")).sort()) {
  const name = png.replace(/\.png$/, "");
  const meta = META[name]; if (!meta) continue;
  const [title, subtitle] = meta;
  const webp = `assets/${name}.webp`;
  const img = sharp(join(SHOTS, png));
  const { width, height } = await img.metadata();
  await img.webp({ quality: 82 }).toFile(join(OUT, webp));
  const html = `<!-- @dsCard group="Cockpit (B2B) — Le Bon Rebond" -->
<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>${title}</title><meta name="description" content="${subtitle}">
<style>html,body{margin:0;background:#f4f7fb;font-family:'Plus Jakarta Sans',system-ui,sans-serif}.cap{display:block;width:100%;height:auto}</style></head>
<body><img class="cap" src="${webp}" width="${width}" height="${height}" alt="${title} — ${subtitle}"></body></html>`;
  writeFileSync(join(OUT, `${name}.html`), html, "utf8");
  console.log(`${name}.webp  ${kb(join(OUT, webp))}  (${width}x${height})`);
}
console.log("✓ cockpit bundle prêt");
