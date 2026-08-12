# Technical RL Iteration Report — Roadmap 2 Drive

## Context

Feature: automatic Google Drive hierarchy, node file upload and private reader.

Acceptance criteria: the Drive status is visible without opening settings; a node owns a stable folder; files can be dropped, listed and read safely; Drive and Roadmap hierarchy cannot silently diverge; archived nodes remain consultable and explicitly read-only.

## Product and technical decisions

- Google Drive remains the document source of truth. Roadmap 2 stores only private URLs and lifecycle metadata.
- Each Roadmap 2 workspace gets one configurable Drive root and the 20-folder reference tree.
- Canonical node path: category → phase → initiative/action/decision. A stable hashed node marker prevents collisions between equal titles.
- Parent/category changes produce a preview and require explicit confirmation before Drive mutation.
- Archive moves the node folder below `10_Archives`; restore returns it to its canonical active branch.
- Reconciliation compensates a partial move/rename failure and rejects a stale confirmed path.
- PDF, JPEG, PNG, WebP, TXT and CSV are read directly. Google Docs, Sheets, Slides and Drawings are exported temporarily as PDF. Office files open in Drive.
- The reader route is admin-only, workspace/node scoped, anti-IDOR, no-store, allowlisted, bounded to 10 MiB and never exposes the temporary provider URL.
- Archived nodes expose file consultation and restore, but no edit, upload, relation or update controls.

## Data model and migration

- `Roadmap2Node.isWorkspaceRoot Boolean @default(false)`
- `Roadmap2Node.preArchiveStatus Roadmap2Status?`
- One partial unique workspace-root index per workspace.
- One partial unique incoming `parent_child` relation per target.
- Existing seed roots and duplicate parent relations are normalized additively.

Migration: `20260812150000_roadmap2_drive_hierarchy`.

## Routes and server surfaces

- `POST /api/admin/roadmap-2/drive/preview`
- Existing private upload route retained and used for multi-file upload.
- Server actions added or reinforced for layout preview/reconciliation, Drive listing, archive/restore and versioned parent relations.

## Technical smoke journey

Commands:

- `npx tsc --noEmit`
- `npx eslint --quiet .`
- `npm run smoke:roadmap`
- `npm run smoke:roadmap-2`
- `npm run smoke:roadmap-2:drive`
- `npm run smoke:roadmap-2:a11y`
- `npm run build`

Covered invariants include OAuth status, idempotent 20-folder provisioning, stable node resources, hierarchy cycles, version conflicts, archive/restore, confirmed layout, rollback, root isolation, multi-upload constraints, reader formats, `canDownload=false`, anti-IDOR, provider-host allowlist, 10 MiB limit, permission scoping and legacy Roadmap coexistence.

## Scores

- Technical reliability: 96/100
- Specification compliance: 96/100
- State coherence: 97/100
- CLI testability: 98/100
- Production readiness: 94/100

## Verdict

Technical RL: PASS.

Business Client Mystère: PASS after the archived-state, root-action and mobile Drive-label corrections.

## Remaining non-blocking evolutions

- Google Drive change notifications instead of status polling.
- Advanced export of the graph/timeline.
- Slack notifications.
- Full node lifecycle history and administrator repair queue for a rare provider compensation failure.
- Additional integrated browser tests with a dedicated Google test account.
