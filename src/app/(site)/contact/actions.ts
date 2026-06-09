"use server";

import { z } from "zod";
import { sendEmail, brandedEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

const schema = z.object({
  name: z.string().min(2, "Nom trop court").max(120),
  email: z.email("Email invalide"),
  phone: z.string().max(40).optional().or(z.literal("")),
  situation: z.string().max(60).optional().or(z.literal("")),
  message: z.string().max(4000).optional().or(z.literal("")),
  cpfCheck: z.boolean().optional(),
});

export type ContactResult = { ok: boolean; error?: string };

/** Destinataire des demandes du site vitrine : CONTACT_EMAIL, sinon 1er admin plateforme, sinon expéditeur. */
function recipient(): string {
  return (
    process.env.CONTACT_EMAIL ??
    process.env.PLATFORM_ADMIN_EMAILS?.split(",")[0]?.trim() ??
    process.env.EMAIL_FROM ??
    "contact@rebondpro.local"
  );
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] ?? c));
}

/** Reçoit une demande de contact du site B2C, la journalise et l'envoie par email à l'équipe. */
export async function submitContactRequest(input: unknown): Promise<ContactResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Formulaire invalide. Vérifiez votre nom et votre email." };
  const d = parsed.data;

  // Toujours journaliser : la demande n'est jamais perdue, même si l'email échoue.
  logger.info("site.contact.received", { name: d.name, email: d.email, phone: d.phone || null, situation: d.situation || null, cpf: d.cpfCheck ?? false });

  try {
    await sendEmail({
      to: recipient(),
      subject: `Nouvelle demande — ${d.name}${d.cpfCheck ? " (éligibilité CPF)" : ""}`,
      html: brandedEmail(
        "Nouvelle demande depuis le site",
        `<p><strong>Nom :</strong> ${esc(d.name)}</p>
         <p><strong>Email :</strong> ${esc(d.email)}</p>
         ${d.phone ? `<p><strong>Téléphone :</strong> ${esc(d.phone)}</p>` : ""}
         ${d.situation ? `<p><strong>Situation :</strong> ${esc(d.situation)}</p>` : ""}
         ${d.cpfCheck ? `<p><strong>➜ Souhaite vérifier son éligibilité CPF.</strong></p>` : ""}
         ${d.message ? `<p><strong>Message :</strong><br/>${esc(d.message).replace(/\n/g, "<br/>")}</p>` : ""}`
      ),
      text: `Demande de ${d.name} (${d.email})${d.phone ? ` — ${d.phone}` : ""}\nSituation : ${d.situation || "—"}\nCPF : ${d.cpfCheck ? "oui" : "non"}\n\n${d.message || ""}`,
    });
  } catch (e) {
    // L'utilisateur ne doit pas être pénalisé par une panne SMTP : la demande reste journalisée ci-dessus.
    logger.error("site.contact.email_failed", { error: e instanceof Error ? e.message : String(e) });
  }
  return { ok: true };
}
