# Rapport Technical RL — Orchestration des parcours

Date : 2026-08-15  
Route : `/admin/orchestration`  
Périmètre : vertical slice de démonstration Emploi’Ton Hôtellerie–Tourisme–Vente–Services.

## Verdict

**PASS technique pour le prototype démontrable. NO-GO production.**

La fonctionnalité est intégrée à l'administration existante, protégée par la garde plateforme, testable depuis la CLI et utilisable comme studio local. Elle matérialise le flux :

```text
Participant State + Target State + Local Ecosystem
→ brouillon explicable
→ validation humaine
→ orchestration et boucle de retour
→ outcome et maintien
→ coût, financement et apprentissage
```

Le prototype ne se présente pas comme une intégration opérationnelle : ses mutations UI sont locales au navigateur, aucune orientation n'est envoyée et aucune donnée partenaire non vérifiée n'est élevée au rang de fait.

## Architecture implémentée

1. **Domaine canonique** — types TypeScript et schémas Zod dans `src/features/orchestration`. Les objets utilisent la composition (`Actor + capabilities + serviceOffers`) et partagent les mêmes compétences entre Passeport, métier et opportunité.
2. **Pathway Engine** — règles déterministes pour gaps, Needs, Capability, recherche d'acteurs, brouillons A/B, transitions Referral, activation du Plan B, coûts, couverture et jalons de sortie. Chaque proposition conserve explication, données utilisées, inconnues et validation humaine obligatoire.
3. **Repository isolé** — repository en mémoire avec validation runtime, contrôle de version optimiste, archivage des versions et mutations métier gardées. Il constitue le contrat de la future implémentation PostgreSQL.
4. **Fixtures et provenance** — scénario Sarah typé, 15 étapes Plan A, 5 étapes Plan B, acteurs synthétiques séparés et seed Guadeloupe normalisé.
5. **Adaptateur de vue** — transformation explicite du snapshot canonique vers des modèles UI. Aucun JSON métier géant n'est embarqué dans le composant.
6. **Studio admin** — Server Component protégé, Client Component interactif, React Flow pour le graphe, six vues, drawers et persistance `localStorage` clairement annoncée comme locale.

La stratégie prototype n'ajoute aucune migration destructive et ne crée ni second parseur de CV ni second profil maître. Le raccordement futur doit adapter le `Beneficiary`/dossier existant vers `ParticipantPassport`.

## Modèle de données

Le modèle comprend :

- `ParticipantPassport`, `SkillClaim`, `ConsentGrant` ;
- `Occupation` et ses compétences/prérequis ;
- `Actor`, `ActorCapability`, `ServiceOffer`, `Opportunity` ;
- `Need`, avec mapping explicite vers une `Capability` ;
- `Pathway`, `PathwayStep` et versions archivées ;
- `Referral` et sa machine d'états ;
- `CostItem` et `FundingAllocation`, strictement distincts ;
- `Outcome` et ses jalons J+7/J+30/J+60/J+90 ;
- cohorte Emploi’Ton et références de source/vérification.

Règles critiques : une compétence inférée n'est pas confirmée ; une absence de donnée ne devient pas un verdict négatif ; un coût inconnu reste `null` ; l'approbation exige identité humaine, responsables, échéances, preuves et relances ; une sortie et chaque maintien exigent acteur, date et preuve dans l'UI.

## Intégration admin et sécurité

- Route : `/admin/orchestration`.
- Navigation : entrée « Orchestration » ajoutée sans modifier les routes Roadmap et Roadmap 2.
- Accès : layout admin existant et page Orchestration appellent la garde serveur `requirePlatformAdmin`.
- Données : scénario entièrement synthétique ; aucune donnée sensible, CV brut ou note sociale n'est journalisée.
- Partage : aperçus employeur, CFA et prescripteur limités au minimum nécessaire ; aucun portail ou compte externe n'est créé.
- Mutations externes : aucune. Les referrals, coûts et sorties sont des simulations locales explicites.

## Intégration des acteurs locaux

L'audit a trouvé trois classeurs dans `financement/excel` et n'a trouvé ni `LE_BON_REBOND_STRAT*.xlsx`, ni `Support_BMO26_v5.pdf`, ni fichier dédié ACTEURS/ENTREPRISES/CFA/OPPORTUNITES/EMPLOITON.

Le seed conserve 47 organisations candidates :

- 47/47 `needs_verification` ;
- 0 capacité, service, contact, opportunité, coût ou financement confirmé ;
- 18 territoires conservés uniquement lorsqu'ils apparaissent littéralement dans le nom ; 29 inconnus ;
- trois répétitions textuelles regroupées après revue explicite ;
- six rapprochements proches laissés en file manuelle ;
- provenance par fichier, onglet/section, cellule ou ligne et empreinte SHA-256 lorsque disponible.

Le Bon Rebond et « Hôtel partenaire A » sont des acteurs de scénario séparés, marqués « Démo synthétique ». Ils ne constituent pas des partenaires réels.

## Fonctionnalités du vertical slice

- barre de pilotage et inbox « À traiter maintenant » dérivées de l'état ;
- cohorte Emploi’Ton et Passeport Rebond de Sarah ;
- comparaison explicable au métier : quatre compétences confirmées sur cinq et gap anglais ;
- graphe Plan A/B, zoom, déplacement, sélection, ajout/suppression de brouillon, dépendances, owner, échéance, preuve et coût ;
- checklist bloquante avant validation et nouvelle version après modification majeure ;
- registre acteurs carte/liste avec filtres, sources et vérification humaine datée ;
- création explicite d'une orientation, statuts, timestamps, refus motivé, relance et activation séparée du Plan B ;
- ledger éditable : prévu, réel, demandé, accordé, payé et reste à financer ;
- sortie et suivis J+7/J+30/J+60/J+90 avec gates de preuve ;
- aperçus de partage minimisés par audience ;
- états vides, inconnus et synthétiques signalés textuellement, pas seulement par couleur.

## Fichiers créés

- `data/guadeloupe-ecosystem.seed.json`
- `data/README-orchestration-sources.md`
- `src/features/orchestration/constants.ts`
- `src/features/orchestration/schemas.ts`
- `src/features/orchestration/types.ts`
- `src/features/orchestration/engine.ts`
- `src/features/orchestration/fixtures.ts`
- `src/features/orchestration/repository.ts`
- `src/features/orchestration/index.ts`
- `src/app/admin/orchestration/page.tsx`
- `src/app/admin/orchestration/orchestration-client.tsx`
- `src/app/admin/orchestration/orchestration-adapter.ts`
- `src/app/admin/orchestration/pathway-canvas.tsx`
- `src/app/admin/orchestration/orchestration.module.css`
- `src/app/admin/orchestration/ui-types.ts`
- `scripts/smoke-orchestration.ts`
- `scripts/capture-orchestration.mjs`
- `reports/2026-08-15_technical-rl_orchestration.md`
- `reports/2026-08-15_business-client_orchestration.md`

## Fichiers modifiés

- `src/app/admin/admin-nav.tsx`
- `package.json`
- `scripts/smoke-all.mjs`
- `CLI_TESTABILITY_CONTRACT.md`
- `PRODUCT_PHILOSOPHY.md`
- `FUNCTIONAL_SPECIFICATION.md`
- `PRODUCTION_READINESS.md`

Le worktree contenait déjà de nombreuses modifications hors périmètre ; elles n'ont pas été nettoyées, réinitialisées ou attribuées à ce lot.

## Données restant à vérifier

- raison sociale, SIRET, type, territoire/bassin, adresse et contacts des 47 acteurs ;
- capacités, services, éligibilité, prérequis, livrables, SLA, disponibilité et règles de partage ;
- acteur mobilité, CFA/centre, employeur et opportunités réellement mobilisables pour Sarah ;
- places, dates, coûts, financeurs, dispositifs et décisions ;
- doublons Mission Locale, France Travail, PLIE, GEIQ, UMIH et ADMR ;
- libellés ambigus CARL, Sygma, RSMA, Conseil Départemental/DSIA et Office de tourisme de la Riviera du Levant.

## Vérifications légères exécutées

| Contrôle | Résultat |
| --- | --- |
| `npm run smoke:orchestration` | **PASS 13/13** — les 12 invariants demandés + garde d'approbation humaine |
| ESLint ciblé sur domaine, route, navigation et scripts | **PASS**, 0 erreur, 0 warning |
| `npx tsc --noEmit --pretty false` | **PASS** |
| `npm run build` | **PASS**, route dynamique `/admin/orchestration` produite |
| Adaptateur runtime | **PASS** — 49 acteurs dont 47 sourcés et 2 synthétiques, 0 vérifié, 20 étapes, 3 coûts inconnus, 0 sortie active |
| Inspection visuelle manuelle | **PASS**, six captures authentifiées |
| Client Mystère | **PASS démo**, 4,5/5 et 89/100 |

Conformément à la contrainte : aucune suite Playwright/Cypress E2E, aucun test de charge et aucun audit de sécurité complet n'ont été exécutés. `smoke:all` n'a pas été lancé. Le script Playwright de capture n'effectue qu'une navigation courte et six captures ; il ne constitue pas une suite E2E.

## Captures

- `.run/orchestration-captures/01-vue-ensemble.png`
- `.run/orchestration-captures/02-passeport-sarah.png`
- `.run/orchestration-captures/03-parcours-plan-a-b.png`
- `.run/orchestration-captures/04-ecosysteme-local.png`
- `.run/orchestration-captures/05-fiche-acteur.png`
- `.run/orchestration-captures/06-couts-financements.png`

## Limites du prototype

- Les modifications UI persistent dans `localStorage`, pas dans PostgreSQL ; le repository canonique n'est pas encore raccordé à des Server Actions.
- L'historique de versions UI n'est pas opposable ni multi-utilisateur.
- Modifier l'objectif invalide le brouillon mais ne relance pas encore automatiquement le moteur.
- Les orientations et réponses sont simulées ; aucun canal partenaire réel n'est connecté.
- Les politiques de vue et consentements sont démonstratives, non appliquées à un export serveur.
- Les 47 acteurs restent des pistes sans capacité opérationnelle confirmée.
- La densité du graphe complet et du ledger mérite un mode guidé supplémentaire.

## Backlog recommandé

### P0 — production

- repository PostgreSQL/Supabase additif, `workspace_id`/tenant, RLS, audit, version optimiste et reprise ;
- qualification des acteurs et doublons avec preuve, responsable, date et renouvellement ;
- Partner Portal minimal et boucle referral idempotente ;
- consentements complets et vues minimisées appliquées côté serveur ;
- notifications/relances avec SLA et journal ;
- tests E2E ciblés, accessibilité runtime, sécurité IDOR/XSS, charge et restauration.

### P1 — pilote

- recalcul/diff explicable après changement d'objectif ;
- pièces jointes de preuve par étape, referral, coût, financement, outcome et suivi ;
- reporting financeur et export de cohorte ;
- mode graphe progressif par phase, besoin ou branche ;
- uniformisation complète des états de vérification après mutation locale.

### P2 — extension

- intégrations France Travail, KAIROS, DORA et Immersion Facilitée ;
- IA avancée uniquement comme suggestion sourcée, explicable et validée ;
- analytics coûts/délais/handoffs/blocages/sorties/J+90 ;
- performance partenaire contextualisée sans classement opaque ;
- programmes supplémentaires sur le même Pathway Engine.
