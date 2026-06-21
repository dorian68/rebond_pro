/**
 * Proxy d'extraction de fichiers — décide AUTOMATIQUEMENT comment traiter
 * chaque fichier avant de l'envoyer à Socrate.
 *
 * Route A — texte extrait  → 0 token vision  (PDF digital)
 * Route B — vision LLM     → tokens consommés (PDF scanné / image)
 *
 * Ce module tourne EXCLUSIVEMENT côté client (browser).
 */

import type { Attachment } from "@/lib/ag-ui/types";

// ── Types publics ────────────────────────────────────────────────────────────

export type ExtractionMode = "text" | "vision";

export type ExtractionResult = {
  mode: ExtractionMode;
  filename: string;
  mimeType: string;
  /** Texte extrait proprement (mode=text uniquement) */
  extractedText?: string;
  /** Pièce jointe base64 envoyée au LLM (mode=vision uniquement) */
  attachment?: Attachment;
  /** Nombre de pages du PDF (si applicable) */
  pageCount?: number;
  /** Nombre de caractères extraits (si applicable) */
  charCount?: number;
  /**
   * Explication de la décision de routing — pour le log/debug côté UI.
   * Exemples : "PDF digital — 4200 chars / 3 pages → 0 token"
   *            "PDF scanné — 12 chars/page → vision LLM"
   *            "Image JPEG → vision LLM"
   */
  routingReason: string;
};

// ── Configuration ────────────────────────────────────────────────────────────

/**
 * Seuil de densité textuelle pour classer un PDF comme "digital".
 * En dessous → PDF scanné → route vision.
 * 150 chars/page ≈ ~30 mots ≈ une page avec un titre et quelques lignes.
 */
const TEXT_DENSITY_THRESHOLD = 150;

/**
 * Nombre maximal de caractères envoyés au LLM en mode texte.
 * Évite de dépasser le contexte et de coûter trop de tokens texte.
 * 32 000 chars ≈ 8 000 tokens ≈ ~10 pages de texte dense.
 */
const MAX_CHARS = 32_000;

/** Nombre maximal de pages traitées par pdf.js (protection contre les très gros PDFs). */
const MAX_PAGES = 30;

// ── Entrée publique ──────────────────────────────────────────────────────────

/**
 * Point d'entrée principal du proxy.
 * Appelle en interne la route A ou B selon le type et le contenu du fichier.
 */
export async function extractFileContent(file: File): Promise<ExtractionResult> {
  if (file.type === "application/pdf") {
    return routePdf(file);
  }
  if (
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.name.toLowerCase().endsWith(".docx")
  ) {
    return routeDocx(file);
  }
  if (file.type.startsWith("image/")) {
    return routeImage(file);
  }
  throw new Error(`Type non supporté : ${file.type}`);
}

// ── Route DOCX ───────────────────────────────────────────────────────────────

async function routeDocx(file: File): Promise<ExtractionResult> {
  const PizZip = (await import("pizzip")).default;
  const zip = new PizZip(await file.arrayBuffer());
  const parts = ["word/document.xml", ...Object.keys(zip.files).filter((name) => /^word\/header\d*\.xml$|^word\/footer\d*\.xml$/.test(name))];
  const parser = new DOMParser();
  const texts: string[] = [];
  for (const part of parts) {
    const xml = zip.file(part)?.asText();
    if (!xml) continue;
    const doc = parser.parseFromString(xml, "application/xml");
    const nodes = Array.from(doc.getElementsByTagName("w:t"));
    const value = nodes.map((n) => n.textContent ?? "").join(" ").replace(/\s+/g, " ").trim();
    if (value) texts.push(value);
  }
  const fullText = texts.join("\n\n").trim();
  const text = fullText.length > MAX_CHARS
    ? fullText.slice(0, MAX_CHARS) + `\n\n⚠️ [Document DOCX tronqué — ${fullText.length.toLocaleString()} caractères extraits, limite ${MAX_CHARS.toLocaleString()} affichée]`
    : fullText;
  return {
    mode: "text",
    filename: file.name,
    mimeType: file.type || "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    extractedText: text,
    charCount: fullText.length,
    routingReason: `[A] DOCX — ${fullText.length.toLocaleString()} caractères extraits par fonction → 0 token vision`,
  };
}

// ── Route PDF ────────────────────────────────────────────────────────────────

async function routePdf(file: File): Promise<ExtractionResult> {
  // Tentative d'extraction texte (pdf.js, lazy-loaded)
  let extracted: { text: string; pageCount: number; charCount: number };

  try {
    extracted = await pdfToText(file);
  } catch (err) {
    // pdf.js a échoué (PDF protégé, corrompu…) → fallback vision LLM
    const attachment = await fileToAttachment(file);
    return {
      mode: "vision",
      filename: file.name,
      mimeType: file.type,
      attachment,
      routingReason: `[B] pdf.js a échoué (${err instanceof Error ? err.message : "erreur inconnue"}) → vision LLM`,
    };
  }

  const avgCharsPerPage =
    extracted.pageCount > 0 ? extracted.charCount / extracted.pageCount : 0;

  if (avgCharsPerPage >= TEXT_DENSITY_THRESHOLD) {
    // ── Route A : PDF digital → texte extrait ──────────────────────────────
    const text =
      extracted.text.length > MAX_CHARS
        ? extracted.text.slice(0, MAX_CHARS) +
          `\n\n⚠️ [Document tronqué — ${extracted.text.length.toLocaleString()} caractères extraits, limite ${MAX_CHARS.toLocaleString()} affichée]`
        : extracted.text;

    return {
      mode: "text",
      filename: file.name,
      mimeType: file.type,
      extractedText: text,
      pageCount: extracted.pageCount,
      charCount: extracted.charCount,
      routingReason: `[A] PDF digital — ${extracted.charCount.toLocaleString()} chars / ${extracted.pageCount} pages (moy. ${Math.round(avgCharsPerPage)} c/p) → 0 token vision`,
    };
  }

  // ── Route B : PDF scanné → vision LLM ─────────────────────────────────
  const attachment = await fileToAttachment(file);
  return {
    mode: "vision",
    filename: file.name,
    mimeType: file.type,
    attachment,
    pageCount: extracted.pageCount,
    charCount: extracted.charCount,
    routingReason: `[B] PDF scanné — ${Math.round(avgCharsPerPage)} c/page < seuil ${TEXT_DENSITY_THRESHOLD} → vision LLM`,
  };
}

// ── Route Image ──────────────────────────────────────────────────────────────

async function routeImage(file: File): Promise<ExtractionResult> {
  // Les images vont toujours en vision LLM.
  // L'OCR navigateur (Tesseract.js, ~10 MB WASM) n'est pas justifié ici :
  // une image = ~1 page → coût vision raisonnable et précision supérieure.
  const attachment = await fileToAttachment(file);
  return {
    mode: "vision",
    filename: file.name,
    mimeType: file.type,
    attachment,
    routingReason: `[B] Image ${file.type} → vision LLM (OCR natif Claude)`,
  };
}

// ── Extraction texte PDF (pdf.js) ────────────────────────────────────────────

let workerInitialized = false;

async function pdfToText(
  file: File
): Promise<{ text: string; pageCount: number; charCount: number }> {
  const pdfjsLib = await import("pdfjs-dist");

  // Initialise le worker une seule fois (auto-hébergé dans /public)
  if (!workerInitialized) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    workerInitialized = true;
  }

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;

  const pageCount = pdf.numPages;
  const pagesToProcess = Math.min(pageCount, MAX_PAGES);

  let fullText = "";

  for (let p = 1; p <= pagesToProcess; p++) {
    const page = await pdf.getPage(p);
    const textContent = await page.getTextContent();

    // Reconstitue le texte de la page en respectant les espaces et sauts de ligne
    let pageText = "";
    let lastY: number | null = null;

    for (const item of textContent.items) {
      if (!("str" in item)) continue;
      const y = (item as { transform: number[] }).transform[5];
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        pageText += "\n";
      }
      pageText += (item as { str: string }).str;
      lastY = y;
    }

    fullText += `\n--- Page ${p} ---\n${pageText.trim()}\n`;
  }

  if (pagesToProcess < pageCount) {
    fullText += `\n[... ${pageCount - pagesToProcess} pages supplémentaires non extraites (limite ${MAX_PAGES} pages)]\n`;
  }

  const trimmed = fullText.trim();
  return { text: trimmed, pageCount, charCount: trimmed.length };
}

// ── Utilitaire base64 ────────────────────────────────────────────────────────

function fileToAttachment(file: File): Promise<Attachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const raw = (reader.result as string).split(",")[1] ?? "";
      resolve({
        name: file.name,
        type: file.type as Attachment["type"],
        data: raw,
        size: file.size,
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
