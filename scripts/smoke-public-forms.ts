import { readFileSync } from "node:fs";
import { submitContactRequest } from "../src/app/(site)/contact/actions";
import { rateLimit, rateLimitFingerprint } from "../src/server/rate-limit";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const fingerprint = rateLimitFingerprint(" Test.User@Example.test ");
  assert(fingerprint === rateLimitFingerprint("test.user@example.test"), "L'empreinte doit normaliser l'adresse.");
  assert(!fingerprint.includes("test.user"), "L'empreinte ne doit pas exposer l'adresse brute.");

  const bucket = `smoke:public-form:${Date.now()}:${Math.random()}`;
  assert(rateLimit(bucket, 2, 60_000), "La première demande doit être autorisée.");
  assert(rateLimit(bucket, 2, 60_000), "La deuxième demande doit être autorisée.");
  assert(!rateLimit(bucket, 2, 60_000), "La demande au-delà du quota doit être refusée.");

  const botResult = await submitContactRequest({ website: "https://spam.example" });
  assert(botResult.ok, "Le honeypot doit neutraliser silencieusement les robots.");
  const invalidResult = await submitContactRequest({ website: "" });
  assert(!invalidResult.ok, "Un formulaire humain invalide doit être refusé.");

  const contactSource = readFileSync("src/app/(site)/contact/actions.ts", "utf8");
  const leadSource = readFileSync("src/server/public-actions.ts", "utf8");
  assert(contactSource.includes("rateLimitFingerprint"), "Le contact doit limiter les demandes sans journaliser l'email brut.");
  assert(contactSource.includes("return { ok: false"), "Un échec email ne doit pas produire un faux succès.");
  assert(leadSource.includes('formData.get("website")'), "Le formulaire formation doit conserver son honeypot.");
  assert(leadSource.includes("public-lead:contact"), "Le formulaire formation doit appliquer un quota par contact.");

  console.log("smoke:public-forms PASS");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
