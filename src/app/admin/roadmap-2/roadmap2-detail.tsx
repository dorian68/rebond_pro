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
import { listRoadmap2NodeDriveFiles, type Roadmap2DriveActionResult } from "@/server/roadmap2-drive-actions";
import type { Roadmap2DriveFile, Roadmap2DriveStatus } from "@/server/roadmap2-drive";
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

export function Roadmap2Detail({ workspaceKey, node, createDefaults, nodes, edges, owners, actions, onClose, onCreateChild, onLocalNode, announce, driveStatus, driveStatusLoading, driveStatusError, hasRootDrive, onManageDrive, onRefreshDrive }: {
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
  driveStatus: Roadmap2DriveStatus | null;
  driveStatusLoading: boolean;
  driveStatusError: string | null;
  hasRootDrive: boolean;
  onManageDrive: () => void;
  onRefreshDrive: () => void;
}) {
  const router = useRouter();
  const titleRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<Roadmap2NodeInput>(() => node ? nodeToInput(node) : emptyInput(createDefaults));
  const [baseVersion, setBaseVersion] = useState<number | null>(() => node?.version ?? null);
  const [error, setError] = useState<string | null>(null);
  const [relationTarget, setRelationTarget] = useState("");
  const [relationType, setRelationType] = useState<Roadmap2RelationType>("dependency");
  const [updateType, setUpdateType] = useState<Roadmap2UpdateType>("note");
  const [updateBody, setUpdateBody] = useState("");
  const [nodeFiles, setNodeFiles] = useState<Roadmap2DriveFile[] | null>(null);
  const [nodeDriveError, setNodeDriveError] = useState<string | null>(null);
  const [nodeDriveBusy, setNodeDriveBusy] = useState<"list" | "upload" | null>(null);
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
  const visibleNodeFiles = useMemo(() => nodeFiles?.filter((file) => file.name !== "00 - SUIVI & DÉCISIONS" && file.url !== form.trackingDocUrl) ?? [], [form.trackingDocUrl, nodeFiles]);

  async function loadNodeFiles() {
    if (!node?.driveFolderUrl || !driveStatus?.connected) return;
    setNodeDriveBusy("list");
    setNodeDriveError(null);
    const result = await listRoadmap2NodeDriveFiles(workspaceKey, node.id);
    if (result.ok) setNodeFiles(result.data.files);
    else {
      setNodeFiles(null);
      setNodeDriveError(result.error);
    }
    setNodeDriveBusy(null);
  }

  useEffect(() => {
    if (!node?.driveFolderUrl || !driveStatus?.connected) return;
    let active = true;
    const timer = window.setTimeout(() => {
      setNodeDriveBusy("list");
      setNodeDriveError(null);
      void listRoadmap2NodeDriveFiles(workspaceKey, node.id).then((result) => {
        if (!active) return;
        if (result.ok) setNodeFiles(result.data.files);
        else {
          setNodeFiles(null);
          setNodeDriveError(result.error);
        }
      }).finally(() => { if (active) setNodeDriveBusy(null); });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [driveStatus?.connected, node?.driveFolderUrl, node?.id, workspaceKey]);

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

  function createDriveResources() {
    if (!node || remoteVersionChanged) return;
    if (!window.confirm(`Créer ou retrouver dans Google Drive le dossier « ${node.title} » et son document « 00 - SUIVI & DÉCISIONS » ?`)) return;
    startTransition(async () => {
      const versionedNode = { ...node, version: baseVersion ?? node.version };
      const result = await actions.createDriveResources(versionedNode);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const now = new Date().toISOString();
      const updatedNode = { ...node, driveFolderUrl: result.data.driveFolderUrl, trackingDocUrl: result.data.trackingDocUrl, version: result.data.version, updatedAt: now };
      setForm((current) => ({ ...current, driveFolderUrl: result.data.driveFolderUrl, trackingDocUrl: result.data.trackingDocUrl }));
      setBaseVersion(result.data.version);
      setError(null);
      onLocalNode(updatedNode);
      setNodeFiles([]);
    });
  }

  async function uploadFiles(files: FileList | null) {
    if (!node || !files?.length) return;
    setNodeDriveBusy("upload");
    setNodeDriveError(null);
    let uploaded = 0;
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("workspaceKey", workspaceKey);
      formData.set("nodeId", node.id);
      let result: Roadmap2DriveActionResult<{ file: Roadmap2DriveFile }>;
      try {
        const response = await fetch("/api/admin/roadmap-2/drive/upload", { method: "POST", body: formData });
        result = await response.json() as Roadmap2DriveActionResult<{ file: Roadmap2DriveFile }>;
      } catch {
        result = { ok: false, code: "UNAVAILABLE", error: "L’ajout à Google Drive a échoué. Réessayez." };
      }
      if (!result.ok) {
        setNodeDriveError(result.error);
        break;
      }
      uploaded += 1;
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
    setNodeDriveBusy(null);
    if (uploaded) {
      announce("success", `${uploaded} fichier${uploaded === 1 ? "" : "s"} ajouté${uploaded === 1 ? "" : "s"} au dossier Drive du nœud.`);
      await loadNodeFiles();
    }
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
            <div className={styles.sectionKicker}>Documents Google Drive · privé</div>
            {!node ? (
              <p className={styles.inlineEmpty}>Créez d’abord le nœud. Vous pourrez ensuite préparer son dossier Drive et y ajouter des fichiers.</p>
            ) : driveStatusLoading ? (
              <div className={styles.nodeDriveState} role="status">
                <span className={`${styles.driveStatusDot} ${styles.driveStatusChecking}`} aria-hidden="true" />
                <div><strong>Vérification de Google Drive…</strong><small>Nous vérifions la connexion avant d’afficher les documents de ce résultat.</small></div>
              </div>
            ) : driveStatusError || driveStatus?.enabled === false ? (
              <div className={`${styles.nodeDriveState} ${styles.nodeDriveStateWarning}`} role="alert">
                <span className={styles.driveStatusDot} aria-hidden="true" />
                <div><strong>Google Drive est momentanément indisponible</strong><small>Votre dossier n’est pas déconnecté. Réessayez la vérification dans quelques instants.</small></div>
                <button type="button" className={styles.secondaryButton} onClick={onRefreshDrive}>Réessayer</button>
              </div>
            ) : !driveStatus?.connected ? (
              <div className={`${styles.nodeDriveState} ${styles.nodeDriveStateWarning}`}>
                <span className={styles.driveStatusDot} aria-hidden="true" />
                <div><strong>{hasRootDrive ? "Google Drive doit être reconnecté" : "Google Drive n’est pas connecté"}</strong><small>Connectez le compte Drive pour afficher et ajouter les fichiers de ce résultat.</small></div>
                <button type="button" className={styles.primaryButton} onClick={onManageDrive}>{hasRootDrive ? "Reconnecter Drive" : "Connecter Drive"}</button>
              </div>
            ) : !hasRootDrive ? (
              <div className={styles.nodeDriveState}>
                <span className={`${styles.driveStatusDot} ${styles.driveStatusConnected}`} aria-hidden="true" />
                <div><strong>Drive connecté · arborescence à préparer</strong><small>Créez ou choisissez le dossier racine avant d’associer ce nœud.</small></div>
                <button type="button" className={styles.primaryButton} onClick={onManageDrive}>Préparer Drive</button>
              </div>
            ) : !form.driveFolderUrl ? (
              <div className={styles.nodeDriveState}>
                <span className={`${styles.driveStatusDot} ${styles.driveStatusConnected}`} aria-hidden="true" />
                <div><strong>Drive connecté · dossier du nœud à créer</strong><small>Roadmap 2 créera un dossier dédié et le document « 00 - SUIVI & DÉCISIONS ».</small></div>
                <button type="button" className={styles.primaryButton} disabled={pending || remoteVersionChanged} onClick={createDriveResources}><Icon name="plus" size={15} /> Préparer l’espace Drive</button>
              </div>
            ) : (
              <div className={styles.nodeDriveWorkspace}>
                <div className={styles.nodeDriveHeading}>
                  <div><span className={`${styles.driveStatusDot} ${styles.driveStatusConnected}`} aria-hidden="true" /><span><strong>Dossier du nœud prêt</strong><small>Les fichiers ci-dessous restent stockés dans Google Drive.</small></span></div>
                  <div>
                    <label className={`${styles.primaryButton} ${nodeDriveBusy ? styles.uploadDisabled : ""}`}><Icon name="paperclip" size={15} /> {nodeDriveBusy === "upload" ? "Ajout en cours…" : "Ajouter des fichiers"}<input ref={fileInputRef} className={styles.visuallyHidden} type="file" multiple disabled={Boolean(nodeDriveBusy)} accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.jpg,.jpeg,.png,.webp" onChange={(event) => void uploadFiles(event.target.files)} /></label>
                    <a className={styles.secondaryButton} href={form.driveFolderUrl} target="_blank" rel="noopener noreferrer"><Icon name="external" size={15} /> Ouvrir dans Drive</a>
                  </div>
                </div>

                {form.trackingDocUrl && <a className={styles.trackingDocCard} href={form.trackingDocUrl} target="_blank" rel="noopener noreferrer"><span className={styles.driveFileIcon}><Icon name="file-text" size={17} /></span><span><strong>00 - SUIVI & DÉCISIONS</strong><small>Document de référence · toujours disponible en tête</small></span><Icon name="external" size={14} /></a>}

                <div className={styles.nodeFilesHeader}><span>Fichiers du nœud</span><button type="button" disabled={Boolean(nodeDriveBusy)} onClick={() => void loadNodeFiles()}><Icon name="refresh" size={14} /> Actualiser</button></div>
                {nodeDriveBusy === "list" && nodeFiles === null ? <p className={styles.driveExplorerEmpty} role="status">Chargement des fichiers Drive…</p> : visibleNodeFiles.length === 0 ? <p className={styles.nodeFilesEmpty}>Aucun autre fichier. Ajoutez ici vos devis, tableaux, présentations ou preuves de décision.</p> : (
                  <ul className={`${styles.driveFileList} ${styles.nodeDriveFileList}`}>
                    {visibleNodeFiles.map((file) => <li key={file.id}><span className={styles.driveFileIcon}><Icon name={file.isFolder ? "layers" : "file-text"} size={16} /></span><a href={file.url} target="_blank" rel="noopener noreferrer"><strong>{file.name}</strong><small>{file.isFolder ? "Dossier Drive" : file.modifiedAt ? `Modifié ${new Date(file.modifiedAt).toLocaleDateString("fr-FR")}` : "Fichier Drive"}</small></a><a href={file.url} target="_blank" rel="noopener noreferrer" aria-label={`Consulter ${file.name}`}><Icon name="eye" size={14} /></a></li>)}
                  </ul>
                )}
                {nodeDriveError && <div className={styles.formError} role="alert"><Icon name="alert-circle" size={16} /> <span>{nodeDriveError}</span><button type="button" onClick={onManageDrive}>Gérer la connexion</button></div>}
                <p className={styles.nodeDriveHint}>PDF, Office, CSV, TXT et images · 10 Mo maximum par fichier. Roadmap 2 ne conserve aucune copie.</p>
              </div>
            )}
            <details className={styles.driveManualConfig}><summary>Liens Drive et aide avancée</summary><p>Vous pouvez conserver un dossier existant en renseignant ses URL manuellement. Enregistrez ensuite le nœud.</p><DriveField label="Dossier Google Drive" value={form.driveFolderUrl ?? ""} onChange={(value) => field("driveFolderUrl", nullable(value))} placeholder="https://drive.google.com/drive/folders/…" onCopy={copy} emptyText="Aucun dossier Drive associé" actionText="Ajouter un lien" /><DriveField label="Document Suivi & décisions" value={form.trackingDocUrl ?? ""} onChange={(value) => field("trackingDocUrl", nullable(value))} placeholder="https://docs.google.com/document/d/…" onCopy={copy} emptyText="Aucun document Suivi & décisions" actionText="Renseigner le document" /><details className={styles.helpDetails}><summary>Structure et modèle recommandés</summary><div className={styles.helpColumns}><pre>{ROADMAP2_DRIVE_HELP}</pre><pre>{ROADMAP2_TRACKING_DOC_TEMPLATE}</pre></div></details></details>
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
