import { Buffer } from "node:buffer";
import { z } from "zod";
import { sendLeadNotificationEmail, type Attachment } from "@/lib/email";
import { logger } from "@/lib/logger";
import { rateLimit, rateLimitFingerprint } from "@/server/rate-limit";
import { isSainteLucieOpen } from "./opportunity";

const requestSchema = z.object({
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80),
  age: z.coerce.number().int().min(18).max(25),
  commune: z.string().trim().min(2).max(100),
  email: z.email().max(254),
  phone: z.string().trim().min(8).max(40),
  english: z.enum(["debutant", "intermediaire", "aise"]),
  availability: z.enum(["oui", "non", "a-confirmer"]),
  motivation: z.string().trim().min(10).max(2000),
  consent: z.literal(true),
  shareEmail: z.boolean().default(false),
  website: z.string().max(200).optional().default(""),
});

export type SainteLucieResult = { ok: boolean; error?: string };

const ENGLISH_LABELS = { debutant: "Débutant", intermediaire: "Intermédiaire", aise: "À l'aise" };
const AVAILABILITY_LABELS = { oui: "Oui", non: "Non", "a-confirmer": "À confirmer" };
const MAX_CV_BYTES = 5 * 1024 * 1024;
const PDF_MIME = "application/pdf";
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

async function prepareCvAttachment(file?: File | null): Promise<{ attachment?: Attachment; error?: string }> {
  if (!file) return {};
  if (file.size === 0 && (!file.name || file.name === "undefined")) return {};
  if (file.size <= 0) return { error: "Le CV sélectionné est vide." };
  if (file.size > MAX_CV_BYTES) return { error: "Le CV ne doit pas dépasser 5 Mo." };

  const originalName = file.name.replace(/\\/g, "/").split("/").pop()?.normalize("NFKC") ?? "";
  const extension = originalName.toLowerCase().split(".").pop();
  if (extension !== "pdf" && extension !== "docx") {
    return { error: "Le CV doit être au format PDF ou DOCX." };
  }

  const expectedMime = extension === "pdf" ? PDF_MIME : DOCX_MIME;
  if (file.type && file.type.toLowerCase() !== expectedMime) {
    return { error: "Le type du fichier ne correspond pas à son extension. Choisis un CV PDF ou DOCX." };
  }

  const content = Buffer.from(await file.arrayBuffer());
  const isPdf = extension === "pdf"
    && content.subarray(0, 1024).includes(Buffer.from("%PDF-"));
  const isDocx = extension === "docx"
    && content.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))
    && content.includes(Buffer.from("[Content_Types].xml"))
    && content.includes(Buffer.from("word/document.xml"));
  if (!isPdf && !isDocx) {
    return { error: "Le fichier ne semble pas être un CV PDF ou DOCX valide." };
  }

  const stem = originalName.slice(0, -(extension.length + 1))
    .replace(/[^\p{L}\p{N} _-]/gu, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80) || "CV";
  return { attachment: { filename: `${stem}.${extension}`, content } };
}

export async function processSainteLucieRequest(
  input: unknown,
  dependencies: { notify?: typeof sendLeadNotificationEmail; now?: Date } = {},
  cvFile?: File | null,
): Promise<SainteLucieResult> {
  const honeypot = input && typeof input === "object" && "website" in input
    ? String((input as { website?: unknown }).website ?? "")
    : "";
  if (honeypot) return { ok: true };

  if (!isSainteLucieOpen(dependencies.now)) {
    return { ok: false, error: "La date limite de cette mission est passée. Écris-nous via la page Contact pour parler d'autres pistes." };
  }

  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Vérifie les champs du formulaire et accepte l'utilisation de tes coordonnées pour le rappel." };
  }
  const d = parsed.data;
  const cv = await prepareCvAttachment(cvFile);
  if (cv.error) return { ok: false, error: cv.error };
  const emailFingerprint = rateLimitFingerprint(d.email);
  if (
    !rateLimit(`site:sainte-lucie:email:${emailFingerprint}`, 3, 86_400_000) ||
    !rateLimit("site:sainte-lucie:global", 80, 3_600_000)
  ) {
    return { ok: false, error: "Trop de demandes ont été envoyées. Réessaie plus tard ou contacte-nous par la page Contact." };
  }

  logger.info("site.sainte_lucie.request_received", {
    emailFingerprint,
    availability: d.availability,
  });

  try {
    await (dependencies.notify ?? sendLeadNotificationEmail)({
      firstName: d.firstName,
      lastName: d.lastName,
      email: d.email,
      phone: d.phone,
      profileType: "particulier",
      intent: "contact_request",
      source: "Offre Service Civique Sainte-Lucie",
      recipient: "public-contact",
      ...(cv.attachment ? { attachments: [cv.attachment] } : {}),
      message: [
        "MESSAGE INTERNE — ne pas transférer ce courriel ni le CV à la CARL : ils contiennent d'autres données personnelles.",
        "Mise en relation CARL : vérifier l'accord du candidat, puis rédiger un nouveau message contenant uniquement son adresse e-mail. Conserver une trace de l'accord, du destinataire et de la date d'envoi.",
        "",
        `CV joint : ${cv.attachment?.filename ?? "aucun"}`,
        `Âge : ${d.age}`,
        `Commune : ${d.commune}`,
        `Anglais : ${ENGLISH_LABELS[d.english]}`,
        `Disponible à partir de décembre 2026 : ${AVAILABILITY_LABELS[d.availability]}`,
        `Motivation : ${d.motivation}`,
        "Consentement au rappel : oui",
        `Accord pour transmettre l'adresse e-mail à la CARL : ${d.shareEmail ? "oui" : "non — demander son accord lors de l'échange avant toute transmission"}`,
      ].join("\n"),
    });
  } catch (error) {
    logger.error("site.sainte_lucie.notification_failed", {
      emailFingerprint,
      errorType: error instanceof Error ? error.name : "unknown",
    });
    return { ok: false, error: "Ta demande n'a pas pu être envoyée. Réessaie dans quelques instants ou contacte-nous par la page Contact." };
  }

  return { ok: true };
}
