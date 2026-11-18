# Déploiement VPS - RebondPro

## Conservation des questionnaires

Après application de la migration `20261118120000_questionnaire_responses`, installer `ops/purge-questionnaires.sh` sous `/opt/rebondpro/ops/purge-questionnaires.sh` avec permissions 0750 et une tâche `/etc/cron.d/rebondpro-questionnaires` :

```cron
17 3 * * * root /opt/rebondpro/ops/purge-questionnaires.sh >> /opt/rebondpro/backups/questionnaires-purge.log 2>&1
```

La tâche ne supprime que les réponses dont `expiresAt` est atteint ; son journal contient uniquement le nombre de suppressions PostgreSQL. Les interfaces excluent déjà ces réponses dès l'échéance. Vérifier `sh -n`, exécution à blanc sans réponse échue, puis la présence du cron. Les sauvegardes PostgreSQL restent soumises au cycle de rotation d'exploitation et ne doivent pas réintroduire de réponses expirées après une restauration.

## Release questionnaire du 18 novembre 2026

La production sert `06ac3e044ede7a70b8ea8b6e9739ec85aa0bb2dd`, construit dans le worktree `rebondpro-questionnaire` sur la branche `feat/questionnaire-rebond`, depuis la base de production exacte `1ea433e`. Cette branche n'est pas un descendant de `origin/main` ; aucune réécriture de la branche principale ni reprise du checkout historique modifié n'a été effectuée.

Pour cette publication, l'image a été compilée hors VPS puis transférée par `docker save` et `docker load` en flux, sans archive d'image supplémentaire sur le disque serveur. Les couches RootFS, architecture et label de révision ont été comparés avant activation. La sauvegarde PostgreSQL, `prisma migrate deploy` dans un conteneur éphémère 6.19.3, la purge et les contrôles ont précédé la finalisation de `DEPLOYED_COMMIT`. Seul le service `app` a été recréé avec `docker compose up -d --no-deps app`. Cette méthode évite un build sur le VPS, dont les ressources restent contraintes.

L'image précédente est conservée sous `rebondpro-app:rollback-questionnaire-1ea433e51c8d2ab9abd589101594bbed7f848bb2`. Une restauration de l'image conserve la nouvelle table, additive ; ne pas supprimer cette table ni ses réponses pour revenir à l'interface précédente. Les contrôles publics ont été effectués après activation et la seule réponse de recette a été supprimée.

Dernière validation : 12 juillet 2026.

Ce document décrit l'infrastructure réellement utilisée par `lebonrebond.optiquant-ia.com`. Le déploiement courant est automatisé par `scripts/deploy.mjs` et conserve les secrets, la base et le proxy déjà présents sur le VPS.

## Architecture de production

| Composant | Configuration |
|---|---|
| VPS | Hetzner, accès par clé SSH dédiée |
| Application | Image Docker `rebondpro-app:<commit>`, publiée localement sur `127.0.0.1:3000` |
| Base | PostgreSQL 16 dans `rebondpro-db`, volume Docker persistant, non exposé sur Internet |
| HTTPS | Caddy installé comme service système, proxy vers l'application |
| Fichiers | Supabase Storage côté serveur |
| Releases | `/opt/rebondpro/releases/<commit>` ; cinq releases conservées par défaut |
| Santé | `https://lebonrebond.optiquant-ia.com/api/health` |

Le fichier `/opt/rebondpro/docker-compose.yml` et les secrets du VPS sont la source de vérité d'exploitation. Le fichier `docker-compose.prod.yml` du dépôt reste un exemple de bootstrap et ne remplace pas la composition existante lors d'une mise à jour ordinaire.

## Préflight local

Depuis la branche `main` :

```bash
npm ci
npm run lint
npx tsc --noEmit
npm run smoke:all:local
npm run build
npm run deploy:dry
```

Pour les parcours rendus, le serveur local doit tourner sur le port 3100 :

```bash
npm run dev:local
npm run smoke:accessibility
npm run smoke:ui
npm run smoke:email-transport
```

`smoke:all:local` refuse une base distante et neutralise Stripe, les emails externes, Composio et Supabase Storage.

## Mise en production

Cette release contient des migrations Prisma. La commande recommandée est donc :

```bash
node scripts/deploy.mjs --yes --migrate --commit "chore(release): harden public production"
```

Le pipeline effectue, dans l'ordre :

1. commit et push de la révision ;
2. lint et build local ;
3. transfert d'une archive Git sans fichier `.env*` ;
4. build de l'image sur le VPS ;
5. sauvegarde PostgreSQL puis `prisma migrate deploy` ;
6. bascule par `docker compose up -d` ;
7. health-check HTTPS avec rollback automatique en cas d'échec ;
8. conservation de la release et purge limitée aux anciennes images RebondPro.

Ne jamais utiliser `--skip-build` pour une release normale. `DEV_AUTOLOGIN` doit rester absent ou à `false` en production.

## Variables sensibles

Les vraies valeurs restent uniquement dans la configuration du VPS. Les familles requises sont :

- `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `APP_PUBLIC_URL` ;
- SMTP (`EMAIL_SMTP_*`, `EMAIL_FROM`) ;
- stockage (`STORAGE_DRIVER=supabase`, `SUPABASE_*`) ;
- OAuth Google, fournisseur LLM et Stripe selon les fonctionnalités activées.

Les paiements publics sont des fonctionnalités à activation explicite :

- `PUBLIC_FORMATION_PAYMENTS_ENABLED=true` seulement après validation des CGV marketplace et du vendeur ;
- `BILAN_PAYMENTS_ENABLED=true` seulement avec `ORGANISME_FORMATION_NDA` renseigné et conformité du prestataire vérifiée.

Sans ces conditions, le site conserve un parcours de prise de contact et n'affiche pas de paiement trompeur.

## Sauvegardes et migrations

`/opt/rebondpro/backup.sh` produit une sauvegarde PostgreSQL avant migration. Une sauvegarde quotidienne compressée est également conservée dans `/opt/rebondpro/backups`.

Le job quotidien publie toujours le dump PostgreSQL vérifié avant d'appeler le stockage distant. Si Supabase refuse l'export (quota, restriction ou panne), le job termine en échec, conserve le dump DB, écrit un fichier `*.status` marqué `PARTIAL` et journalise l'action fournisseur requise. Un état PARTIAL ne remplace pas une sauvegarde complète des documents.

Vérifications manuelles non sensibles :

```bash
ssh -i ~/.ssh/rebondpro_deploy root@204.168.138.243 "docker compose -f /opt/rebondpro/docker-compose.yml ps"
ssh -i ~/.ssh/rebondpro_deploy root@204.168.138.243 "cat /opt/rebondpro/DEPLOYED_COMMIT"
```

## Vérifications après bascule

```bash
curl -fsS https://lebonrebond.optiquant-ia.com/api/health
curl -fsSI https://lebonrebond.optiquant-ia.com/
curl -fsSI https://lebonrebond.optiquant-ia.com/bilan-de-competences
curl -fsSI https://lebonrebond.optiquant-ia.com/bilan-orientation
curl -fsSI https://lebonrebond.optiquant-ia.com/legal/mentions
curl -fsSI https://lebonrebond.optiquant-ia.com/robots.txt
curl -fsSI https://lebonrebond.optiquant-ia.com/sitemap.xml
```

Contrôler ensuite les logs sans afficher l'environnement :

```bash
ssh -i ~/.ssh/rebondpro_deploy root@204.168.138.243 "docker logs --since 10m rebondpro-app"
```

## Rollback

Le pipeline conserve l'image précédente et revient automatiquement dessus si la santé échoue. Un rollback manuel reste disponible :

```bash
npm run deploy:rollback
```

Après rollback, vérifier `/api/health`, les logs de l'application et l'état de `rebondpro-db` avant toute nouvelle tentative.
