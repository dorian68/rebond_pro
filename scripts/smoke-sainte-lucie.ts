import { readFileSync } from "node:fs";
import PizZip from "pizzip";
import { processSainteLucieRequest } from "../src/app/(site)/opportunites/service-civique-sainte-lucie/submission";
import { isSainteLucieOpen } from "../src/app/(site)/opportunites/service-civique-sainte-lucie/opportunity";
import { leadNotificationRecipients } from "../src/lib/email";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const valid = {
  firstName: "Camille", lastName: "Martin", age: "22", commune: "Le Gosier",
  email: `sainte-lucie-smoke-${Date.now()}@example.test`, phone: "0690000000",
  english: "intermediaire", availability: "a-confirmer",
  motivation: "Je voudrais découvrir les projets citoyens et la coopération caribéenne.",
  consent: true, shareEmail: true, website: "",
};

async function main() {
  const openDate = new Date("2026-09-29T12:00:00Z");
  assert(isSainteLucieOpen(openDate), "La mission doit être ouverte avant la date limite.");
  assert(!isSainteLucieOpen(new Date("2026-10-12T00:00:00Z")), "La mission doit être close après la date limite.");
  assert(leadNotificationRecipients("public-contact") === "contact.lebonrebond@gmail.com", "La demande Sainte-Lucie doit être adressée à la boîte confirmée par Le Bon Rebond.");

  const calls = { count: 0 };
  const bot = await processSainteLucieRequest({ ...valid, website: "https://spam.example" }, {
    now: openDate, notify: async () => { calls.count++; },
  });
  assert(bot.ok && calls.count === 0, "Le honeypot ne doit envoyer aucune notification.");

  for (const [label, invalid] of [
    ["consentement", { ...valid, consent: false }],
    ["autorisation de partage invalide", { ...valid, shareEmail: "oui" }],
    ["email", { ...valid, email: "invalid" }],
    ["âge", { ...valid, age: "abc" }],
    ["âge hors critères", { ...valid, age: "26" }],
    ["motivation", { ...valid, motivation: "court" }],
  ] as const) {
    const result = await processSainteLucieRequest(invalid, { now: openDate, notify: async () => { calls.count++; } });
    assert(!result.ok && calls.count === 0, `Le champ ${label} invalide doit être refusé sans notification.`);
  }

  const closed = await processSainteLucieRequest(valid, {
    now: new Date("2026-10-12T00:00:00Z"), notify: async () => { calls.count++; },
  });
  assert(!closed.ok && calls.count === 0, "Une demande après échéance doit être refusée.");

  const failedEmail = await processSainteLucieRequest(valid, {
    now: openDate, notify: async () => { throw new Error("SMTP indisponible"); },
  });
  assert(!failedEmail.ok, "Un échec de notification ne doit pas afficher un faux succès.");

  let notification = "";
  const success = await processSainteLucieRequest({ ...valid, email: `success-${Date.now()}@example.test` }, {
    now: openDate,
    notify: async (payload) => { calls.count++; notification = JSON.stringify(payload); },
  });
  assert(success.ok && Number(calls.count) === 1, "La demande valide doit notifier l'équipe une seule fois.");
  assert(notification.includes("Le Gosier") && notification.includes("À confirmer") && notification.includes("Offre Service Civique Sainte-Lucie"), "La notification doit être qualifiée et traçable.");
  assert(notification.includes("la CARL : oui") && notification.includes('"recipient":"public-contact"'), "L'accord de mise en relation et la destination de la notification doivent être transmis à l'équipe.");
  assert(notification.includes("ne pas transférer ce courriel ni le CV à la CARL") && notification.includes("uniquement son adresse e-mail"), "La notification interne doit empêcher le transfert du courriel et du CV à la CARL.");

  let optOutNotification = "";
  const optOut = await processSainteLucieRequest({ ...valid, shareEmail: false, email: `optout-${Date.now()}@example.test` }, {
    now: openDate,
    notify: async (payload) => { optOutNotification = JSON.stringify(payload); },
  });
  assert(optOut.ok && optOutNotification.includes("non — demander son accord"), "Un candidat doit pouvoir demander un échange sans autoriser la transmission de son email.");

  let noCvNotification: { attachments?: Array<{ filename: string; content: Buffer }> } | undefined;
  const noCvResult = await processSainteLucieRequest({ ...valid, email: `no-cv-${Date.now()}@example.test` }, {
    now: openDate,
    notify: async (payload) => { noCvNotification = payload; },
  }, new File([], "", { type: "application/octet-stream" }));
  assert(noCvResult.ok && !noCvNotification?.attachments?.length, "Le champ CV vide doit être accepté comme une absence de pièce jointe.");

  const pdfBytes = Buffer.from("%PDF-1.4\n1 0 obj <<>> endobj\n%%EOF", "utf8");
  const pdfFile = new File([new Uint8Array(pdfBytes)], "CV-Camille.PDF", { type: "application/pdf" });
  let pdfNotification: { attachments?: Array<{ filename: string; content: Buffer }> } | undefined;
  const pdfResult = await processSainteLucieRequest({ ...valid, email: `pdf-${Date.now()}@example.test` }, {
    now: openDate,
    notify: async (payload) => { pdfNotification = payload; },
  }, pdfFile);
  assert(pdfResult.ok, "Un CV PDF valide doit être accepté.");
  assert(pdfNotification?.attachments?.length === 1, "Le CV PDF doit être attaché à la notification.");
  assert(pdfNotification.attachments[0].filename === "CV-Camille.pdf" && pdfNotification.attachments[0].content.equals(pdfBytes), "Le nom doit être assaini et le contenu du CV préservé.");
  assert(JSON.stringify(pdfNotification).includes("ne pas transférer ce courriel ni le CV à la CARL"), "La notification interne doit interdire le transfert du CV à la CARL.");
  console.log(JSON.stringify({ feature: "sainte-lucie-cv", step: "pdf-upload", status: "pass" }));

  const docxZip = new PizZip();
  docxZip.file("[Content_Types].xml", "<Types/>");
  docxZip.file("word/document.xml", "<w:document/>");
  const docxFile = new File([new Uint8Array(docxZip.generate({ type: "nodebuffer" }))], "CV-Camille.docx", {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  const docxResult = await processSainteLucieRequest({ ...valid, email: `docx-${Date.now()}@example.test` }, {
    now: openDate, notify: async () => {},
  }, docxFile);
  assert(docxResult.ok, "Un CV DOCX valide doit être accepté.");
  console.log(JSON.stringify({ feature: "sainte-lucie-cv", step: "docx-upload", status: "pass" }));

  const invalidFile = new File([pdfBytes], "cv.png", { type: "image/png" });
  const callsBeforeInvalidFile = calls.count;
  const invalidUpload = await processSainteLucieRequest({ ...valid, email: `bad-file-${Date.now()}@example.test` }, {
    now: openDate, notify: async () => { calls.count++; },
  }, invalidFile);
  assert(!invalidUpload.ok && invalidUpload.error?.includes("PDF ou DOCX") && calls.count === callsBeforeInvalidFile, "Un fichier d'un type non autorisé doit être refusé sans notification.");
  console.log(JSON.stringify({ feature: "sainte-lucie-cv", step: "reject-unsupported-type", status: "pass" }));

  const forgedPdf = new File([Buffer.from("pas un PDF", "utf8")], "cv.pdf", { type: "application/pdf" });
  const invalidSignature = await processSainteLucieRequest({ ...valid, email: `forged-file-${Date.now()}@example.test` }, {
    now: openDate, notify: async () => { calls.count++; },
  }, forgedPdf);
  assert(!invalidSignature.ok && invalidSignature.error?.includes("PDF ou DOCX valide") && calls.count === callsBeforeInvalidFile, "Un fichier qui usurpe l'extension PDF doit être refusé sans notification.");
  console.log(JSON.stringify({ feature: "sainte-lucie-cv", step: "reject-invalid-signature", status: "pass" }));

  const oversizedFile = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "cv.pdf", { type: "application/pdf" });
  const oversizedUpload = await processSainteLucieRequest({ ...valid, email: `large-file-${Date.now()}@example.test` }, {
    now: openDate, notify: async () => { calls.count++; },
  }, oversizedFile);
  assert(!oversizedUpload.ok && oversizedUpload.error?.includes("5 Mo") && calls.count === callsBeforeInvalidFile, "Un CV de plus de 5 Mo doit être refusé sans notification.");
  console.log(JSON.stringify({ feature: "sainte-lucie-cv", step: "reject-oversized-file", status: "pass" }));

  const page = readFileSync("src/app/(site)/opportunites/service-civique-sainte-lucie/page.tsx", "utf8");
  const form = readFileSync("src/app/(site)/opportunites/service-civique-sainte-lucie/RecallForm.tsx", "utf8");
  const actions = readFileSync("src/app/(site)/opportunites/service-civique-sainte-lucie/actions.ts", "utf8");
  const sitemap = readFileSync("src/app/sitemap.ts", "utf8");
  assert(page.includes("<h1") && page.includes("href=\"#rappel\"") && page.includes("La sélection finale"), "La page doit exposer le parcours et la transparence.");
  assert(form.includes("useActionState") && form.includes("type=\"file\"") && form.includes("type=\"checkbox\""), "Le formulaire doit proposer un upload de CV et conserver les consentements.");
  assert(actions.includes('formData.get("cv")') && actions.includes("processSainteLucieRequest"), "L'action serveur doit récupérer le fichier et appeler le traitement réel.");
  assert(sitemap.includes("/opportunites/service-civique-sainte-lucie"), "La page doit figurer dans le sitemap.");

  console.log(JSON.stringify({ feature: "sainte-lucie", status: "pass" }));
}

main().catch((error) => {
  console.error(JSON.stringify({ feature: "sainte-lucie", status: "fail", error: error instanceof Error ? error.message : String(error) }));
  process.exitCode = 1;
});
