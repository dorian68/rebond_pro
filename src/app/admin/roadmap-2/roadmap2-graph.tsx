"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  applyNodeChanges,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  type NodeProps,
  type ReactFlowInstance,
} from "@xyflow/react";
import { Icon } from "@/components/ui/Icon";
import {
  ROADMAP2_PRIORITY_LABELS,
  ROADMAP2_RELATION_LABELS,
  ROADMAP2_STATUS_LABELS,
  ROADMAP2_TYPE_LABELS,
  type Roadmap2EdgeDto,
  type Roadmap2NodeDto,
} from "@/lib/roadmap2";
import type { Roadmap2UiActions } from "./roadmap2-client";
import { formatRoadmap2Date, isRoadmap2Overdue } from "./roadmap2-ui";
import styles from "./roadmap2.module.css";

type RoadmapFlowNode = Node<{
  roadmapNode: Roadmap2NodeDto;
  onOpen: (nodeId: string) => void;
}, "roadmap2">;

const EDGE_COLORS = {
  dependency: "#235f55",
  parent_child: "#8a8277",
  blocks: "#a94f45",
  contributes_to: "#725c91",
} as const;

function RoadmapNodeCard({ data, selected }: NodeProps<RoadmapFlowNode>) {
  const node = data.roadmapNode;
  const overdue = isRoadmap2Overdue(node);
  return (
    <article
      className={`${styles.flowNode} ${styles[`node_${node.type}`]} ${styles[`status_${node.status}`]} ${selected ? styles.flowNodeSelected : ""}`}
      data-status={node.status}
      tabIndex={0}
      aria-label={`${ROADMAP2_TYPE_LABELS[node.type]} ${node.title}, statut ${ROADMAP2_STATUS_LABELS[node.status]}`}
      onDoubleClick={() => data.onOpen(node.id)}
      onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); data.onOpen(node.id); } }}
    >
      <Handle type="target" position={Position.Left} className={styles.flowHandle} />
      <div className={styles.nodeTopline}>
        <span className={styles.nodeType}>{node.type === "milestone" && <span className={styles.diamond} aria-hidden />} {ROADMAP2_TYPE_LABELS[node.type]}</span>
        <span className={`${styles.priority} ${styles[`priority_${node.priority}`]}`} title={`Priorité ${ROADMAP2_PRIORITY_LABELS[node.priority]}`}>{node.priority}</span>
      </div>
      <h3>{node.title}</h3>
      <div className={styles.nodeMeta}>
        <span className={styles.statusWritten}>{node.status === "blocked" && <Icon name="alert-triangle" size={12} />} {ROADMAP2_STATUS_LABELS[node.status]}</span>
        <span><Icon name="user" size={12} /> {node.owner?.name ?? "Non assigné"}</span>
        <span className={overdue ? styles.overdue : ""}><Icon name="calendar" size={12} /> {node.dueDate ? formatRoadmap2Date(node.dueDate, { day: "2-digit", month: "short" }) : "À planifier"}{overdue ? " · retard" : ""}</span>
      </div>
      <div className={styles.nodeProgress}><span style={{ width: `${node.progressPercent}%` }} /><b>{node.progressPercent}%</b></div>
      <div className={styles.nodeFooter}>
        <button className="nodrag" onClick={() => data.onOpen(node.id)} aria-label={`Ouvrir le détail de ${node.title}`}>Ouvrir le détail</button>
        <span title={node.driveFolderUrl ? "Dossier Drive renseigné" : "Aucun dossier Drive associé"}><Icon name={node.driveFolderUrl ? "check-circle" : "paperclip"} size={14} /></span>
      </div>
      <Handle type="source" position={Position.Right} className={styles.flowHandle} />
    </article>
  );
}

const nodeTypes = { roadmap2: RoadmapNodeCard };

function toFlowNodes(nodes: Roadmap2NodeDto[], onOpen: (nodeId: string) => void): RoadmapFlowNode[] {
  return nodes.map((node) => ({
    id: node.id,
    type: "roadmap2",
    position: { x: node.positionX, y: node.positionY },
    data: { roadmapNode: node, onOpen },
    style: { width: node.width ?? (node.type === "phase" ? 430 : node.type === "action" ? 235 : 270) },
  }));
}

function toFlowEdges(edges: Roadmap2EdgeDto[], visibleIds: Set<string>): Edge[] {
  return edges.filter((edge) => visibleIds.has(edge.sourceNodeId) && visibleIds.has(edge.targetNodeId)).map((edge) => ({
    id: edge.id,
    source: edge.sourceNodeId,
    target: edge.targetNodeId,
    type: "smoothstep",
    label: ROADMAP2_RELATION_LABELS[edge.relationType],
    labelStyle: { fill: EDGE_COLORS[edge.relationType], fontSize: 10, fontWeight: 700 },
    labelBgStyle: { fill: "#fffaf2", fillOpacity: .94 },
    labelBgPadding: [5, 3],
    labelBgBorderRadius: 5,
    style: {
      stroke: EDGE_COLORS[edge.relationType],
      strokeWidth: edge.relationType === "blocks" ? 2.4 : 1.6,
      strokeDasharray: edge.relationType === "dependency" ? "7 5" : edge.relationType === "contributes_to" ? "3 4" : undefined,
    },
    markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color: EDGE_COLORS[edge.relationType] },
    data: { relationType: edge.relationType },
  }));
}

export function Roadmap2Graph({ nodes, visibleNodes, edges, actions, onOpen, focusNodeId, onFocusConsumed }: {
  nodes: Roadmap2NodeDto[];
  visibleNodes: Roadmap2NodeDto[];
  edges: Roadmap2EdgeDto[];
  actions: Roadmap2UiActions;
  onOpen: (nodeId: string) => void;
  focusNodeId: string | null;
  onFocusConsumed: () => void;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [instance, setInstance] = useState<ReactFlowInstance<RoadmapFlowNode, Edge> | null>(null);
  const [fullScreen, setFullScreen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const incomingNodes = useMemo(() => toFlowNodes(visibleNodes, onOpen), [visibleNodes, onOpen]);
  const [flowNodes, setFlowNodes] = useState<RoadmapFlowNode[]>(incomingNodes);
  const visibleIds = useMemo(() => new Set(visibleNodes.map((node) => node.id)), [visibleNodes]);
  const flowEdges = useMemo(() => toFlowEdges(edges, visibleIds), [edges, visibleIds]);

  useEffect(() => {
    const timer = window.setTimeout(() => setFlowNodes(incomingNodes), 0);
    return () => window.clearTimeout(timer);
  }, [incomingNodes]);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 700px)");
    const update = () => setMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    const fit = () => instance?.fitView({ padding: .16, duration: 450 });
    window.addEventListener("roadmap2-fit-view", fit);
    return () => window.removeEventListener("roadmap2-fit-view", fit);
  }, [instance]);
  useEffect(() => {
    const onFullScreenChange = () => setFullScreen(document.fullscreenElement === wrapperRef.current);
    document.addEventListener("fullscreenchange", onFullScreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullScreenChange);
  }, []);
  useEffect(() => {
    if (!focusNodeId || !instance) return;
    const node = flowNodes.find((candidate) => candidate.id === focusNodeId);
    if (node) {
      instance.setCenter(node.position.x + 130, node.position.y + 70, { zoom: 1.05, duration: 550 });
      instance.setNodes((current) => current.map((candidate) => ({ ...candidate, selected: candidate.id === focusNodeId })));
    }
    onFocusConsumed();
  }, [focusNodeId, instance, flowNodes, onFocusConsumed]);

  function handleNodeChanges(changes: NodeChange<RoadmapFlowNode>[]) {
    setFlowNodes((current) => applyNodeChanges(changes, current));
  }

  async function handleDragStop(_: MouseEvent | TouchEvent, flowNode: RoadmapFlowNode) {
    const source = nodes.find((node) => node.id === flowNode.id);
    if (!source) return;
    const result = await actions.moveNode(source, flowNode.position.x, flowNode.position.y);
    if (!result.ok) setFlowNodes(incomingNodes);
  }

  async function handleConnect(connection: Connection) {
    if (!connection.source || !connection.target) return;
    await actions.createEdge(connection.source, connection.target, "dependency");
  }

  async function toggleFullScreen() {
    if (!wrapperRef.current) return;
    if (document.fullscreenElement === wrapperRef.current) await document.exitFullscreen();
    else await wrapperRef.current.requestFullscreen();
  }

  return (
    <div ref={wrapperRef} className={`${styles.graphShell} ${fullScreen ? styles.graphFullscreen : ""}`}>
      <div className={styles.graphHint}>
        <span><Icon name="menu" size={14} /> Glisser pour organiser</span>
        <span><Icon name="arrow-right" size={14} /> Relier deux poignées pour créer une dépendance</span>
        {mobile && <span><Icon name="eye" size={14} /> Mode mobile simplifié</span>}
      </div>
      <button className={styles.fullscreenButton} onClick={toggleFullScreen} aria-label={fullScreen ? "Quitter le plein écran" : "Afficher le graphe en plein écran"}><Icon name={fullScreen ? "x" : "layers"} size={16} /> {fullScreen ? "Quitter" : "Plein écran"}</button>
      <ReactFlow<RoadmapFlowNode, Edge>
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onInit={setInstance}
        onNodesChange={handleNodeChanges}
        onNodeDragStop={handleDragStop}
        onNodeDoubleClick={(_, node) => onOpen(node.id)}
        onConnect={handleConnect}
        onEdgesDelete={(deleted) => { for (const edge of deleted) void actions.removeEdge(edge.id); }}
        fitView
        fitViewOptions={{ padding: .16, minZoom: .2, maxZoom: 1 }}
        minZoom={.15}
        maxZoom={1.7}
        nodesDraggable={!mobile}
        nodesConnectable={!mobile}
        edgesFocusable
        panOnDrag
        zoomOnPinch
        zoomOnScroll={!mobile}
        deleteKeyCode={["Backspace", "Delete"]}
        aria-label="Graphe directionnel Roadmap 2"
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.1} color="#cfc6b8" />
        <Controls showInteractive={false} position="bottom-left" />
        {!mobile && <MiniMap position="bottom-right" pannable zoomable nodeColor={(node) => {
          const roadmap = (node.data as RoadmapFlowNode["data"]).roadmapNode;
          if (roadmap.status === "blocked") return "#b95d53";
          if (roadmap.status === "completed") return "#3c7868";
          if (roadmap.type === "phase") return "#1f584f";
          return "#d6a25b";
        }} maskColor="rgba(247,242,233,.72)" />}
      </ReactFlow>
    </div>
  );
}
