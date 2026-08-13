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
  isRoadmap2DrivePending,
  roadmap2DriveAccountLabel,
  roadmap2DriveNeedsReconnect,
  roadmap2DriveStatusLabel,
} from "@/lib/roadmap2-drive-status";
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
  restoreRoadmap2Node,
  setRoadmap2RootDriveUrl,
  updateRoadmap2Node,
  type Roadmap2ActionResult,
} from "@/server/roadmap2-actions";
import {
  connectRoadmap2Drive,
  createRoadmap2NodeDriveResources,
  getRoadmap2DriveStatus,
  listRoadmap2DriveFiles,
  previewRoadmap2NodeStructuralChange,
  provisionRoadmap2Drive,
  syncRoadmap2DrivePermissions,
  type Roadmap2DriveActionResult,
} from "@/server/roadmap2-drive-actions";
import { EMPTY_FILTERS, filterRoadmap2Nodes, nodeToInput, type Roadmap2Filters, type Roadmap2View } from "./roadmap2-ui";
import { clearRoadmap2OperationKey, getOrCreateRoadmap2OperationKey, roadmap2PermissionOperationScope } from "@/lib/roadmap2-operation-key-store";
import { Roadmap2Graph } from "./roadmap2-graph";
import { Roadmap2Timeline } from "./roadmap2-timeline";
import { Roadmap2List } from "./roadmap2-list";
import { Roadmap2Detail } from "./roadmap2-detail";
import styles from "./roadmap2.module.css";

type EditorState = { mode: "edit"; nodeId: string } | { mode: "create"; parentId?: string; type?: Roadmap2NodeDto["type"]; category?: Roadmap2NodeDto["category"] } | null;
type DriveStatus = Extract<Awaited<ReturnType<typeof getRoadmap2DriveStatus>>, { ok: true }>["data"];
type DriveListing = Extract<Awaited<ReturnType<typeof listRoadmap2DriveFiles>>, { ok: true }>["data"];
type DriveNodeResources = Extract<Awaited<ReturnType<typeof createRoadmap2NodeDriveResources>>, { ok: true }>["data"];
type ReviewPreset = "overview" | "weekly" | "decisions" | "dueSoon";

const VIEW_PREFERENCES_PREFIX = "rebondpro:roadmap2:view:v1";

function isDefaultRoadmap2Filters(filters: Roadmap2Filters) {
  return JSON.stringify(filters) === JSON.stringify(EMPTY_FILTERS);
}

function applyReviewPreset(nodes: Roadmap2NodeDto[], preset: ReviewPreset) {
  if (preset === "overview") return nodes;
  const today = new Date();
  const inSevenDays = new Date(today.getTime() + 7 * 86400000);
  return nodes.filter((node) => {
    if (node.status === "archived" || node.archivedAt) return false;
    if (preset === "decisions") return (node.type === "decision" || node.decisionRequired) && node.status !== "completed";
    if (preset === "dueSoon") return Boolean(node.dueDate && new Date(`${node.dueDate}T23:59:59`) >= today && new Date(`${node.dueDate}T23:59:59`) <= inSevenDays && node.status !== "completed");
    return node.status === "blocked" || node.status === "review" || node.priority === "P0" || node.decisionRequired
      || Boolean(node.dueDate && new Date(`${node.dueDate}T23:59:59`) <= inSevenDays && node.status !== "completed");
  });
}

export type Roadmap2UiActions = {
  saveNode: (node: Roadmap2NodeDto | null, input: Roadmap2NodeInput, structuralPreflightToken?: string) => Promise<Roadmap2ActionResult>;
  previewStructuralChange: (node: Roadmap2NodeDto, input: Roadmap2NodeInput, allowLinkedFolder?: boolean) => ReturnType<typeof previewRoadmap2NodeStructuralChange>;
  quickUpdate: (node: Roadmap2NodeDto, patch: Partial<Roadmap2NodeInput>) => Promise<Roadmap2ActionResult>;
  moveNode: (node: Roadmap2NodeDto, positionX: number, positionY: number) => Promise<Roadmap2ActionResult>;
  archiveNode: (node: Roadmap2NodeDto) => Promise<Roadmap2ActionResult>;
  restoreNode: (node: Roadmap2NodeDto) => Promise<Roadmap2ActionResult>;
  removeNode: (node: Roadmap2NodeDto) => Promise<Roadmap2ActionResult>;
  duplicateNode: (node: Roadmap2NodeDto) => Promise<Roadmap2ActionResult>;
  createEdge: (sourceNodeId: string, targetNodeId: string, relationType: Roadmap2RelationType) => Promise<Roadmap2ActionResult>;
  removeEdge: (edgeId: string) => Promise<Roadmap2ActionResult>;
  createDriveResources: (node: Roadmap2NodeDto) => Promise<Roadmap2DriveActionResult<DriveNodeResources>>;
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

export function Roadmap2Client({ initialData, openDriveOnLoad = false }: { initialData: Roadmap2Data; openDriveOnLoad?: boolean }) {
  const router = useRouter();
  const [nodes, setNodes] = useState(initialData.nodes);
  const [edges, setEdges] = useState(initialData.edges);
  const [workspace, setWorkspace] = useState(initialData.workspace);
  const [workspaceOptions, setWorkspaceOptions] = useState(initialData.workspaces);
  const [view, setView] = useState<Roadmap2View>("graph");
  const [filters, setFilters] = useState<Roadmap2Filters>(EMPTY_FILTERS);
  const [reviewPreset, setReviewPreset] = useState<ReviewPreset>("overview");
  const [expandedPhaseIds, setExpandedPhaseIds] = useState<Set<string>>(new Set());
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [editor, setEditor] = useState<EditorState>(null);
  const [driveConfigOpen, setDriveConfigOpen] = useState(openDriveOnLoad);
  const [workspaceModal, setWorkspaceModal] = useState<"create" | "rename" | null>(null);
  const [workspaceNameInput, setWorkspaceNameInput] = useState("");
  const [driveInput, setDriveInput] = useState(initialData.workspace.rootDriveUrl ?? "");
  const [driveStatus, setDriveStatus] = useState<DriveStatus | null>(null);
  const [driveStatusLoading, setDriveStatusLoading] = useState(true);
  const [driveStatusError, setDriveStatusError] = useState<string | null>(null);
  const [driveListing, setDriveListing] = useState<DriveListing | null>(null);
  const [driveHistory, setDriveHistory] = useState<Array<{ id: string; name: string }>>([]);
  const [driveCollaborators, setDriveCollaborators] = useState("");
  const [driveError, setDriveError] = useState<string | null>(null);
  const [driveBusy, setDriveBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ tone: "success" | "error" | "info"; message: string } | null>(null);
  const [busy, startTransition] = useTransition();
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const graphToolbarRef = useRef<HTMLDivElement>(null);
  const modalPanelRef = useRef<HTMLElement>(null);
  const modalReturnFocusRef = useRef<HTMLElement | null>(null);
  const permissionOperationRef = useRef<{ signature: string; key: string } | null>(null);
  const preferencesWorkspaceRef = useRef<string | null>(null);
  const closeEditor = useCallback(() => setEditor(null), []);
  const driveAccountLabel = roadmap2DriveAccountLabel(driveStatus?.account);
  const drivePending = isRoadmap2DrivePending(driveStatus?.status);
  const driveReconnect = roadmap2DriveNeedsReconnect(driveStatus?.status);
  const driveStatusText = roadmap2DriveStatusLabel(driveStatus?.status);
  const driveUnavailable = Boolean(driveStatusError || driveStatus?.enabled === false || driveStatus?.status === "UNKNOWN");

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
    const timer = window.setTimeout(() => {
      try {
        setView("graph");
        setFilters(EMPTY_FILTERS);
        setReviewPreset("overview");
        setExpandedPhaseIds(new Set());
        const raw = window.localStorage.getItem(`${VIEW_PREFERENCES_PREFIX}:${encodeURIComponent(workspace.key)}`);
        if (raw) {
          const saved = JSON.parse(raw) as { view?: unknown; filters?: Partial<Roadmap2Filters>; preset?: unknown; expandedPhaseIds?: unknown };
          if (saved.view === "graph" || saved.view === "timeline" || saved.view === "list") setView(saved.view);
          if (saved.preset === "overview" || saved.preset === "weekly" || saved.preset === "decisions" || saved.preset === "dueSoon") setReviewPreset(saved.preset);
          if (saved.filters && typeof saved.filters === "object") setFilters({ ...EMPTY_FILTERS, ...saved.filters });
          if (Array.isArray(saved.expandedPhaseIds)) setExpandedPhaseIds(new Set(saved.expandedPhaseIds.filter((id): id is string => typeof id === "string")));
        }
      } catch { /* préférences facultatives */ }
      preferencesWorkspaceRef.current = workspace.key;
      setPreferencesReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [workspace.key]);

  useEffect(() => {
    if (!preferencesReady || preferencesWorkspaceRef.current !== workspace.key) return;
    try {
      window.localStorage.setItem(`${VIEW_PREFERENCES_PREFIX}:${encodeURIComponent(workspace.key)}`, JSON.stringify({ view, filters, preset: reviewPreset, expandedPhaseIds: [...expandedPhaseIds] }));
    } catch { /* préférences facultatives */ }
  }, [expandedPhaseIds, filters, preferencesReady, reviewPreset, view, workspace.key]);

  useEffect(() => {
    const timer = window.setInterval(() => router.refresh(), 15000);
    return () => window.clearInterval(timer);
  }, [router]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const refreshDriveStatus = useCallback(async (showError = false) => {
    setDriveStatusLoading(true);
    const result = await getRoadmap2DriveStatus(workspace.key);
    if (result.ok) {
      setDriveStatus(result.data);
      setDriveStatusError(null);
    } else {
      setDriveStatus(null);
      setDriveStatusError(result.error);
      if (showError) setDriveError(result.error);
    }
    setDriveStatusLoading(false);
    return result;
  }, [workspace.key]);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => void refreshDriveStatus(false), 0);
    const timer = window.setInterval(() => void refreshDriveStatus(false), 60000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, [refreshDriveStatus]);

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

  const matchingNodes = useMemo(() => applyReviewPreset(filterRoadmap2Nodes(nodes, filters), reviewPreset), [nodes, filters, reviewPreset]);
  const filteredNodes = useMemo(() => {
    if (reviewPreset !== "overview" || !isDefaultRoadmap2Filters(filters)) return matchingNodes;
    return matchingNodes.filter((node) => node.isWorkspaceRoot || node.type === "phase" || (node.parentId ? expandedPhaseIds.has(node.parentId) : false));
  }, [expandedPhaseIds, filters, matchingNodes, reviewPreset]);
  const selectedNode = editor?.mode === "edit" ? nodes.find((node) => node.id === editor.nodeId) ?? null : null;

  const showResult = useCallback((result: Roadmap2ActionResult, success: string) => {
    setToast({ tone: result.ok ? "success" : "error", message: result.ok ? success : result.error ?? "Action impossible." });
    if (result.code === "CONFLICT") router.refresh();
    return result;
  }, [router]);

  const saveNode = useCallback(async (node: Roadmap2NodeDto | null, input: Roadmap2NodeInput, structuralPreflightToken?: string) => {
    if (input.status === "archived") return showResult({ ok: false, code: "VALIDATION", error: "Utilisez l’action Archiver dédiée." }, "");
    const result = node ? await updateRoadmap2Node(workspace.key, node.id, node.version, input, structuralPreflightToken) : await createRoadmap2Node(workspace.key, input);
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
            isWorkspaceRoot: false,
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

  const previewStructuralChange = useCallback((node: Roadmap2NodeDto, input: Roadmap2NodeInput, allowLinkedFolder = false) => (
    previewRoadmap2NodeStructuralChange(workspace.key, node.id, node.version, input, allowLinkedFolder)
  ), [workspace.key]);

  const quickUpdate = useCallback(async (node: Roadmap2NodeDto, patch: Partial<Roadmap2NodeInput>) => {
    const input = { ...nodeToInput(node), ...patch };
    if (input.status === "archived" || node.status === "archived") return showResult({ ok: false, code: "VALIDATION", error: "Utilisez les actions Archiver ou Restaurer dédiées." }, "");
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
    const message = node.driveFolderUrl
      ? `Archiver « ${node.title} » ? Son dossier et tous ses fichiers seront déplacés dans 10_Archives. Aucun document ne sera supprimé.`
      : `Archiver « ${node.title} » ?`;
    if (!window.confirm(message)) return { ok: false, code: "VALIDATION", error: "Archivage annulé." } satisfies Roadmap2ActionResult;
    const operationKeyName = `archive:${node.id}:${node.version}`;
    const operationKey = getOrCreateRoadmap2OperationKey(workspace.key, operationKeyName);
    const result = await archiveRoadmap2Node(workspace.key, node.id, node.version, Boolean(node.driveFolderUrl), operationKey);
    if (result.ok) {
      clearRoadmap2OperationKey(workspace.key, operationKeyName);
      const now = new Date().toISOString();
      setNodes((current) => current.map((candidate) => candidate.id === node.id ? { ...candidate, status: "archived", archivedAt: now, version: candidate.version + 1, updatedAt: now } : candidate));
      setEditor(null);
    }
    return showResult(result, "Élément archivé.");
  }, [showResult, workspace.key]);

  const restoreNode = useCallback(async (node: Roadmap2NodeDto) => {
    const message = node.driveFolderUrl
      ? `Restaurer « ${node.title} » ? Son dossier et ses fichiers seront replacés dans la branche active de la roadmap.`
      : `Restaurer « ${node.title} » ?`;
    if (!window.confirm(message)) return { ok: false, code: "VALIDATION", error: "Restauration annulée." } satisfies Roadmap2ActionResult;
    const operationKeyName = `restore:${node.id}:${node.version}`;
    const operationKey = getOrCreateRoadmap2OperationKey(workspace.key, operationKeyName);
    const result = await restoreRoadmap2Node(workspace.key, node.id, node.version, Boolean(node.driveFolderUrl), operationKey);
    if (result.ok) {
      clearRoadmap2OperationKey(workspace.key, operationKeyName);
      setEditor(null);
      router.refresh();
    }
    return showResult(result, "Élément restauré.");
  }, [router, showResult, workspace.key]);

  const removeNode = useCallback(async (node: Roadmap2NodeDto) => {
    const result = await deleteRoadmap2Node(workspace.key, node.id, node.version, "preserve_drive_and_delete_node");
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

  const createDriveResources = useCallback(async (node: Roadmap2NodeDto) => {
    const operationKeyName = `node-resources:${node.id}`;
    const operationKey = getOrCreateRoadmap2OperationKey(workspace.key, operationKeyName);
    const result = await createRoadmap2NodeDriveResources(workspace.key, node.id, node.version, operationKey);
    if (!result.ok) {
      setToast({ tone: "error", message: result.error });
      if (result.code === "CONFLICT") router.refresh();
      return result;
    }
    clearRoadmap2OperationKey(workspace.key, operationKeyName);
    setToast({ tone: "success", message: result.data.trackingPopulated ? "Dossier et document de suivi créés dans Drive." : "Dossier et document créés. Le modèle de suivi reste à copier dans le document." });
    router.refresh();
    return result;
  }, [router, workspace.key]);

  const actions: Roadmap2UiActions = useMemo(() => ({ saveNode, previewStructuralChange, quickUpdate, moveNode, archiveNode, restoreNode, removeNode, duplicateNode, createEdge, removeEdge, createDriveResources }), [saveNode, previewStructuralChange, quickUpdate, moveNode, archiveNode, restoreNode, removeNode, duplicateNode, createEdge, removeEdge, createDriveResources]);

  function runSeed(setup: { anchorDate: string; ownerByCategory: Record<(typeof ROADMAP2_CATEGORIES)[number], string> }) {
    if (!window.confirm(`Créer ici une copie modifiable du modèle Le Bon Rebond, ancrée au ${new Date(`${setup.anchorDate}T12:00:00`).toLocaleDateString("fr-FR")} ?`)) return;
    startTransition(async () => {
      const result = await initializeRoadmap2(workspace.key, setup);
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
    setDriveListing(null);
    setDriveHistory([]);
    setDriveError(null);
    setDriveConfigOpen(true);
    void refreshDriveStatus(true);
  }

  function manageDriveFromNode() {
    setEditor(null);
    openDriveConfig();
  }

  async function connectDrive() {
    setDriveBusy("connect");
    setDriveError(null);
    const result = await connectRoadmap2Drive(workspace.key);
    if (result.ok) {
      window.location.assign(result.data.url);
      return;
    }
    setDriveError(result.error);
    setDriveBusy(null);
  }

  async function loadDriveFolder(folderId?: string, pushHistory = false) {
    setDriveBusy("list");
    setDriveError(null);
    const result = await listRoadmap2DriveFiles(workspace.key, folderId);
    if (result.ok) {
      if (pushHistory && driveListing) setDriveHistory((current) => [...current, { id: driveListing.folder.id, name: driveListing.folder.name }]);
      setDriveListing(result.data);
    } else {
      setDriveError(result.error);
    }
    setDriveBusy(null);
  }

  async function provisionDrive() {
    if (!window.confirm("Créer ou compléter l’arborescence Le Bon Rebond dans le Google Drive connecté ? Les dossiers existants portant le même nom seront réutilisés.")) return;
    setDriveBusy("provision");
    setDriveError(null);
    const operationKeyName = "provision-workspace";
    const operationKey = getOrCreateRoadmap2OperationKey(workspace.key, operationKeyName);
    const result = await provisionRoadmap2Drive(workspace.key, operationKey);
    if (!result.ok) {
      setDriveError(result.error);
      setDriveBusy(null);
      return;
    }
    clearRoadmap2OperationKey(workspace.key, operationKeyName);
    setDriveInput(result.data.rootDriveUrl);
    setWorkspace((current) => ({ ...current, rootDriveUrl: result.data.rootDriveUrl, updatedAt: new Date().toISOString() }));
    setToast({ tone: "success", message: result.data.rootCreated ? `Dossier racine et ${result.data.foldersCreated} sous-dossiers créés.` : `${result.data.foldersCreated} dossier${result.data.foldersCreated === 1 ? "" : "s"} manquant${result.data.foldersCreated === 1 ? "" : "s"} créé${result.data.foldersCreated === 1 ? "" : "s"}.` });
    setDriveBusy(null);
    await loadDriveFolder();
  }

  async function goBackDrive() {
    const previous = driveHistory.at(-1);
    if (!previous) return;
    setDriveHistory((current) => current.slice(0, -1));
    await loadDriveFolder(previous.id, false);
  }

  async function shareDrive() {
    const emails = driveCollaborators.split(/[;,\n]+/).map((email) => email.trim()).filter(Boolean);
    if (!emails.length) { setDriveError("Ajoutez au moins une adresse email."); return; }
    if (!window.confirm(`Ajouter ou mettre à niveau un accès éditeur au dossier racine pour :\n\n${emails.join("\n")}\n\nAucun accès Drive existant ne sera retiré.`)) return;
    setDriveBusy("share");
    setDriveError(null);
    const signature = [...emails].map((email) => email.toLowerCase()).sort().join("|");
    const operationScope = roadmap2PermissionOperationScope(emails);
    const operation = permissionOperationRef.current?.signature === signature
      ? permissionOperationRef.current
      : { signature, key: getOrCreateRoadmap2OperationKey(workspace.key, operationScope) };
    permissionOperationRef.current = operation;
    const result = await syncRoadmap2DrivePermissions(workspace.key, emails, operation.key);
    if (result.ok) {
      permissionOperationRef.current = null;
      clearRoadmap2OperationKey(workspace.key, operationScope);
      setToast({ tone: "success", message: `Accès Drive : ${result.data.created} ajouté(s), ${result.data.updated} mis à niveau, ${result.data.unchanged} déjà éditeur(s). Aucun accès existant n’a été retiré.` });
    } else {
      setDriveError(result.error);
    }
    setDriveBusy(null);
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

  const searchMatches = filters.search.trim() ? matchingNodes.slice(0, 5) : [];

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
            <div className={`${styles.driveHeaderStatus} ${driveStatus?.connected ? styles.driveHeaderConnected : driveUnavailable ? styles.driveHeaderUnavailable : drivePending || driveReconnect ? styles.driveHeaderWarning : ""}`} role="status" aria-label={driveStatusLoading ? "Vérification de Google Drive" : driveUnavailable ? "Google Drive momentanément indisponible" : `Google Drive : ${driveStatusText}${driveAccountLabel ? `, ${driveAccountLabel}` : ""}`} data-private-export>
              <span className={`${styles.driveStatusDot} ${driveStatus?.connected ? styles.driveStatusConnected : ""}`} aria-hidden="true" />
              <span><small>Google Drive</small><strong>{driveStatusLoading ? "Vérification…" : driveUnavailable ? "Indisponible" : driveStatusText}</strong>{driveAccountLabel && <em title={driveAccountLabel}>{driveAccountLabel}</em>}</span>
              {driveStatus?.connected && workspace.rootDriveUrl && <a href={workspace.rootDriveUrl} target="_blank" rel="noopener noreferrer" aria-label="Ouvrir le dossier Drive racine"><Icon name="external" size={15} /> Ouvrir</a>}
              <button type="button" onClick={driveStatusError ? () => void refreshDriveStatus(false) : openDriveConfig}>{driveStatusError ? "Réessayer" : driveStatus?.connected ? "Gérer" : drivePending ? "Vérifier" : driveReconnect ? "Reconnecter" : "Connecter"}</button>
            </div>
          </div>
        </div>

        <div className={styles.pilotStrip} aria-label="Synthèse de pilotage">
          <span><strong>{initialData.stats.activeInitiatives}</strong> livrables actifs</span>
          <span className={initialData.stats.blocked ? styles.statDanger : ""}><strong>{initialData.stats.blocked}</strong> bloquées</span>
          <span><strong>{initialData.stats.dueSoon}</strong> échéances à 7 jours</span>
          <span><strong>{initialData.stats.globalProgress}%</strong> progression globale</span>
          <span><strong>{initialData.stats.pendingDecisions}</strong> décisions en attente</span>
          <details className={styles.kpiFormula}><summary>Formule des KPI</summary><p>Une seule base est comptée : les {initialData.stats.basisCount} livrables actifs sans sous-nœud. Les phases et la racine sont exclues. La progression est leur moyenne simple.</p></details>
          <span className={styles.lastUpdate}><span className={styles.liveDot} /> {relativeTime(initialData.stats.lastUpdatedAt)}{initialData.stats.lastUpdatedBy ? ` · ${initialData.stats.lastUpdatedBy}` : ""}</span>
        </div>
      </header>

      <div className={styles.controlDeck} ref={graphToolbarRef}>
        <div className={styles.viewTabs} role="tablist" aria-label="Vue Roadmap 2">
          {([['graph', 'Graphe'], ['timeline', 'Timeline'], ['list', 'Liste']] as const).map(([value, label]) => (
            <button key={value} role="tab" aria-selected={view === value} className={view === value ? styles.activeTab : ""} onClick={() => setView(value)}>{label}</button>
          ))}
        </div>
        <div className={styles.reviewPresets} aria-label="Raccourcis de revue">
          {([['overview', 'Vue d’ensemble'], ['weekly', 'Revue hebdomadaire'], ['decisions', 'Décisions'], ['dueSoon', 'Échéances à 7 jours']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={reviewPreset === value} className={reviewPreset === value ? styles.selectedControl : ""} onClick={() => setReviewPreset(value)}>{label}</button>)}
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
          {reviewPreset === "overview" && isDefaultRoadmap2Filters(filters) && nodes.some((node) => node.type === "phase") && <div className={styles.phaseExpansion} aria-label="Développer les chantiers">{nodes.filter((node) => node.type === "phase" && !node.archivedAt).map((phase) => <button key={phase.id} type="button" aria-pressed={expandedPhaseIds.has(phase.id)} onClick={() => setExpandedPhaseIds((current) => { const next = new Set(current); if (next.has(phase.id)) next.delete(phase.id); else next.add(phase.id); return next; })}>{expandedPhaseIds.has(phase.id) ? '−' : '+'} {phase.title}</button>)}</div>}
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
          {(!isDefaultRoadmap2Filters(filters) || reviewPreset !== "overview" || expandedPhaseIds.size > 0) && <button className={styles.resetButton} onClick={() => { setFilters(EMPTY_FILTERS); setReviewPreset("overview"); setExpandedPhaseIds(new Set()); }}>Réinitialiser</button>}
        </div>
      </div>

      {nodes.length === 0 ? (
        <Roadmap2Empty workspaceName={workspace.name} isDefault={workspace.key === "le-bon-rebond"} owners={initialData.owners} onSeed={runSeed} onCreate={() => setEditor({ mode: "create" })} onDrive={openDriveConfig} busy={busy} />
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
          key={editor.mode === "edit" ? `edit-${editor.nodeId}` : `create-${editor.parentId ?? "root"}-${editor.type ?? "initiative"}-${editor.category ?? "default"}`}
          node={selectedNode}
          workspaceKey={workspace.key}
          createDefaults={editor.mode === "create" ? { parentId: editor.parentId, type: editor.type, category: editor.category } : undefined}
          nodes={nodes}
          edges={edges}
          owners={initialData.owners}
          actions={actions}
          onClose={closeEditor}
          onCreateChild={(parentId) => setEditor({ mode: "create", parentId, type: "action", category: nodes.find((candidate) => candidate.id === parentId)?.category })}
          onLocalNode={(node) => setNodes((current) => current.map((candidate) => candidate.id === node.id ? node : candidate))}
          onLocalEdge={(edge: Roadmap2EdgeDto) => setEdges((current) => [...current, edge])}
          onLocalEdgeRemoved={(edgeId) => setEdges((current) => current.filter((edge) => edge.id !== edgeId))}
          announce={(tone, message) => setToast({ tone, message })}
          driveStatus={driveStatus}
          driveStatusLoading={driveStatusLoading}
          driveStatusError={driveStatusError}
          hasRootDrive={Boolean(workspace.rootDriveUrl)}
          onManageDrive={manageDriveFromNode}
          onRefreshDrive={() => void refreshDriveStatus(false)}
        />
      )}

      {driveConfigOpen && (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDriveConfigOpen(false); }}>
          <section ref={modalPanelRef} className={`${styles.driveModal} ${styles.driveIntegrationModal}`} role="dialog" aria-modal="true" aria-labelledby="drive-config-title">
            <button autoFocus className={styles.closeButton} onClick={() => setDriveConfigOpen(false)} aria-label="Fermer"><Icon name="x" size={18} /></button>
            <div className={styles.eyebrow}>Intégration privée · {workspace.name}</div>
            <h2 id="drive-config-title">Intégration Google Drive</h2>
            <p>Roadmap 2 peut créer les dossiers, préparer les documents de suivi et afficher le contenu du seul dossier racine associé.</p>

            <div className={styles.driveConnection} aria-live="polite">
              <span className={`${styles.driveStatusDot} ${driveStatus?.connected ? styles.driveStatusConnected : ""}`} aria-hidden="true" />
              <div>
                <strong>{driveStatusLoading ? "Vérification de la connexion…" : driveUnavailable ? "Intégration serveur indisponible" : `Google Drive · ${driveStatusText}`}</strong>
                <small>{driveStatus?.connected && driveAccountLabel ? `Compte confirmé par Google Drive : ${driveAccountLabel}. Aucun token Google n’est envoyé au navigateur.` : driveStatus?.connected ? "Connexion active, mais Google Drive n’a pas encore confirmé l’identité du compte. Ouvrez le dossier ou reconnectez le compte attendu." : drivePending ? "Terminez l’autorisation Google, puis revenez vérifier la connexion." : driveReconnect ? "Cette autorisation n’est plus exploitable. Reconnectez le compte qui doit posséder le dossier de travail." : "Connectez le compte Google qui doit posséder le dossier de travail."}</small>
              </div>
              <button type="button" className={driveStatus?.connected ? styles.secondaryButton : styles.primaryButton} disabled={Boolean(driveBusy) || driveStatusLoading || driveStatus?.enabled === false} onClick={() => void connectDrive()}>{driveBusy === "connect" ? "Redirection…" : driveStatus?.connected ? "Changer / reconnecter" : drivePending ? "Reprendre la connexion" : driveReconnect ? "Reconnecter Google Drive" : "Connecter Google Drive"}</button>
            </div>

            {driveStatus?.connected && (
              <>
                <div className={styles.driveIntegrationActions}>
                  <button type="button" className={styles.primaryButton} disabled={Boolean(driveBusy)} onClick={() => void provisionDrive()}><Icon name="plus" size={15} /> {workspace.rootDriveUrl ? "Synchroniser l’arborescence" : "Créer l’arborescence"}</button>
                  {workspace.rootDriveUrl && <button type="button" className={styles.secondaryButton} disabled={Boolean(driveBusy)} onClick={() => void loadDriveFolder()}><Icon name="eye" size={15} /> Afficher le contenu</button>}
                  {workspace.rootDriveUrl && <a className={styles.secondaryButton} href={workspace.rootDriveUrl} target="_blank" rel="noopener noreferrer"><Icon name="external" size={15} /> Ouvrir dans Drive</a>}
                </div>

                {driveListing && (
                  <section className={styles.driveExplorer} aria-label="Contenu du dossier Google Drive">
                    <div className={styles.driveExplorerHeader}>
                      <div>
                        <span>Contenu Drive</span>
                        <strong>{driveListing.folder.name}</strong>
                      </div>
                      <div>
                        {driveHistory.length > 0 && <button type="button" disabled={Boolean(driveBusy)} onClick={() => void goBackDrive()}><Icon name="chevron-left" size={15} /> Retour</button>}
                        <button type="button" disabled={Boolean(driveBusy)} onClick={() => void loadDriveFolder(driveListing.folder.id)} aria-label="Actualiser le contenu Drive"><Icon name="refresh" size={15} /></button>
                      </div>
                    </div>
                    {driveListing.files.length === 0 ? <p className={styles.driveExplorerEmpty}>Ce dossier est vide.</p> : (
                      <ul className={styles.driveFileList}>
                        {driveListing.files.map((file) => (
                          <li key={file.id}>
                            <span className={styles.driveFileIcon}><Icon name={file.isFolder ? "layers" : "file-text"} size={16} /></span>
                            {file.isFolder ? <button type="button" onClick={() => void loadDriveFolder(file.id, true)}><strong>{file.name}</strong><small>Dossier</small></button> : <a href={file.url} target="_blank" rel="noopener noreferrer"><strong>{file.name}</strong><small>{file.modifiedAt ? `Modifié ${new Date(file.modifiedAt).toLocaleDateString("fr-FR")}` : "Document Drive"}</small></a>}
                            <a href={file.url} target="_blank" rel="noopener noreferrer" aria-label={`Ouvrir ${file.name} dans Google Drive`}><Icon name="external" size={14} /></a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                )}

                {workspace.rootDriveUrl && (
                  <section className={styles.driveSharing}>
                    <div><strong>Ajouter Dorian, Mathurin ou un collaborateur</strong><small>Roadmap 2 ajoute ou promeut ces emails au niveau éditeur. Elle ne retire jamais un accès Drive existant ; les sous-dossiers héritent du partage racine.</small></div>
                    <label className={styles.field}><span>Emails, séparés par une virgule</span><input value={driveCollaborators} onChange={(event) => setDriveCollaborators(event.target.value)} placeholder="dorian@…, mathurin@…" /></label>
                    <button type="button" className={styles.secondaryButton} disabled={Boolean(driveBusy)} onClick={() => void shareDrive()}><Icon name="users" size={15} /> Ajouter / mettre à niveau</button>
                  </section>
                )}
              </>
            )}

            {driveError && <div className={styles.formError} role="alert"><Icon name="alert-circle" size={16} /> {driveError}</div>}
            {driveBusy && driveBusy !== "status" && driveBusy !== "connect" && <p className={styles.driveProgress} role="status">Opération Google Drive en cours…</p>}

            <details className={styles.driveManualConfig}>
              <summary>Utiliser un dossier existant manuellement</summary>
              <p>Renseignez une URL si le dossier racine existe déjà. L’accès à son contenu nécessite tout de même la connexion Google ci-dessus.</p>
              <label className={styles.field}><span>URL HTTPS Google Drive</span><input value={driveInput} onChange={(event) => setDriveInput(event.target.value)} placeholder="https://drive.google.com/drive/folders/…" /></label>
              <div className={styles.modalActions}><button type="button" className={styles.secondaryButton} disabled={busy} onClick={saveRootDrive}>Enregistrer ce dossier</button></div>
            </details>
            <p className={styles.driveSecurityNote}><Icon name="shield" size={15} /> Les URL et contenus restent côté admin. Roadmap 2 ne stocke ni mot de passe, ni token Google, ni copie des fichiers.</p>
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

function Roadmap2Empty({ workspaceName, isDefault, owners, onSeed, onCreate, onDrive, busy }: { workspaceName: string; isDefault: boolean; owners: Roadmap2Data["owners"]; onSeed: (setup: { anchorDate: string; ownerByCategory: Record<(typeof ROADMAP2_CATEGORIES)[number], string> }) => void; onCreate: () => void; onDrive: () => void; busy: boolean }) {
  const [anchorDate, setAnchorDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [ownerByCategory, setOwnerByCategory] = useState<Record<(typeof ROADMAP2_CATEGORIES)[number], string>>(() => Object.fromEntries(ROADMAP2_CATEGORIES.map((category) => [category, owners[0]?.id ?? ""])) as Record<(typeof ROADMAP2_CATEGORIES)[number], string>);
  const setupComplete = Boolean(anchorDate && ROADMAP2_CATEGORIES.every((category) => ownerByCategory[category]));
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyCompass}><Icon name="target" size={34} /></div>
      <div>
        <div className={styles.eyebrow}>Premier cap</div>
        <h2>{isDefault ? "Construisons la roadmap du Bon Rebond" : `Construisons « ${workspaceName} »`}</h2>
        <p>Visualisez les prochaines étapes, reliez chaque chantier à son dossier Drive et gardez vos décisions au même endroit.</p>
        <p className={styles.seedDisclosure}><strong>D’où vient le modèle proposé ?</strong> Des branches et actions fournies dans le cahier des charges Roadmap 2. L’initialisation crée ici une copie modifiable de 65 nœuds et 110 relations ; les dates, positions, statuts, priorités et dépendances sont des propositions de départ.</p>
        <div className={styles.seedSetup}>
          <label><span>Date d’ancrage</span><input type="date" required value={anchorDate} onChange={(event) => setAnchorDate(event.target.value)} /></label>
          <fieldset><legend>Responsable par phase</legend>{ROADMAP2_CATEGORIES.map((category) => <label key={category}><span>{ROADMAP2_CATEGORY_LABELS[category]}</span><select required value={ownerByCategory[category]} onChange={(event) => setOwnerByCategory((current) => ({ ...current, [category]: event.target.value }))}><option value="">Choisir…</option>{owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}</option>)}</select></label>)}</fieldset>
        </div>
        <div className={styles.emptyActions}>
          <button className={styles.primaryButton} disabled={busy || !setupComplete} onClick={() => onSeed({ anchorDate, ownerByCategory })}>{busy ? "Initialisation…" : "Initialiser la roadmap Le Bon Rebond"}</button>
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
