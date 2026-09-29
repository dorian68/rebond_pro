import { z } from "zod";
import { sendLeadNotificationEmail } from "@/lib/email";
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

export async function processSainteLucieRequest(
  input: unknown,
  dependencies: { notify?: typeof sendLeadNotificationEmail; now?: Date } = {},
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
      message: [
        "MESSAGE INTERNE — ne pas transférer ce courriel à la CARL : il contient des données personnelles non autorisées pour cette transmission.",
        "Mise en relation CARL : vérifier l'accord du candidat, puis rédiger un nouveau message contenant uniquement son adresse e-mail. Conserver une trace de l'accord, du destinataire et de la date d'envoi.",
        "",
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
