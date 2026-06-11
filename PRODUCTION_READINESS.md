# Production Readiness

_Dernière mise à jour : 11 juin 2026 (passe Technical RL — fiabilité DB). Base locale PostgreSQL validée ; Supabase `us-east-1` reste injoignable par Prisma depuis Windows lorsque le trafic passe par ProtonVPN (`P1001`, malgré TCP ouvert). tsc/lint/build et 20 smoke tests verts en local._

| Area | Verdict | Evidence / blocker |
|---|---|---|
| Authentication | YES (cœur) | Auth.js credentials + vérification email réelle (jeton haché). **Reset mot de passe** (jeton haché 30 min, à usage unique) et **anti-bruteforce** (verrouillage 15 min après 5 échecs) livrés et testés (`smoke:password-reset`). `DEV_AUTOLOGIN` neutralisé en production. Restant : 2FA optionnelle. |
| Authorization | YES (cœur) | Rôles appliqués sur mutations (server actions + outils agent). **Isolation cross-tenant vérifiée par `smoke:tenant`** : lecture/recherche scopées, écriture et suppression cross-tenant bloquées. |
| Secrets redaction | YES | `.env*` ignorés, exemples sans secrets, smoke sans secrets, logs sans tokens. |
| Environment variables | YES | `env.ts` valide via **Zod** `DATABASE_URL` (format postgres) et `AUTH_SECRET` (≥16) au démarrage (throw en prod) + garde `DEV_AUTOLOGIN`. `.env.example` à jour (Supabase). |
| No localhost hardcoding | PARTIAL | URLs via env. Valeurs dev par défaut encore présentes pour le local. |
| No silent mock fallback | YES | IA/agent annoncent leur fallback ; données démo explicitement chargées via action dédiée. |
| Database persistence | YES (local/code), PARTIAL (accès distant actuel) | Prisma 6. Les écritures ne sont jamais rejouées automatiquement. Une lecture n'est retentée qu'une fois sur coupure d'une connexion déjà établie (`P1008/P1017`) ; `P1001/P1002` échouent rapidement. Migration idempotente `20260611210000_sync_current_schema` ajoutée et validée localement. |
| Concurrency/races | YES (publique) | Déduplication publique garantie par **index unique partiel** `Prospect_public_dedup_key` (org+formation+email, actifs) — testé `smoke:dedup`. |
| Error handling | PARTIAL | Erreurs structurées (server actions, outils agent renvoient des messages ciblés). Audit global restant. |
| API response consistency | PARTIAL→YES | Helper `src/lib/api.ts` (`apiOk`/`apiError`) ; erreurs homogènes. Shapes de succès volontairement couplées aux clients existants. |
| Logging | YES (base) | **Logger structuré** JSON `src/lib/logger.ts` (secrets masqués) + **endpoint `/api/health`** (liveness + readiness DB) + smoke JSON. APM/alerting externe restant. |
| Billing / abonnements | PARTIAL (code YES, compte non activé) | **Stripe livré** : plans FREE/PRO/PREMIUM, Checkout (`payment_method_types: ["card"]`), portail, webhook ; **quotas** (`smoke:quota`) ; `smoke:billing`. **Setup live fait** : clé restreinte live branchée (`STRIPE_SECRET_KEY=rk_live`), **produits + prix PRO (49€)/PREMIUM (99€) créés en live**, price IDs câblés ; création de session Checkout live **prouvée**. **🔴 BLOQUEUR : compte Stripe `charges_enabled=false`** (activation/vérification Stripe en attente) → aucun paiement réel possible avant. **+ `STRIPE_WEBHOOK_SECRET` à créer au déploiement** (endpoint a besoin d'une URL publique). |
| Flux financiers (ledger) | YES (live) | **Ledger `Transaction`** migré et testé live (`smoke:finance`). `recordTransaction` idempotent (renvoie l'id), `getFinanceSummary` (brut/commission/**net à reverser** + `pendingPayout`). **Suivi du reversement** : `payoutStatus` (pending/settled/not_applicable) + `settledAt`, action `markTransactionSettled` (god-mode) + bouton « Marquer reversé » sur `/admin/finances`. Reversement manuel (pas de Stripe Connect, acté). |
| Paiements one-time | YES (code) | Checkout formation connecté + **public** (`publicFormationCheckout`, checkout invité, `smoke:public-purchase`) + bilan, webhook FORMATION_PURCHASE/BILAN. **Inscription auto** (`enrollBeneficiaryInFormation`, idempotent) + email de confirmation à l'acheteur. **Hors scope (futur)** : portail de connexion apprenant. |
| Espaces dédiés | YES (code) | **Espace bénéficiaire** (`/espace`, modèle `Beneficiary`, `smoke:beneficiary`), **portail formateur** (`/trainer`, `smoke:trainer-portal`), **site vitrine B2C** (`/(site)`, contact réel). À rejouer en live. |
| Plateforme god-mode | YES (code) | `/admin` cross-tenant lecture seule derrière `requirePlatformAdmin()` (`User.platformAdmin`, `PLATFORM_ADMIN_EMAILS`) ; agrégats batchés (fix EMAXCONNSESSION) ; `smoke:platform`. |
| Sécurité copilote (personas) | YES (code) | Personas AG-UI (visitor/beneficiary/trainer/center/platform_admin) : **allowlist d'outils côté serveur + double garde sur action approuvée** ; visiteur sans accès tenant ; admin lecture seule. `smoke:persona` (logique pure) vert. |
| Email transactionnel | PARTIAL | **Resend câblé via SMTP** (`smtp.resend.com:465`), envoi de bout en bout **vérifié** (vérif email, reset, confirmations d'achat). **Bloqueur prod** : domaine non vérifié → Resend n'envoie qu'à l'adresse du compte (`dorian.labry@gmail.com`) avec `onboarding@resend.dev`. Action : vérifier un domaine sur resend.com/domains puis passer `EMAIL_FROM` à ce domaine. |
| CLI smoke tests | YES | **20 suites vertes sur PostgreSQL local, `smoke:all` exit 0** : health, lot5, auth, registration, crud, agent, marketplace, tenant, password-reset, dedup, billing, quota, trainer-portal, beneficiary, platform, persona, finance, public-purchase, business, business-marketplace. `npm run db:diagnose` distingue TCP et session Prisma. |
| Build | YES | `npm run build` exit 0, `npm run lint` exit 0 (0 erreur), `tsc` 0 (9 juin 2026). |
| Deployment | NO | Pipeline CI/CD et environnement hébergé non définis. Voir `DEPLOYMENT.md`. Bucket Supabase Storage public `public-assets` à créer pour l'upload d'images. |
| Documentation | YES (socle) | Docs socle à jour (philosophie, spec, contrat CLI, readiness) + **`DEPLOYMENT.md`** (runbook). Rapports dans `reports/`. |

## Overall verdict

**PARTIAL** (cockpit B2B demo-ready ; couche financière + B2C bilan à finaliser et reprouver en live).

### Bloqueurs P0 restants
- Déploiement (CI/CD + hébergement + bucket Storage public) — voir `DEPLOYMENT.md`.
- APM / alerting production externe (logging structuré + `/api/health` en place).

### Résolu (passe 9 juin — Phase 0/1 financière, live)
- Migration `Transaction` (+ colonnes payout) appliquée ; **`smoke:all` exit 0 (19 suites), `build` exit 0** sur Supabase.
- **Inscription auto à l'achat** (Learner + Enrollment sur session OUVERTE, idempotent).
- **Suivi du reversement** (`payoutStatus`/`settledAt` + action god-mode + UI `/admin/finances`).

### P1 — actions credentials/compte (le code est prêt et prouvé)
- **Activer le compte Stripe** : `charges_enabled` est `false` → terminer l'activation sur le dashboard Stripe (vérification identité/société/IBAN) pour pouvoir encaisser réellement.
- **`STRIPE_WEBHOOK_SECRET`** : créer l'endpoint `/api/stripe/webhook` au déploiement (URL publique requise) → `whsec_`.
- **Vérifier un domaine sur Resend** (resend.com/domains) puis `EMAIL_FROM=no-reply@tondomaine` — sinon les emails ne partent qu'à `dorian.labry@gmail.com` (le code email est branché et prouvé).
- Portail de connexion apprenant (un acheteur public est inscrit comme `Learner` mais sans espace personnel propre).
- Audit erreurs global + contrat API automatisé.

### Résolu (passes du 7 juin)
- CLI-testabilité des features critiques (CRUD, agent, marketplace, multi-tenant) — 12 smoke tests.
- Isolation cross-tenant vérifiée et prouvée.
- Reset mot de passe + anti-bruteforce livrés et testés.
- **Observabilité de base** : logger structuré + `/api/health` + `smoke:health`.
- **Intégrité doublon prospect public** : index unique partiel + `smoke:dedup`.
- **Validation Zod des env** + garde `DEV_AUTOLOGIN`.
- **Effet réseau marketplace** : seed multi-centres (`seed:marketplace-demo`).
- Retron DB sur coupures transitoires. Build + lint + tsc verts.

### Résolu (passes du 9 juin — écosystème multi-faces)
- **Personas AG-UI** sécurisés (allowlist serveur + double garde) sur les 4 surfaces — `smoke:persona` vert.
- **Espace bénéficiaire**, **portail formateur**, **admin god-mode** livrés (code) — `smoke:beneficiary/trainer-portal/platform`.
- **Ledger financier** (`Transaction`) + paiements Stripe formation/bilan + `/admin/finances` (net à reverser) — `smoke:finance` (post-migration).
- **Quotas de plan** appliqués — `smoke:quota`.
- **Chasse cohérence produit** : formulaire contact réel (était un mock), éligibilité CPF fonctionnelle, suggestions AG-UI par persona, prix bilan aligné (1 200 €), géographie cohérente (Guadeloupe). tsc/lint 0.
