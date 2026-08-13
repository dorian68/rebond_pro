import type { Roadmap2NodeInput } from "@/server/roadmap2";
import type {
  Roadmap2Category,
  Roadmap2NodeDto,
  Roadmap2Priority,
  Roadmap2Status,
} from "@/lib/roadmap2";

export type Roadmap2View = "graph" | "timeline" | "list";

export type Roadmap2Filters = {
  search: string;
  category: Roadmap2Category | "all";
  status: Roadmap2Status | "all";
  ownerUserId: string | "all";
  priority: Roadmap2Priority | "all";
  showArchived: boolean;
};

export const EMPTY_FILTERS: Roadmap2Filters = {
  search: "",
  category: "all",
  status: "all",
  ownerUserId: "all",
  priority: "all",
  showArchived: false,
};

export function filterRoadmap2Nodes(nodes: Roadmap2NodeDto[], filters: Roadmap2Filters) {
  const query = filters.search.trim().toLocaleLowerCase("fr");
  return nodes.filter((node) => {
    if (!filters.showArchived && (node.status === "archived" || node.archivedAt)) return false;
    if (filters.category !== "all" && node.category !== filters.category) return false;
    if (filters.status !== "all" && node.status !== filters.status) return false;
    if (filters.ownerUserId !== "all" && node.ownerUserId !== filters.ownerUserId) return false;
    if (filters.priority !== "all" && node.priority !== filters.priority) return false;
    if (query && !`${node.title} ${node.description ?? ""} ${node.nextAction ?? ""}`.toLocaleLowerCase("fr").includes(query)) return false;
    return true;
  });
}

/**
 * Réduit l'aperçu par phases sans jamais fabriquer un faux état vide : une
 * roadmap composée uniquement de nœuds libres doit rester immédiatement visible.
 */
export function projectRoadmap2OverviewNodes(nodes: Roadmap2NodeDto[], expandedPhaseIds: ReadonlySet<string>, showAll = false) {
  if (showAll) return nodes;
  const projected = nodes.filter((node) => node.isWorkspaceRoot || node.type === "phase" || (node.parentId ? expandedPhaseIds.has(node.parentId) : false));
  return projected.length > 0 ? projected : nodes;
}

export function nodeToInput(node: Roadmap2NodeDto): Roadmap2NodeInput {
  return {
    title: node.title,
    description: node.description,
    expectedOutcome: node.expectedOutcome,
    type: node.type,
    category: node.category,
    status: node.status,
    priority: node.priority,
    progressPercent: node.progressPercent,
    ownerUserId: node.ownerUserId,
    startDate: node.startDate,
    dueDate: node.dueDate,
    nextAction: node.nextAction,
    decisionRequired: node.decisionRequired,
    definitionOfDone: node.definitionOfDone,
    driveFolderUrl: node.driveFolderUrl,
    trackingDocUrl: node.trackingDocUrl,
    parentId: node.parentId,
    positionX: node.positionX,
    positionY: node.positionY,
    width: node.width,
  };
}

export function formatRoadmap2Date(value: string | null, options?: Intl.DateTimeFormatOptions) {
  if (!value) return "—";
  return new Date(`${value}T12:00:00`).toLocaleDateString("fr-FR", options ?? { day: "2-digit", month: "short", year: "numeric" });
}

export function isRoadmap2Overdue(node: Roadmap2NodeDto) {
  if (!node.dueDate || node.status === "completed" || node.status === "archived") return false;
  return new Date(`${node.dueDate}T23:59:59`).getTime() < Date.now();
}
