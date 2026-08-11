"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import {
  ROADMAP2_CATEGORIES,
  ROADMAP2_CATEGORY_LABELS,
  ROADMAP2_DRIVE_HELP,
  ROADMAP2_NODE_TYPES,
  ROADMAP2_PRIORITIES,
  ROADMAP2_PRIORITY_LABELS,
  ROADMAP2_RELATION_LABELS,
  ROADMAP2_RELATION_TYPES,
  ROADMAP2_STATUSES,
  ROADMAP2_STATUS_LABELS,
  ROADMAP2_TRACKING_DOC_TEMPLATE,
  ROADMAP2_TYPE_LABELS,
  ROADMAP2_UPDATE_LABELS,
  ROADMAP2_UPDATE_TYPES,
  type Roadmap2EdgeDto,
  type Roadmap2NodeDto,
  type Roadmap2Owner,
  type Roadmap2RelationType,
  type Roadmap2UpdateType,
} from "@/lib/roadmap2";
import type { Roadmap2NodeInput } from "@/server/roadmap2";
import { addRoadmap2Update } from "@/server/roadmap2-actions";
import type { Roadmap2UiActions } from "./roadmap2-client";
import { nodeToInput } from "./roadmap2-ui";
import styles from "./roadmap2.module.css";

function futureDate(days: number) {
  const date = new Date(Date.now() + days * 86400000);
  return date.toISOString().slice(0, 10);
}

function emptyInput(defaults: { parentId?: string; type?: Roadmap2NodeDto["type"] } | undefined): Roadmap2NodeInput {
  return {
    title: "",
    description: null,
    expectedOutcome: null,
    type: defaults?.type ?? "initiative",
    category: "strategy_governance",
    status: "not_started",
    priority: "P1",
    progressPercent: 0,
    ownerUserId: null,
    startDate: new Date().toISOString().slice(0, 10),
    dueDate: futureDate(30),
    nextAction: null,
    decisionRequired: defaults?.type === "decision",
    definitionOfDone: null,
    driveFolderUrl: null,
    trackingDocUrl: null,
    parentId: defaults?.parentId ?? null,
    positionX: 140,
    positionY: 140,
    width: defaults?.type === "phase" ? 430 : 270,
  };
}

function contextualRelationLabel(relationType: Roadmap2RelationType, outgoing: boolean) {
  if (relationType === "dependency") return outgoing ? "Prérequis pour" : "A pour prérequis";
  if (relationType === "parent_child") return outgoing ? "Parent de" : "Enfant de";
  if (relationType === "blocks") return outgoing ? "Bloque" : "Bloqué par";
  return outgoing ? "Contribue à" : "Reçoit la contribution de";
}

function nullable(value: string) {
  return value.trim() ? value : null;
}

export function Roadmap2Detail({ workspaceKey, node, createDefaults, nodes, edges, owners, actions, onClose, onCreateChild, onLocalNode, announce }: {
  workspaceKey: string;
  node: Roadmap2NodeDto | null;
  createDefaults?: { parentId?: string; type?: Roadmap2NodeDto["type"] };
  nodes: Roadmap2NodeDto[];
  edges: Roadmap2EdgeDto[];
  owners: Roadmap2Owner[];
  actions: Roadmap2UiActions;
  onClose: () => void;
  onCreateChild: (parentId: string) => void;
  onLocalNode: (node: Roadmap2NodeDto) => void;
  onLocalEdge: (edge: Roadmap2EdgeDto) => void;
  onLocalEdgeRemoved: (edgeId: string) => void;
  announce: (tone: "success" | "error" | "info", message: string) => void;
}) {
  const router = useRouter();
  const titleRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [form, setForm] = useState<Roadmap2NodeInput>(() => node ? nodeToInput(node) : emptyInput(createDefaults));
  const [baseVersion, setBaseVersion] = useState<number | null>(() => node?.version ?? null);
  const [error, setError] = useState<string | null>(null);
  const [relationTarget, setRelationTarget] = useState("");
  const [relationType, setRelationType] = useState<Roadmap2RelationType>("dependency");
  const [updateType, setUpdateType] = useState<Roadmap2UpdateType>("note");
  const [updateBody, setUpdateBody] = useState("");
  const [pending, startTransition] = useTransition();
  const remoteVersionChanged = Boolean(node && baseVersion !== null && node.version !== baseVersion);

  useEffect(() => {
    const previous = document.body.style.overflow;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => titleRef.current?.focus(), 40);
    const handleKeys = (event: KeyboardEvent) => {
      if (event.key === "Escape") { onClose(); return; }
      if (event.key !== "Tab") return;
      const focusable = [...(panelRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? [])]
        .filter((element) => element.getClientRects().length > 0);
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handleKeys);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", handleKeys);
      window.clearTimeout(focusTimer);
      previousFocusRef.current?.focus();
    };
  }, [onClose]);

  const connected = useMemo(() => edges.filter((edge) => edge.sourceNodeId === node?.id || edge.targetNodeId === node?.id), [edges, node?.id]);
  const nodeMap = useMemo(() => new Map(nodes.map((candidate) => [candidate.id, candidate])), [nodes]);

  function field<K extends keyof Roadmap2NodeInput>(key: K, value: Roadmap2NodeInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!form.ownerUserId) { setError("Choisissez un responsable."); return; }
    if (!form.dueDate) { setError("Définissez une échéance."); return; }
    if (node && remoteVersionChanged) {
      setError("Une modification plus récente a été reçue. Rechargez-la avant d’enregistrer votre brouillon.");
      return;
    }
    const versionedNode = node && baseVersion !== null ? { ...node, version: baseVersion } : node;
    const result = await actions.saveNode(versionedNode, form);
    if (!result.ok) setError(result.error ?? "Enregistrement impossible.");
  }

  function addRelation() {
    if (!node || !relationTarget) return;
    startTransition(async () => {
      const result = await actions.createEdge(node.id, relationTarget, relationType);
      if (result.ok) setRelationTarget("");
    });
  }

  function addUpdate() {
    if (!node || !updateBody.trim()) return;
    startTransition(async () => {
      const result = await addRoadmap2Update(workspaceKey, { nodeId: node.id, nodeVersion: baseVersion ?? node.version, updateType, body: updateBody });
      if (!result.ok) {
        announce("error", result.error ?? "Mise à jour impossible.");
        if (result.code === "CONFLICT") router.refresh();
        return;
      }
      const now = new Date().toISOString();
      const nextVersion = result.version ?? (baseVersion ?? node.version) + 1;
      setBaseVersion(nextVersion);
      onLocalNode({ ...node, version: nextVersion, updatedAt: now, updates: [{ id: result.id!, nodeId: node.id, updateType, body: updateBody.trim(), author: null, createdAt: now, editedAt: null }, ...node.updates] });
      setUpdateBody("");
      announce("success", "Mise à jour publiée.");
      router.refresh();
    });
  }

  async function copy(value: string, label: string) {
    await navigator.clipboard.writeText(value);
    announce("success", `${label} copié.`);
  }

  return (
    <div className={styles.detailBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside ref={panelRef} className={styles.detailPanel} role="dialog" aria-modal="true" aria-labelledby="roadmap2-detail-title">
        <div className={styles.detailHeader}>
          <div>
            <div className={styles.eyebrow}>{node ? "Détail du résultat" : createDefaults?.parentId ? "Nouveau sous-nœud" : "Nouveau résultat"}</div>
            <h2 id="roadmap2-detail-title">{node?.title ?? "Créer un nœud"}</h2>
            {node && <p>Modifié {new Date(node.updatedAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}{node.updatedBy ? ` par ${node.updatedBy.name}` : ""} · v{node.version}</p>}
          </div>
          <button className={styles.closeButton} onClick={onClose} aria-label="Fermer le panneau"><Icon name="x" size={19} /></button>
        </div>

        <form onSubmit={submit} className={styles.detailForm}>
          {remoteVersionChanged && node && (
            <div className={styles.conflictNotice} role="alert">
              <Icon name="alert-circle" size={17} />
              <span>Une modification plus récente (v{node.version}) a été reçue. Votre brouillon n’a pas été écrasé.</span>
              <button type="button" onClick={() => { setForm(nodeToInput(node)); setBaseVersion(node.version); setError(null); }}>Recharger la version reçue</button>
            </div>
          )}
          <section className={styles.editorialSection}>
            <div className={styles.sectionKicker}>Identité</div>
            <label className={`${styles.field} ${styles.titleField}`}><span>Titre du résultat</span><input ref={titleRef} required maxLength={200} value={form.title} onChange={(event) => field("title", event.target.value)} placeholder="Le résultat à atteindre" /></label>
            <div className={styles.formGrid3}>
              <label className={styles.field}><span>Type</span><select value={form.type} onChange={(event) => field("type", event.target.value as Roadmap2NodeInput["type"])}>{ROADMAP2_NODE_TYPES.map((value) => <option key={value} value={value}>{ROADMAP2_TYPE_LABELS[value]}</option>)}</select></label>
              <label className={styles.field}><span>Statut</span><select value={form.status} onChange={(event) => field("status", event.target.value as Roadmap2NodeInput["status"])}>{ROADMAP2_STATUSES.map((value) => <option key={value} value={value}>{ROADMAP2_STATUS_LABELS[value]}</option>)}</select></label>
              <label className={styles.field}><span>Priorité</span><select value={form.priority} onChange={(event) => field("priority", event.target.value as Roadmap2NodeInput["priority"])}>{ROADMAP2_PRIORITIES.map((value) => <option key={value} value={value}>{value} · {ROADMAP2_PRIORITY_LABELS[value]}</option>)}</select></label>
            </div>
            <div className={styles.formGrid2}>
              <label className={styles.field}><span>Catégorie</span><select value={form.category} onChange={(event) => field("category", event.target.value as Roadmap2NodeInput["category"])}>{ROADMAP2_CATEGORIES.map((value) => <option key={value} value={value}>{ROADMAP2_CATEGORY_LABELS[value]}</option>)}</select></label>
              <label className={styles.field}><span>Responsable</span><select required value={form.ownerUserId ?? ""} onChange={(event) => field("ownerUserId", event.target.value || null)}><option value="">Choisir…</option>{owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}</option>)}</select></label>
            </div>
          </section>

          <section className={styles.editorialSection}>
            <div className={styles.sectionKicker}>Objectif</div>
            <label className={styles.field}><span>Contexte</span><textarea rows={3} value={form.description ?? ""} onChange={(event) => field("description", nullable(event.target.value))} placeholder="Pourquoi ce résultat compte maintenant ?" /></label>
            <label className={styles.field}><span>Résultat attendu</span><textarea rows={2} value={form.expectedOutcome ?? ""} onChange={(event) => field("expectedOutcome", nullable(event.target.value))} placeholder="Ce qui doit être vrai à la fin" /></label>
            <label className={styles.field}><span>Definition of done</span><textarea rows={2} value={form.definitionOfDone ?? ""} onChange={(event) => field("definitionOfDone", nullable(event.target.value))} placeholder="La preuve observable que le travail est terminé" /></label>
          </section>

          <section className={styles.editorialSection}>
            <div className={styles.sectionKicker}>Pilotage</div>
            <div className={styles.formGrid2}>
              <label className={styles.field}><span>Date de début</span><input type="date" value={form.startDate ?? ""} onChange={(event) => field("startDate", event.target.value || null)} /></label>
              <label className={styles.field}><span>Échéance</span><input required type="date" value={form.dueDate ?? ""} onChange={(event) => field("dueDate", event.target.value || null)} /></label>
            </div>
            <label className={styles.rangeField}><span>Progression <b>{form.progressPercent}%</b></span><input type="range" min="0" max="100" step="5" value={form.progressPercent} onChange={(event) => field("progressPercent", Number(event.target.value))} /></label>
            <label className={styles.field}><span>Prochaine action</span><input value={form.nextAction ?? ""} onChange={(event) => field("nextAction", nullable(event.target.value))} placeholder="La prochaine action concrète" /></label>
            <label className={styles.checkField}><input type="checkbox" checked={form.decisionRequired} onChange={(event) => field("decisionRequired", event.target.checked)} /><span>Une décision est nécessaire pour avancer</span></label>
            <label className={styles.field}><span>Parent</span><select value={form.parentId ?? ""} onChange={(event) => field("parentId", event.target.value || null)}><option value="">Aucun parent</option>{nodes.filter((candidate) => candidate.id !== node?.id && candidate.status !== "archived").map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.title}</option>)}</select></label>
          </section>

          <section className={`${styles.editorialSection} ${styles.privateSection}`} data-private-export>
            <div className={styles.sectionKicker}>Documents · privé</div>
            <DriveField label="Dossier Google Drive" value={form.driveFolderUrl ?? ""} onChange={(value) => field("driveFolderUrl", nullable(value))} placeholder="https://drive.google.com/drive/folders/…" onCopy={copy} emptyText="Aucun dossier Drive associé" actionText="Ajouter un lien" />
            <DriveField label="Document Suivi & décisions" value={form.trackingDocUrl ?? ""} onChange={(value) => field("trackingDocUrl", nullable(value))} placeholder="https://docs.google.com/document/d/…" onCopy={copy} emptyText="Aucun document Suivi & décisions" actionText="Renseigner le document" />
            <details className={styles.helpDetails}><summary>Structure Drive et modèle recommandés</summary><p>Ce modèle est indicatif : Roadmap 2 ne crée ni dossier ni document.</p><div className={styles.helpColumns}><pre>{ROADMAP2_DRIVE_HELP}</pre><pre>{ROADMAP2_TRACKING_DOC_TEMPLATE}</pre></div></details>
          </section>

          {node && (
            <section className={styles.editorialSection}>
              <div className={styles.sectionKicker}>Dépendances et contribution</div>
              {connected.length === 0 ? <p className={styles.inlineEmpty}>Aucune relation. Créez-en une ci-dessous ou reliez deux poignées dans le graphe.</p> : (
                <ul className={styles.relationList}>{connected.map((edge) => {
                  const outgoing = edge.sourceNodeId === node.id;
                  const other = nodeMap.get(outgoing ? edge.targetNodeId : edge.sourceNodeId);
                  return <li key={edge.id}><span className={styles.relationDirection}>{outgoing ? "Sortant" : "Entrant"}</span><strong>{contextualRelationLabel(edge.relationType, outgoing)}</strong><span>{other?.title ?? "Élément supprimé"}</span><button type="button" onClick={() => void actions.removeEdge(edge.id)} aria-label={`Supprimer la relation avec ${other?.title ?? "cet élément"}`}><Icon name="trash-2" size={14} /></button></li>;
                })}</ul>
              )}
              <div className={styles.relationBuilder}>
                <select aria-label="Nature de la nouvelle relation" value={relationType} onChange={(event) => setRelationType(event.target.value as Roadmap2RelationType)}>{ROADMAP2_RELATION_TYPES.map((value) => <option key={value} value={value}>{ROADMAP2_RELATION_LABELS[value]}</option>)}</select>
                <select aria-label="Cible de la nouvelle relation" value={relationTarget} onChange={(event) => setRelationTarget(event.target.value)}><option value="">Choisir une cible…</option>{nodes.filter((candidate) => candidate.id !== node.id && candidate.status !== "archived").map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.title}</option>)}</select>
                <button type="button" className={styles.secondaryButton} disabled={!relationTarget || pending} onClick={addRelation}><Icon name="arrow-right" size={14} /> Créer</button>
              </div>
            </section>
          )}

          {node && (
            <section className={`${styles.editorialSection} ${styles.followupSection}`} data-private-export>
              <div className={styles.sectionKicker}>Suivi</div>
              <div className={styles.updateComposer}>
                <select aria-label="Type de mise à jour" value={updateType} onChange={(event) => setUpdateType(event.target.value as Roadmap2UpdateType)}>{ROADMAP2_UPDATE_TYPES.map((value) => <option key={value} value={value}>{ROADMAP2_UPDATE_LABELS[value]}</option>)}</select>
                <textarea rows={2} maxLength={2000} value={updateBody} onChange={(event) => setUpdateBody(event.target.value)} placeholder="Ce qui a changé, bloque ou vient d’être décidé…" />
                <button type="button" className={styles.primaryButton} disabled={!updateBody.trim() || pending} onClick={addUpdate}>Publier la mise à jour</button>
              </div>
              <div className={styles.updateTimeline}>
                {node.updates.length === 0 ? <p className={styles.inlineEmpty}>Aucune mise à jour pour le moment.</p> : node.updates.map((update) => <article key={update.id} className={styles[`update_${update.updateType}`]}><div><span>{ROADMAP2_UPDATE_LABELS[update.updateType]}</span><time>{new Date(update.createdAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}</time></div><p>{update.body}</p><small>{update.author?.name ?? "Vous"}</small></article>)}
              </div>
            </section>
          )}

          {error && <div className={styles.formError} role="alert"><Icon name="alert-circle" size={16} /> {error}</div>}
          <div className={styles.stickySave}>
            <button className={styles.primaryButton} type="submit" disabled={pending || remoteVersionChanged}>{pending ? "Enregistrement…" : node ? "Enregistrer" : "Créer le nœud"}</button>
            <button className={styles.secondaryButton} type="button" onClick={onClose}>Annuler</button>
          </div>
        </form>

        {node && (
          <footer className={styles.detailActions}>
            <button onClick={() => void actions.duplicateNode(node)}><Icon name="copy" size={15} /> Dupliquer</button>
            <button onClick={() => onCreateChild(node.id)}><Icon name="plus" size={15} /> Créer un sous-nœud</button>
            <button onClick={() => void actions.archiveNode(node)}><Icon name="download" size={15} /> Archiver</button>
            <button className={styles.dangerAction} onClick={() => { if (window.confirm(`Supprimer définitivement « ${node.title} » et ses mises à jour ? Cette action est irréversible.`)) void actions.removeNode(node); }}><Icon name="trash-2" size={15} /> Supprimer définitivement</button>
          </footer>
        )}
      </aside>
    </div>
  );
}

function DriveField({ label, value, onChange, placeholder, onCopy, emptyText, actionText }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; onCopy: (value: string, label: string) => void; emptyText: string; actionText: string }) {
  return (
    <div className={styles.driveField}>
      <label className={styles.field}><span>{label}</span><input type="url" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>
      {value ? <div className={styles.driveFieldActions}><a href={value} target="_blank" rel="noopener noreferrer"><Icon name="external" size={14} /> Ouvrir</a><button type="button" onClick={() => void onCopy(value, label)}><Icon name="copy" size={14} /> Copier</button></div> : <div className={styles.driveMissing}><span>{emptyText}</span><button type="button" onClick={(event) => event.currentTarget.closest(`.${styles.driveField}`)?.querySelector("input")?.focus()}>{actionText}</button></div>}
    </div>
  );
}
