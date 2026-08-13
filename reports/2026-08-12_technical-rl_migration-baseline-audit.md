# Audit Technical RL — baseline Prisma et registre Drive

Date : 2026-08-12

## Verdict

**PASS sur clone représentatif et PASS sur cible de production VPS.**

La chaîne versionnée de 25 migrations construit un schéma vide. Un premier rehearsal a cloné les 44 tables et 413 lignes de la base Supabase de développement dérivée. La véritable cible de production a ensuite été identifiée comme le PostgreSQL local du VPS, déjà à 22/25 migrations. Un dump frais de cette cible a été restauré dans une base temporaire; les 3 migrations restantes y ont été déployées, avec second deploy vide, avant application identique à la cible `public`.

## Méthode réversible

La commande `npm run audit:migrations` :

1. génère un nom de schéma temporaire strictement borné à `codex_migration_audit_<hex>` ;
2. crée ce schéma dans la même base ;
3. y exécute `prisma migrate deploy` avec une URL dont seul le paramètre `schema` change ;
4. compare colonnes, contraintes, index, RLS et enums avec le schéma actif ;
5. supprime le schéma temporaire avec `DROP SCHEMA ... CASCADE` après nouvelle validation du nom.

Les exécutions ont confirmé le nettoyage du schéma temporaire, y compris après échec. Le verrou consultatif Prisma est désactivé uniquement pour ce schéma aléatoire isolé, jamais pour un déploiement réel.

## Résultat observé

- 25 migrations appliquées avec succès sur le schéma vide.
- 1 migration enregistrée comme terminée sur le schéma actif.
- 526 colonnes attendues et 505 présentes : les 21 colonnes manquantes appartiennent au nouveau registre `Roadmap2DriveOperation`.
- 207 valeurs d'enums attendues et 193 présentes : les 14 valeurs manquantes sont celles des types/statuts du registre.
- Une divergence de nullabilité : `SocrateLeadCapture.email` est `NOT NULL` dans la base active, alors que la migration `20260712123000_allow_phone_only_public_leads` le rend nullable.
- Neuf clés étrangères existent dans la base active mais manquent dans le schéma temporaire. Leur migration historique utilise une recherche de nom de contrainte non limitée au schéma ; la présence des contraintes homonymes dans `public` les fait sauter dans le schéma temporaire.
- L'index actif `Prospect_public_dedup_key` ne correspond pas à la définition versionnée : la version attendue limite l'unicité aux prospects actifs associés à une formation.
- Le RLS est actif sur les 44 tables du schéma actif, alors que la chaîne propre ne le reproduit pas sur toutes ces tables. Roadmap 2 conserve bien le RLS sur ses cinq tables.

## Conséquence

Il reste dangereux de lancer directement `prisma migrate deploy` sur la cible, qui tenterait de rejouer des créations déjà présentes. Le rehearsal prouve désormais la procédure technique, mais son application exige encore une sauvegarde restaurable et un créneau contrôlé.

## Rehearsal représentatif PASS — 13 août 2026

- 44 tables et 413 lignes copiées dans `codex_baseline_clone_<hex>` ; comptage exact source/clone pour chaque table.
- Enums, 76 clés étrangères, clés primaires et index recréés dans le namespace du clone.
- 23 migrations historiques marquées appliquées dans le clone uniquement.
- Migrations `20260812210000_roadmap2_drive_operation_ledger` et `20260812220000_repair_schema_reproducibility` déployées.
- Second `prisma migrate deploy` : `No pending migrations to apply`.
- Fingerprint final : 526 colonnes, 125 contraintes, 141 index, 45 tables RLS et 208 valeurs d’enum strictement identiques à une chaîne propre.
- Clone supprimé après succès.

## Procédure requise avant baseline

1. Obtenir une sauvegarde restaurable datée de la base cible.
2. Ajouter une migration corrective idempotente qui :
   - recrée les neuf clés étrangères en limitant les tests à `current_schema()` ;
   - reproduit explicitement le RLS attendu ;
   - remplace l'index Prospect par sa définition métier versionnée ;
   - laisse la migration email nullable s'appliquer normalement.
3. Exécuter le même script juste avant la fenêtre de changement et archiver sa sortie JSON.
4. Baseline les migrations historiques une par une sur la cible avec journal, puis exécuter `migrate deploy`.
5. Vérifier le second `migrate deploy`, `prisma migrate status`, les fingerprints et les smokes DB.

## Application production VPS — 13 août 2026

- Base avant intervention : 22 migrations terminées, 45 tables, 66 nœuds Roadmap 2, registre absent; les cinq tables Roadmap 2 historiques avaient RLS actif.
- Sauvegarde historique `rebondpro-roadmap2-pre-migrate-2026-08-12-171447.sql.gz` restaurée avec succès : 45 tables, 66 nœuds, 21 migrations au moment du dump.
- Dump frais conservé : `rebondpro-20260813-roadmap2-pre-baseline.sql.gz`, 150016 octets.
- Rehearsal sur restauration fraîche : migrations `20260712123000`, `20260812210000`, `20260812220000` PASS; second deploy vide; fingerprint `25|46|66|registre=true|RLS=true`.
- Production `public` : même séquence PASS; second deploy vide; 25 migrations, 46 tables, 66 nœuds, registre présent et vide, RLS actif, `SocrateLeadCapture.email` nullable.
- Santé : conteneur PostgreSQL healthy; endpoint applicatif local `/api/health` retourne `ok=true`, `db=up`.

La base Supabase référencée par `.env.local` reste à 1/25 migrations et ne doit pas être confondue avec la cible de production. Elle demeure un environnement de développement dérivé à traiter séparément si elle doit être conservée.

Réserve : le backup atomique global DB + Storage a échoué sans publier de faux artefact, car l’inventaire Supabase Storage retourne HTTP 402. La sauvegarde PostgreSQL utilisée ici est bien restaurable; la sauvegarde globale quotidienne doit être réparée côté quota/contrat Storage.

## Décision

La barrière migration PostgreSQL de production est levée. Le registre Roadmap 2 est actif sur la cible et prêt pour le déploiement du code correspondant. Le goal global reste ouvert pour le Google E2E réel et les deux revues utilisateurs.
