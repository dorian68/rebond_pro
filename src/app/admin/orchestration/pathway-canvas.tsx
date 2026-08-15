"use client";

import { useEffect, useMemo, useState } from "react";
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
  type Edge,
  type Node,
  type NodeChange,
  type NodeProps,
} from "@xyflow/react";
import { Icon } from "@/components/ui/Icon";
import type { UiStep } from "./ui-types";
import styles from "./orchestration.module.css";

const TYPE_META: Record<string, { label: string; icon: string; className: string }> = {
  DIAGNOSTIC: { label: "Diagnostic", icon: "search", className: styles.nodeAction },
  PROJECT_VALIDATION: { label: "Validation", icon: "check-circle", className: styles.nodeMilestone },
  LBR_ACTION: { label: "Action Le Bon Rebond", icon: "sparkles", className: styles.nodeAction },
  REFERRAL: { label: "Orientation", icon: "send", className: styles.nodeReferral },
  SERVICE: { label: "Service", icon: "building", className: styles.nodeService },
  TRAINING: { label: "Formation", icon: "grad", className: styles.nodeService },
  MOBILITY: { label: "Mobilité", icon: "map-pin", className: styles.nodeNeed },
  IMMERSION: { label: "PMSMP", icon: "eye", className: styles.nodeReferral },
  INTERVIEW: { label: "Entretien", icon: "message", className: styles.nodeAction },
  OPPORTUNITY: { label: "Opportunité", icon: "target", className: styles.nodeOpportunity },
  FUNDING: { label: "Financement", icon: "euro", className: styles.nodeFunding },
  OUTCOME: { label: "Sortie", icon: "trophy", className: styles.nodeOutcome },
  MILESTONE: { label: "Jalon", icon: "calendar", className: styles.nodeMilestone },
  NEED: { label: "Besoin", icon: "alert-circle", className: styles.nodeNeed },
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  READY: "Prête",
  ASSIGNED: "Assignée",
  SENT: "Envoyée",
  ACKNOWLEDGED: "Reçue",
  ACCEPTED: "Acceptée",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminée",
  REJECTED: "Refusée",
  BLOCKED: "Bloquée",
  NO_RESPONSE: "Sans réponse",
  CANCELLED: "Annulée",
};

type OrchestrationFlowNode = Node<{
  step: UiStep;
  planBActive: boolean;
  onOpen: (stepId: string) => void;
}, "orchestrationStep">;

function formatDate(value?: string | null) {
  if (!value) return "Échéance à définir";
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(new Date(value));
}

function StepNode({ data, selected }: NodeProps<OrchestrationFlowNode>) {
  const { step } = data;
  const meta = TYPE_META[step.type] ?? TYPE_META.LBR_ACTION;
  const isInactivePlanB = step.planType === "B" && !data.planBActive;

  return (
    <article
      className={`${styles.flowNode} ${meta.className} ${selected ? styles.flowNodeSelected : ""} ${isInactivePlanB ? styles.nodePlanB : ""} ${step.planType === "B" && data.planBActive ? styles.nodePlanBActive : ""}`}
      tabIndex={0}
      aria-label={`${meta.label}, ${step.title}, statut ${STATUS_LABELS[step.status] ?? step.status}, Plan ${step.planType}`}
      onDoubleClick={() => data.onOpen(step.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          data.onOpen(step.id);
        }
      }}
    >
      <Handle type="target" position={Position.Left} className={styles.flowHandle} />
      <div className={styles.nodeTop}>
        <span className={styles.nodeType}><Icon name={meta.icon} size={11} /> {meta.label}</span>
        <span className={styles.nodePlanLabel}>Plan {step.planType}</span>
      </div>
      <h3>{step.title}</h3>
      <div className={styles.nodeMeta}>
        <span className={styles.nodeStatus}><Icon name={step.status === "BLOCKED" ? "alert-triangle" : step.status === "COMPLETED" ? "check-circle" : "circle"} size={10} /> {STATUS_LABELS[step.status] ?? step.status}</span>
        <span><Icon name="building" size={10} /> {step.assignedActorName || "Acteur à assigner"}</span>
        <span><Icon name="calendar" size={10} /> {formatDate(step.dueDate)}</span>
      </div>
      <Handle type="source" position={Position.Right} className={styles.flowHandle} />
    </article>
  );
}

const nodeTypes = { orchestrationStep: StepNode };

function toNodes(steps: UiStep[], planBActive: boolean, onOpen: (stepId: string) => void): OrchestrationFlowNode[] {
  return steps.map((step) => ({
    id: step.id,
    type: "orchestrationStep",
    position: { x: step.x, y: step.y },
    data: { step, planBActive, onOpen },
    style: { width: 218 },
  }));
}

function toEdges(steps: UiStep[]): Edge[] {
  const ids = new Set(steps.map((step) => step.id));
  return steps.flatMap((step) => step.dependencies
    .filter((dependencyId) => ids.has(dependencyId))
    .map((dependencyId) => ({
      id: `${dependencyId}--${step.id}`,
      source: dependencyId,
      target: step.id,
      type: "smoothstep",
      animated: step.status === "IN_PROGRESS",
      style: {
        stroke: step.planType === "B" ? "#735f8e" : "#4d766c",
        strokeWidth: 1.7,
        strokeDasharray: step.planType === "B" ? "6 5" : undefined,
      },
      markerEnd: { type: MarkerType.ArrowClosed, width: 17, height: 17, color: step.planType === "B" ? "#735f8e" : "#4d766c" },
      ariaLabel: `${step.title} dépend de ${dependencyId}`,
    })));
}

export function PathwayCanvas({ steps, selectedId, planBActive, mode, onSelect, onMove }: {
  steps: UiStep[];
  selectedId: string | null;
  planBActive: boolean;
  mode: "graph" | "timeline";
  onSelect: (stepId: string) => void;
  onMove: (stepId: string, x: number, y: number) => void;
}) {
  const incomingNodes = useMemo(() => toNodes(steps, planBActive, onSelect), [steps, planBActive, onSelect]);
  const [nodes, setNodes] = useState(incomingNodes);
  const edges = useMemo(() => toEdges(steps), [steps]);

  useEffect(() => {
    const timer = window.setTimeout(() => setNodes(incomingNodes.map((node) => ({ ...node, selected: node.id === selectedId }))), 0);
    return () => window.clearTimeout(timer);
  }, [incomingNodes, selectedId]);

  if (mode === "timeline") {
    return (
      <div className={styles.timeline} aria-label="Timeline alternative du parcours">
        <div className={styles.timelineTrack}>
          {steps.map((step) => (
            <button key={step.id} type="button" className={styles.timelineItem} onClick={() => onSelect(step.id)}>
              <small>{formatDate(step.dueDate)}</small>
              <span>
                <strong>{step.title}</strong>
                <small>{step.assignedActorName || "Acteur à assigner"} · Plan {step.planType}</small>
              </span>
              <span className={`${styles.statusPill} ${step.status === "COMPLETED" ? styles.statusDone : step.status === "BLOCKED" || step.status === "REJECTED" ? styles.statusBlocked : step.status === "DRAFT" ? styles.statusDraft : styles.statusActive}`}>{STATUS_LABELS[step.status] ?? step.status}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  function handleNodeChanges(changes: NodeChange<OrchestrationFlowNode>[]) {
    setNodes((current) => applyNodeChanges(changes, current));
  }

  return (
    <div className={styles.flowCanvas}>
      <ReactFlow<OrchestrationFlowNode, Edge>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodeChanges}
        onNodeClick={(_, node) => onSelect(node.id)}
        onNodeDragStop={(_, node) => onMove(node.id, node.position.x, node.position.y)}
        fitView
        fitViewOptions={{ padding: .13, minZoom: .2, maxZoom: .9 }}
        minZoom={.15}
        maxZoom={1.6}
        panOnDrag
        zoomOnPinch
        zoomOnScroll
        nodesConnectable={false}
        aria-label="Graphe interactif du parcours de Sarah"
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.1} color="#cfc5b7" />
        <Controls showInteractive={false} position="bottom-left" />
        <MiniMap
          position="bottom-right"
          pannable
          zoomable
          nodeColor={(node) => {
            const step = (node.data as OrchestrationFlowNode["data"]).step;
            if (step.status === "BLOCKED" || step.status === "REJECTED") return "#a9534b";
            if (step.planType === "B") return "#735f8e";
            if (step.type === "OUTCOME") return "#dd745a";
            return "#205c4f";
          }}
          maskColor="rgba(246,241,232,.72)"
        />
      </ReactFlow>
    </div>
  );
}
