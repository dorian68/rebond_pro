# Goal de relance — Roadmap 2 fiable et adoptable

Date de définition : 2026-08-12

## Avancement au 12 août 2026

- Terminé et testé : traitement de toutes les réponses de permissions Composio, machine d'état OAuth complète, identité Google via `GOOGLEDRIVE_GET_ABOUT`, épinglage des mutations sur le compte vérifié.
- Terminé et testé avec fournisseur simulé : un document de suivi existant est accepté uniquement si Drive confirme qu'il s'agit d'un Google Doc placé directement dans le dossier du nœud.
- Terminé dans le code et testé : registre durable couvrant les huit mutations Drive/DB, clés d'idempotence conservées côté client, leases, résultats fournisseur durables, reprise sans double appel, audits rejouables, file de réparation et CLI de finalisation locale.
- Terminé avec fournisseur simulé : reprise du provisioning après perte du commit PostgreSQL et reprise d'un upload après succès fournisseur sans seconde copie.
- Terminé sans mutation active : un clone structure+données de 44 tables et 413 lignes a baseliné les 23 migrations historiques, déployé les 2 migrations nouvelles, prouvé un second déploiement vide et obtenu un fingerprint strictement identique avant nettoyage. La cible attend encore une sauvegarde restaurable avant baseline/déploiement.
- Restant : E2E Google réel et deux revues utilisateurs. La base Supabase de développement reste volontairement distincte et dérivée ; la cible de production est le PostgreSQL du VPS.
- Terminé et testé : les clés d'idempotence non sensibles survivent au rechargement pendant sept jours; elles sont supprimées seulement après succès. Un upload `retryable` redemande le même fichier sans stocker ses octets, et les permissions redemandent les emails sans les conserver en clair.
- Terminé et testé : tout renommage, changement de catégorie ou de parent d'un nœud lié à Drive exige un aperçu avant/après et un jeton signé lié au brouillon; Drive est réconcilié avant la transaction métier et la finalisation reste réparable.
- Terminé et testé : le constructeur de relations refuse création et suppression `parent_child`; la hiérarchie ne peut plus contourner ce préflight. Les scopes d’upload localStorage sont pseudonymisés, clés et valeurs sont sans nom de fichier/email brut, et les entrées expirées sont purgées globalement.
- Terminé et testé : l’initialisation demande une date d’ancrage et un responsable par phase, la vue d’ensemble affiche au plus huit éléments avant expansion, quatre presets accélèrent la revue, vue/filtres/expansions survivent au reload et les KPI utilisent uniquement les livrables feuilles avec formule visible.
- Terminé et testé en navigateur authentifié : Axe sans violation critique/sérieuse, aucun débordement à 1440, 768 et 390 px, navigation clavier amorcée, reflow équivalent zoom 200 % et cibles tactiles Roadmap 2 d’au moins 44 px.
- Terminé sur la cible de production VPS : dump PostgreSQL frais, restauration temporaire, déploiement des 3 migrations restantes sur la restauration, second deploy vide, puis même déploiement sur `public`. Résultat : 25/25 migrations, 46 tables, 66 nœuds conservés, registre vide présent et RLS actif, health app/DB PASS.

## Objectif

Rendre Roadmap 2 réellement fiable et adoptable par Dorian et Mathurin, depuis l'activation Google Drive jusqu'à deux revues hebdomadaires complètes sur le seed réel de 65 nœuds, sans tableur parallèle et sans ambiguïté entre l'état PostgreSQL et l'état Drive.

## Résultat attendu

À la fin du goal :

- toutes les mutations Drive sont exactes, idempotentes, traçables et récupérables;
- l'état OAuth et l'identité Google affichés correspondent au fournisseur réel;
- la chaîne de migrations peut être déployée de façon sûre et répétable;
- un administrateur initialise le seed en moins de 10 minutes avec date et responsables pertinents;
- la vue progressive, les filtres et les KPI permettent une revue hebdomadaire rapide;
- le parcours Google Drive complet est prouvé en E2E réel;
- les deux agents du dépôt rendent un verdict **PASS**.

## Lots de construction

### Lot 1 — Intégrité production

- Uniformiser le traitement des succès/erreurs Composio, notamment les permissions.
- Exposer la machine d'état OAuth complète et l'identité du compte connecté.
- Ajouter un registre d'opérations Drive, des clés d'idempotence, une reprise et une réconciliation CLI.
- Garantir une reprise compréhensible après fermeture/rechargement : persister les clés non sensibles nécessaires, distinguer « réessayez le fichier » d'une réparation serveur et ne jamais prétendre qu'une opération `retryable` est auto-récupérable sans son entrée.
- Vérifier la parenté réelle de tout document ou dossier rattaché.
- Interdire les mutations incohérentes, dont la duplication de la racine.
- Baseline et réparer l'historique Prisma sur un clone avant toute action sur la base active.

### Lot 2 — Adoption et pilotage

- Ajouter au seed une date d'ancrage et l'attribution en masse des responsables par phase.
- Replier la vue initiale sur la racine et les sept phases, puis permettre l'expansion progressive.
- Rendre obligatoire une prévisualisation Drive avant/après pour les mutations structurelles.
- Corriger les contrôles archivés, l'upload par fichier et les états d'erreur.
- Clarifier les KPI et ajouter des presets de revue.
- Mémoriser la vue et les filtres utiles.

### Lot 3 — Preuve réelle et acceptation

- Construire un E2E sur un compte Google de test isolé : connexion, racine, dossier, upload, liste, preview PDF/image/Google Docs, ouverture Office, permissions, archive, lecture seule, restauration, révocation et reconnexion.
- Ajouter les scénarios d'échec fournisseur, retry, conflit et récupération aux smokes CLI.
- Tester clavier, Axe runtime, zoom 200 %, mobile 390 px, tablette et desktop.
- Effectuer deux revues hebdomadaires avec Dorian et Mathurin et mesurer temps et satisfaction.

## Critères de sortie techniques

1. Build, TypeScript, ESLint ciblé, Prisma validate, audit npm et tous les smokes Roadmap 2 PASS.
2. `prisma migrate deploy` prouvé sur un clone représentatif puis sur la cible selon une procédure sauvegardée et réversible.
3. Zéro succès fonctionnel annoncé lorsque Composio retourne `successful: false` ou une erreur.
4. Un retry après panne ne crée ni racine, ni dossier, ni fichier, ni audit en double.
5. Toute opération partielle apparaît dans une file de réparation et peut être reprise en CLI.
6. Aucun fichier ou document hors de la racine du workspace ne peut être rattaché.
7. Le statut `ACTIVE/INITIALIZING/FAILED/EXPIRED/INACTIVE/REVOKED` est reproduit et testé.
8. Le parcours E2E réel et les scénarios de révocation sont PASS avec preuves.
9. Axe ne retourne aucune erreur critique ou sérieuse; clavier et zoom 200 % sont PASS.

## Critères de sortie business

1. Initialisation exploitable en moins de 10 minutes.
2. Vue initiale de 8 éléments maximum : racine + sept phases.
3. Un nœud quelconque est trouvé en deux interactions maximum ou par recherche.
4. Un P0 bloqué, une décision et une échéance à sept jours sont trouvés en moins de 60 secondes.
5. Statut, progression, prochaine action, note et preuve sont mis à jour en moins de 3 minutes.
6. Les KPI ne doublonnent pas les niveaux et leur formule est visible.
7. Aucun débordement de page inattendu à 390 px, tablette ou desktop; cibles tactiles d'au moins 44 px.
8. Deux revues réelles sont réalisées sans tableur parallèle, avec satisfaction des deux personas au moins 4/5 et temps de préparation réduit d'au moins 30 %.

## Hors périmètre

- Nouveaux fournisseurs de stockage autres que Google Drive.
- Édition native des fichiers Office ou Google dans Rebond Pro.
- Slack, webhooks temps réel, tarification ou commercialisation générique multi-client.
- Refonte de l'ancienne roadmap.
- Nouveaux rôles métier au-delà des administrateurs déjà prévus.
- Export PDF/PNG avancé, sauf décision séparée après les deux revues.

## Definition of Done

Le goal est terminé uniquement lorsque :

```text
Technical RL verdict: PASS
Business Client Mystère verdict: PASS
```
