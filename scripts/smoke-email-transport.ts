import { sendEmail } from "../src/lib/email";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const mailpitUrl = new URL(process.env.MAILPIT_API_URL ?? "http://localhost:8025");
  assert(["localhost", "127.0.0.1", "::1"].includes(mailpitUrl.hostname), "Ce smoke refuse un serveur email non local.");

  process.env.RESEND_API_KEY = "";
  process.env.EMAIL_SMTP_HOST = "localhost";
  process.env.EMAIL_SMTP_PORT = "1025";
  process.env.EMAIL_SMTP_USER = "";
  process.env.EMAIL_SMTP_PASSWORD = "";

  const marker = `email-transport-${Date.now()}`;
  const subject = `Smoke email ${marker}`;
  await sendEmail({
    from: "Le Bon Rebond Smoke <smoke@rebondpro.local>",
    to: "recipient@example.test",
    subject,
    text: `Texte ${marker}`,
    html: `<p>HTML <strong>${marker}</strong></p>`,
    attachments: [{ filename: `${marker}.txt`, content: Buffer.from(`Pièce jointe ${marker}`, "utf8") }],
  });

  const listResponse = await fetch(new URL("/api/v1/messages", mailpitUrl));
  assert(listResponse.ok, `API Mailpit indisponible (${listResponse.status}).`);
  const list = await listResponse.json() as { messages?: Array<{ ID?: string; Subject?: string }> };
  const received = list.messages?.find((message) => message.Subject === subject);
  assert(received?.ID, "Mailpit n'a pas reçu l'email SMTP attendu.");

  const detailResponse = await fetch(new URL(`/api/v1/message/${received.ID}`, mailpitUrl));
  assert(detailResponse.ok, `Détail Mailpit indisponible (${detailResponse.status}).`);
  const detail = JSON.stringify(await detailResponse.json());
  assert(detail.includes(marker), "Le contenu HTML/texte reçu est incomplet.");
  assert(detail.includes(`${marker}.txt`), "La pièce jointe reçue est absente.");

  console.log("smoke:email-transport PASS");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
