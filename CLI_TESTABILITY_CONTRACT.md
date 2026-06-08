# CLI Testability Contract

## Goal

Les parcours critiques doivent être vérifiables sans dépendre uniquement d'un navigateur. Un agent doit pouvoir valider le produit depuis la CLI.

## Commands

| Command | Contract |
|---|---|
| `npm run smoke:health` | Vérifie la connectivité base (SELECT 1). Miroir CLI de l'endpoint `/api/health` (liveness + readiness DB). |
| `npm run smoke:lot5` | Résout une page publique, crée un prospect dans le bon tenant, valide la déduplication puis nettoie ses données. |
| `npm run smoke:auth` | Vérifie un jeton email haché, son expiration logique et sa consommation. |
| `npm run smoke:registration` | Crée un compte/tenant/trial, exige la vérification email puis nettoie les données. |
| `npm run smoke:crud` | Cycle complet create→update→delete (formation, apprenant, session, inscription) via la couche de mutation, tenant jetable, nettoyage. |
| `npm run smoke:agent` | Valide le copilote AG-UI : registre d'outils, sensibilité des actions d'écriture, exécution réelle après approbation (human-in-the-loop), recherche renvoyant des IDs, traçabilité AiInteraction. Nettoyage. |
| `npm run smoke:marketplace` | Vérifie le catalogue cross-centres, les filtres, les facettes, l'annuaire, la fiche centre (formateurs + formations), le profil formateur public, et qu'une formation non publiée NE fuit PAS. Nettoyage. |
| `npm run smoke:tenant` | Vérifie l'isolation multi-tenant : lecture scopée, recherche scopée, écriture et suppression cross-tenant bloquées. Nettoyage. |
| `npm run smoke:password-reset` | Vérifie le reset mot de passe (jeton haché, invalide/court refusés, changement effectif, jeton non réutilisable, expiration) et l'anti-bruteforce (verrouillage après seuil, réinitialisation au succès). Nettoyage. |
| `npm run smoke:dedup` | Vérifie l'index unique anti-doublon prospect public (doublon actif rejeté, GAGNE autorisé). Nettoyage. |
| `npm run smoke:billing` | Vérifie le catalogue de plans, le mapping priceId→plan, l'état de facturation, le handler webhook Stripe (upgrade/downgrade) et le fallback sans clé. Nettoyage. |
| `npm run smoke:business` | Vérifie les éléments de compréhension/activation/conversion (promesse landing, marketplace, onboarding, CTA public, dashboard honnête). |
| `npm run smoke:all` | Enchaîne tous les smoke tests headless ci-dessus (sans serveur). |
| `npm run smoke:ui` | Intégration HTTP (serveur requis) : login/reset, effet réseau marketplace, fiches centre/formateur, onglet abonnement, santé. `SMOKE_BASE_URL` si port ≠ 3000. |
| `npm run smoke:agui-e2e` | AG-UI end-to-end (serveur + clé LLM) : l'agent appelle un outil, exécution réelle (création + suppression) via `/api/ag-ui/run`, vérifiée en base. |
| `npm run smoke:e2e` | `smoke:ui` + `smoke:agui-e2e`. |
| `npm run lint` | Vérifie les règles statiques. |
| `npm run build` | Vérifie TypeScript et le build Next.js de production. |
| `npm run smoke:production` | Exécute lint puis build. |

## Output format

Les scripts smoke écrivent une ligne JSON par étape avec `status: pass|fail`. Aucun secret ne doit être écrit. Un code de sortie non nul signale un échec.

## Environment loading

Les scripts CLI chargent automatiquement `.env.local` puis `.env` via `scripts/_env.ts` (sans écraser les variables déjà présentes). Les scripts important des modules `server-only` (marketplace, agent, couche serveur) sont exécutés avec `--tsconfig scripts/tsconfig.json` qui neutralise le marqueur `server-only` hors contexte Next.

## Preconditions

`DATABASE_URL` accessible (PostgreSQL local ou **Supabase pooler**). Les smoke tests `crud/agent/marketplace/tenant` créent leur propre tenant jetable et n'exigent aucun seed. `smoke:lot5` requiert au moins une formation publique (exécuter le chargement de données démo si nécessaire).

> ⚠️ Connectivité Supabase : couper tout VPN (ProtonVPN bloque le handshake PostgreSQL → `P1001`). Le client Prisma applique un retron automatique sur les coupures transitoires.

## Failure contract

Une étape échouée produit un message ciblé et un code de sortie non nul. Toutes les données créées par un smoke test doivent être nettoyées (tenant jetable supprimé en cascade).
