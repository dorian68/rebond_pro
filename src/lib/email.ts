import "server-only";
import { Message, SMTPClient, type MessageAttachment } from "emailjs";

const PUBLIC_BASE_URL = (process.env.APP_PUBLIC_URL ?? process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");

// Adapter email : SMTP (Mailpit en dev, Resend/Postmark en prod via SMTP).
let smtpClient: SMTPClient | null = null;

function getSmtpClient(): SMTPClient {
  if (smtpClient) return smtpClient;
  const port = Number(process.env.EMAIL_SMTP_PORT ?? 1025);
  smtpClient = new SMTPClient({
    host: process.env.EMAIL_SMTP_HOST ?? "localhost",
    port,
    ssl: port === 465,
    tls: port === 587,
    user: process.env.EMAIL_SMTP_USER ?? "",
    password: process.env.EMAIL_SMTP_PASSWORD ?? "",
    timeout: 10_000,
  });
  return smtpClient;
}

export type Attachment = { filename: string; content: Buffer };

function attachmentType(filename: string): string {
  const extension = filename.toLowerCase().split(".").pop();
  if (extension === "pdf") return "application/pdf";
  if (extension === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (extension === "csv") return "text/csv";
  if (extension === "txt") return "text/plain";
  if (extension === "png") return "image/png";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  return "application/octet-stream";
}

export async function sendEmail(opts: { to: string | string[]; from?: string; subject: string; html: string; text?: string; attachments?: Attachment[] }): Promise<void> {
  const from = opts.from ?? process.env.EMAIL_FROM ?? "Le Bon Rebond <no-reply@lebonrebond.local>";
  const apiKey = process.env.RESEND_API_KEY;

  // En prod : API HTTP Resend (port 443). Évite le SMTP (souvent bloqué par les pare-feux cloud)
  // et garantit un timeout court pour ne jamais bloquer une requête (inscription, reset…).
  if (apiKey) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from, to: opts.to, subject: opts.subject, html: opts.html, text: opts.text,
        ...(opts.attachments?.length ? { attachments: opts.attachments.map((a) => ({ filename: a.filename, content: a.content.toString("base64") })) } : {}),
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`Resend API ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return;
  }

  // Dev (Mailpit) ou SMTP générique. Les buffers sont pré-encodés pour préserver
  // strictement les pièces jointes binaires dans le flux MIME.
  const attachments: MessageAttachment[] = [
    { data: opts.html, alternative: true, type: "text/html" },
    ...(opts.attachments ?? []).map((attachment) => ({
      name: attachment.filename,
      data: attachment.content.toString("base64"),
      encoded: true,
      type: attachmentType(attachment.filename),
    })),
  ];
  await getSmtpClient().sendAsync(new Message({
    from,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    attachment: attachments,
  }));
}

// ── Emails Socrate chatbot ───────────────────────────────────────────────────

/** Destinataires internes fixes — non modifiables par l'utilisateur. */
const SOCRATE_ADMIN_EMAILS: string[] = (() => {
  const raw = process.env.LE_BON_REBOND_ADMIN_EMAILS ?? "dorian.labry@gmail.com,msuffrin.carra@gmail.com";
  return raw.split(",").map((e) => e.trim()).filter(Boolean);
})();

const SOCRATE_FROM = process.env.EMAIL_FROM ?? "Le Bon Rebond <no-reply@optiquant-ia.com>";

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] ?? c));
}

/**
 * Envoie le bilan de compétences Socrate à l'utilisateur.
 * Les recommandations de formations sont optionnelles.
 */
export async function sendSkillAssessmentEmail(opts: {
  to: string;
  userName?: string;
  assessmentMarkdown: string;
  uploadedFileName?: string;
  recommendedFormations?: { title: string; center: string; url: string }[];
}): Promise<void> {
  const greeting = opts.userName ? `Bonjour ${esc(opts.userName)},` : "Bonjour,";
  const formationsHtml =
    opts.recommendedFormations && opts.recommendedFormations.length > 0
      ? `<h3 style="color:#2469a6;margin:24px 0 8px">Formations recommandées</h3>
         <ul style="padding-left:20px;line-height:1.8">${opts.recommendedFormations
           .map(
             (f) =>
               `<li><strong>${esc(f.title)}</strong> — ${esc(f.center)}${
                 f.url ? ` <a href="${esc(f.url)}" style="color:#2469a6">[voir la formation]</a>` : ""
               }</li>`,
           )
           .join("")}</ul>`
      : "";

  const assessmentHtml = esc(opts.assessmentMarkdown)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^#{1,3} (.+)$/gm, "<h3 style=\"color:#15181f;margin:20px 0 6px\">$1</h3>")
    .replace(/^- (.+)$/gm, "<li style=\"margin:2px 0\">$1</li>")
    .replace(/\n/g, "<br/>");

  const fileNote = opts.uploadedFileName
    ? `<p style="font-size:12px;color:#aaa">Document analysé : ${esc(opts.uploadedFileName)}</p>`
    : "";

  await sendEmail({
    from: SOCRATE_FROM,
    to: opts.to,
    subject: "Votre bilan de compétences — Le Bon Rebond",
    html: brandedEmail(
      "Votre bilan de compétences",
      `<p>${greeting}</p>
       <p>Suite à notre échange, voici votre bilan de compétences personnalisé préparé par Socrate, l'assistant IA de Le Bon Rebond.</p>
       <hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
       <div style="line-height:1.7;color:#15181f">${assessmentHtml}</div>
       ${formationsHtml}
       <hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
       ${fileNote}
       <p style="margin-top:16px">Ce bilan est une première orientation. Pour un accompagnement complet et officiel, nous vous invitons à prendre rendez-vous avec l'un de nos conseillers.</p>
       <p><a href="${PUBLIC_BASE_URL}/contact" style="display:inline-block;background:linear-gradient(135deg,#2f9488,#2469a6);color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">Prendre rendez-vous</a></p>
       <p style="font-size:12px;color:#aaa;margin-top:24px">Cet email vous a été envoyé car vous avez demandé votre bilan sur ${PUBLIC_BASE_URL.replace(/^https?:\/\//, "")}. Aucun démarchage commercial.</p>`,
    ),
    text: [
      greeting,
      "",
      "Votre bilan de compétences — Le Bon Rebond",
      "",
      opts.assessmentMarkdown,
      opts.recommendedFormations?.length
        ? "\nFormations recommandées :\n" + opts.recommendedFormations.map((f) => `- ${f.title} (${f.center})`).join("\n")
        : "",
      `\nPour un accompagnement complet, rendez-vous sur : ${PUBLIC_BASE_URL}/contact`,
    ]
      .filter(Boolean)
      .join("\n"),
  });
}

/**
 * Notifie l'équipe interne qu'un lead Socrate souhaite être recontacté.
 * Destinataires hardcodés — l'utilisateur ne peut pas les modifier.
 */
export async function sendLeadNotificationEmail(opts: {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  profileType?: string;
  intent?: string;
  message?: string;
  conversationSummary?: string;
  source?: string;
}): Promise<void> {
  const displayName = [opts.firstName, opts.lastName].filter(Boolean).join(" ") || opts.email || opts.phone || "Nouveau lead";
  const source = opts.source ?? "Socrate chatbot";
  const now = new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "full", timeStyle: "short" });

  const INTENT_LABELS: Record<string, string> = {
    contact_request: "Demande de contact / rappel",
    more_info_request: "Demande d'information",
    training_recommendation_request: "Recherche de formation",
    training_center_request: "Centre de formation partenaire",
    human_advisor_request: "Souhaite parler à un conseiller",
    skill_assessment_request: "Bilan de compétences",
    unknown: "Non précisé",
  };
  const intentLabel = INTENT_LABELS[opts.intent ?? ""] ?? opts.intent ?? "Non précisé";

  const PROFILE_LABELS: Record<string, string> = {
    particulier: "Particulier",
    centre: "Centre de formation",
    formateur: "Formateur",
    entreprise: "Entreprise",
    autre: "Autre",
  };
  const profileLabel = PROFILE_LABELS[opts.profileType ?? ""] ?? opts.profileType ?? "—";

  await sendEmail({
    from: SOCRATE_FROM,
    to: SOCRATE_ADMIN_EMAILS,
    subject: `[Le Bon Rebond] Nouveau lead à recontacter — ${displayName}`,
    html: brandedEmail(
      "Nouveau lead",
      `<p style="background:#e8f4fd;border-left:3px solid #2469a6;padding:10px 14px;border-radius:0 6px 6px 0;margin-bottom:20px;font-weight:600">
         🔔 Nouveau lead à recontacter — source : ${esc(source)}
       </p>
       <table style="width:100%;border-collapse:collapse;font-size:14px">
         <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#888;width:160px">Nom</td><td style="padding:8px 0;border-bottom:1px solid #eee;font-weight:700;color:#15181f">${esc(displayName)}</td></tr>
         ${opts.email ? `<tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#888">Email</td><td style="padding:8px 0;border-bottom:1px solid #eee"><a href="mailto:${esc(opts.email)}" style="color:#2469a6">${esc(opts.email)}</a></td></tr>` : ""}
         ${opts.phone ? `<tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#888">Téléphone</td><td style="padding:8px 0;border-bottom:1px solid #eee"><a href="tel:${esc(opts.phone)}" style="color:#2469a6">${esc(opts.phone)}</a></td></tr>` : ""}
         <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#888">Profil</td><td style="padding:8px 0;border-bottom:1px solid #eee">${esc(profileLabel)}</td></tr>
         <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#888">Intention</td><td style="padding:8px 0;border-bottom:1px solid #eee;font-weight:700;color:#E07C39">${esc(intentLabel)}</td></tr>
         ${opts.message ? `<tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#888;vertical-align:top">Besoin exprimé</td><td style="padding:8px 0;border-bottom:1px solid #eee;line-height:1.6">${esc(opts.message).replace(/\n/g, "<br/>")}</td></tr>` : ""}
         ${opts.conversationSummary ? `<tr><td style="padding:8px 0;color:#888;vertical-align:top;padding-top:12px">Résumé conversation</td><td style="padding:8px 0;padding-top:12px;line-height:1.6;color:#5a6271;font-style:italic">${esc(opts.conversationSummary).replace(/\n/g, "<br/>")}</td></tr>` : ""}
       </table>
       <p style="margin-top:20px;font-size:12px;color:#aaa">Reçu le ${esc(now)} · Source : ${esc(source)} · Statut : <strong style="color:#E07C39">à recontacter</strong></p>`,
    ),
    text: [
      `[Le Bon Rebond] Nouveau lead — ${displayName}`,
      `Email    : ${opts.email}`,
      opts.phone ? `Tél      : ${opts.phone}` : "",
      `Profil   : ${profileLabel}`,
      `Intention: ${intentLabel}`,
      opts.message ? `\nBesoin :\n${opts.message}` : "",
      opts.conversationSummary ? `\nRésumé conversation :\n${opts.conversationSummary}` : "",
      `\nReçu le ${now} · Source : ${source}`,
    ]
      .filter(Boolean)
      .join("\n"),
  });
}

export function brandedEmail(title: string, bodyHtml: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#15181f">
    <div style="background:linear-gradient(135deg,#2f9488,#2469a6);padding:20px 24px;border-radius:12px 12px 0 0">
      <span style="color:#fff;font-weight:800;font-size:18px">Le Bon Rebond</span>
    </div>
    <div style="border:1px solid #e8eaef;border-top:none;border-radius:0 0 12px 12px;padding:24px">
      <h2 style="margin:0 0 12px;font-size:18px">${title}</h2>
      <div style="font-size:14px;line-height:1.6;color:#5a6271">${bodyHtml}</div>
    </div>
  </div>`;
}
