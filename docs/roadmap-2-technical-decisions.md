# Roadmap 2 — décisions produit et techniques

## Périmètre et isolation

- La route historique `/admin/roadmap`, le modèle `RoadmapMilestone`, `src/server/roadmap.ts` et `src/server/roadmap-actions.ts` restent inchangés.
- La nouvelle route est `/admin/roadmap-2` et son libellé visible est exactement **Roadmap 2**.
- Roadmap 2 utilise un workspace plateforme privé distinct. Le navigateur ne choisit jamais son `workspaceId` : chaque lecture ou mutation le résout après `requirePlatformAdmin()`.
- Aucun endpoint public, sitemap ou donnée de démonstration publique n'est ajouté.

## Source de vérité

- PostgreSQL/Prisma reste l'unique source de vérité.
- `Roadmap2Node`, `Roadmap2Edge` et `Roadmap2Update` utilisent des relations explicites ; les dépendances ne sont pas stockées dans un JSON opaque.
- Le sens d'une arête est toujours `source → cible`. Pour `dependency`, la source est le prérequis et la cible le résultat conditionné ; l'interface affiche donc « Prérequis pour » et contextualise les relations entrantes.
- `Roadmap2Workspace` contient uniquement la configuration privée du workspace, dont l'URL du dossier Drive racine.
- Google Drive reste la source documentaire : le MVP ne stocke que deux URL HTTPS autorisées par nœud et n'appelle aucune API Google.

## Collaboration et conflits

- Toutes les mutations d'un nœud utilisent `version` avec un `updateMany` atomique. Une version obsolète renvoie un conflit explicite et n'écrase aucune donnée.
- Un panneau déjà ouvert fige sa version de base. Si le polling reçoit une version plus récente, le brouillon local est conservé, l'enregistrement est bloqué et l'utilisateur doit recharger explicitement la version reçue.
- Les vues partagent un état client unique et sont rafraîchies périodiquement pour rendre visibles les modifications d'un autre administrateur, sans construire un éditeur temps réel complexe.
- Chaque mutation sensible écrit un audit minimal sans URL Drive, description ni contenu de note.

## Interface

- `@xyflow/react` est retenu : aucune bibliothèque de graphe n'est actuellement installée.
- Les vues Graphe, Timeline et Liste consomment le même DTO et les mêmes filtres.
- La Liste fournit l'alternative clavier aux déplacements et connexions du graphe.
- Le détail utilise un panneau latéral éditorial ; les URL et notes privées sont masquées lors de l'impression/export de synthèse.
- Sur mobile, Liste et Timeline sont prioritaires et le Graphe passe en navigation simplifiée.

## Sécurité

- Chaque Server Action est considérée comme un point d'entrée non fiable : authentification, autorisation et validation Zod sont répétées côté serveur.
- RLS est activé sur les cinq tables Roadmap 2 sans politique pour les rôles Supabase directs. Seul le rôle backend Prisma `BYPASSRLS` y accède, après les contrôles admin/workspace applicatifs.
- Les URL sont limitées à HTTPS, 2 048 caractères et aux hôtes exacts `drive.google.com` ou `docs.google.com`.
- Les textes sont rendus par React sans HTML injecté.
- L'archivage est l'action courante ; la suppression définitive exige une confirmation explicite dans l'UI et reste réservée au super-admin plateforme.
