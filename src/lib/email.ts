import "server-only";
import nodemailer from "nodemailer";

// Adapter email : SMTP (Mailpit en dev, Resend/Postmark en prod via SMTP).
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;
  const port = Number(process.env.EMAIL_SMTP_PORT ?? 1025);
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_SMTP_HOST ?? "localhost",
    port,
    secure: port === 465, // 465 = TLS implicite (Resend) ; 587/1025 = STARTTLS/clair
    auth: process.env.EMAIL_SMTP_USER ? { user: process.env.EMAIL_SMTP_USER, pass: process.env.EMAIL_SMTP_PASSWORD } : undefined,
  });
  return transporter;
}

export type Attachment = { filename: string; content: Buffer };

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

  // Dev (Mailpit) ou SMTP générique
  await getTransporter().sendMail({
    from, to: opts.to, subject: opts.subject, html: opts.html, text: opts.text, attachments: opts.attachments,
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
