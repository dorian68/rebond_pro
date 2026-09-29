"use server";

import { processSainteLucieRequest } from "./submission";
import type { SainteLucieResult } from "./submission";

export async function submitSainteLucieRequest(_previousState: SainteLucieResult, formData: FormData): Promise<SainteLucieResult> {
  const cvValue = formData.get("cv");
  const cvSelected = formData.get("cvSelected") === "true";
  if (cvSelected && !(cvValue instanceof File)) {
    return { ok: false, error: "Le fichier joint n'est pas valide." };
  }

  const input = {
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    age: formData.get("age"),
    commune: formData.get("commune"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    english: formData.get("english"),
    availability: formData.get("availability"),
    motivation: formData.get("motivation"),
    consent: formData.get("consent") === "on",
    shareEmail: formData.get("shareEmail") === "on",
    website: formData.get("website"),
  };
  const cvFile = cvSelected && cvValue instanceof File ? cvValue : null;
  return processSainteLucieRequest(input, {}, cvFile);
}
