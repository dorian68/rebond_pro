/** Extraction du texte réel d'un document généré (PDF via pdf-parse, DOCX via pizzip). */
import PizZip from 'pizzip';

// Playwright transpile en CJS → `require` est disponible au runtime.
type PdfParser = {
  getText: () => Promise<{ text?: string }>;
};
type PdfParseModule = {
  PDFParse: new (options: { data: Buffer }) => PdfParser;
};
declare const require: (id: string) => PdfParseModule;

export async function extractText(buffer: Buffer, mime?: string): Promise<string> {
  const m = (mime || '').toLowerCase();
  const isPdf = m.includes('pdf') || buffer.slice(0, 4).toString() === '%PDF';
  if (isPdf) {
    // pdf-parse v2 : classe PDFParse → getText()
    const { PDFParse } = require('pdf-parse');
    const parser = new PDFParse({ data: buffer });
    const res = await parser.getText();
    return normalizeExtracted(res?.text || '');
  }
  // DOCX : extraire le TEXTE lisible (contenu des <w:t>), pas le XML brut
  try {
    const zip = new PizZip(buffer);
    const xml = zip.file('word/document.xml')?.asText() ?? '';
    const runs = [...xml.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map((m) => m[1]);
    let text = runs.join(' ');
    if (!text || text.length < 40) text = xml; // fallback
    // filet : retirer toute balise XML résiduelle qui aurait fui
    text = text.replace(/<[^>]+>/g, ' ');
    return normalizeExtracted(text);
  } catch {
    return normalizeExtracted(buffer.toString('utf8'));
  }
}

/** Nettoie le texte extrait : entités HTML, balises résiduelles, et artefact pdf-parse "1/500"→"1 500". */
function normalizeExtracted(s: string): string {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
    .replace(/(\d)\/(\d{3})(?!\d)/g, '$1 $2') // séparateur de milliers insécable mal extrait en "/"
    .replace(/[ \t  ]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}
