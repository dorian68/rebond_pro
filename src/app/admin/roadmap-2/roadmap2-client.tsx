"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import {
  ROADMAP2_CATEGORIES,
  ROADMAP2_CATEGORY_LABELS,
  ROADMAP2_PRIORITIES,
  ROADMAP2_PRIORITY_LABELS,
  ROADMAP2_STATUSES,
  ROADMAP2_STATUS_LABELS,
  type Roadmap2Data,
  type Roadmap2EdgeDto,
  type Roadmap2NodeDto,
  type Roadmap2RelationType,
} from "@/lib/roadmap2";
import type { Roadmap2NodeInput } from "@/server/roadmap2";
import {
  archiveRoadmap2Node,
  createRoadmap2Edge,
  createRoadmap2Node,
  createRoadmap2Workspace,
  deleteRoadmap2Edge,
  deleteRoadmap2Node,
  duplicateRoadmap2Node,
  initializeRoadmap2,
  moveRoadmap2Node,
  renameRoadmap2Workspace,
  setRoadmap2RootDriveUrl,
  updateRoadmap2Node,
  type Roadmap2ActionResult,
} from "@/server/roadmap2-actions";
import { EMPTY_FILTERS, filterRoadmap2Nodes, nodeToInput, type Roadmap2Filters, type Roadmap2View } from "./roadmap2-ui";
import { Roadmap2Graph } from "./roadmap2-graph";
import { Roadmap2Timeline } from "./roadmap2-timeline";
import { Roadmap2List } from "./roadmap2-list";
import { Roadmap2Detail } from "./roadmap2-detail";
import styles from "./roadmap2.module.css";

type EditorState = { mode: "edit"; nodeId: string } | { mode: "create"; parentId?: string; type?: Roadmap2NodeDto["type"] } | null;

export type Roadmap2UiActions = {
  saveNode: (node: Roadmap2NodeDto | null, input: Roadmap2NodeInput) => Promise<Roadmap2ActionResult>;
  quickUpdate: (node: Roadmap2NodeDto, patch: Partial<Roadmap2NodeInput>) => Promise<Roadmap2ActionResult>;
  moveNode: (node: Roadmap2NodeDto, positionX: number, positionY: number) => Promise<Roadmap2ActionResult>;
  archiveNode: (node: Roadmap2NodeDto) => Promise<Roadmap2ActionResult>;
  removeNode: (node: Roadmap2NodeDto) => Promise<Roadmap2ActionResult>;
  duplicateNode: (node: Roadmap2NodeDto) => Promise<Roadmap2ActionResult>;
  createEdge: (sourceNodeId: string, targetNodeId: string, relationType: Roadmap2RelationType) => Promise<Roadmap2ActionResult>;
  removeEdge: (edgeId: string) => Promise<Roadmap2ActionResult>;
};

function relativeTime(iso: string | null) {
  if (!iso) return "Aucune activité";
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "À l’instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

export function Roadmap2Client({ initialData }: { initialData: Roadmap2Data }) {
  const router = useRouter();
  const [nodes, setNodes] = useState(initialData.nodes);
  const [edges, setEdges] = useState(initialData.edges);
  const [workspace, setWorkspace] = useState(initialData.workspace);
  const [workspaceOptions, setWorkspaceOptions] = useState(initialData.workspaces);
  const [view, setView] = useState<Roadmap2View>("graph");
  const [filters, setFilters] = useState<Roadmap2Filters>(EMPTY_FILTERS);
  const [editor, setEditor] = useState<EditorState>(null);
  const [driveConfigOpen, setDriveConfigOpen] = useState(false);
  const [workspaceModal, setWorkspaceModal] = useState<"create" | "rename" | null>(null);
  const [workspaceNameInput, setWorkspaceNameInput] = useState("");
  const [driveInput, setDriveInput] = useState(initialData.workspace.rootDriveUrl ?? "");
  const [toast, setToast] = useState<{ tone: "success" | "error" | "info"; message: string } | null>(null);
  const [busy, startTransition] = useTransition();
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const graphToolbarRef = useRef<HTMLDivElement>(null);
  const modalPanelRef = useRef<HTMLElement>(null);
  const modalReturnFocusRef = useRef<HTMLElement | null>(null);
  const closeEditor = useCallback(() => setEditor(null), []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setNodes(initialData.nodes);
      setEdges(initialData.edges);
      setWorkspace(initialData.workspace);
      setWorkspaceOptions(initialData.workspaces);
      setDriveInput(initialData.workspace.rootDriveUrl ?? "");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialData]);

  useEffect(() => {
    const timer = window.setInterval(() => router.refresh(), 15000);
    return () => window.clearInterval(timer);
  }, [router]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!driveConfigOpen && !workspaceModal) return;
    const handleKeys = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setDriveConfigOpen(false);
        setWorkspaceModal(null);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = [...(modalPanelRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])') ?? [])]
        .filter((element) => element.getClientRects().length > 0);
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handleKeys);
    return () => {
      document.removeEventListener("keydown", handleKeys);
      if (modalReturnFocusRef.current?.isConnected) modalReturnFocusRef.current.focus();
      modalReturnFocusRef.current = null;
    };
  }, [driveConfigOpen, workspaceModal]);

  const filteredNodes = useMemo(() => filterRoadmap2Nodes(nodes, filters), [nodes, filters]);
  const selectedNode = editor?.mode === "edit" ? nodes.find((node) => node.id === editor.nodeId) ?? null : null;

  const showResult = useCallback((result: Roadmap2ActionResult, success: string) => {
    setToast({ tone: result.ok ? "success" : "error", message: result.ok ? success : result.error ?? "Action impossible." });
    if (result.code === "CONFLICT") router.refresh();
    return result;
  }, [router]);

  const saveNode = useCallback(async (node: Roadmap2NodeDto | null, input: Roadmap2NodeInput) => {
    const result = node ? await updateRoadmap2Node(workspace.key, node.id, node.version, input) : await createRoadmap2Node(workspace.key, input);
    if (result.ok) {
      const now = new Date().toISOString();
      const owner = initialData.owners.find((candidate) => candidate.id === input.ownerUserId) ?? null;
      if (node) {
        setNodes((current) => current.map((candidate) => candidate.id === node.id ? {
          ...candidate,
          ...input,
          version: result.version ?? candidate.version + 1,
          updatedAt: now,
          owner,
          archivedAt: input.status === "archived" ? now : null,
        } : candidate));
      } else if (result.id) {
        setNodes((current) => [...current, {
          id: result.id!,
          ...input,
          owner,
          version: result.version ?? 1,
          archivedAt: input.status === "archived" ? now : null,
          createdAt: now,
          updatedAt: now,
          updatedBy: owner,
          updates: [],
        }]);
        if (input.parentId) {
          setEdges((current) => [...current, { id: `pending-${result.id}`, sourceNodeId: input.parentId!, targetNodeId: result.id!, relationType: "parent_child", createdAt: now }]);
        }
      }
      setEditor(null);
      router.refresh();
    }
    return showResult(result, node ? "Nœud enregistré." : "Nœud créé.");
  }, [initialData.owners, router, showResult, workspace.key]);

  const quickUpdate = useCallback(async (node: Roadmap2NodeDto, patch: Partial<Roadmap2NodeInput>) => {
    const input = { ...nodeToInput(node), ...patch };
    const result = await updateRoadmap2Node(workspace.key, node.id, node.version, input);
    if (result.ok) {
      const owner = initialData.owners.find((candidate) => candidate.id === input.ownerUserId) ?? null;
      setNodes((current) => current.map((candidate) => candidate.id === node.id ? { ...candidate, ...input, owner, version: result.version ?? candidate.version + 1, updatedAt: new Date().toISOString() } : candidate));
      router.refresh();
    }
    return showResult(result, "Mise à jour enregistrée.");
  }, [initialData.owners, router, showResult, workspace.key]);

  const moveNode = useCallback(async (node: Roadmap2NodeDto, positionX: number, positionY: number) => {
    const result = await moveRoadmap2Node(workspace.key, node.id, node.version, positionX, positionY);
    if (result.ok) {
      setNodes((current) => current.map((candidate) => candidate.id === node.id ? { ...candidate, positionX, positionY, version: result.version ?? candidate.version + 1, updatedAt: new Date().toISOString() } : candidate));
    }
    return showResult(result, "Position enregistrée.");
  }, [showResult, workspace.key]);

  const archiveNode = useCallback(async (node: Roadmap2NodeDto) => {
    const result = await archiveRoadmap2Node(workspace.key, node.id, node.version);
    if (result.ok) {
      const now = new Date().toISOString();
      setNodes((current) => current.map((candidate) => candidate.id === node.id ? { ...candidate, status: "archived", archivedAt: now, version: candidate.version + 1, updatedAt: now } : candidate));
      setEditor(null);
    }
    return showResult(result, "Élément archivé.");
  }, [showResult, workspace.key]);

  const removeNode = useCallback(async (node: Roadmap2NodeDto) => {
    const result = await deleteRoadmap2Node(workspace.key, node.id);
    if (result.ok) {
      setNodes((current) => current.filter((candidate) => candidate.id !== node.id));
      setEdges((current) => current.filter((edge) => edge.sourceNodeId !== node.id && edge.targetNodeId !== node.id));
      setEditor(null);
    }
    return showResult(result, "Élément supprimé définitivement.");
  }, [showResult, workspace.key]);

  const duplicateNode = useCallback(async (node: Roadmap2NodeDto) => {
    const result = await duplicateRoadmap2Node(workspace.key, node.id);
    if (result.ok) router.refresh();
    return showResult(result, "Copie créée.");
  }, [router, showResult, workspace.key]);

  const createEdge = useCallback(async (sourceNodeId: string, targetNodeId: string, relationType: Roadmap2RelationType) => {
    const result = await createRoadmap2Edge(workspace.key, { sourceNodeId, targetNodeId, relationType });
    if (result.ok && result.id) {
      setEdges((current) => [...current, { id: result.id!, sourceNodeId, targetNodeId, relationType, createdAt: new Date().toISOString() }]);
      router.refresh();
    }
    return showResult(result, "Relation créée.");
  }, [router, showResult, workspace.key]);

  const removeEdge = useCallback(async (edgeId: string) => {
    const result = await deleteRoadmap2Edge(workspace.key, edgeId);
    if (result.ok) {
      setEdges((current) => current.filter((edge) => edge.id !== edgeId));
      router.refresh();
    }
    return showResult(result, "Relation supprimée.");
  }, [router, showResult, workspace.key]);

  const actions: Roadmap2UiActions = useMemo(() => ({ saveNode, quickUpdate, moveNode, archiveNode, removeNode, duplicateNode, createEdge, removeEdge }), [saveNode, quickUpdate, moveNode, archiveNode, removeNode, duplicateNode, createEdge, removeEdge]);

  function runSeed() {
    if (!window.confirm("Créer ici une copie modifiable du modèle Le Bon Rebond (65 nœuds et 110 relations) ? Les dates, statuts, priorités et dépendances sont des propositions. Les éléments seront attribués provisoirement à l’administrateur qui lance l’initialisation.")) return;
    startTransition(async () => {
      const result = await initializeRoadmap2(workspace.key);
      showResult(result, `Roadmap initialisée : ${result.meta?.nodes ?? 0} nœuds, ${result.meta?.edges ?? 0} relations.`);
      if (result.ok) router.refresh();
    });
  }

  function saveRootDrive() {
    startTransition(async () => {
      const result = await setRoadmap2RootDriveUrl(workspace.key, driveInput);
      if (result.ok) {
        setWorkspace((current) => ({ ...current, rootDriveUrl: driveInput || null, updatedAt: new Date().toISOString() }));
        setDriveConfigOpen(false);
      }
      showResult(result, "Dossier Drive racine enregistré.");
    });
  }

  function openWorkspaceModal(mode: "create" | "rename") {
    modalReturnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setWorkspaceNameInput(mode === "rename" ? workspace.name : "");
    setWorkspaceModal(mode);
  }

  function openDriveConfig() {
    modalReturnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setDriveConfigOpen(true);
  }

  function saveWorkspace() {
    startTransition(async () => {
      const result = workspaceModal === "rename"
        ? await renameRoadmap2Workspace(workspace.key, workspaceNameInput)
        : await createRoadmap2Workspace(workspaceNameInput);
      if (!result.ok) {
        showResult(result, "");
        return;
      }
      if (workspaceModal === "rename" && result.name) {
        setWorkspace((current) => ({ ...current, name: result.name! }));
        setWorkspaceOptions((current) => current.map((item) => item.key === workspace.key ? { ...item, name: result.name! } : item));
        setWorkspaceModal(null);
        showResult(result, "Roadmap renommée.");
        router.refresh();
        return;
      }
      if (result.key) {
        setWorkspaceModal(null);
        showResult(result, "Roadmap vide créée.");
        router.push(`/admin/roadmap-2?roadmap=${encodeURIComponent(result.key)}`);
      }
    });
  }

  function focusSearch() {
    graphToolbarRef.current?.querySelector<HTMLInputElement>("input[type=search]")?.focus();
  }

  const searchMatches = filters.search.trim() ? filteredNodes.slice(0, 5) : [];

  return (
    <section className={`${styles.workspace} ${editor ? styles.detailOpen : ""}`} aria-label="Roadmap 2">
      <header className={styles.hero}>
        <div className={styles.heroTopline}>
          <div className={styles.eyebrow}>Roadmap 2 · Studio de pilotage privé · Dorian & Mathurin</div>
          <div className={styles.workspaceChooser} data-private-export>
            <label>
              <span>Roadmap active</span>
              <select aria-label="Choisir une roadmap" value={workspace.key} onChange={(event) => router.push(`/admin/roadmap-2?roadmap=${encodeURIComponent(event.target.value)}`)}>
                {workspaceOptions.map((item) => <option key={item.key} value={item.key}>{item.name} · {item.nodeCount} nœud{item.nodeCount === 1 ? "" : "s"}</option>)}
              </select>
            </label>
            <button className={styles.secondaryButton} onClick={() => openWorkspaceModal("create")}><Icon name="plus" size={15} /> Nouvelle roadmap</button>
            <button className={styles.iconButtonText} onClick={() => openWorkspaceModal("rename")} aria-label="Renommer la roadmap active"><Icon name="edit-3" size={15} /> Renommer</button>
          </div>
        </div>
        <div className={styles.heroRow}>
          <div>
            <h1>{workspace.name}</h1>
            <p>Du cap stratégique aux preuves Drive, sans perdre le fil des décisions.</p>
          </div>
          <div className={styles.heroActions}>
            <button className={styles.primaryButton} onClick={() => setEditor({ mode: "create" })}><Icon name="plus" size={16} /> Nouveau nœud</button>
            <button className={styles.secondaryButton} onClick={() => setEditor({ mode: "create", type: "decision" })}><Icon name="alert-circle" size={16} /> Nouvelle décision</button>
            <button className={styles.iconButtonText} onClick={() => view === "graph" ? window.dispatchEvent(new CustomEvent("roadmap2-fit-view")) : setView("graph")} title="Ajuster la vue"><Icon name="target" size={16} /> Ajuster la vue</button>
            <button className={styles.iconButtonText} onClick={focusSearch}><Icon name="search" size={16} /> Rechercher</button>
            <button className={`${styles.iconButtonText} ${styles.exportButton}`} onClick={() => window.print()}><Icon name="download" size={16} /> Exporter</button>
            {workspace.rootDriveUrl ? (
              <>
                <a className={styles.driveButton} href={workspace.rootDriveUrl} target="_blank" rel="noopener noreferrer"><Icon name="external" size={16} /> Dossier Drive racine</a>
                <button className={styles.iconButtonText} onClick={openDriveConfig}><Icon name="edit-3" size={16} /> Modifier Drive</button>
              </>
            ) : (
              <button className={styles.driveButton} onClick={openDriveConfig}><Icon name="plus" size={16} /> Configurer Drive</button>
            )}
          </div>
        </div>

        <div className={styles.pilotStrip} aria-label="Synthèse de pilotage">
          <span><strong>{initialData.stats.activeInitiatives}</strong> initiatives actives</span>
          <span className={initialData.stats.blocked ? styles.statDanger : ""}><strong>{initialData.stats.blocked}</strong> bloquées</span>
          <span><strong>{initialData.stats.dueSoon}</strong> échéances à 7 jours</span>
          <span><strong>{initialData.stats.globalProgress}%</strong> progression globale</span>
          <span><strong>{initialData.stats.pendingDecisions}</strong> décisions en attente</span>
          <span className={styles.lastUpdate}><span className={styles.liveDot} /> {relativeTime(initialData.stats.lastUpdatedAt)}{initialData.stats.lastUpdatedBy ? ` · ${initialData.stats.lastUpdatedBy}` : ""}</span>
        </div>
      </header>

      <div className={styles.controlDeck} ref={graphToolbarRef}>
        <div className={styles.viewTabs} role="tablist" aria-label="Vue Roadmap 2">
          {([['graph', 'Graphe'], ['timeline', 'Timeline'], ['list', 'Liste']] as const).map(([value, label]) => (
            <button key={value} role="tab" aria-selected={view === value} className={view === value ? styles.activeTab : ""} onClick={() => setView(value)}>{label}</button>
          ))}
        </div>
        <div className={styles.searchWrap}>
          <Icon name="search" size={16} />
          <input type="search" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} onKeyDown={(event) => {
            if (event.key === "Enter" && searchMatches[0]) {
              setView("graph");
              setFocusNodeId(searchMatches[0].id);
              setEditor({ mode: "edit", nodeId: searchMatches[0].id });
            }
          }} placeholder="Rechercher un résultat…" aria-label="Rechercher un nœud" />
          {searchMatches.length > 0 && (
            <div className={styles.searchResults}>
              {searchMatches.map((node) => <button key={node.id} onClick={() => { setView("graph"); setFocusNodeId(node.id); setEditor({ mode: "edit", nodeId: node.id }); }}>{node.title}</button>)}
            </div>
          )}
        </div>
        <div className={styles.filters}>
          <select aria-label="Filtrer par catégorie" value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value as Roadmap2Filters["category"] }))}>
            <option value="all">Toutes les catégories</option>
            {ROADMAP2_CATEGORIES.map((value) => <option key={value} value={value}>{ROADMAP2_CATEGORY_LABELS[value]}</option>)}
          </select>
          <select aria-label="Filtrer par statut" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as Roadmap2Filters["status"] }))}>
            <option value="all">Tous les statuts</option>
            {ROADMAP2_STATUSES.map((value) => <option key={value} value={value}>{ROADMAP2_STATUS_LABELS[value]}</option>)}
          </select>
          <select aria-label="Filtrer par responsable" value={filters.ownerUserId} onChange={(event) => setFilters((current) => ({ ...current, ownerUserId: event.target.value }))}>
            <option value="all">Tous les responsables</option>
            {initialData.owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}</option>)}
          </select>
          <select aria-label="Filtrer par priorité" value={filters.priority} onChange={(event) => setFilters((current) => ({ ...current, priority: event.target.value as Roadmap2Filters["priority"] }))}>
            <option value="all">Toutes les priorités</option>
            {ROADMAP2_PRIORITIES.map((value) => <option key={value} value={value}>{value} · {ROADMAP2_PRIORITY_LABELS[value]}</option>)}
          </select>
          <label className={styles.archiveToggle}><input type="checkbox" checked={filters.showArchived} onChange={(event) => setFilters((current) => ({ ...current, showArchived: event.target.checked }))} /> Archives</label>
          {JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS) && <button className={styles.resetButton} onClick={() => setFilters(EMPTY_FILTERS)}>Réinitialiser</button>}
        </div>
      </div>

      {nodes.length === 0 ? (
        <Roadmap2Empty workspaceName={workspace.name} isDefault={workspace.key === "le-bon-rebond"} onSeed={runSeed} onCreate={() => setEditor({ mode: "create" })} onDrive={openDriveConfig} busy={busy} />
      ) : filteredNodes.length === 0 ? (
        <div className={styles.emptyFiltered}><Icon name="search" size={24} /><strong>Aucun résultat avec ces filtres</strong><button onClick={() => setFilters(EMPTY_FILTERS)}>Afficher toute la roadmap</button></div>
      ) : (
        <div className={styles.viewStage}>
          {view === "graph" && <Roadmap2Graph nodes={nodes} visibleNodes={filteredNodes} edges={edges} actions={actions} onOpen={(nodeId) => setEditor({ mode: "edit", nodeId })} focusNodeId={focusNodeId} onFocusConsumed={() => setFocusNodeId(null)} />}
          {view === "timeline" && <Roadmap2Timeline nodes={filteredNodes} edges={edges} owners={initialData.owners} actions={actions} onOpen={(nodeId) => setEditor({ mode: "edit", nodeId })} />}
          {view === "list" && <Roadmap2List nodes={filteredNodes} edges={edges} owners={initialData.owners} actions={actions} onOpen={(nodeId) => setEditor({ mode: "edit", nodeId })} />}
        </div>
      )}

      {editor && (
        <Roadmap2Detail
          key={editor.mode === "edit" ? `edit-${editor.nodeId}` : `create-${editor.parentId ?? "root"}-${editor.type ?? "initiative"}`}
          node={selectedNode}
          workspaceKey={workspace.key}
          createDefaults={editor.mode === "create" ? { parentId: editor.parentId, type: editor.type } : undefined}
          nodes={nodes}
          edges={edges}
          owners={initialData.owners}
          actions={actions}
          onClose={closeEditor}
          onCreateChild={(parentId) => setEditor({ mode: "create", parentId, type: "action" })}
          onLocalNode={(node) => setNodes((current) => current.map((candidate) => candidate.id === node.id ? node : candidate))}
          onLocalEdge={(edge: Roadmap2EdgeDto) => setEdges((current) => [...current, edge])}
          onLocalEdgeRemoved={(edgeId) => setEdges((current) => current.filter((edge) => edge.id !== edgeId))}
          announce={(tone, message) => setToast({ tone, message })}
        />
      )}

      {driveConfigOpen && (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDriveConfigOpen(false); }}>
          <section ref={modalPanelRef} className={styles.driveModal} role="dialog" aria-modal="true" aria-labelledby="drive-config-title">
            <button className={styles.closeButton} onClick={() => setDriveConfigOpen(false)} aria-label="Fermer"><Icon name="x" size={18} /></button>
            <div className={styles.eyebrow}>Configuration privée</div>
            <h2 id="drive-config-title">Dossier Drive racine</h2>
            <p>Enregistrez uniquement l’URL du dossier « LE BON REBOND ». Aucun contenu n’est importé.</p>
            <label className={styles.field}><span>URL HTTPS Google Drive</span><input autoFocus value={driveInput} onChange={(event) => setDriveInput(event.target.value)} placeholder="https://drive.google.com/drive/folders/…" /></label>
            <div className={styles.modalActions}><button className={styles.primaryButton} disabled={busy} onClick={saveRootDrive}>Enregistrer</button><button className={styles.secondaryButton} onClick={() => setDriveConfigOpen(false)}>Annuler</button></div>
          </section>
        </div>
      )}

      {workspaceModal && (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setWorkspaceModal(null); }}>
          <section ref={modalPanelRef} className={styles.driveModal} role="dialog" aria-modal="true" aria-labelledby="workspace-config-title">
            <button className={styles.closeButton} onClick={() => setWorkspaceModal(null)} aria-label="Fermer"><Icon name="x" size={18} /></button>
            <div className={styles.eyebrow}>{workspaceModal === "create" ? "Nouvel espace privé" : "Roadmap active"}</div>
            <h2 id="workspace-config-title">{workspaceModal === "create" ? "Créer une roadmap vide" : "Renommer la roadmap"}</h2>
            <p>{workspaceModal === "create" ? "Elle sera indépendante des autres roadmaps. Vous pourrez partir de zéro ou initialiser ensuite le modèle Le Bon Rebond." : "Le contenu, les liens et l’historique restent inchangés."}</p>
            <label className={styles.field}><span>Nom de la roadmap</span><input autoFocus minLength={2} maxLength={100} value={workspaceNameInput} onChange={(event) => setWorkspaceNameInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") saveWorkspace(); }} placeholder="Ex. Lancement Martinique 2027" /></label>
            <div className={styles.modalActions}><button className={styles.primaryButton} disabled={busy || workspaceNameInput.trim().length < 2} onClick={saveWorkspace}>{busy ? "Enregistrement…" : workspaceModal === "create" ? "Créer la roadmap" : "Enregistrer"}</button><button className={styles.secondaryButton} onClick={() => setWorkspaceModal(null)}>Annuler</button></div>
          </section>
        </div>
      )}

      <div className={`${styles.toast} ${toast ? styles.toastVisible : ""} ${toast ? styles[`toast_${toast.tone}`] : ""}`} role="status" aria-live="polite">{toast?.message}</div>
    </section>
  );
}

function Roadmap2Empty({ workspaceName, isDefault, onSeed, onCreate, onDrive, busy }: { workspaceName: string; isDefault: boolean; onSeed: () => void; onCreate: () => void; onDrive: () => void; busy: boolean }) {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyCompass}><Icon name="target" size={34} /></div>
      <div>
        <div className={styles.eyebrow}>Premier cap</div>
        <h2>{isDefault ? "Construisons la roadmap du Bon Rebond" : `Construisons « ${workspaceName} »`}</h2>
        <p>Visualisez les prochaines étapes, reliez chaque chantier à son dossier Drive et gardez vos décisions au même endroit.</p>
        <p className={styles.seedDisclosure}><strong>D’où vient le modèle proposé ?</strong> Des branches et actions fournies dans le cahier des charges Roadmap 2. L’initialisation crée ici une copie modifiable de 65 nœuds et 110 relations ; les dates, positions, statuts, priorités et dépendances sont des propositions de départ.</p>
        <div className={styles.emptyActions}>
          <button className={styles.primaryButton} disabled={busy} onClick={onSeed}>{busy ? "Initialisation…" : "Initialiser la roadmap Le Bon Rebond"}</button>
          <button className={styles.secondaryButton} onClick={onCreate}>Créer un premier nœud</button>
          <button className={styles.secondaryButton} onClick={onDrive}>Configurer le dossier Drive racine</button>
        </div>
      </div>
      <div className={styles.emptyPrinciples}>
        <span><strong>1.</strong> Un résultat clair</span>
        <span><strong>2.</strong> Une personne responsable</span>
        <span><strong>3.</strong> Une preuve dans Drive</span>
      </div>
    </div>
  );
}
