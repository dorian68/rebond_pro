# Le Bon Rebond

La plateforme qui transforme les périodes de doute en trajectoires professionnelles claires.
Elle réunit un parcours public orientation/formation et un espace SaaS multi-tenant pour les centres partenaires.

> Cahier des charges : `../projet_formation/CAHIER_DES_CHARGES.md`

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** + design system maison (`src/app/globals.css`)
- **Prisma 6** + **PostgreSQL**
- **Auth.js (NextAuth v5)** — credentials + session JWT, multi-tenant + rôles
- **Redis / Mailpit** via Docker (jobs & emails de dev)

## Démarrer en local

Prérequis : Node 20+, Docker.

```bash
# 1. Services (PostgreSQL, Redis, Mailpit)
docker compose up -d

# 2. Variables d'env
cp .env.example .env.local   # ajuster si besoin (un .env existe déjà pour Prisma)

# 3. Base de données + données de démo
npm install
npm run db:migrate
npm run db:seed

# 4. Lancer
npm run dev   # http://localhost:3000
```

**Connexion démo :** `demo@rebondpro.local` / `demo1234`
(centre « Académie Horizon Formation » pré-rempli).

Mailpit (emails de dev) : http://localhost:8025

## Scripts

| Script | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` / `start` | Build & run production |
| `npm run db:migrate` | Migrations Prisma (dev) |
| `npm run db:seed` | Données de démonstration |
| `npm run db:studio` | Explorateur de base Prisma |
| `npm run db:reset` | Réinitialise la base |
| `npm run smoke:lot5` | Smoke backend du parcours public → prospect |
| `npm run smoke:auth` | Smoke du parcours de vérification email |
| `npm run smoke:registration` | Smoke inscription, tenant, trial et vérification requise |
| `npm run smoke:business` | Audit automatisé acquisition/activation du lot 5 |
| `npm run smoke:production` | Lint + build production |

## Architecture

```
src/
  app/
    (auth)/        login, register
    (app)/         cockpit protégé (layout = Sidebar + Topbar)
      dashboard/   tableau de bord (branché metrics réelles)
      formations/ sessions/ planning/ prospects/ ...
    api/auth/      handlers Auth.js
    onboarding/    post-inscription
  components/      ui/ (Icon, charts, primitives) + app/ (Sidebar, Topbar)
  lib/             prisma, auth (tenant), utils, nav
  server/          metrics, server actions
  auth.ts          configuration Auth.js
prisma/            schema + seed
```

## Règles structurantes

- **Multi-tenant** : toute requête de données filtre par `organizationId`
  (`requireTenant()` + `tenantWhere()` dans `src/lib/tenant.ts`).
- **Metrics centralisées** : `src/server/metrics.ts` (jamais de chiffres en dur).
- **Services externes derrière des interfaces** (storage, email, IA) pour la bascule prod.

## État d'avancement

- [x] Lot 0 — Fondations (auth, multi-tenant, DB, design system, shell)
- [x] Dashboard branché sur données réelles
- [x] Lot 1 — CRUD métier (formations, sessions, formateurs, apprenants, CRM Kanban)
- [x] Lot 2 — Planning intelligent (calendrier hebdo, conflits, créneaux IA, indisponibilités)
- [x] Lot 3 — Documents & emails (PDF @react-pdf, génération unitaire/lot, envoi Mailpit)
- [x] Lot 4 — IA opérationnelle (assistant Claude, relance/description, fallback sans clé)
- [x] Lot 5 — Pages publiques, landing, onboarding et vérification email
- [ ] Lot 6 — Qualité & portails
- [ ] Lot 7 — SaaS production (facturation, calendrier, signature, paiement)
