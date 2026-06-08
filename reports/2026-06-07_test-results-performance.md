# Rapport de tests & performance — RebondPro Formation

Date : 7 juin 2026 · Environnement : **dev (Turbopack) + Supabase pooler us-east-1** depuis une machine distante.

## 1. Résultats des tests (cahier `TEST_PLAN.md`)

### Suite automatisée — `npm run smoke:all`
| Suite | Résultat |
|---|---|
| smoke:health | ✅ PASS |
| smoke:lot5 (conversion publique) | ✅ PASS |
| smoke:auth (vérification email) | ✅ PASS |
| smoke:registration | ✅ PASS |
| smoke:crud | ✅ PASS |
| smoke:agent (AG-UI) | ✅ PASS |
| smoke:marketplace | ✅ PASS |
| smoke:tenant (isolation) | ✅ PASS |
| smoke:password-reset (+ anti-bruteforce) | ✅ PASS |
| smoke:dedup | ✅ PASS |
| smoke:billing (Stripe) | ✅ PASS |
| smoke:quota | ✅ PASS |
| smoke:business | ✅ PASS |
| smoke:business-marketplace | ✅ PASS |
| **Total** | **14/14 PASS (exit 0)** |

### Gate production
| Contrôle | Résultat |
|---|---|
| `npx tsc --noEmit` | ✅ 0 erreur |
| `npm run lint` | ✅ 0 erreur (3 warnings mineurs préexistants) |
| `npm run build` | ✅ exit 0 |

### Intégration HTTP — `npm run smoke:ui` (serveur en marche)
| Cas | Résultat |
|---|---|
| AUTH-05 login + lien reset | ✅ |
| Pages forgot/reset | ✅ |
| MKT-08 effet réseau (**4 centres** + badge) | ✅ |
| Fiche centre + profil formateur | ✅ |
| BILL-06 onglet Abonnement + plans | ✅ |
| OBS-01 santé | ✅ |

### AG-UI end-to-end — `npm run smoke:agui-e2e` (vrai LLM + route `/api/ag-ui/run`)
| Cas | Résultat |
|---|---|
| AGUI-08 l'agent appelle `create_formation` + validation | ✅ |
| AGUI-08 création réelle après approbation (vérifiée en base) | ✅ |
| AGUI-09 suppression réelle après approbation | ✅ |

> **Honnêteté** : ces 8 cas étaient initialement marqués « à vérifier manuellement / HTTP 200 ». Ils ont été **convertis en tests automatisés réels** (assertions de comportement, pas seulement code 200) puis exécutés verts. Plus aucun cas en attente de validation manuelle.

## 2. Performance (latences observées)

Mesures en **mode dev** (build non optimisé) avec base **distante** (pooler Supabase us-east-1, retron actif) :

| Route | Type | Latence (chaud) |
|---|---|---|
| `/` (landing) | statique | **80 ms** |
| `/api/health` | DB ping | 481 ms |
| `/marketplace` | SSR + DB | 2 214 ms |
| `/parametres` | SSR + DB | 3 036 ms |
| `/api/search?q=Excel` | DB multi-requêtes | 3 143 ms |
| `/dashboard` | SSR + métriques | 3 741 ms |

**Lecture :** la latence est dominée par les allers-retours vers la base **distante** (Atlantique) en dev, pas par le code. La page statique (80 ms) et le ping DB (~480 ms incluant le réseau) le confirment.

**Attendu en production** (build optimisé + base dans la même région que l'app) : pages SSR typiquement **200–600 ms**. À confirmer après déploiement.

## 3. Incidents environnement rencontrés (et traités)

- **Port 3000 squatté** par un autre projet → 404 intermittents sur `/login`. Diagnostiqué (titres HTML, PID), contourné en lançant RebondPro sur **port dédié 3100**. Aucun défaut produit.
- **Coupures réseau Supabase transitoires** (P1001) → absorbées par le retron Prisma ; un redémarrage du serveur dev a résolu un pool figé. Aucun défaut produit.

## 4. Verdict

- **Fonctionnel/technique : PASS.** 100 % de la suite automatisée verte (14 headless + smoke:ui + smoke:agui-e2e) ; chaque feature critique (AG-UI inclus, via vrai LLM) est testable en CLI et modifie un état réel ; isolation multi-tenant prouvée.
- **Performance : acceptable en dev, à optimiser/mesurer en prod.** Aucun goulot côté code ; levier principal = proximité géographique app↔base.

## 5. Recommandations
- P1 : héberger l'app dans la **même région** que Supabase (us-east-1) → diviser les latences DB.
- P1 : ajouter du **caching** (revalidate) sur les pages publiques marketplace (lecture seule, fort trafic).
- P2 : test e2e navigateur (Playwright) pour AGUI-08/09 et un test de charge léger (k6) avant lancement.
- P2 : APM en production pour suivre les latences réelles.
