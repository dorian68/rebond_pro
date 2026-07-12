"use server";

import { z } from "zod";
import { sendEmail, brandedEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { rateLimit, rateLimitFingerprint } from "@/server/rate-limit";

const schema = z.object({
  name: z.string().min(2, "Nom trop court").max(120),
  email: z.email("Email invalide"),
  phone: z.string().max(40).optional().or(z.literal("")),
  situation: z.string().max(60).optional().or(z.literal("")),
  message: z.string().max(4000).optional().or(z.literal("")),
  website: z.string().max(200).optional().or(z.literal("")),
});

export type ContactResult = { ok: boolean; error?: string };

const LEAD_RECIPIENTS = ["dorian.labry@gmail.com", "msuffrin.carra@gmail.com"];
const CONTACT_FROM = "Le Bon Rebond Contact <lebonrebond.contact@optiquant-ia.com>";

const SITUATION_LABELS: Record<string, string> = {
  "formation": "Trouver une formation",
  "bilan-competences": "Bilan de compétences",
  "bilan-orientation": "Bilan d'orientation",
  "centre-formation": "Devenir centre partenaire",
  "autre": "Autre question",
};

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] ?? c));
}

export async function submitContactRequest(input: unknown): Promise<ContactResult> {
  const honeypot = input && typeof input === "object" && "website" in input
    ? String((input as { website?: unknown }).website ?? "")
    : "";
  if (honeypot) return { ok: true };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Formulaire invalide. Vérifiez votre nom et votre email." };
  const d = parsed.data;
  const emailFingerprint = rateLimitFingerprint(d.email);
  if (
    !rateLimit(`site:contact:email:${emailFingerprint}`, 3, 86_400_000) ||
    !rateLimit("site:contact:global", 80, 3_600_000)
  ) {
    return { ok: false, error: "Trop de demandes ont été envoyées. Réessayez plus tard ou contactez-nous par téléphone." };
  }

  const situationLabel = SITUATION_LABELS[d.situation ?? ""] ?? d.situation ?? "—";
  const now = new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "full", timeStyle: "short" });

  logger.info("site.contact.received", {
    emailFingerprint,
    hasPhone: Boolean(d.phone),
    situation: d.situation || null,
  });

  try {
    await sendEmail({
      from: CONTACT_FROM,
      to: LEAD_RECIPIENTS,
      subject: `🔔 Nouveau lead — ${d.name} · ${situationLabel}`,
      html: brandedEmail(
        "Nouvelle demande de contact",
        `<table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#888;width:140px">Nom</td><td style="padding:8px 0;border-bottom:1px solid #eee;font-weight:700;color:#15181f">${esc(d.name)}</td></tr>
          <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#888">Email</td><td style="padding:8px 0;border-bottom:1px solid #eee"><a href="mailto:${esc(d.email)}" style="color:#2469a6">${esc(d.email)}</a></td></tr>
          ${d.phone ? `<tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#888">Téléphone</td><td style="padding:8px 0;border-bottom:1px solid #eee"><a href="tel:${esc(d.phone)}" style="color:#2469a6">${esc(d.phone)}</a></td></tr>` : ""}
          <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#888">Besoin</td><td style="padding:8px 0;border-bottom:1px solid #eee;font-weight:700;color:#E07C39">${esc(situationLabel)}</td></tr>
          ${d.message ? `<tr><td style="padding:8px 0;color:#888;vertical-align:top;padding-top:12px">Message</td><td style="padding:8px 0;padding-top:12px;line-height:1.6;color:#15181f">${esc(d.message).replace(/\n/g, "<br/>")}</td></tr>` : ""}
        </table>
        <p style="margin-top:20px;font-size:12px;color:#aaa">Reçu le ${esc(now)} · Répondre directement à <a href="mailto:${esc(d.email)}" style="color:#2469a6">${esc(d.email)}</a></p>`,
      ),
      text: [
        `🔔 Nouveau lead — ${d.name}`,
        `Email    : ${d.email}`,
        d.phone ? `Tél      : ${d.phone}` : "",
        `Besoin   : ${situationLabel}`,
        d.message ? `\nMessage :\n${d.message}` : "",
        `\nReçu le ${now}`,
      ].filter(Boolean).join("\n"),
    });
  } catch (e) {
    logger.error("site.contact.email_failed", {
      emailFingerprint,
      error: e instanceof Error ? e.message : String(e),
    });
    return { ok: false, error: "Votre demande n'a pas pu être envoyée. Réessayez dans quelques instants ou contactez-nous par téléphone." };
  }
  return { ok: true };
}
