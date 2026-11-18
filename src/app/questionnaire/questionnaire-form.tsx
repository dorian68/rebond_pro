"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { answerError, questionnaire, questions, submissionSchema, type Answers, type Question } from "@/features/questionnaire/schema";
import styles from "./questionnaire.module.css";

const STEPS = ["Votre projet", "Vos conditions pour avancer", "Votre accompagnement et la suite"];
const GROUPS = [questions.slice(0,5), questions.slice(5,9), questions.slice(9)];

export default function QuestionnaireForm() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [extra, setExtra] = useState({ sectorDetail: "", firstName: "", phone: "", email: "", contactSlot: "", website: "" });
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string,string>>({});
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);
  const submissionKey = useRef<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const wantsPhone = answers.rappel === "Oui, par téléphone";
  const wantsEmail = answers.rappel === "Oui, par email";

  useEffect(() => {
    if (success || !Object.keys(answers).length) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [answers, success]);

  function choose(q: Question, option: string) {
    setErrors(previous => { const next = { ...previous }; delete next[`answers.${q.id}`]; delete next.form; if (q.id === "rappel") { delete next.phone; delete next.email; delete next.firstName; delete next.contactSlot; } return next; });
    setAnswers(previous => {
      if (q.type === "single") return { ...previous, [q.id]: option };
      const selected = Array.isArray(previous[q.id]) ? previous[q.id] as string[] : [];
      let next: string[];
      if (selected.includes(option)) next = selected.filter(v => v !== option);
      else if (q.exclusive?.includes(option)) next = [option];
      else next = [...selected.filter(v => !q.exclusive?.includes(v)), option];
      return { ...previous, [q.id]: next };
    });
    if (q.id === "rappel") setExtra(previous => ({ ...previous, phone: option === "Oui, par téléphone" ? previous.phone : "", email: option === "Oui, par email" ? previous.email : "", ...(option === "Non, pas pour le moment" ? { firstName: "", contactSlot: "" } : {}) }));
  }

  function move(next: number) {
    setStep(next); setErrors({});
    requestAnimationFrame(() => { heading.current?.focus(); heading.current?.scrollIntoView({ behavior: "smooth", block: "start" }); });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    const issues: Record<string,string> = {};
    for (const q of GROUPS[step]) { const message = answerError(q, answers[q.id]); if (message) issues[`answers.${q.id}`] = message; }
    if (Object.keys(issues).length) { setErrors(issues); return; }
    if (step < 2) { move(step+1); return; }
    submissionKey.current ??= crypto.randomUUID();
    const raw = { submissionKey: submissionKey.current, answers, ...extra, consent };
    const result = submissionSchema.safeParse(raw);
    if (!result.success) {
      setErrors(Object.fromEntries(result.error.issues.map(issue => [issue.path.join("."), issue.message])));
      return;
    }
    setPending(true); setErrors({});
    try {
      const response = await fetch("/api/questionnaire", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(raw), signal: AbortSignal.timeout(25_000) });
      const data = await response.json();
      if (!response.ok || !data.ok) { setErrors({ ...data.fields, form: data.error ?? "L’enregistrement n’est pas confirmé. Réessayez." }); return; }
      setSuccess(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch { setErrors({ form: "L’enregistrement n’est pas confirmé. Vos réponses sont toujours sur cette page. Vérifiez votre connexion et réessayez." }); }
    finally { setPending(false); }
  }

  if (success) return <section className={styles.success} aria-live="polite"><span className={styles.check} aria-hidden="true">✓</span><h1>Vos réponses ont bien été enregistrées</h1><p>{questionnaire.closing}</p><p>Vous pouvez fermer cette page.</p><Link href="/">Revenir à l’accueil</Link></section>;

  return <>
    <div className={styles.intro}><span className={styles.eyebrow}>ENVIRON 4 MINUTES · SANS ENGAGEMENT</span><h1>{questionnaire.title}</h1><p>{questionnaire.intro}</p></div>
    <ol className={styles.steps} aria-label="Étapes du questionnaire">{STEPS.map((label,index) => <li key={label} aria-current={step === index ? "step" : undefined} className={index <= step ? styles.active : ""}><span>{index+1}</span><span>{label}</span></li>)}</ol>
    <form className={styles.form} onSubmit={submit} noValidate>
      <h2 ref={heading} tabIndex={-1}>{STEPS[step]} <span>{step+1} sur 3</span></h2>
      <p className={styles.help}>{questionnaire.instructions}</p>
      <fieldset disabled={pending} className={styles.group}>
      {GROUPS[step].map(q => {
        const value = answers[q.id]; const error = errors[`answers.${q.id}`];
        return <fieldset key={q.id} className={styles.question} aria-describedby={`${q.id}-hint${error ? ` ${q.id}-error` : ""}`} aria-invalid={Boolean(error)}>
          <legend><span className={styles.number}>{String(q.number).padStart(2,"0")}</span>{q.label}</legend>
          <p id={`${q.id}-hint`} className={styles.hint}>{q.hint ?? (q.type === "single" ? "Une seule réponse." : "Plusieurs réponses possibles.")}</p>
          {q.type === "text" ? <input aria-label={q.label} className={styles.input} maxLength={q.max_length} value={typeof value === "string" ? value : ""} onChange={event => setAnswers(previous => ({ ...previous, [q.id]: event.target.value }))} /> : <div className={styles.choices}>{q.options?.map(option => {
            const checked = Array.isArray(value) ? value.includes(option) : value === option;
            const atMax = q.type === "multiple" && Boolean(q.max_choices && Array.isArray(value) && value.length >= q.max_choices);
            return <label key={option} className={`${styles.choice} ${checked ? styles.selected : ""}`}><input type={q.type === "single" ? "radio" : "checkbox"} name={q.id} value={option} checked={checked} disabled={!checked && atMax && !q.exclusive?.includes(option)} onChange={() => choose(q,option)} /><span>{option}</span></label>;
          })}</div>}
          {q.optional_text && <label className={styles.extra}>{q.optional_text.label}<input className={styles.input} value={extra.sectorDetail} maxLength={q.optional_text.max_length} onChange={event => setExtra(previous => ({ ...previous, sectorDetail: event.target.value }))} /></label>}
          {error && <p id={`${q.id}-error`} role="alert" className={styles.error}>{error}</p>}
        </fieldset>;
      })}
      {step === 2 && (wantsPhone || wantsEmail) && <div className={styles.contact}>
        <h3>Pour vous recontacter</h3><p>Votre demande concerne cet échange, sans inscription à une newsletter.</p>
        <label>Prénom <span>(facultatif)</span><input className={styles.input} autoComplete="given-name" maxLength={80} value={extra.firstName} onChange={event => setExtra(previous => ({ ...previous, firstName: event.target.value }))} /></label>
        <label>{wantsPhone ? "Téléphone" : "Adresse email"}<input className={styles.input} type={wantsPhone ? "tel" : "email"} autoComplete={wantsPhone ? "tel" : "email"} value={wantsPhone ? extra.phone : extra.email} maxLength={wantsPhone ? 40 : 254} onChange={event => setExtra(previous => ({ ...previous, [wantsPhone ? "phone" : "email"]: event.target.value }))} aria-invalid={Boolean(errors.phone || errors.email)} />{(errors.phone || errors.email) && <span role="alert" className={styles.error}>{errors.phone || errors.email}</span>}</label>
        <label>Créneau souhaité <span>(facultatif, heure de Guadeloupe)</span><input className={styles.input} maxLength={160} value={extra.contactSlot} onChange={event => setExtra(previous => ({ ...previous, contactSlot: event.target.value }))} /></label>
      </div>}
      {step === 2 && <section className={styles.privacy}>
        <h3>Vos réponses restent confidentielles</h3><p>OPTIQUANT IA, responsable du service Le Bon Rebond, utilise vos réponses avec votre accord pour préparer votre orientation et, si vous le demandez, vous recontacter. Seule l’équipe habilitée y a accès. Les réponses sont conservées six mois, puis supprimées. Aucun dossier n’est transmis à un partenaire à partir de ce questionnaire.</p><p>Vous pouvez retirer votre accord ou exercer vos droits auprès de <a href="mailto:contact.lebonrebond@gmail.com">contact.lebonrebond@gmail.com</a>. <Link href="/legal/confidentialite" target="_blank" rel="noreferrer">Lire la politique de confidentialité</Link>.</p>
        <label className={styles.consent}><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} /><span>J’accepte que mes réponses soient utilisées pour préparer mon orientation et, si je le souhaite, pour me recontacter.</span></label>{errors.consent && <p role="alert" className={styles.error}>{errors.consent}</p>}
      </section>}
      <label className={styles.honeypot} aria-hidden="true">Votre site web<input tabIndex={-1} autoComplete="off" value={extra.website} onChange={event => setExtra(previous => ({ ...previous, website: event.target.value }))} /></label>
      </fieldset>
      {errors.form && <p role="alert" className={styles.errorBanner}>{errors.form}</p>}
      <div className={styles.actions}>{step > 0 ? <button type="button" disabled={pending} className={styles.back} onClick={() => move(step-1)}>Précédent</button> : <span />}
        <button type="submit" disabled={pending} className={styles.next}>{pending ? "Enregistrement…" : step < 2 ? "Continuer" : wantsPhone || wantsEmail ? "Demander un échange" : "Terminer"}{!pending && <span aria-hidden="true"> →</span>}</button>
      </div>
    </form>
  </>;
}
