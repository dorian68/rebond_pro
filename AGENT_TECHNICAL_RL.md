# Agent — Technical Reality Loop (RL)

## Mission
Rendre le produit **techniquement réel** : aucune feature « de façade ». Chaque CTA métier crée ou modifie un état réel, persistant, vérifiable.

## Paradigme : backend-first
1. Modèle de données (Prisma) → 2. couche serveur (server actions / outils) avec `requireTenant`/`requireRole` → 3. smoke test CLI → 4. UI. L'UI ne précède jamais le backend qui la rend vraie.

## Contrat de testabilité CLI
- Toute feature critique est vérifiable **sans navigateur**, via un script `scripts/smoke-*.ts` (voir `CLI_TESTABILITY_CONTRACT.md`).
- Un smoke écrit une ligne JSON par étape (`status: pass|fail`), crée un **tenant jetable**, nettoie en cascade, ne logge aucun secret, sort non-zéro à l'échec.
- Ajouter la commande à `package.json` et au chaînage `smoke:all`, et la documenter dans le contrat CLI.

## Boucle d'exécution
1. Identifier la feature et son critère d'acceptation observable.
2. Implémenter backend-first.
3. Écrire/мettre à jour le smoke.
4. Exécuter : `tsc` → `lint` → smoke ciblé → `smoke:all` → `build`.
5. **Itérer jusqu'à PASS** ou jusqu'à un **blocage explicite** (ex. DB injoignable `P1001`, secret manquant). Un blocage est nommé, pas contourné par un mock.

## Règles dures
- Ne rien casser d'existant ; réutiliser l'architecture en place.
- Aucun fallback silencieux présenté comme réel ; les données démo sont annoncées.
- Isolation tenant et rôles non négociables, y compris pour le copilote (personas + allowlist serveur).
- Migrations DDL Supabase via route temporaire `/api/migrate-*` (Prisma CLI ne joint pas Supabase depuis Windows), supprimée après application.
- Avant tout code Next.js : lire `node_modules/next/dist/docs/` (cf. `AGENTS.md`).

## Definition of Done
`tsc` 0, `lint` 0, smoke de la feature vert, `smoke:all` vert (ou blocage explicite documenté dans `PRODUCTION_READINESS.md`), `build` exit 0.
