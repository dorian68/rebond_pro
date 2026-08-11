# Business Client Mystère Report — Roadmap 2

## Contexte

- **Produit :** Le Bon Rebond, rubrique privée `/admin/roadmap-2`.
- **Utilisateurs testés :** Dorian et Mathurin, dans le rôle de propriétaires/opérateurs de la plateforme.
- **Parcours :** comprendre les priorités, initialiser la roadmap, passer du graphe à la timeline et à la liste, piloter un résultat, consulter Drive et publier un suivi court.
- **Promesse évaluée :** transformer les chantiers du Bon Rebond en une vue d'ensemble actionnable, avec responsables, échéances, dépendances, décisions et preuves Drive.
- **Positionnement :** cockpit interne de pilotage, pas gestionnaire documentaire ni clone de Notion.

La rubrique historique **Roadmap** est toujours présente et distincte de **Roadmap 2**. Le smoke HTTP confirmé sur l'environnement utile retourne `200` pour les deux routes et `404` pour les surfaces publiques `/roadmap-2` et `/api/roadmap-2`.

## Périmètre d'observation et preuves

Documents lus intégralement : `AGENT_BUSINESS_CLIENT_MYSTERE.md`, `PRODUCT_PHILOSOPHY.md`, `FUNCTIONAL_SPECIFICATION.md`, `PRODUCTION_READINESS.md` et `docs/roadmap-2-technical-decisions.md`. Aucun rapport Roadmap 2 antérieur n'était présent au moment de la revue.

Preuves disponibles :

- `smoke:roadmap-2` : **PASS** — 65 nœuds, 110 relations, CRUD, positions, suivi, conflit, IDOR, URL Drive, audit, seed idempotent et non-régression structurelle ;
- `smoke:roadmap-2:http` : **PASS** sur l'environnement Supabase utilisé pour la validation ;
- `smoke:roadmap-2:a11y` : **PASS**, relancé après les corrections d'opérabilité ;
- `smoke:admin-auth`, `smoke:tenant`, ESLint, TypeScript, build production et audit des dépendances : **PASS** selon les résultats techniques transmis ;
- inspection des sources UI, des libellés, des états vides, du responsive CSS, de l'impression et des parcours de mutation.

Limite majeure : aucun navigateur intégré n'est disponible (`agent.browsers.list()` a retourné `[]`). Il n'a donc pas été possible de cliquer réellement le parcours authentifié, d'inspecter les captures desktop/tablette/mobile, ni d'exécuter axe dans un DOM rendu. Le smoke a11y est un contrôle statique utile, mais ne remplace pas cette validation. Une tentative HTTP locale indépendante a aussi été bloquée par PostgreSQL local indisponible ; elle n'est pas comptée comme un échec produit puisque le même smoke a passé sur l'environnement fonctionnel.

## Premières 30 secondes

**Ce que je comprends :** Roadmap 2 est un « studio de pilotage privé · Dorian & Mathurin ». La phrase « Du cap stratégique aux preuves Drive, sans perdre le fil des décisions » explique correctement sa place entre stratégie et documentation.

**Action évidente :** créer un nœud, créer une décision ou initialiser la roadmap du Bon Rebond. L'état vide explique le résultat attendu avant de demander une action.

**Confusion restante :** après l'initialisation, le graphe doit présenter 65 nœuds et 110 relations. Sans repli par phase ni niveau de lecture initial, le risque de « mur de nœuds » est élevé et ne peut pas être levé sans inspection visuelle.

## Parcours évalué

1. La navigation admin présente **Roadmap** puis **Roadmap 2**, sans ambiguïté.
2. Le premier accès propose initialisation, premier nœud et configuration Drive racine.
3. L'initialisation est volontaire, confirmée et non rejouable ; elle annonce que l'attribution à l'initialisateur est provisoire.
4. Graphe, Timeline et Liste utilisent le même état et les mêmes filtres.
5. La Liste permet les changements rapides de responsable, statut et dates, et sert d'alternative au glisser-déposer.
6. Le détail regroupe objectif, pilotage, documents, relations et suivi sans devenir une messagerie.
7. Les liens Drive restent des URL externes ; l'application ne prétend ni importer ni synchroniser leur contenu.
8. L'archivage est accessible et la suppression définitive exige une confirmation explicite.

**Valeur attendue :** réduire le temps de préparation des points Dorian/Mathurin et éviter qu'une décision, un blocage ou une preuve documentaire soit dissocié du résultat concerné.

**Valeur constatée :** la structure livre bien ce contrat. La valeur est persistée et réutilisée entre les trois vues ; elle n'est pas décorative.

## Boucle de correction réalisée

La première revue a identifié quatre risques de confiance, corrigés avant ce verdict :

- la relation `dependency` affichait « Dépend de » alors que le contrat source → cible signifiait prérequis → résultat dépendant ; elle affiche maintenant **« Prérequis pour »**, avec libellé entrant **« A pour prérequis »** ;
- le polling pouvait apporter une nouvelle version au parent tout en conservant un ancien formulaire, puis autoriser son enregistrement ; le panneau fige maintenant sa version de base, préserve le brouillon, signale la nouvelle version et bloque l'enregistrement jusqu'au rechargement explicite ;
- un nouveau nœud était attribué silencieusement au premier administrateur trié ; le responsable est maintenant vide et obligatoire ;
- le dossier Drive racine devenait impossible à reconfigurer après sa première saisie ; l'action **Modifier Drive** reste maintenant disponible.

Le smoke statique `operability_and_conflict_feedback` passe après ces corrections.

## Revue UX

### Clarté

La promesse, les trois vues et les actions principales sont immédiatement compréhensibles. Les statuts sont écrits, les blocages possèdent aussi un signal non chromatique et les absences de Drive ou de dates ne sont pas présentées comme des succès.

### Confiance

Google Drive reste explicitement la source documentaire. Les URL sont privées, validées et exclues de l'impression. L'auteur, l'heure et la version sont visibles. La correction du conflit de brouillon est décisive : sans elle, la promesse de collaboration aurait été trompeuse.

### Friction

Le détail est structuré et la Liste permet d'agir sans manipuler le graphe. Les principales frictions restantes concernent l'échelle de la roadmap initialisée, la répartition en masse des responsables et la compréhension des indicateurs agrégés.

### Cohérence

Le produit respecte le principe « un résultat → un responsable et une échéance → une preuve Drive → un suivi court ». Graphe, Timeline, Liste et détail racontent la même histoire.

### États vides et erreurs

L'activation vide est utile. Les conflits, validations, cibles absentes et erreurs de persistance sont annoncés. La qualité visuelle et l'absence de débordements à 200 % restent toutefois à vérifier dans un navigateur réel.

## Trois forces

1. **Positionnement net :** l'outil apporte la vue d'ensemble et renvoie vers Drive au lieu de tenter de le remplacer.
2. **Valeur opérationnelle cohérente :** trois lectures synchronisées, suivi court, prochaines actions, responsabilité et dates dans un même flux.
3. **Activation crédible :** le seed complet fait gagner plusieurs heures de structuration et reste volontaire, idempotent et annoncé comme modifiable.

## Trois frictions principales

1. **Densité initiale :** 65 nœuds et 110 relations peuvent rendre la vue principale illisible au zoom global. Il manque une lecture progressive par phases/jalons ou un mécanisme de repli.
2. **Répartition des responsables :** l'attribution provisoire au lanceur est honnêtement annoncée, mais répartir manuellement 65 éléments entre Dorian et Mathurin reste coûteux.
3. **Confiance dans les KPI :** « initiatives actives » compte initiatives et actions, tandis que la progression globale moyenne aussi racine, phases, jalons et actions. Les chiffres sont calculés, mais leur sens métier n'est pas assez explicite.

## Revue commerciale

**Est-ce que je paierais ?** Oui selon la grille, à condition que la validation visuelle finale confirme la lisibilité du graphe initialisé et l'opérabilité mobile.

**Hypothèse de prix :** Roadmap 2 n'a pas vocation à être vendue seule à Dorian et Mathurin. Pour une future offre à d'autres petites équipes, sa valeur actuelle justifierait un module inclus dans un plan premium ou un test autour de **20–30 € par utilisateur et par mois**, pas davantage avant historique avancé, notifications et export enrichi.

**Pourquoi :** il peut remplacer des heures de consolidation entre feuilles, documents Drive et réunions, tout en réduisant le risque de travailler dans le mauvais ordre.

**Ce qui bloque une mise en vente externe :** le produit est aujourd'hui nommé et initialisé spécifiquement pour Le Bon Rebond, sans parcours multi-workspace commercial ni preuve d'usage réel prolongé.

## Scores 0–5

| Critère | Score | Justification courte |
|---|---:|---|
| Clarté de la promesse | **4,5/5** | Positionnement et activation compris sans effort. |
| Parcours principal | **4,0/5** | Parcours complet prouvé par persistance et sources, mais non cliqué visuellement. |
| Valeur perçue | **4,5/5** | Gain de structuration, d'alignement et de préparation de réunion immédiat. |
| Confiance | **4,3/5** | Données réelles, Drive assumé, permissions et conflits protégés ; KPI à clarifier. |
| Conversion / prochaine étape | **3,7/5** | CTA nets, mais l'après-seed demande encore un effort de tri et d'attribution. |
| **Score global** | **4,2/5** | Moyenne : 21/25. |

Interprétation selon la grille du dépôt : **« paierait »** (≥ 3,5).

### Verdict par persona

- **Dorian — paierait :** la lecture stratégique, les jalons et les preuves Drive répondent directement au besoin de pilotage.
- **Mathurin — paierait :** la Liste, les mises à jour rapides et les prochaines actions rendent l'outil opérable ; le confort mobile doit encore être observé.

## Verdict

**PARTIAL — intention d'achat positive, validation business finale non certifiable sans inspection visuelle.**

La proposition de valeur et les parcours métier atteignent le niveau « paierait ». Les quatre risques d'opérabilité détectés pendant la revue ont été corrigés. Je ne prononce toutefois pas **Business PASS** tant que les captures demandées et le parcours authentifié réel n'ont pas été inspectés. Cette réserve est un blocker d'observation, pas un échec technique constaté.

## Corrections prioritaires

### P0 — gate avant Business PASS

- Exécuter dans un navigateur authentifié le parcours complet : seed contrôlé, création, sous-nœud, relation, déplacement, Timeline, Liste, Drive, suivi, conflit à deux sessions, archivage et suppression.
- Inspecter et joindre les captures graphe, timeline, liste, détail et mobile, avec roadmap vide/initialisée, blocage et nœud terminé.
- Lancer une vérification a11y runtime : clavier complet, focus modal, zoom 200 %, contraste, annonces et absence d'overflow hors canvas/timeline contrôlés.

### P1 — adoption quotidienne

- Ajouter une lecture progressive du graphe : repli par phase, vue initiale phases + jalons, ou preset « Cap stratégique ».
- Ajouter une attribution en masse après le seed, au minimum par phase, pour répartir rapidement Dorian/Mathurin.
- Renommer « initiatives actives » en « résultats actifs » ou limiter le calcul aux initiatives ; documenter/revoir le calcul de progression globale pour éviter le double comptage hiérarchique.

### P2 — enrichissement

- Transformer « Exporter » en choix explicite impression/PDF/PNG tout en conservant le mode synthèse privé par défaut.
- Avertir avant de fermer un panneau contenant des modifications non enregistrées.
- Mémoriser la dernière vue et les filtres de chaque utilisateur si les tests d'usage confirment ce besoin.
