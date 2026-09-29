import { readFileSync } from "node:fs";
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
  assert(notification.includes("ne pas transférer ce courriel à la CARL") && notification.includes("uniquement son adresse e-mail"), "La notification interne doit empêcher son transfert intégral à la CARL.");

  let optOutNotification = "";
  const optOut = await processSainteLucieRequest({ ...valid, shareEmail: false, email: `optout-${Date.now()}@example.test` }, {
    now: openDate,
    notify: async (payload) => { optOutNotification = JSON.stringify(payload); },
  });
  assert(optOut.ok && optOutNotification.includes("non — demander son accord"), "Un candidat doit pouvoir demander un échange sans autoriser la transmission de son email.");

  const page = readFileSync("src/app/(site)/opportunites/service-civique-sainte-lucie/page.tsx", "utf8");
  const form = readFileSync("src/app/(site)/opportunites/service-civique-sainte-lucie/RecallForm.tsx", "utf8");
  const sitemap = readFileSync("src/app/sitemap.ts", "utf8");
  assert(page.includes("<h1") && page.includes("href=\"#rappel\"") && page.includes("La sélection finale"), "La page doit exposer le parcours et la transparence.");
  assert(form.includes("submitSainteLucieRequest") && form.includes("type=\"checkbox\""), "Le formulaire doit appeler l'action réelle avec consentement.");
  assert(sitemap.includes("/opportunites/service-civique-sainte-lucie"), "La page doit figurer dans le sitemap.");

  console.log(JSON.stringify({ feature: "sainte-lucie", status: "pass" }));
}

main().catch((error) => {
  console.error(JSON.stringify({ feature: "sainte-lucie", status: "fail", error: error instanceof Error ? error.message : String(error) }));
  process.exitCode = 1;
});
