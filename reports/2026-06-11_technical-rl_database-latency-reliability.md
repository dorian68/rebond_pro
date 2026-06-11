# Technical RL Iteration Report

## Context

Product: Le Bon Rebond  
Feature: Latence et fiabilité des communications PostgreSQL  
Spec sections: persistance, CLI-testabilité, production readiness  
Acceptance criteria: cause reproductible, erreurs observables, écritures non rejouées, base locale cohérente, smoke tests verts.

## Diagnosis

1. `.env.local` cible le pooler Supabase `us-east-1:5432` depuis la France.
2. Le trafic sort par l'interface ProtonVPN. Le port TCP s'ouvre, mais Prisma échoue au handshake/session PostgreSQL avec `P1001`.
3. L'ancien middleware Prisma rejouait trois fois toutes les opérations, y compris les écritures. Une panne transformait un timeout d'environ 5 secondes en 13 à 20 secondes et pouvait dupliquer un effet déjà validé côté serveur.
4. Deux serveurs Next concurrents écoutaient sur les ports 3000 et 3100.
5. Le schéma Prisma avait évolué sans migration correspondante. La base locale était déclarée à jour tout en manquant des colonnes et tables.

## Patch

- Retry limité à une répétition des lectures sur `P1008/P1017` ou connexion interrompue.
- Aucun retry automatique des créations, mises à jour, suppressions ou commandes SQL d'écriture.
- Ajout de `npm run db:diagnose` avec sorties JSON sans secret.
- Ajout de `npm run dev:local`, qui force PostgreSQL local sur le port 3100.
- Ajout de la migration idempotente `20260611210000_sync_current_schema`, incluant l'index partiel anti-doublon prospect.
- Séparation requêtes brutes/cache Next pour rendre les smoke tests exécutables hors runtime Next.
- Isolation du smoke achat public pour empêcher tout appel Stripe réel.
- Arrêt du serveur Next obsolète sur le port 3000.

## Tests

Commands:

- `npm run db:diagnose`
- `npx prisma migrate deploy`
- `npx prisma migrate status`
- `npm run smoke:all`
- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`

Results:

- Supabase via ProtonVPN: TCP ouvert en 319 ms, Prisma `P1001` après environ 5 secondes.
- Ancien `smoke:health` distant: environ 19 secondes. Après correction: environ 7 secondes, sans triple retry.
- PostgreSQL local: première requête 35 ms, requêtes chaudes 2 à 3 ms.
- HTTP local chaud: `/api/health` 29 ms, `/marketplace` 108 ms, `/dashboard` 179 ms.
- Migrations: schéma local à jour, diff vide.
- `smoke:all`: 20/20 PASS.
- TypeScript, lint et build: PASS. Lint conserve 3 warnings préexistants.

## Scores

Technical reliability: 94/100  
Spec compliance: 94/100  
State coherence: 95/100  
CLI testability: 98/100  
Production readiness: 84/100

## Verdict

**PASS pour le développement local. PARTIAL pour Supabase depuis cette machine tant que ProtonVPN route PostgreSQL.**

## Remaining risks

P0: aucun pour le développement local.  
P1: désactiver ProtonVPN ou exclure le trafic PostgreSQL/Supabase du tunnel pour les tests distants.  
P1: héberger l'application dans la même région que Supabase, ou recréer la base dans une région européenne avant production.  
P2: ajouter un APM pour mesurer les requêtes lentes en production.
