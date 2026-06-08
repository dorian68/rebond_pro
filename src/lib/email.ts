import "server-only";
import nodemailer from "nodemailer";

// Adapter email : SMTP (Mailpit en dev, Resend/Postmark en prod via SMTP).
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_SMTP_HOST ?? "localhost",
    port: Number(process.env.EMAIL_SMTP_PORT ?? 1025),
    secure: false,
    auth: process.env.EMAIL_SMTP_USER ? { user: process.env.EMAIL_SMTP_USER, pass: process.env.EMAIL_SMTP_PASSWORD } : undefined,
  });
  return transporter;
}

export type Attachment = { filename: string; content: Buffer };

export async function sendEmail(opts: { to: string; subject: string; html: string; text?: string; attachments?: Attachment[] }): Promise<void> {
  const from = process.env.EMAIL_FROM ?? "RebondPro Formation <no-reply@rebondpro.local>";
  await getTransporter().sendMail({
    from, to: opts.to, subject: opts.subject, html: opts.html, text: opts.text, attachments: opts.attachments,
  });
}

export function brandedEmail(title: string, bodyHtml: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#15181f">
    <div style="background:linear-gradient(135deg,#6a5cf0,#5850ec);padding:20px 24px;border-radius:12px 12px 0 0">
      <span style="color:#fff;font-weight:800;font-size:18px">RebondPro Formation</span>
    </div>
    <div style="border:1px solid #e8eaef;border-top:none;border-radius:0 0 12px 12px;padding:24px">
      <h2 style="margin:0 0 12px;font-size:18px">${title}</h2>
      <div style="font-size:14px;line-height:1.6;color:#5a6271">${bodyHtml}</div>
    </div>
  </div>`;
}
