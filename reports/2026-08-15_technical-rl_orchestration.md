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
4. **Fixtures et provenance** — scénario Sarah typé, 15 étapes Plan A, 5 étapes Plan B, acteurs synthétiques séparés, seed Guadeloupe normalisé et corpus officiel qualifié assertion par assertion.
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

Un second travail documentaire daté du 15 août 2026 qualifie des assertions atomiques depuis des sources publiques primaires : identité et rôle général de prescripteurs, existence de mécanismes, sessions de formation datées, ROME, BMO 2026 et trois offres France Travail volatiles. Cette qualification ne remplace pas le seed initial et ne rend pas les acteurs opérationnels :

- `VERIFIED` s'applique à l'assertion et à sa provenance, jamais à toutes les propriétés d'un acteur ;
- une statistique BMO ne devient jamais une opportunité ;
- un dispositif, plafond ou forfait ne crée aucune allocation de financement ;
- disponibilité, capacité, places, prix, partenariat, éligibilité et décision restent inconnus tant qu'ils ne sont pas prouvés ;
- les offres datées exigent une nouvelle vérification avant activation.

La matrice, ses URLs directes, dates et règles de fraîcheur sont consignées dans `reports/2026-08-15_orchestration-sources.md`.

Le registre documentaire initial contenait 26 références : 20 sources `VERIFIED`, trois offres volatiles et trois fichiers internes en `NEEDS_VERIFICATION`. Il exposait aussi neuf signaux de marché, quatre mécanismes, trois scénarios budgétaires internes et huit exigences de preuve. Douze acteurs portaient 26 revendications de capacité sourcées et trois services étaient matérialisés. Ces chiffres constituent le socle avant l’itération d’enrichissement détaillée plus bas.

La fusion runtime initiale était exacte et non floue : les 47 candidats étaient conservés, les enrichissements utilisaient les IDs exacts et les deux acteurs `demo-` restaient séparés. Le snapshot enrichi courant est décrit dans la section « Itération enrichissement écosystème ».

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
- `data/guadeloupe-orchestration.sources.json`
- `data/README-orchestration-sources.md`
- `src/features/orchestration/constants.ts`
- `src/features/orchestration/schemas.ts`
- `src/features/orchestration/types.ts`
- `src/features/orchestration/engine.ts`
- `src/features/orchestration/fixtures.ts`
- `src/features/orchestration/repository.ts`
- `src/features/orchestration/source-registry.ts`
- `src/features/orchestration/index.ts`
- `src/app/admin/orchestration/page.tsx`
- `src/app/admin/orchestration/orchestration-client.tsx`
- `src/app/admin/orchestration/orchestration-adapter.ts`
- `src/app/admin/orchestration/pathway-canvas.tsx`
- `src/app/admin/orchestration/orchestration.module.css`
- `src/app/admin/orchestration/ui-types.ts`
- `scripts/smoke-orchestration.ts`
- `scripts/smoke-orchestration-sources.ts`
- `scripts/capture-orchestration.mjs`
- `reports/2026-08-15_technical-rl_orchestration.md`
- `reports/2026-08-15_business-client_orchestration.md`
- `reports/2026-08-15_orchestration-sources.md`

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

- raison sociale, SIRET, type, territoire/bassin, adresse et contacts des pistes qui ne disposent pas d'une assertion officielle suffisante ;
- capacités opérationnelles, services activables, éligibilité, prérequis, livrables, SLA, disponibilité et règles de partage, y compris lorsque l'identité de l'acteur est officiellement établie ;
- acteur mobilité, CFA/centre, employeur et opportunités réellement mobilisables pour Sarah ;
- places, coûts, financeurs applicables et décisions individuelles ;
- disponibilité actuelle des offres France Travail datées et identité de l'hôtel d'accueil non nommé ;
- doublons Mission Locale, France Travail, PLIE, GEIQ, UMIH et ADMR ;
- libellés ambigus CARL, Sygma, RSMA, Conseil Départemental/DSIA et Office de tourisme de la Riviera du Levant.

## Vérifications légères exécutées

| Contrôle | Résultat |
| --- | --- |
| `npm run smoke:orchestration` | **PASS 15/15** — invariants métier, matching, fraîcheur et garde d'approbation humaine |
| `npm run smoke:orchestration-sources` | **PASS 11/11** — provenance, relations, couverture, offres volatiles, IDs exacts, fraîcheur et inconnus `null` |
| ESLint ciblé sur domaine, route, navigation et scripts | **PASS**, 0 erreur, 0 warning |
| `npx tsc --noEmit --pretty false` | **PASS** |
| `npm run build` | **PASS**, route dynamique `/admin/orchestration` produite |
| Adaptateur runtime | **PASS** — 60 acteurs dont 27 identités officielles et 2 synthétiques, 56 claims, 18 services, 8 opportunités visibles dont une PMSMP synthétique, 0 financement alloué et 0 sortie active |
| Inspection visuelle manuelle | **PASS**, six captures authentifiées |
| Client Mystère | **PASS prototype**, 4,6/5 et 91/100 |

Conformément à la contrainte : aucune suite Playwright/Cypress E2E, aucun test de charge et aucun audit de sécurité complet n'ont été exécutés. `smoke:all` n'a pas été lancé. Le nouveau contrôle de provenance est entièrement headless et sans mutation externe. Le script Playwright de capture n'effectue qu'une navigation courte et six captures ; il ne constitue pas une suite E2E.

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

## Itération enrichissement écosystème — 2026-08-15

### Verdict Technical RL

**PASS pour le prototype démontrable et pour un pilote encadré de qualification.**

**NO-GO production et NO-GO déploiement comme orchestration opérationnelle.** Le registre et le matcher sont cohérents, déterministes, prudents et testables sans navigateur, mais le studio reste une simulation locale sans repository serveur, audit durable, RLS, consentements opposables ni boucle partenaire réelle. Aucune disponibilité, place, aide, orientation ou sortie ne peut être traitée comme engagée dans le monde réel.

Ce verdict couvre l’itération d’enrichissement et de matching uniquement. Il ne remplace pas le verdict antérieur du périmètre déjà commercialisé dans `PRODUCTION_READINESS.md`.

### État technique observé

- Le registre fusionné expose **49 sources**, **27 acteurs officiels**, **56 claims de capacité vérifiés**, **22 acteurs avec un rôle de parcours documenté**, **18 services**, **10 mécanismes de financement** et **7 opportunités officielles**. Le snapshot de démonstration expose **60 acteurs**, **18 services** et **8 opportunités**, la huitième étant la PMSMP synthétique explicitement signalée.
- Les 47 pistes du seed initial sont conservées. Les enrichissements d’acteurs utilisent uniquement l’identifiant exact ; les augmentations orphelines ou dupliquées sont rejetées au chargement et les IDs canoniques sont contrôlés.
- Les trois anciennes offres France Travail constatées en HTTP 404 sont `CLOSED`. Les quatre offres ouvertes ajoutées restent `NEEDS_VERIFICATION`, avec places, échéance de réponse et disponibilité non présumées.
- Les coûts inconnus et toutes les places libres non prouvées restent `null`. Les deux seuls coûts de service à zéro correspondent à des services explicitement documentés comme gratuits ; aucun zéro ne remplace une inconnue.
- Les mécanismes financiers restent séparés des allocations : Sarah conserve zéro `FundingAllocation`, zéro montant approuvé ou payé et aucun plafond public n’est transformé en financement acquis.
- La validation Zod vérifie les relations source/acteur/service/financeur et les imports échouent explicitement en cas d’ID orphelin ou dupliqué. Aucun fallback silencieux n’a été identifié.

### Garde-fous du matching

Chaque résultat porte un niveau `ACTIVATABLE`, `QUALIFIED_WITH_CHECKS`, `DISCOVERY_ONLY` ou `EXCLUDED`, un score sur 100 et une décomposition explicable. Le score mesure la qualité documentaire et la mobilisabilité ; il ne prédit pas une réussite individuelle.

Le matcher applique les invariants suivants :

- un service concret relié à la Capability, au type de Need, à la compétence et au territoire précède une capacité institutionnelle générale ;
- un acteur indisponible, zéro place, une session uniquement passée ou un territoire de service incompatible produit une exclusion dure ;
- l’état de fraîcheur `CURRENT`, `REVIEW_DUE` ou `NEEDS_VERIFICATION` est évalué à l’heure d’exécution ; une source échue ou à vérifier interdit le niveau `ACTIVATABLE` ;
- disponibilité inconnue, règles textuelles d’éligibilité, prérequis ou pièces à contrôler produisent `QUALIFIED_WITH_CHECKS` ;
- une capacité documentée sans offre exacte reste `DISCOVERY_ONLY` ;
- le planner conserve jusqu’à trois pistes mais n’auto-affecte acteur et service que pour `ACTIVATABLE` ; les autres cas restent « à instruire » ;
- les prérequis, pièces demandées et sorties attendues du service suggéré sont propagés à l’étape, sans inventer de coût.

Sur le scénario réel du snapshot, le CCI arrive en tête pour l’anglais à **85/100**, Mobil’Izy en tête pour la mobilité à **85/100**, tous deux `QUALIFIED_WITH_CHECKS`. Le besoin « Expérience métier à confirmer » ne reçoit aucune solution vérifiée faute d’hôte PMSMP documenté. **Aucune piste n’est donc auto-affectée**, ce qui est le comportement sûr attendu.

Le service CCI est désormais relié à la source précise « cours de langues à la carte » et transmet à l’étape l’évaluation préalable du niveau et des besoins ainsi que la proposition de parcours linguistique attendue.

### Sécurité et contrat CLI

- L’itération n’ajoute aucun endpoint, aucune mutation externe et aucun secret. Les références ajoutées sont des sources publiques ; aucune donnée sensible de Sarah ou CV brut n’est journalisée.
- La route reste derrière la garde plateforme existante. Les modifications interactives restent dans le navigateur et sont annoncées comme démonstratives.
- Les scripts de smoke produisent une ligne JSON par invariant, sortent avec un code non nul à l’échec et n’effectuent aucune mutation externe.

### Preuves légères relancées sur l’état final

| Contrôle | Résultat |
| --- | --- |
| `npm run smoke:orchestration` | **PASS 15/15** — matching concret, fraîcheur bloquant `ACTIVATABLE`, gates opérationnels, plans A/B, referral, coûts inconnus, Plan B, outcome et approbation humaine |
| `npm run smoke:orchestration-sources` | **PASS 11/11** — provenance officielle, inconnues `null`, trois offres archivées, quatre offres ouvertes revues sous 24 h, relations, unicité et fraîcheur |
| `npx tsc --noEmit --pretty false` | **PASS** |
| ESLint ciblé sur les neuf fichiers TypeScript/TSX modifiés | **PASS**, zéro erreur et zéro warning |
| `git diff --check` | **PASS** ; seuls les avertissements de conversion LF/CRLF restent présents |
| Exécution directe de l’adaptateur | **PASS** — 60 acteurs, 18 services, 8 opportunités ; CCI et Mobil’Izy rendus `QUALIFIED_WITH_CHECKS`, besoin expérience sans faux résultat |

Aucun E2E, Playwright/Cypress, test de charge, `smoke:all` ou audit de sécurité complet n’a été lancé. Le build final a été relancé après les derniers garde-fous et a produit avec succès la route dynamique `/admin/orchestration`.

### Écarts et bloqueurs avant production

1. **P0 — persistance et autorisation serveur absentes.** Le repository du prototype n’est pas raccordé à PostgreSQL/Supabase ; les mutations locales ne fournissent ni isolation tenant, ni RLS, ni audit opposable, ni contrôle de concurrence multi-utilisateur.
2. **P0 — aucune solution opérationnellement activable.** Les 18 services restent à instruire faute de disponibilité/capacité complète et les quatre opportunités ouvertes restent volatiles. Aucun hôte PMSMP vérifié ne couvre le besoin d’expérience de Sarah.
3. **P0 — boucle partenaire simulée.** Accusés de réception, refus, relances, financements et preuves ne sont ni envoyés ni persistés auprès d’acteurs externes.

### Gate de sortie recommandé

**Aucun bloqueur ne reste pour le lot prototype démontrable.** Le prototype peut être présenté sous la mention **« démonstration synthétique — solutions à instruire »**. Toute mise en production opérationnelle exige au minimum : correction des P0, dates de disponibilité et preuves sur un noyau d’acteurs, repository serveur protégé, puis tests ciblés d’IDOR/XSS, de concurrence, de transitions et de restauration. La double Definition of Done est satisfaite pour la **démo/pilote encadré** puisque les verdicts Technical RL et Business Client Mystère sont PASS sur ce périmètre ; elle ne l’est pas pour la production autonome.
