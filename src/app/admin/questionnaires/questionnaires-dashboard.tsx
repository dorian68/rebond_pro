"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { questions, STATUS_LABELS, type Answers, type responseStatistics } from "@/features/questionnaire/schema";
import styles from "./questionnaires.module.css";

type Row = { id: string; createdAt: string; status: string; firstName: string | null; phone: string | null; email: string | null; answers: Answers; sectorDetail: string | null; version?: string; contactSlot?: string | null; expiresAt?: string; consentedAt?: string };
type Data = { rows: Row[]; stats: ReturnType<typeof responseStatistics>; page: number; totalPages: number };
const date = (value: string) => new Date(value).toLocaleString("fr-FR", { timeZone: "America/Guadeloupe", dateStyle: "medium", timeStyle: "short" });
function display(value: string | string[] | undefined) { return Array.isArray(value) ? value.join(" · ") : value || "Non renseigné"; }

export default function QuestionnairesDashboard() {
  const [filters, setFilters] = useState({ from: "", to: "", status: "", contact: "" });
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState("responses");
  const [data, setData] = useState<Data | null>(null);
  const [loadedQuery, setLoadedQuery] = useState("");
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [refresh, setRefresh] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const params = new URLSearchParams({ ...filters, page: String(page) }).toString();
  const queryKey = `${params}|${refresh}`;
  const loading = loadedQuery !== queryKey;
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/admin/questionnaires?${params}`, { signal: controller.signal, cache: "no-store" }).then(async response => {
      const result = await response.json(); if (!response.ok) throw new Error(result.error ?? "Les réponses sont indisponibles.");
      if (!controller.signal.aborted) { setData(result); setError(""); }
    }).catch(error => { if (!controller.signal.aborted) setError(error.message); }).finally(() => { if (!controller.signal.aborted) setLoadedQuery(queryKey); });
    return () => controller.abort();
  }, [params, queryKey]);
  const close = useCallback(() => setDetail(null), []);
  useEffect(() => { if (detail && dialog.current && !dialog.current.open) dialog.current.showModal(); }, [detail]);
  useEffect(() => { if (!detail) return; const handler = (event: KeyboardEvent) => { if (event.key === "Escape") close(); }; window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler); }, [detail, close]);

  async function open(id: string) {
    setBusy(true); setNotice("");
    try { const response = await fetch(`/api/admin/questionnaires/${id}`, { cache: "no-store" }); const result = await response.json(); if (!response.ok) throw new Error(result.error); setDetail(result.row); }
    catch (error) { setNotice(error instanceof Error ? error.message : "La réponse est indisponible."); }
    finally { setBusy(false); }
  }
  async function update(remove: boolean, status?: string) {
    if (!detail || busy) return;
    if (remove && !window.confirm("Supprimer définitivement ce questionnaire et ses coordonnées ? Cette action est irréversible.")) return;
    setBusy(true); setNotice("");
    try {
      const response = await fetch(`/api/admin/questionnaires/${detail.id}`, { method: remove ? "DELETE" : "PATCH", headers: { "Content-Type": "application/json" }, ...(remove ? {} : { body: JSON.stringify({ status }) }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      if (remove) setDetail(null); else setDetail(previous => previous ? { ...previous, status: status! } : null);
      setRefresh(value => value+1); setNotice(remove ? "Le questionnaire a été supprimé." : "Le statut a été enregistré.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "La modification n’est pas confirmée."); }
    finally { setBusy(false); }
  }

  return <div className={styles.dashboard}>
    <div className={styles.title}><div><h1>Questionnaires</h1><p>Consultez les réponses, suivez les demandes d’échange et retrouvez les besoins exprimés.</p></div><Link href="/questionnaire" target="_blank" className={styles.link}>Ouvrir le questionnaire ↗</Link></div>
    <form className={styles.filters} onSubmit={event => event.preventDefault()} aria-label="Filtrer les questionnaires">
      <label>Du<input type="date" value={filters.from} onChange={event => { setFilters({ ...filters, from: event.target.value }); setPage(1); }} /></label>
      <label>Au<input type="date" value={filters.to} onChange={event => { setFilters({ ...filters, to: event.target.value }); setPage(1); }} /></label>
      <label>Statut<select value={filters.status} onChange={event => { setFilters({ ...filters, status: event.target.value }); setPage(1); }}><option value="">Tous les statuts</option>{Object.entries(STATUS_LABELS).map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label>Demande d’échange<select value={filters.contact} onChange={event => { setFilters({ ...filters, contact: event.target.value }); setPage(1); }}><option value="">Toutes les réponses</option><option value="yes">Échange souhaité</option><option value="no">Sans demande d’échange</option></select></label>
      <button type="button" onClick={() => { setFilters({ from: "", to: "", status: "", contact: "" }); setPage(1); }}>Réinitialiser</button>
      <button type="button" onClick={() => setRefresh(value => value+1)}>Actualiser</button>
    </form>
    <p className={styles.scope}>Dates et heures de Guadeloupe. Les indicateurs et l’export portent sur toutes les réponses correspondant aux filtres.</p>
    {notice && <p role="status" className={styles.notice}>{notice}</p>}
    {loading ? <p role="status" className={styles.state}>Chargement des réponses…</p> : error ? <div role="alert" className={styles.error}>{error}<button onClick={() => setRefresh(value => value+1)}>Réessayer</button></div> : data && <>
      <div className={styles.kpis}>{[["Réponses",data.stats.total],["Échanges souhaités",data.stats.contact],["Sans demande d’échange",data.stats.total-data.stats.contact],["À traiter",data.stats.pending]].map(([label,value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
      <div className={styles.toolbar}><div className={styles.tabs} role="group" aria-label="Vue des questionnaires"><button aria-pressed={tab === "responses"} onClick={() => setTab("responses")}>Réponses</button><button aria-pressed={tab === "stats"} onClick={() => setTab("stats")}>Statistiques</button></div><a href={`/api/admin/questionnaires?${params}&format=csv`} className={styles.link}>Exporter en CSV</a></div>
      {!data.stats.total ? <div className={styles.state}><h2>Aucune réponse pour le moment</h2><p>{Object.values(filters).some(Boolean) ? "Aucun questionnaire ne correspond à ces filtres. Vous pouvez les modifier ou les réinitialiser." : "Les questionnaires apparaîtront ici après leur envoi."}</p></div> : tab === "responses" ? <>
        <div className={styles.tableWrap}><table><thead><tr><th>Reçu le</th><th>Personne</th><th>Priorité</th><th>Commune</th><th>Échange</th><th>Statut</th><th><span className={styles.srOnly}>Détail</span></th></tr></thead><tbody>{data.rows.map(row => <tr key={row.id}><td>{date(row.createdAt)}</td><td>{row.firstName || "Prénom non renseigné"}</td><td>{display(row.answers.objectif)}</td><td>{display(row.answers.commune)}</td><td>{row.phone ? "Téléphone" : row.email ? "Email" : "Non demandé"}</td><td><span className={styles.badge}>{STATUS_LABELS[row.status as keyof typeof STATUS_LABELS]}</span></td><td><button disabled={busy} onClick={() => open(row.id)} aria-label={`Voir le questionnaire reçu le ${date(row.createdAt)}`}>Voir</button></td></tr>)}</tbody></table></div>
        <div className={styles.pagination}><button disabled={data.page <= 1} onClick={() => setPage(data.page-1)}>Précédent</button><span>Page {data.page} sur {data.totalPages} · {data.stats.total} réponse{data.stats.total > 1 ? "s" : ""}</span><button disabled={data.page >= data.totalPages} onClick={() => setPage(data.page+1)}>Suivant</button></div>
      </> : <div><p className={styles.scope}>Pourcentages calculés parmi les personnes ayant répondu à chaque question. Pour les choix multiples, le total peut dépasser 100 %.</p><div className={styles.charts}>{data.stats.distributions.map(distribution => <section key={distribution.id} className={styles.chart}><h2>{distribution.label}</h2><p>{distribution.answered} réponse{distribution.answered > 1 ? "s" : ""} · {distribution.unanswered} non renseigné{distribution.unanswered > 1 ? "s" : ""}</p>{distribution.options.length ? distribution.options.map(option => <div className={styles.barRow} key={option.label}><div><span>{option.label}</span><strong>{option.count} · {option.percent} %</strong></div><div className={styles.track}><div style={{ width: `${option.percent}%` }} /></div></div>) : <p>Aucune réponse renseignée.</p>}</section>)}</div></div>}
    </>}
    {detail && <dialog ref={dialog} className={styles.modal} onCancel={event => { event.preventDefault(); close(); }} aria-label="Détail du questionnaire"><section className={styles.drawer}>
      <div className={styles.detailTitle}><h2>Réponse au questionnaire</h2><button onClick={close} autoFocus>Fermer</button></div><p className={styles.scope}>Reçu le {date(detail.createdAt)} · {detail.version}</p>
      <div className={styles.detailActions}><label>Statut<select disabled={busy} value={detail.status} onChange={event => update(false,event.target.value)}>{Object.entries(STATUS_LABELS).map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select></label><button disabled={busy} className={styles.danger} onClick={() => update(true)}>Supprimer la réponse</button></div>
      {notice && <p role="status" className={styles.notice}>{notice}</p>}
      <div className={styles.contact}><h3>{detail.firstName || "Prénom non renseigné"}</h3>{detail.phone ? <a href={`tel:${detail.phone.replace(/[^+\d]/g,"")}`}>{detail.phone}</a> : detail.email ? <a href={`mailto:${detail.email}`}>{detail.email}</a> : <p>Aucun échange demandé. Aucune coordonnée recueillie.</p>}{detail.contactSlot && <p>Créneau souhaité, heure de Guadeloupe : {detail.contactSlot}</p>}</div>
      <dl className={styles.answers}>{questions.map(q => <div key={q.id}><dt>{q.number}. {q.label}</dt><dd>{display(detail.answers[q.id])}</dd></div>)}{detail.sectorDetail && <div><dt>Métier, domaine ou idée d’activité</dt><dd>{detail.sectorDetail}</dd></div>}</dl>
      <p className={styles.scope}>Accord recueilli le {detail.consentedAt ? date(detail.consentedAt) : "—"}. Suppression prévue le {detail.expiresAt ? date(detail.expiresAt) : "—"}. Aucune mise en relation avec un partenaire n’est autorisée par ce seul questionnaire.</p>
    </section></dialog>}
  </div>;
}
