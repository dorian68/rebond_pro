# CLI Testability Contract

## Goal

Les parcours critiques doivent être vérifiables sans dépendre uniquement d'un navigateur. Un agent doit pouvoir valider le produit depuis la CLI.

## Commands

| Command | Contract |
|---|---|
| `npm run dev:local` | Démarre Next.js sur le port 3100 avec la `DATABASE_URL` locale de `.env`, même si `.env.local` pointe vers Supabase. Refuse une URL non locale. |
| `npm run db:diagnose` | Diagnostique sans afficher de secret la configuration DB, l'ouverture TCP puis trois vraies requêtes Prisma. Distingue un port ouvert d'un handshake/session PostgreSQL inutilisable. |
| `npm run smoke:health` | Vérifie la connectivité base (SELECT 1). Miroir CLI de l'endpoint `/api/health` (liveness + readiness DB). |
| `npm run smoke:lot5` | Résout une page publique, crée un prospect dans le bon tenant, valide la déduplication puis nettoie ses données. |
| `npm run smoke:auth` | Vérifie un jeton email haché, son expiration logique et sa consommation. |
| `npm run smoke:admin-auth` | Vérifie le circuit d'authentification et les gardes d'accès super-admin. |
| `npm run smoke:auth-session` | Vérifie les durées de session courte/mémorisée et le rejet serveur des jetons expirés. |
| `npm run smoke:google-oauth` | Vérifie Google OAuth sans navigateur : contexte signé, détection env, connexion d'un compte existant, refus d'un login inconnu sans intention d'inscription, refus d'un email Google non vérifié, création centre OWNER avec trial. Nettoyage. |
| `npm run smoke:registration` | Crée un compte/tenant/trial, exige la vérification email puis nettoie les données. |
| `npm run smoke:crud` | Cycle complet create→update→delete (formation, apprenant, session, inscription) via la couche de mutation, tenant jetable, nettoyage. |
| `npm run smoke:agent` | Valide le copilote AG-UI : registre d'outils, sensibilité des actions d'écriture, exécution réelle après approbation (human-in-the-loop), recherche renvoyant des IDs, traçabilité AiInteraction. Nettoyage. |
| `npm run smoke:marketplace` | Vérifie le catalogue cross-centres, les filtres, les facettes, l'annuaire, la fiche centre (formateurs + formations), le profil formateur public, et qu'une formation non publiée NE fuit PAS. Nettoyage. |
| `npm run smoke:tenant` | Vérifie l'isolation multi-tenant : lecture scopée, recherche scopée, écriture et suppression cross-tenant bloquées. Nettoyage. |
| `npm run smoke:password-reset` | Vérifie le reset mot de passe (jeton haché, invalide/court refusés, changement effectif, jeton non réutilisable, expiration) et l'anti-bruteforce (verrouillage après seuil, réinitialisation au succès). Nettoyage. |
| `npm run smoke:dedup` | Vérifie l'index unique anti-doublon prospect public (doublon actif rejeté, GAGNE autorisé). Nettoyage. |
| `npm run smoke:billing` | Vérifie le catalogue de plans, le mapping priceId→plan, l'état de facturation, le handler webhook Stripe (upgrade/downgrade) et le fallback sans clé. Nettoyage. |
| `npm run smoke:quota` | Vérifie l'application des quotas de plan (limites FREE/PRO/PREMIUM bloquantes au-delà du seuil). Nettoyage. |
| `npm run smoke:trainer-portal` | Vérifie le portail formateur : disponibilités, planning scopé au formateur, demandes d'animation. Nettoyage. |
| `npm run smoke:planning-stress` | Vérifie les invariants de planning sous charge et les conflits de disponibilité. Nettoyage. |
| `npm run smoke:formation-modules-planning` | Vérifie le planning modulaire : formation à modules, formateurs par module, bulk disponibilités, audit/persistance et suggestions qui exigent la couverture de chaque module. Nettoyage. |
| `npm run smoke:documents-engine` | Vérifie le catalogue documentaire, le préflight et les moteurs de génération PDF/DOCX. Nettoyage. |
| `npm run smoke:document-intake` | Vérifie les routes, schémas et brouillons de formulaires issus de documents, sans écriture implicite. |
| `npm run smoke:admin-agents` | Vérifie l'accès admin, la lecture seule et les garde-fous du bac à sable des agents internes. |
| `npm run smoke:roadmap` | Vérifie la persistance, les mutations gardées et l'intégration admin de la roadmap. |
| `npm run smoke:beneficiary` | Vérifie l'espace bénéficiaire : `Beneficiary` lié au compte, parcours/phases, accès scopé. Nettoyage. |
| `npm run smoke:platform-beneficiaries` | Vérifie la vue bénéficiaires cross-centres réservée au super-admin. |
| `npm run smoke:platform` | Vérifie l'admin god-mode : agrégats cross-tenant en lecture seule derrière `requirePlatformAdmin()`, batché (évite EMAXCONNSESSION). Nettoyage. |
| `npm run smoke:persona` | **Logique pure (sans DB)** : `resolvePersona` (visitor/beneficiary/trainer/center/platform_admin) et l'allowlist d'outils (visiteur sans accès tenant, bénéficiaire sans suppression, admin sans écriture). |
| `npm run smoke:connectors` | Vérifie le socle Composio : 7 connecteurs déclarés, Calendar en lecture seule, Drive/OneDrive/SharePoint en lecture/import, Gmail/Outlook en brouillon uniquement, aucun outil d'envoi direct, accès persona verrouillé. |
| `npm run smoke:finance` | Vérifie le ledger : `recordTransaction` (commission auto + `payoutStatus`), idempotence par `stripeRef`, **inscription auto à l'achat** (Learner+Enrollment sur session OUVERTE, idempotente), **reversement** (`settleTransaction`), `getFinanceSummary` (brut/commission/net/pending). Nettoyage. |
| `npm run smoke:public-purchase` | Vérifie l'achat public (sans compte) : appelable sans session, gating public/publié/prix>0, dégradation propre si Stripe non configuré. Nettoyage. |
| `npm run smoke:public-forms` | Vérifie honeypots, quotas anonymisés et absence de faux succès sur les formulaires publics. |
| `npm run smoke:commercial-trust` | Vérifie l'absence de faux témoignages et de promesses CPF/Qualiopi non justifiées, ainsi que les garde-fous d'activation des paiements publics. |
| `npm run smoke:email-transport` | Vérifie sur un SMTP de test l'email HTML/texte et les pièces jointes. Requiert Mailpit ou un serveur SMTP jetable. |
| `npm run smoke:accessibility` | Serveur local requis : contrôle Axe et débordements horizontaux sur 14 routes publiques, en desktop et mobile. `SMOKE_BASE_URL` permet de changer le port. |
| `npm run smoke:business` | Vérifie les éléments de compréhension/activation/conversion (promesse landing, marketplace, onboarding, CTA public, dashboard honnête). |
| `npm run smoke:business-marketplace` | Vérifie la valeur perçue de la marketplace (catalogue cross-centres, fiches, visibilité formateurs). |
| `npm run smoke:business-google-oauth` | Vérifie côté client mystère que le login Google est visible quand configuré, que la création centre reste explicite, et que les garde-fous de confiance (CGU, nom du centre, email vérifié, pas de création silencieuse) existent. |
| `npm run smoke:all` | Enchaîne les 34 smoke tests headless déclarés dans `scripts/smoke-all.mjs` avec l'environnement courant. |
| `npm run smoke:all:local` | Lit exclusivement la `DATABASE_URL` locale de `.env`, refuse tout hôte distant, neutralise Stripe/Resend/Composio et exécute les 34 suites. |
| `npm run smoke:ui` | Intégration HTTP (serveur requis) : login/reset, effet réseau marketplace, fiches centre/formateur, onglet abonnement, santé. `SMOKE_BASE_URL` si port ≠ 3000. |
| `npm run smoke:agui-e2e` | AG-UI end-to-end (serveur + clé LLM) : l'agent appelle un outil, exécution réelle (création + suppression) via `/api/ag-ui/run`, vérifiée en base. |
| `npm run smoke:e2e` | `smoke:ui` + `smoke:agui-e2e`. |
| `npm run lint` | Vérifie les règles statiques. |
| `npm run build` | Vérifie TypeScript et le build Next.js de production. |
| `npm run smoke:production` | Exécute lint puis build. |

## Output format

Les scripts smoke écrivent une ligne JSON par étape avec `status: pass|fail`. Aucun secret ne doit être écrit. Un code de sortie non nul signale un échec.

## Environment loading

Les scripts CLI chargent automatiquement `.env.local` puis `.env` via `scripts/_env.ts` sans écraser les variables déjà présentes. Pour un audit local reproductible, utiliser `npm run smoke:all:local` : cette commande injecte d'abord la base locale et les valeurs sans effet externe. Les scripts important des modules `server-only` sont exécutés avec `--tsconfig scripts/tsconfig.json`, qui neutralise ce marqueur hors contexte Next.

## Preconditions

`DATABASE_URL` accessible (PostgreSQL local ou pooler PostgreSQL). Les smoke tests avec persistance créent leurs propres fixtures jetables et n'exigent aucun seed public. `smoke:persona` ne touche pas la base. Le schéma doit être à jour via `prisma migrate deploy`.

> ⚠️ Connectivité Supabase : couper tout VPN (ProtonVPN bloque le handshake PostgreSQL → `P1001`). Le client Prisma applique un retron automatique sur les coupures transitoires.

## Failure contract

Une étape échouée produit un message ciblé et un code de sortie non nul. Toutes les données créées par un smoke test doivent être nettoyées (tenant jetable supprimé en cascade).
