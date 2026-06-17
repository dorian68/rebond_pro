// Convertit les visuels fournis en .webp optimisés (covers blog + témoignage accueil).
import sharp from "sharp";
import { mkdirSync, statSync } from "node:fs";

const DL = "C:/Users/Labry/Downloads";
mkdirSync("public/blog", { recursive: true });
mkdirSync("public/photos", { recursive: true });

// slug d'article -> fichier source
const COVERS = {
  "changer-de-voie-a-40-ans": "pexels-muneeb-babar-1300535-22427879.jpg",
  "bilan-de-competences-a-quoi-ca-sert": "pexels-anna-pou-8132483.jpg",
  "parcoursup-aider-son-ado-sans-choisir": "pexels-kampus-7417159.jpg",
  "cpf-financer-formation-2026": "pexels-mikhail-nilov-6969624.jpg",
  "reprendre-confiance-apres-doute-professionnel": "pexels-rdne-5837271.jpg",
  "se-reconvertir-dans-le-numerique-mythes-realites": "pexels-mikegles-29180739.jpg",
  "se-former-pres-de-chez-soi-territoires-guadeloupe": "pexels-paul-scheelen-269808325-38129343.jpg",
};

const kb = (p) => Math.round(statSync(p).size / 1024) + " Ko";

for (const [slug, file] of Object.entries(COVERS)) {
  const out = `public/blog/${slug}.webp`;
  await sharp(`${DL}/${file}`).resize(1280, 800, { fit: "cover", position: "attention" }).webp({ quality: 80 }).toFile(out);
  console.log(`cover  ${slug}.webp  ${kb(out)}`);
}

// Témoignage Camille (image #8)
const cam = `${DL}/ChatGPT Image Jun 17, 2026, 07_57_54 PM.png`;
await sharp(cam).resize(1000, 880, { fit: "cover", position: "attention" }).webp({ quality: 82 }).toFile("public/photos/temoignage-camille.webp");
await sharp(cam).resize(200, 200, { fit: "cover", position: "attention" }).webp({ quality: 82 }).toFile("public/photos/temoignage-camille-avatar.webp");
console.log(`temoignage-camille.webp        ${kb("public/photos/temoignage-camille.webp")}`);
console.log(`temoignage-camille-avatar.webp ${kb("public/photos/temoignage-camille-avatar.webp")}`);
console.log("✓ terminé");
