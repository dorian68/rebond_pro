"use client";

import { useActionState, useState, type FormEvent } from "react";
import Link from "next/link";
import { submitSainteLucieRequest } from "./actions";
import type { SainteLucieResult } from "./submission";
import styles from "./sainte-lucie.module.css";

const initialState: SainteLucieResult = { ok: false };
const initialForm = {
  firstName: "", lastName: "", age: "", commune: "", email: "", phone: "",
  english: "", availability: "", motivation: "", consent: false, shareEmail: false,
};
const MAX_CV_BYTES = 5 * 1024 * 1024;

function validateCvBeforeSubmit(file?: File): string | null {
  if (!file || !file.name) return null;
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension !== "pdf" && extension !== "docx") return "Le CV doit être au format PDF ou DOCX.";
  if (file.size > MAX_CV_BYTES) return "Le CV ne doit pas dépasser 5 Mo.";
  const expectedMime = extension === "pdf"
    ? "application/pdf"
    : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (file.type && file.type.toLowerCase() !== expectedMime) {
    return "Le type du fichier ne correspond pas à son extension. Choisis un CV PDF ou DOCX.";
  }
  return null;
}

export default function RecallForm() {
  const [state, formAction, submitting] = useActionState(submitSainteLucieRequest, initialState);
  const [form, setForm] = useState(initialForm);
  const [cvSelected, setCvSelected] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const file = (event.currentTarget.elements.namedItem("cv") as HTMLInputElement | null)?.files?.[0];
    const error = validateCvBeforeSubmit(file);
    if (error) {
      event.preventDefault();
      setClientError(error);
    } else {
      setClientError(null);
    }
  }

  if (state.ok) {
    return (
      <div className={styles.success} role="status" aria-live="polite">
        <span className={styles.successMark} aria-hidden="true">✓</span>
        <h3>Merci, ta demande a bien été reçue.</h3>
        <p>Nous reviendrons vers toi afin d’échanger sur ton projet. Si tu poursuis cette opportunité, Le Bon Rebond t’accompagnera dans les démarches et, si tu es sélectionné, jusqu’à la fin de la mission.</p>
        <p className={styles.small}>Si tu as demandé la mise en relation, notre équipe pourra communiquer ton adresse e-mail à la CARL. Cela ne constitue pas une candidature officielle et ne garantit pas une sélection.</p>
      </div>
    );
  }

  return (
    <form className={styles.form} action={formAction} onSubmit={handleSubmit} onReset={(event) => event.preventDefault()} encType="multipart/form-data" noValidate={false}>
      <input type="hidden" name="cvSelected" value={cvSelected ? "true" : "false"} />
      <div className={styles.honeypot} aria-hidden="true">
        <label htmlFor="sl-website">Site web</label>
        <input id="sl-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <div className={styles.formGrid}>
        <div className={styles.field}>
          <label htmlFor="sl-first-name">Prénom *</label>
          <input id="sl-first-name" name="firstName" autoComplete="given-name" required minLength={2} maxLength={80} value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} />
        </div>
        <div className={styles.field}>
          <label htmlFor="sl-last-name">Nom *</label>
          <input id="sl-last-name" name="lastName" autoComplete="family-name" required minLength={2} maxLength={80} value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} />
        </div>
        <div className={styles.field}>
          <label htmlFor="sl-age">Âge *</label>
          <input id="sl-age" name="age" type="number" inputMode="numeric" min={18} max={25} required value={form.age} onChange={(event) => setForm({ ...form, age: event.target.value })} />
          <span className={styles.fieldHint}>Cette mission est ouverte aux 18–25 ans. Pour un autre projet, <Link href="/contact">écris-nous ici</Link>.</span>
        </div>
        <div className={styles.field}>
          <label htmlFor="sl-commune">Commune de résidence *</label>
          <input id="sl-commune" name="commune" autoComplete="address-level2" required minLength={2} maxLength={100} value={form.commune} onChange={(event) => setForm({ ...form, commune: event.target.value })} />
        </div>
        <div className={styles.field}>
          <label htmlFor="sl-email">Adresse e-mail *</label>
          <input id="sl-email" name="email" type="email" autoComplete="email" required maxLength={254} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        </div>
        <div className={styles.field}>
          <label htmlFor="sl-phone">Téléphone *</label>
          <input id="sl-phone" name="phone" type="tel" autoComplete="tel" required minLength={8} maxLength={40} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
        </div>
        <div className={styles.field}>
          <label htmlFor="sl-english">Ton niveau d’anglais *</label>
          <select id="sl-english" name="english" required value={form.english} onChange={(event) => setForm({ ...form, english: event.target.value })}>
            <option value="">Choisir une réponse</option>
            <option value="debutant">Débutant</option>
            <option value="intermediaire">Intermédiaire</option>
            <option value="aise">À l’aise</option>
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="sl-availability">Disponible à partir de décembre 2026 ? *</label>
          <select id="sl-availability" name="availability" required value={form.availability} onChange={(event) => setForm({ ...form, availability: event.target.value })}>
            <option value="">Choisir une réponse</option>
            <option value="oui">Oui</option>
            <option value="non">Non</option>
            <option value="a-confirmer">À confirmer</option>
          </select>
        </div>
      </div>
      <div className={styles.field}>
        <label htmlFor="sl-motivation">Qu’est-ce qui t’attire dans cette expérience à Sainte-Lucie ? *</label>
        <textarea id="sl-motivation" name="motivation" rows={4} required minLength={10} maxLength={2000} value={form.motivation} onChange={(event) => setForm({ ...form, motivation: event.target.value })} placeholder="Quelques mots suffisent : ce qui t’intéresse, ce que tu aimerais découvrir, tes questions…" />
      </div>
      <div className={styles.field}>
        <label htmlFor="sl-cv">Joindre ton CV (facultatif)</label>
        <input id="sl-cv" name="cv" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" aria-describedby="sl-cv-help" onChange={(event) => { setCvSelected(Boolean(event.currentTarget.files?.length)); setClientError(null); }} />
        <span className={styles.fieldHint} id="sl-cv-help">PDF ou DOCX, 5 Mo maximum. Le CV sera envoyé à l’équipe Le Bon Rebond avec ta demande et ne sera pas transmis à la CARL.</span>
      </div>
      <label className={styles.consent} htmlFor="sl-consent">
        <input id="sl-consent" name="consent" type="checkbox" required checked={form.consent} onChange={(event) => setForm({ ...form, consent: event.target.checked })} />
        <span>J’accepte que Le Bon Rebond utilise les informations et le CV transmis afin de me recontacter au sujet de cette opportunité et de mon projet professionnel. *</span>
      </label>
      <label className={styles.consent} htmlFor="sl-share-email">
        <input id="sl-share-email" name="shareEmail" type="checkbox" checked={form.shareEmail} onChange={(event) => setForm({ ...form, shareEmail: event.target.checked })} />
        <span>Je souhaite que Le Bon Rebond transmette mon adresse e-mail à la CARL pour faciliter notre mise en relation au sujet de cette mission. Facultatif : nous pouvons d’abord en parler ensemble.</span>
      </label>
      {(clientError || state.error) && <p className={styles.formError} role="alert">{clientError || state.error} <Link href="/contact">Page Contact</Link></p>}
      <button className={styles.submit} type="submit" disabled={submitting}>
        {submitting ? "Envoi en cours…" : "Demander à être recontacté(e)"}
      </button>
      <p className={styles.formNote}>Le formulaire et le CV facultatif sont adressés à contact.lebonrebond@gmail.com. Seule ton adresse e-mail peut ensuite être communiquée à la CARL si tu l’autorises. Cette demande ne constitue pas une candidature officielle et ne garantit pas une sélection. <Link href="/legal/confidentialite">Confidentialité des données</Link>.</p>
    </form>
  );
}
