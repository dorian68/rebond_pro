# Technical RL — retrait Digitalys Formation

## Périmètre et acceptation

Demande explicite du propriétaire : retirer Digitalys Formation de l'ensemble du site public et appliquer directement en production. Référence : section « Retrait du référencement Digitalys » de FUNCTIONAL_SPECIFICATION.md. La fiche centre et ses cinq formations doivent disparaître de l'annuaire, du catalogue, de la recherche et du sitemap ; leurs URLs retournent 404. Les autres centres et formations doivent rester inchangés.

## Mise en production

Production vérifiée sur `06ac3e044ede7a70b8ea8b6e9739ec85aa0bb2dd`, base active du conteneur : hôte `db`, base `rebondpro`. Le checkout historique modifié n'est pas utilisé. Travail source sur `fix/remove-digitalys-20261119`, basé sur la branche questionnaire publiée.

Sauvegarde PostgreSQL complète `/opt/rebondpro/backups/digitalys-pre-withdrawal-20261119.sql.gz` : 157971 octets, permission 600, intégrité gzip vérifiée avant la mutation. La première commande d'affichage `stat` a rencontré un CR final du pipe PowerShell ; le contrôle direct suivant a confirmé l'intégrité et les permissions du fichier avant toute écriture persistée.

`ops/withdraw-digitalys.sql` a d'abord exécuté toute la transaction en simulation, avec ROLLBACK : PASS. Exécution explicite avec `psql -v apply=true` : COMMIT. Une seule organisation identifiée par ID/slug/nom est dépubliée et rejetée ; ses cinq formations passent à `isPublic=false`. Les données métier internes sont conservées. Un audit durable `PUBLIC_CATALOG_WITHDRAWAL` contient les anciens et nouveaux états de publication. Les empreintes des lignes de tous les autres centres et formations sont comparées dans la transaction et restent identiques.

Les premières lectures HTTP servaient encore le Data Cache. Seul le service `app` a été recréé avec la même image via `docker compose -f /opt/rebondpro/docker-compose.yml up -d --no-deps --force-recreate app` ; la base et les autres services n'ont pas été recréés. Cette actualisation de contenu n'exige aucun nouveau build applicatif ni migration. `DEPLOYED_COMMIT` reste correctement celui du code applicatif actif. Le seed CARIF source retire la fiche afin de prévenir sa réintroduction.

## Vérifications

- Simulation SQL et mutation ciblée : PASS ; limites de temps/verrouillage et transaction sérialisable.
- SQL après COMMIT : profil public désactivé, statut REJECTED, zéro formation publique sur les cinq, un audit durable, neuf autres centres et 58 formations publics.
- `node --check scripts/smoke-digitalys-removal.mjs` : PASS.
- `npx tsc --noEmit` : PASS.
- `git diff --check` : PASS.
- `node scripts/smoke-digitalys-removal.mjs` : PASS sur `https://lebonrebond.fr`, 16 étapes, 88 URLs sitemap, six anciennes fiches 404 sans nom/coordonnées/liens publics, sept pages et variantes de recherche sans référencement. Les 67 fiches restantes (neuf centres, 58 formations) retournent toutes 200.
- Le même smoke sur l'alias `https://lebonrebond.optiquant-ia.com` : PASS, 16/16.

La recette ne soumet aucun formulaire, ne crée aucun utilisateur et n'envoie aucun message. Le smoke global des autres fonctions n'est pas relancé pour une dépublication de données ; les limites historiques de la plateforme restent documentées séparément.

## Scores et verdict

Fiabilité technique 100/100 ; conformité ciblée 100/100 ; cohérence d'état 100/100 ; testabilité CLI 100/100 ; exploitation du retrait 100/100.

**Technical RL : PASS ciblé en production.** Le verdict Client Mystère est consigné dans son rapport indépendant. La disparition d'une éventuelle copie déjà indexée dans un moteur externe dépend de son prochain passage ; les URLs retirées servent désormais 404.
