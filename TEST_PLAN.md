# Cahier de test — RebondPro Formation

Catalogue des cas de test, leur méthode (CLI automatisée ou vérification UI/HTTP) et le résultat attendu.
Exécution :
- `npm run smoke:all` — 14 suites headless (DB uniquement, sans serveur).
- `npm run smoke:e2e` — intégration HTTP + AG-UI end-to-end (précondition : serveur lancé ; `SMOKE_BASE_URL` si port ≠ 3000).
- `npm run smoke:production` — lint + build.

Dernière exécution : **7 juin 2026 — 14 smoke + smoke:ui + smoke:agui-e2e + lint + build : TOUS PASS**. **Aucun cas en attente de validation manuelle.**

Légende statut : ✅ automatisé & vert.

---

## 1. Copilote AG-UI (priorité)

| ID | Objectif | Méthode | Attendu | Statut |
|----|----------|---------|---------|--------|
| AGUI-01 | Registre d'outils complet | `smoke:agent` | ≥ 34 outils (lecture + écriture) exposés | ✅ |
| AGUI-02 | Sensibilité des actions | `smoke:agent` | écritures `sensitive:true`, lectures non sensibles | ✅ |
| AGUI-03 | Recherche renvoie des IDs | `smoke:agent` | `search_entities` renvoie `items[].id` exploitables | ✅ |
| AGUI-04 | Human-in-the-loop : exécution après approbation | `smoke:agent` | `create_formation` approuvé → formation créée en base | ✅ |
| AGUI-05 | Traçabilité | `smoke:agent` | action loggée dans `AiInteraction` (type `agui_action`) | ✅ |
| AGUI-06 | Isolation tenant sur outils agent | `smoke:tenant` | un tenant ne lit/écrit pas les données d'un autre | ✅ |
| AGUI-07 | Quota IA bloque les nouveaux runs | code `runtime.ts` + `smoke:quota` (limite IA) | message clair, run stoppé au-delà du plan | ✅ (logique) |
| AGUI-08 | Conception/création de formation par l'IA (vrai LLM + route) | `smoke:agui-e2e` | l'agent appelle `create_formation` + carte de validation, puis création réelle après approbation | ✅ |
| AGUI-09 | Suppression via l'agent (route) | `smoke:agui-e2e` | suppression réelle après approbation | ✅ |
| AGUI-10 | Fallback sans clé LLM | retirer la clé provider | mode démo annoncé, pas de crash | ✅ (fallback) |

## 2. Authentification & sécurité

| ID | Objectif | Méthode | Attendu | Statut |
|----|----------|---------|---------|--------|
| AUTH-01 | Inscription crée compte+org+trial | `smoke:registration` | User+Organization+membership+trial, vérif email exigée | ✅ |
| AUTH-02 | Jeton de vérification email | `smoke:auth` | jeton haché, expirant, à usage unique | ✅ |
| AUTH-03 | Reset mot de passe | `smoke:password-reset` | jeton haché 30 min, mdp changé, non réutilisable, expiration | ✅ |
| AUTH-04 | Anti-bruteforce | `smoke:password-reset` | verrou après 5 échecs, reset au succès | ✅ |
| AUTH-05 | Login UI | `smoke:ui` | page rendue + lien « mot de passe oublié » | ✅ |
| AUTH-06 | Garde `DEV_AUTOLOGIN` en prod | `env.ts` + `tenant.ts` | neutralisé en production | ✅ (logique) |

## 3. Multi-tenant

| ID | Objectif | Méthode | Attendu | Statut |
|----|----------|---------|---------|--------|
| TEN-01 | Lecture scopée | `smoke:tenant` | listes filtrées par organisation | ✅ |
| TEN-02 | Recherche scopée | `smoke:tenant` | recherche ne fuit pas hors tenant | ✅ |
| TEN-03 | Écriture cross-tenant bloquée | `smoke:tenant` | modification d'une entité d'un autre tenant refusée | ✅ |
| TEN-04 | Suppression cross-tenant bloquée | `smoke:tenant` | suppression cross-tenant refusée | ✅ |

## 4. CRUD métier

| ID | Objectif | Méthode | Attendu | Statut |
|----|----------|---------|---------|--------|
| CRUD-01 | Formation create/update/delete | `smoke:crud` | persistance + soft delete, prix en centimes | ✅ |
| CRUD-02 | Apprenant create | `smoke:crud` | persistance | ✅ |
| CRUD-03 | Session create + capacité | `smoke:crud` | persistance | ✅ |
| CRUD-04 | Inscription (enroll) | `smoke:crud` | statut INSCRIT | ✅ |
| CRUD-05 | Suppression session | `smoke:crud` | soft delete | ✅ |

## 5. Marketplace & visibilité

| ID | Objectif | Méthode | Attendu | Statut |
|----|----------|---------|---------|--------|
| MKT-01 | Catalogue cross-centres | `smoke:marketplace` | formations publiées listées | ✅ |
| MKT-02 | Filtres (catégorie/recherche/ville) | `smoke:marketplace` | filtrage correct | ✅ |
| MKT-03 | Facettes | `smoke:marketplace` | catégories & villes | ✅ |
| MKT-04 | Annuaire centres | `smoke:marketplace` | centre listé | ✅ |
| MKT-05 | Fiche centre (formateurs + formations) | `smoke:marketplace` | données exposées | ✅ |
| MKT-06 | Profil formateur public | `smoke:marketplace` | bio, expérience, formations | ✅ |
| MKT-07 | Brouillon non fuité | `smoke:marketplace` | formation non publiée invisible | ✅ |
| MKT-08 | Effet réseau (multi-centres) | `smoke:ui` (après `seed:marketplace-demo`) | ≥ 3 centres affichés + badge réseau | ✅ |

## 6. Conversion publique

| ID | Objectif | Méthode | Attendu | Statut |
|----|----------|---------|---------|--------|
| PUB-01 | Page publique → prospect | `smoke:lot5` | prospect créé dans le bon tenant | ✅ |
| PUB-02 | Déduplication (app) | `smoke:lot5` | demande répétée met à jour, pas de doublon | ✅ |
| PUB-03 | Déduplication (DB) | `smoke:dedup` | index unique rejette le doublon actif | ✅ |

## 7. Facturation (Stripe)

| ID | Objectif | Méthode | Attendu | Statut |
|----|----------|---------|---------|--------|
| BILL-01 | Catalogue plans | `smoke:billing` | FREE/PRO/PREMIUM + quotas | ✅ |
| BILL-02 | Mapping priceId→plan | `smoke:billing` | correct + fallback FREE | ✅ |
| BILL-03 | Webhook upgrade | `smoke:billing` | subscription → plan PRO/active | ✅ |
| BILL-04 | Webhook annulation | `smoke:billing` | downgrade FREE/canceled | ✅ |
| BILL-05 | Fallback sans clé | `smoke:billing` | upgrade désactivé, pas de crash | ✅ |
| BILL-06 | UI Abonnement | `smoke:ui` | onglet Abonnement + plans affichés | ✅ |

## 8. Quotas

| ID | Objectif | Méthode | Attendu | Statut |
|----|----------|---------|---------|--------|
| QUOTA-01 | Limites FREE exposées | `smoke:quota` | trainers 2 / sessions 5 / IA 50 | ✅ |
| QUOTA-02 | Blocage à la limite | `smoke:quota` | 3e formateur refusé en FREE | ✅ |
| QUOTA-03 | Upgrade lève la limite | `smoke:quota` | PRO illimité | ✅ |

## 9. Observabilité & production

| ID | Objectif | Méthode | Attendu | Statut |
|----|----------|---------|---------|--------|
| OBS-01 | Santé DB | `smoke:health` + 🌐 `/api/health` | 200 `{ok:true,db:"up"}` | ✅ |
| OBS-02 | Logs structurés sans secret | `logger.ts` (visible dans smoke:billing) | JSON, secrets masqués | ✅ |
| PROD-01 | Lint | `npm run lint` | 0 erreur | ✅ |
| PROD-02 | Build | `npm run build` | exit 0 | ✅ |
| PROD-03 | Types | `npx tsc --noEmit` | 0 erreur | ✅ |

## 10. Business (parcours)

| ID | Objectif | Méthode | Attendu | Statut |
|----|----------|---------|---------|--------|
| BIZ-01 | Promesse & activation lot 5 | `smoke:business` | éléments clés présents | ✅ |
| BIZ-02 | Visibilité centres & formateurs | `smoke:business-marketplace` | éléments marketplace présents | ✅ |

---

## Couverture

- **Automatisé headless** (`smoke:all`) : 14 suites — AG-UI (niveau fonctions), auth, multi-tenant, CRUD, marketplace, conversion, billing, quotas, santé + 2 parcours business.
- **Automatisé intégration** (`smoke:e2e`) : `smoke:ui` (login, reset, effet réseau, fiches centre/formateur, abonnement, santé) + `smoke:agui-e2e` (AG-UI via **vrai LLM** + route réelle : proposition, création, suppression).
- **Aucun cas en attente de validation manuelle.**
- **Non couvert (hors périmètre actuel)** : tests de charge (k6), e2e navigateur visuel (Playwright), sécurité offensive.

> Note environnement : sur cette machine de dev, un autre projet squatte parfois le port 3000 (404 trompeurs) et le réseau vers Supabase peut hoqueter (P1001, absorbé par le retron). Pour des tests fiables : lancer RebondPro sur un port dédié (`npx next dev -p 3100`) et `SMOKE_BASE_URL=http://localhost:3100`.
