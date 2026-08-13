# Verdict Technical RL — stabilité Roadmap 2

Date : 2026-08-13
Périmètre : commit `b9353fd` déployé sur le VPS de production.

## Verdict

**PASS TECHNIQUE DU CODE EN PRODUCTION. Activation Google et sauvegarde documentaire complète restent conditionnelles aux fournisseurs externes.**

## Invariants prouvés

- Une erreur d'outil agentique termine le run en échec et ne produit plus « C'est fait ».
- Les outils Gmail et Roadmap 2 ne sont accessibles que depuis l'endpoint serveur dédié Roadmap 2.
- Le corps Gmail approuvé est exactement le corps envoyé, référence de suivi comprise.
- Une approbation est signée, liée au contexte/utilisateur/arguments et consommable une fois.
- Un même email ne peut pas être envoyé deux fois, même avec deux approbations ; les états incertains sont réconciliés depuis les messages envoyés.
- Les URL temporaires `*.r2.cloudflarestorage.com` authentiques sont acceptées et les faux suffixes rejetés.
- Les ressources Drive des nœuds sont provisionnées progressivement et Dorian est un éditeur permanent garanti côté serveur.
- Un échec Storage après le dump conserve la sauvegarde PostgreSQL et publie un état `PARTIAL` sans archive documentaire incomplète.
- Le reset « Afficher toute la roadmap » restaure les nœuds après un filtre vide, y compris avec deux nœuds libres.

## Preuves

| Contrôle | Résultat |
| --- | --- |
| 27 migrations sur base vide | PASS |
| `npm run smoke:all` | PASS — 39/39 |
| `npm run smoke:backup` | PASS — succès + panne Storage simulés |
| `npm run smoke:roadmap-2:http` | PASS |
| `npm run smoke:roadmap-2:a11y:runtime` | PASS — desktop/tablette/mobile, Axe 0 sérieux, zoom, clavier, 44 px, reset filtres |
| `npx tsc --noEmit` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS |
| `git diff --check` | PASS |

## Preuves post-déploiement

- image `rebondpro-app:b9353fd` active et health HTTPS/DB PASS ;
- production à 27/27 migrations, index anti-double envoi actif et 67 nœuds conservés ;
- dump pré-migration restauré sur une base de répétition, migration appliquée puis second déploiement vide ;
- smokes ciblés agent, Gmail, Drive et backup PASS contre le schéma production, fixtures nettoyées ;
- dump DB post-déploiement vérifié et état `PARTIAL` correctement signalé sur la panne Storage 402.

## Conditions externes avant PASS opérationnel complet

1. Reconnecter Drive et Gmail : le diagnostic réel post-déploiement retourne Drive `EXPIRED`/`NOT_CONNECTED` et Gmail `NOT_CONNECTED`.
2. Exécuter l'E2E Gmail réel : succès, rejet définitif, timeout incertain, réconciliation et absence de doublon.
3. Exécuter l'E2E Drive réel : provisioning progressif, upload, aperçu Cloudflare R2 et permissions.
4. Lever le HTTP 402 Supabase Storage puis contrôler une sauvegarde complète et sa restauration documentaire.

Aucune de ces opérations externes n'a été simulée comme une preuve de production.
