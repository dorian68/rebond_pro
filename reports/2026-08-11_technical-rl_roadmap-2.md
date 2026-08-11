# Technical RL Iteration Report — Roadmap 2

## Contexte

- Produit : Le Bon Rebond.
- Feature : workspace stratégique privé « Roadmap 2 ».
- Route : `/admin/roadmap-2`, indépendante de `/admin/roadmap`.
- Utilisateurs : administrateurs plateforme autorisés, principalement Dorian et Mathurin.
- Source documentaire : Google Drive ; le MVP ne conserve que des URL HTTPS validées.

## Décisions produit et techniques

- La Roadmap historique, ses composants, ses actions serveur et sa table `RoadmapMilestone` ne sont ni renommés ni réutilisés comme terrain d'expérimentation.
- PostgreSQL/Prisma est la source de vérité des trois vues. Les relations sont des lignes dédiées, jamais un JSON opaque.
- `@xyflow/react` fournit le graphe, aucune bibliothèque de graphe concurrente n'étant présente.
- Les mutations passent exclusivement par des Server Actions qui résolvent l'administrateur et le workspace côté serveur. Aucun `workspaceId` envoyé par le client n'est accepté.
- `version` et `updateMany` assurent le contrôle optimiste atomique. Le détail fige la version d'ouverture ; une version distante plus récente préserve le brouillon et bloque l'écriture jusqu'au rechargement explicite.
- Une relation `dependency` se lit `source → cible`, soit « source est un prérequis pour cible ».
- Les URL Drive sont limitées à HTTPS, 2 048 caractères et aux hôtes exacts `drive.google.com` et `docs.google.com`. Elles ne sont jamais écrites dans l'audit.
- Le seed est manuel, transactionnel et refusé dès qu'un nœud existe. Il crée 65 nœuds et 110 relations.
- L'export MVP utilise l'impression propre et exclut par défaut liens Drive et suivi privé. PNG et export PDF explicite restent des SHOULD.

## Patch

### Fichiers créés

- `prisma/migrations/20260811120000_add_roadmap_2/migration.sql`
- `docs/roadmap-2-technical-decisions.md`
- `src/lib/roadmap2.ts`
- `src/server/roadmap2.ts`
- `src/server/roadmap2-actions.ts`
- `src/server/roadmap2-seed.ts`
- `src/app/admin/admin-shell.module.css`
- `src/app/admin/roadmap-2/page.tsx`
- `src/app/admin/roadmap-2/roadmap2-client.tsx`
- `src/app/admin/roadmap-2/roadmap2-detail.tsx`
- `src/app/admin/roadmap-2/roadmap2-graph.tsx`
- `src/app/admin/roadmap-2/roadmap2-timeline.tsx`
- `src/app/admin/roadmap-2/roadmap2-list.tsx`
- `src/app/admin/roadmap-2/roadmap2-ui.ts`
- `src/app/admin/roadmap-2/roadmap2.module.css`
- `scripts/smoke-roadmap-2.ts`
- `scripts/smoke-roadmap-2-a11y.mjs`
- `scripts/smoke-roadmap-2-http.mjs`
- `reports/2026-08-11_technical-rl_roadmap-2.md`
- `reports/2026-08-11_business-client_roadmap-2.md`

### Fichiers modifiés dans ce périmètre

- `package.json`, `package-lock.json`
- `prisma/schema.prisma`
- `src/app/admin/admin-nav.tsx`
- `src/app/admin/layout.tsx`
- `scripts/smoke-all.mjs`
- `FUNCTIONAL_SPECIFICATION.md`
- `CLI_TESTABILITY_CONTRACT.md`
- `PRODUCTION_READINESS.md`

Le dépôt contenait déjà d'autres modifications non liées ; elles ont été conservées. `prisma format` a également réaligné mécaniquement le schéma sans supprimer les changements existants.

## Schéma de données final

- `Roadmap2Workspace` : workspace privé, clé stable, nom et URL Drive racine.
- `Roadmap2Node` : contenu, type, catégorie, statut, priorité, progression, responsable, dates, prochaine action, décision, definition of done, deux URL Drive, parent, position/taille, version, archive et auteurs.
- `Roadmap2Edge` : workspace, source, cible, `dependency | parent_child | blocks | contributes_to`, créateur et date.
- `Roadmap2Update` : nœud, auteur, `progress | decision | blocker | note | validation`, corps et dates.
- `Roadmap2AuditLog` : acteur, action, type/ID d'entité et date, sans payload sensible.

La migration est additive. Elle a été appliquée au PostgreSQL/Supabase actif et le client Prisma a été régénéré. RLS est activé sur les cinq tables privées sans politique d'accès direct Supabase ; le rôle backend Prisma `postgres` possède `BYPASSRLS` et reste soumis aux guards applicatifs avant toute requête Roadmap 2. Cette base historique ne possède pas un suivi `_prisma_migrations` exploitable pour les anciennes migrations ; le SQL versionné reste donc la preuve de déploiement et devra être intégré au processus de baselining avant un futur `prisma migrate deploy` global.

## Routes et actions ajoutées

- Page privée : `GET /admin/roadmap-2`.
- Aucun endpoint Roadmap 2 public.
- Server Actions : création, modification, déplacement, archivage, suppression, duplication, création/suppression de relation, ajout de suivi, configuration Drive racine et initialisation du seed.

## Smoke journey

Le parcours CLI crée des utilisateurs et workspaces jetables, puis valide :

1. création d'un nœud et d'un sous-nœud ;
2. relation parent/enfant et dépendance ;
3. déplacement et persistance ;
4. rejet d'une version obsolète sans écrasement ;
5. mise à jour de suivi ;
6. rejet cross-workspace/IDOR ;
7. validation des URL Drive et audit expurgé ;
8. seed 65/110 et refus de doublon ;
9. archivage et suppression ;
10. coexistence avec la Roadmap historique et absence de surface publique ;
11. nettoyage de toutes les fixtures.

## Résultats des tests

| Contrôle | Résultat |
|---|---|
| `npm run smoke:roadmap-2` | PASS |
| `npm run smoke:roadmap-2:a11y` | PASS statique, y compris conflit/opérabilité |
| `npm run smoke:roadmap-2:http` | PASS : deux routes admin `200`, surfaces publiques `404` |
| `npm run smoke:roadmap` | PASS, non-régression historique |
| `npm run smoke:admin-auth` | PASS |
| `npm run smoke:tenant` | PASS |
| `npx prisma validate` / génération client | PASS |
| `npx tsc --noEmit` | PASS |
| `npm run lint` | PASS |
| `npm run build` / `npm run smoke:production` | PASS |
| `npm audit --audit-level=low` | PASS, 0 vulnérabilité |
| campagne headless globale | 38/39 PASS |

L'unique échec global est extérieur à Roadmap 2 : `smoke:public-forms` rencontre `SocrateLeadCapture.email NOT NULL` sur la base distante alors que le code et une migration préexistante non appliquée autorisent le téléphone seul. Ce décalage n'a pas été corrigé silencieusement dans cette mission.

## Sécurité

- PASS : accès admin vérifié serveur sur chaque action.
- PASS : workspace résolu serveur, IDOR cross-workspace rejeté.
- PASS : RLS activé sur les cinq tables Roadmap 2 ; aucun accès PostgREST direct n'est autorisé.
- PASS : schémas Zod et allowlist de champs contre le mass assignment.
- PASS : URL `javascript:`, HTTP, hôte contrefait et domaine tiers rejetés.
- PASS : React échappe les descriptions et aucun `dangerouslySetInnerHTML` n'est utilisé.
- PASS : suppression confirmée, archivage privilégié.
- PASS : URLs et notes absentes des audits ; aucune API publique n'est créée.
- PASS : liens externes avec `target="_blank"` et `rel="noopener noreferrer"`.

## Accessibilité et responsive

- PASS statique : onglets sémantiques, labels, `aria-live`, statut écrit, blocage non chromatique, focus visible, fermeture Escape, alternative Liste, breakpoints mobile/tablette, mouvement réduit et overflow contrôlé.
- BLOQUÉ runtime : navigation clavier complète, piège/focus réel du panneau, contraste calculé, Axe, zoom 200 % et overflow rendu ne sont pas certifiables sans navigateur.

## Inspection visuelle et captures

Le navigateur intégré a été interrogé selon le workflow obligatoire, mais `agent.browsers.list()` a retourné une liste vide. Aucune instance ne pouvait être créée ou attachée. Les captures Graphe, Timeline, Liste, détail et mobile ne sont donc pas fournies : fabriquer des captures ou substituer un autre moteur aurait contredit le protocole de validation.

## Scores

| Dimension | Score |
|---|---:|
| Fiabilité technique du noyau | 94/100 |
| Conformité fonctionnelle MVP | 92/100 |
| Cohérence des états et conflits | 95/100 |
| Testabilité CLI | 96/100 |
| Sécurité | 94/100 |
| Readiness finale, inspection visuelle incluse | 82/100 |

## Itérations

1. Audit du routeur, de l'auth admin, du design system, de Prisma et de la Roadmap historique.
2. Modèle relationnel, migration, repositories, actions gardées et seed.
3. Détail, Drive, suivi, Graphe, Timeline et Liste synchronisés.
4. Smokes DB, HTTP, sécurité, accessibilité statique et build.
5. Revue client mystère : correction du sens des dépendances, du conflit de brouillon, du responsable implicite et de la reconfiguration Drive.
6. Nouvelle validation ciblée et revue business à 4,2/5.

## Verdict

**PASS technique du noyau, PARTIAL pour la définition de done complète.**

La feature ne doit pas être déclarée terminée tant que l'inspection visuelle authentifiée, les captures et l'accessibilité runtime n'ont pas été exécutées. Le verdict Business Client Mystère est également PARTIAL pour ce même blocker d'observation, malgré une intention d'achat positive.

## Risques et suites

- P0 : exécuter le parcours authentifié sur un navigateur disponible, produire les cinq captures demandées et lancer Axe/zoom 200 %.
- P1 : proposer un niveau de lecture progressif du graphe initialisé et une attribution en masse Dorian/Mathurin.
- P1 : clarifier les KPI agrégés, notamment « initiatives actives » et progression globale.
- P2 : ajouter export PNG/PDF explicite, historique complet et mémorisation de vue.
- Évolutions séparées : OAuth/API Drive et création automatique de dossiers, notifications Slack, historique complet et export avancé.

## Procédures opérateur

- Initialisation : ouvrir `/admin/roadmap-2` avec un compte admin autorisé, puis choisir « Initialiser la roadmap Le Bon Rebond » et confirmer. L'action est refusée si le workspace contient déjà un nœud.
- Drive racine : choisir « Configurer Drive » dans l'état vide ou « Modifier Drive » dans l'en-tête, saisir une URL HTTPS `drive.google.com`, puis enregistrer.
