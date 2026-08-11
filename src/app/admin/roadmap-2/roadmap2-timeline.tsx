"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import {
  ROADMAP2_CATEGORY_LABELS,
  ROADMAP2_STATUS_LABELS,
  type Roadmap2EdgeDto,
  type Roadmap2NodeDto,
  type Roadmap2Owner,
} from "@/lib/roadmap2";
import type { Roadmap2UiActions } from "./roadmap2-client";
import { formatRoadmap2Date, isRoadmap2Overdue } from "./roadmap2-ui";
import styles from "./roadmap2.module.css";

type Scale = "week" | "month";
type Grouping = "category" | "owner";

const DAY = 86400000;

function parseDay(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function startOfWeek(date: Date) {
  const copy = new Date(date);
  const day = copy.getUTCDay() || 7;
  copy.setUTCDate(copy.getUTCDate() - day + 1);
  return copy;
}

function timelineRange(nodes: Roadmap2NodeDto[], scale: Scale) {
  const dates = nodes.flatMap((node) => [node.startDate, node.dueDate]).filter((value): value is string => Boolean(value)).map(parseDay);
  const now = new Date();
  let start = dates.length ? new Date(Math.min(...dates.map(Number))) : new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
  let end = dates.length ? new Date(Math.max(...dates.map(Number))) : new Date(Date.UTC(now.getFullYear(), now.getMonth() + 3, 0));
  if (scale === "week") {
    start = startOfWeek(start);
    end = new Date(end.getTime() + 7 * DAY);
  } else {
    start = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    end = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0));
  }
  return { start, end };
}

function columnsFor(start: Date, end: Date, scale: Scale) {
  const columns: Array<{ key: string; label: string; start: Date }> = [];
  const cursor = new Date(start);
  while (cursor <= end && columns.length < 80) {
    columns.push({
      key: cursor.toISOString(),
      label: scale === "week"
        ? cursor.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", timeZone: "UTC" })
        : cursor.toLocaleDateString("fr-FR", { month: "long", year: "2-digit", timeZone: "UTC" }),
      start: new Date(cursor),
    });
    if (scale === "week") cursor.setUTCDate(cursor.getUTCDate() + 7);
    else cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return columns;
}

export function Roadmap2Timeline({ nodes, edges, owners, actions, onOpen }: {
  nodes: Roadmap2NodeDto[];
  edges: Roadmap2EdgeDto[];
  owners: Roadmap2Owner[];
  actions: Roadmap2UiActions;
  onOpen: (nodeId: string) => void;
}) {
  const [scale, setScale] = useState<Scale>("month");
  const [grouping, setGrouping] = useState<Grouping>("category");
  const datedNodes = useMemo(() => nodes.filter((node) => node.startDate || node.dueDate), [nodes]);
  const { start, end } = useMemo(() => timelineRange(datedNodes, scale), [datedNodes, scale]);
  const columns = useMemo(() => columnsFor(start, end, scale), [start, end, scale]);
  const totalMs = Math.max(DAY, end.getTime() - start.getTime() + DAY);
  const criticalIds = useMemo(() => {
    const nodeMap = new Map(nodes.map((node) => [node.id, node]));
    return new Set(edges.filter((edge) => {
      const source = nodeMap.get(edge.sourceNodeId);
      return edge.relationType === "blocks" || (edge.relationType === "dependency" && source && (source.status === "blocked" || isRoadmap2Overdue(source)));
    }).map((edge) => edge.targetNodeId));
  }, [nodes, edges]);

  const groups = useMemo(() => {
    const grouped = new Map<string, Roadmap2NodeDto[]>();
    for (const node of datedNodes) {
      const key = grouping === "category" ? node.category : node.ownerUserId ?? "unassigned";
      grouped.set(key, [...(grouped.get(key) ?? []), node]);
    }
    return [...grouped.entries()];
  }, [datedNodes, grouping]);

  if (datedNodes.length === 0) {
    return <div className={styles.timelineEmpty}><Icon name="calendar-range" size={28} /><h2>Aucune période planifiée</h2><p>Les barres apparaîtront dès qu’une date de début ou une échéance sera enregistrée.</p></div>;
  }

  return (
    <section className={styles.timelineShell} aria-label="Timeline Roadmap 2">
      <div className={styles.timelineToolbar}>
        <div><strong>Échelle</strong><button className={scale === "week" ? styles.selectedControl : ""} onClick={() => setScale("week")}>Semaine</button><button className={scale === "month" ? styles.selectedControl : ""} onClick={() => setScale("month")}>Mois</button></div>
        <div><strong>Regrouper</strong><button className={grouping === "category" ? styles.selectedControl : ""} onClick={() => setGrouping("category")}>Catégorie</button><button className={grouping === "owner" ? styles.selectedControl : ""} onClick={() => setGrouping("owner")}>Responsable</button></div>
        <span className={styles.timelineLegend}><i className={styles.legendLate} /> Retard <i className={styles.legendCritical} /> Dépendance critique</span>
      </div>
      <div className={styles.timelineScroll}>
        <div className={styles.timelineContent} style={{ minWidth: 340 + columns.length * (scale === "week" ? 88 : 138) }}>
          <div className={styles.timelineHeader}>
            <div className={styles.timelineSticky}>Résultat et dates</div>
            <div className={styles.timelineColumns}>{columns.map((column) => <div key={column.key}>{column.label}</div>)}</div>
          </div>
          {groups.map(([groupKey, groupNodes]) => {
            const groupLabel = grouping === "category"
              ? ROADMAP2_CATEGORY_LABELS[groupKey as keyof typeof ROADMAP2_CATEGORY_LABELS]
              : owners.find((owner) => owner.id === groupKey)?.name ?? "Non assigné";
            return (
              <div key={groupKey} className={styles.timelineGroup}>
                <h3>{groupLabel}<span>{groupNodes.length}</span></h3>
                {groupNodes.map((node) => {
                  const startDate = parseDay(node.startDate ?? node.dueDate!);
                  const dueDate = parseDay(node.dueDate ?? node.startDate!);
                  const left = Math.max(0, ((startDate.getTime() - start.getTime()) / totalMs) * 100);
                  const width = Math.max(1.4, ((dueDate.getTime() - startDate.getTime() + DAY) / totalMs) * 100);
                  const overdue = isRoadmap2Overdue(node);
                  const critical = criticalIds.has(node.id);
                  return (
                    <div key={node.id} className={`${styles.timelineRow} ${overdue ? styles.timelineOverdue : ""} ${critical ? styles.timelineCritical : ""}`}>
                      <div className={`${styles.timelineSticky} ${styles.timelineLabel}`}>
                        <button onClick={() => onOpen(node.id)}><span>{node.type === "milestone" && <i className={styles.timelineDiamond} />}{node.title}</span><small>{ROADMAP2_STATUS_LABELS[node.status]} · {node.owner?.name ?? "Non assigné"}</small></button>
                        <div className={styles.quickDates}>
                          <label><span>Début</span><input type="date" value={node.startDate ?? ""} onChange={(event) => void actions.quickUpdate(node, { startDate: event.target.value || null })} /></label>
                          <label><span>Échéance</span><input type="date" value={node.dueDate ?? ""} onChange={(event) => void actions.quickUpdate(node, { dueDate: event.target.value || null })} /></label>
                        </div>
                      </div>
                      <div className={styles.timelineTrack}>
                        <div className={`${styles.timelineBar} ${styles[`timelineStatus_${node.status}`]} ${node.type === "milestone" ? styles.milestoneBar : ""}`} style={{ left: `${left}%`, width: `${Math.min(width, 100 - left)}%` }} onClick={() => onOpen(node.id)} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter") onOpen(node.id); }} title={`${node.title} · ${formatRoadmap2Date(node.startDate)} → ${formatRoadmap2Date(node.dueDate)}`}>
                          <span>{node.type === "milestone" ? "◆" : node.title}</span><b>{node.progressPercent}%</b>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
