# Production Readiness

_Dernière mise à jour : 7 juin 2026 (passe Technical RL). Base : Supabase PostgreSQL (pooler). Build et lint verts._

| Area | Verdict | Evidence / blocker |
|---|---|---|
| Authentication | YES (cœur) | Auth.js credentials + vérification email réelle (jeton haché). **Reset mot de passe** (jeton haché 30 min, à usage unique) et **anti-bruteforce** (verrouillage 15 min après 5 échecs) livrés et testés (`smoke:password-reset`). `DEV_AUTOLOGIN` neutralisé en production. Restant : 2FA optionnelle. |
| Authorization | YES (cœur) | Rôles appliqués sur mutations (server actions + outils agent). **Isolation cross-tenant vérifiée par `smoke:tenant`** : lecture/recherche scopées, écriture et suppression cross-tenant bloquées. |
| Secrets redaction | YES | `.env*` ignorés, exemples sans secrets, smoke sans secrets, logs sans tokens. |
| Environment variables | YES | `env.ts` valide via **Zod** `DATABASE_URL` (format postgres) et `AUTH_SECRET` (≥16) au démarrage (throw en prod) + garde `DEV_AUTOLOGIN`. `.env.example` à jour (Supabase). |
| No localhost hardcoding | PARTIAL | URLs via env. Valeurs dev par défaut encore présentes pour le local. |
| No silent mock fallback | YES | IA/agent annoncent leur fallback ; données démo explicitement chargées via action dédiée. |
| Database persistence | YES | Prisma 6 + Supabase. Retron automatique sur coupures transitoires (`P1001/P1017`, 3 essais). |
| Concurrency/races | YES (publique) | Déduplication publique garantie par **index unique partiel** `Prospect_public_dedup_key` (org+formation+email, actifs) — testé `smoke:dedup`. |
| Error handling | PARTIAL | Erreurs structurées (server actions, outils agent renvoient des messages ciblés). Audit global restant. |
| API response consistency | PARTIAL→YES | Helper `src/lib/api.ts` (`apiOk`/`apiError`) ; erreurs homogènes. Shapes de succès volontairement couplées aux clients existants. |
| Logging | YES (base) | **Logger structuré** JSON `src/lib/logger.ts` (secrets masqués) + **endpoint `/api/health`** (liveness + readiness DB) + smoke JSON. APM/alerting externe restant. |
| Billing / monétisation | PARTIAL (code YES) | **Stripe livré** : plans FREE/PRO/PREMIUM, Checkout, portail, webhook (upgrade/downgrade) synchronisant le plan ; fallback sans clé ; testé `smoke:billing`. Reste : configurer les clés Stripe de prod + price IDs, et appliquer les quotas. |
| CLI smoke tests | YES | 13 smoke tests verts sur Supabase : health, lot5, auth, registration, crud, agent, marketplace, tenant, password-reset, dedup, **billing**, business, business-marketplace. `smoke:all` les enchaîne. |
| Build | YES | `npm run build` exit 0 (7 juin 2026), `npm run lint` exit 0 (0 erreur), `tsc` 0. |
| Deployment | NO | Pipeline CI/CD et environnement hébergé non définis. Voir `DEPLOYMENT.md`. Bucket Supabase Storage public `public-assets` à créer pour l'upload d'images. |
| Documentation | YES (socle) | Docs socle à jour (philosophie, spec, contrat CLI, readiness) + **`DEPLOYMENT.md`** (runbook). Rapports dans `reports/`. |

## Overall verdict

**PARTIAL** (proche de demo-ready / pré-production).

### Bloqueurs P0 restants
- Déploiement (CI/CD + hébergement + bucket Storage public) — voir `DEPLOYMENT.md`.
- APM / alerting production externe (le logging structuré + /api/health sont en place).

### P1
- Contrainte unique anti-doublon prospect public.
- Audit erreurs global + contrat API automatisé.
- Validation Zod exhaustive des variables d'env.

### Résolu (passes du 7 juin)
- CLI-testabilité des features critiques (CRUD, agent, marketplace, multi-tenant) — 12 smoke tests.
- Isolation cross-tenant vérifiée et prouvée.
- Reset mot de passe + anti-bruteforce livrés et testés.
- **Observabilité de base** : logger structuré + `/api/health` + `smoke:health`.
- **Intégrité doublon prospect public** : index unique partiel + `smoke:dedup`.
- **Validation Zod des env** + garde `DEV_AUTOLOGIN`.
- **Effet réseau marketplace** : seed multi-centres (`seed:marketplace-demo`).
- Retron DB sur coupures transitoires. Build + lint + tsc verts.
