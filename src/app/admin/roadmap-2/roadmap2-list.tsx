"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import {
  ROADMAP2_CATEGORY_LABELS,
  ROADMAP2_PRIORITY_LABELS,
  ROADMAP2_STATUSES,
  ROADMAP2_STATUS_LABELS,
  ROADMAP2_TYPE_LABELS,
  type Roadmap2EdgeDto,
  type Roadmap2NodeDto,
  type Roadmap2Owner,
} from "@/lib/roadmap2";
import type { Roadmap2UiActions } from "./roadmap2-client";
import { formatRoadmap2Date, isRoadmap2Overdue } from "./roadmap2-ui";
import styles from "./roadmap2.module.css";

type SortKey = "title" | "category" | "owner" | "status" | "priority" | "dueDate" | "updatedAt";

function SortHeader({ label, value, active, direction, onSort }: { label: string; value: SortKey; active: SortKey; direction: "asc" | "desc"; onSort: (value: SortKey) => void }) {
  return <button onClick={() => onSort(value)} aria-label={`Trier par ${label}`}>{label}{active === value && <span aria-hidden>{direction === "asc" ? " ↑" : " ↓"}</span>}</button>;
}

export function Roadmap2List({ nodes, edges, owners, actions, onOpen }: {
  nodes: Roadmap2NodeDto[];
  edges: Roadmap2EdgeDto[];
  owners: Roadmap2Owner[];
  actions: Roadmap2UiActions;
  onOpen: (nodeId: string) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");
  const dependencies = useMemo(() => {
    const map = new Map<string, number>();
    for (const edge of edges) if (edge.relationType === "dependency" || edge.relationType === "blocks") map.set(edge.targetNodeId, (map.get(edge.targetNodeId) ?? 0) + 1);
    return map;
  }, [edges]);
  const sorted = useMemo(() => [...nodes].sort((a, b) => {
    const values: Record<SortKey, [string, string]> = {
      title: [a.title, b.title],
      category: [a.category, b.category],
      owner: [a.owner?.name ?? "", b.owner?.name ?? ""],
      status: [a.status, b.status],
      priority: [a.priority, b.priority],
      dueDate: [a.dueDate ?? "9999", b.dueDate ?? "9999"],
      updatedAt: [a.updatedAt, b.updatedAt],
    };
    const result = values[sortKey][0].localeCompare(values[sortKey][1], "fr");
    return direction === "asc" ? result : -result;
  }), [nodes, sortKey, direction]);

  function sort(value: SortKey) {
    if (sortKey === value) setDirection((current) => current === "asc" ? "desc" : "asc");
    else { setSortKey(value); setDirection("asc"); }
  }

  return (
    <section className={styles.listShell} aria-label="Liste de gestion Roadmap 2">
      <div className={styles.listIntro}><strong>{sorted.length} éléments</strong><span>Édition rapide · alternative accessible au glisser-déposer</span></div>
      <div className={styles.tableScroll}>
        <table className={styles.roadmapTable}>
          <thead><tr>
            <th><SortHeader label="Titre" value="title" active={sortKey} direction={direction} onSort={sort} /></th>
            <th><SortHeader label="Catégorie / type" value="category" active={sortKey} direction={direction} onSort={sort} /></th>
            <th><SortHeader label="Responsable" value="owner" active={sortKey} direction={direction} onSort={sort} /></th>
            <th><SortHeader label="Statut" value="status" active={sortKey} direction={direction} onSort={sort} /></th>
            <th><SortHeader label="Priorité" value="priority" active={sortKey} direction={direction} onSort={sort} /></th>
            <th>Progression</th>
            <th>Début</th>
            <th><SortHeader label="Échéance" value="dueDate" active={sortKey} direction={direction} onSort={sort} /></th>
            <th>Prochaine action</th>
            <th>Dépendances</th>
            <th>Dossier Drive</th>
            <th><SortHeader label="Mise à jour" value="updatedAt" active={sortKey} direction={direction} onSort={sort} /></th>
            <th>Actions</th>
          </tr></thead>
          <tbody>
            {sorted.map((node) => {
              const overdue = isRoadmap2Overdue(node);
              return (
                <tr key={node.id} className={`${overdue ? styles.listOverdue : ""} ${node.status === "blocked" ? styles.listBlocked : ""}`}>
                  <td data-label="Titre"><button className={styles.titleButton} onClick={() => onOpen(node.id)}><strong>{node.title}</strong><span>{node.status === "blocked" && <Icon name="alert-triangle" size={12} />} {ROADMAP2_STATUS_LABELS[node.status]}</span></button></td>
                  <td data-label="Catégorie / type"><span className={styles.cellStrong}>{ROADMAP2_CATEGORY_LABELS[node.category]}</span><small>{ROADMAP2_TYPE_LABELS[node.type]}</small></td>
                  <td data-label="Responsable"><select aria-label={`Responsable de ${node.title}`} value={node.ownerUserId ?? ""} onChange={(event) => void actions.quickUpdate(node, { ownerUserId: event.target.value || null })}><option value="">Non assigné</option>{owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}</option>)}</select></td>
                  <td data-label="Statut"><select className={styles[`selectStatus_${node.status}`]} aria-label={`Statut de ${node.title}`} value={node.status} onChange={(event) => void actions.quickUpdate(node, { status: event.target.value as Roadmap2NodeDto["status"] })}>{ROADMAP2_STATUSES.map((status) => <option key={status} value={status}>{ROADMAP2_STATUS_LABELS[status]}</option>)}</select></td>
                  <td data-label="Priorité"><span className={`${styles.priorityPill} ${styles[`priority_${node.priority}`]}`}>{node.priority} · {ROADMAP2_PRIORITY_LABELS[node.priority]}</span></td>
                  <td data-label="Progression"><div className={styles.listProgress}><span style={{ width: `${node.progressPercent}%` }} /><b>{node.progressPercent}%</b></div></td>
                  <td data-label="Début"><input type="date" aria-label={`Date de début de ${node.title}`} value={node.startDate ?? ""} onChange={(event) => void actions.quickUpdate(node, { startDate: event.target.value || null })} /></td>
                  <td data-label="Échéance"><input className={overdue ? styles.dateOverdue : ""} type="date" aria-label={`Échéance de ${node.title}`} value={node.dueDate ?? ""} onChange={(event) => void actions.quickUpdate(node, { dueDate: event.target.value || null })} />{overdue && <small className={styles.overdue}>En retard</small>}</td>
                  <td data-label="Prochaine action"><span className={styles.nextAction}>{node.nextAction ?? "À préciser"}</span></td>
                  <td data-label="Dépendances"><button className={styles.dependencyCount} onClick={() => onOpen(node.id)}>{dependencies.get(node.id) ?? 0}</button></td>
                  <td data-label="Dossier Drive">{node.driveFolderUrl ? <a className={styles.driveIconLink} href={node.driveFolderUrl} target="_blank" rel="noopener noreferrer" aria-label={`Ouvrir le dossier Drive de ${node.title}`}><Icon name="external" size={15} /> Ouvrir</a> : <button className={styles.missingLink} onClick={() => onOpen(node.id)}>Ajouter un lien</button>}</td>
                  <td data-label="Mise à jour"><span>{new Date(node.updatedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}</span><small>{node.updatedBy?.name ?? "—"}</small></td>
                  <td data-label="Actions"><div className={styles.rowActions}><button onClick={() => onOpen(node.id)} aria-label={`Ouvrir ${node.title}`}><Icon name="edit" size={15} /></button><button onClick={() => void actions.archiveNode(node)} aria-label={`Archiver ${node.title}`}><Icon name="download" size={15} /></button></div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className={styles.listFootnote}>Les liens Drive et les notes internes sont exclus de l’impression de synthèse. Dernière période affichée : {formatRoadmap2Date(sorted[0]?.dueDate ?? null)}.</p>
    </section>
  );
}
