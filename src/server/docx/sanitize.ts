import "server-only";
import PizZip from "pizzip";

const WORD_XML_RE = /^word\/(document|header\d+|footer\d+)\.xml$/;

// Marqueurs d'une section d'instructions / méta-template qui n'a rien à faire dans
// un document remis au CLIENT FINAL. Ces textes proviennent du corps du modèle DOCX
// (rédigés par l'auteur du modèle), pas de notre moteur de rendu.
const PARAGRAPH_MARKERS = [
  "note d'utilisation",
  "note d’utilisation",
  "volontairement générique",
  "remplacées par le crm",
  "remplacé par le crm",
  "doit rester générable",
  "variables principales détectables",
  "variables principales",
  "variable détectable",
  // Variante « Annexe technique » (templates auto-documentés) — wording différent mais même intention.
  // NB : on ne matche PAS « annexe technique » seul (une vraie annexe peut être légitime) ;
  // on cible les formulations sans ambiguïté d'instruction de template.
  "variables du template",
  "variables du crm",
  "peut être supprimée",
  "peut etre supprimee",
  "supprimée si le document",
  "supprimee si le document",
  "envoyé au client",
  "envoye au client",
  "détection automatique des variables",
  "detection automatique des variables",
  "tester la détection",
  "tester la detection",
];
// Une table entière est retirée si elle contient l'en-tête d'un tableau de variables/usage.
const TABLE_MARKERS = [
  "usage attendu",
  "exemple de valeur",
  "variables principales",
  "rôle attendu",
  "role attendu",
  "rôle de la variable",
  "role de la variable",
];

function stripTags(xml: string): string {
  return xml.replace(/<[^>]+>/g, "").toLowerCase();
}

function removeBlocks(xml: string, blockRe: RegExp, markers: string[]): string {
  return xml.replace(blockRe, (block) => {
    const text = stripTags(block);
    return markers.some((m) => text.includes(m)) ? "" : block;
  });
}

/**
 * Nettoie un DOCX **déjà rendu** pour une remise au client final :
 *  1. retire les tableaux de "variables détectables" (en-têtes Usage attendu / Exemple),
 *  2. retire les paragraphes de "Note d'utilisation" / instructions de modèle,
 *  3. remplace les marqueurs "[À compléter : …]" injectés par notre moteur par du vide.
 *
 * Le rendu interne (téléchargement local) n'est PAS affecté : on ne touche qu'à la
 * copie envoyée. Sans danger sur un PDF (renvoyé tel quel) ni sur un DOCX sans instruction.
 */
export function sanitizeDocxForClient(buffer: Buffer): Buffer {
  let zip: PizZip;
  try {
    zip = new PizZip(buffer);
  } catch {
    return buffer; // pas un zip/docx exploitable : on renvoie tel quel
  }
  let touched = false;
  for (const name of Object.keys(zip.files)) {
    if (!WORD_XML_RE.test(name)) continue;
    const original = zip.file(name)?.asText();
    if (!original) continue;
    let xml = original;
    // 1) tables de variables (retirer en premier pour ne pas casser le découpage des paragraphes)
    xml = removeBlocks(xml, /<w:tbl[\s>][\s\S]*?<\/w:tbl>/g, TABLE_MARKERS);
    // 2) paragraphes d'instructions
    xml = removeBlocks(xml, /<w:p[\s>][\s\S]*?<\/w:p>/g, PARAGRAPH_MARKERS);
    // 3) placeholders "[À compléter : …]" -> vide (le client ne voit pas de mention technique)
    xml = xml.replace(/\[À compléter[^\]]*\]/g, "");
    if (xml !== original) {
      zip.file(name, xml);
      touched = true;
    }
  }
  if (!touched) return buffer;
  return zip.generate({ type: "nodebuffer", compression: "DEFLATE" }) as Buffer;
}

/** True si le mimeType correspond à un DOCX (les PDF intégrés sont déjà propres). */
export function isDocxMime(mimeType: string | null | undefined): boolean {
  return !!mimeType && mimeType.includes("officedocument.wordprocessingml");
}
