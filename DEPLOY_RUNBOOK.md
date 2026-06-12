# Déploiement automatisé — RebondPro

Outil : `scripts/deploy.mjs` (raccourcis npm ci-dessous). Automatise **push git + build VPS + bascule + health-check** pour que chaque mise en prod soit reproductible et sûre.

## TL;DR

```bash
npm run deploy:dry      # aperçu : montre TOUT ce qui serait fait, sans rien exécuter
npm run deploy          # déploie le commit HEAD courant
git ... ; npm run deploy # (commit toi-même puis déploie)
npm run deploy:migrate  # déploie ET applique les migrations Prisma
npm run deploy:rollback # revient au commit précédent (re-tag image + compose up)
```

Options fines (via `node scripts/deploy.mjs ...`) :
- `--yes` / `--execute` : exécute réellement (sinon **dry-run par défaut**).
- `--commit "msg"` : `git add -A` + commit + push avant de déployer.
- `--migrate` : lance `prisma migrate deploy` (conteneur jetable sur le VPS).
- `--skip-build` : saute le build local (gate). `--skip-lint` : saute le lint.
- `--allow-dirty` : déploie le dernier commit même si l'arbre est sale.
- `--rollback` : bascule sur la release précédente.

## Ce que fait le pipeline

1. **Préflight local** : vérifie l'état git, lance `npm run lint` puis `npm run build` (échec rapide **avant** de toucher la prod).
2. **Push git** vers `origin/main`.
3. **Transfert source** : `git archive HEAD` → `…/releases/<commit>/` sur le VPS.
   ⚠️ **Aucun `.env*` n'est transféré** (archive = fichiers suivis, et `.env*` est gitignored) → la prod **garde son `.env.production` et donc sa base Postgres du VPS**.
4. **Build sur le VPS** : `docker build -t rebondpro-app:<commit> -t rebondpro-app:latest`.
5. **(option `--migrate`)** : backup DB (`backup.sh`) puis `prisma migrate deploy` via un conteneur `node:22-alpine` sur le réseau `rebondpro_default` (le mot de passe DB est lu sur le VPS, ne transite jamais).
6. **Bascule** : `docker compose up -d` (recrée `rebondpro-app` avec la nouvelle image). Caddy système inchangé.
7. **Health-check** : `GET /api/health` jusqu'à succès (`{"ok":true,"db":"up"}`).
   - **Échec ⇒ rollback automatique** sur l'image du commit précédent + re-check.
8. **Finalisation** : écrit `DEPLOYED_COMMIT`, purge les vieilles releases (garde les 5 dernières).

## Configuration (valeurs par défaut, surchargeables par env)

| Variable | Défaut |
|---|---|
| `DEPLOY_VPS_HOST` | `root@204.168.138.243` |
| `DEPLOY_SSH_KEY` | `~/.ssh/rebondpro_deploy` |
| `DEPLOY_REMOTE_DIR` | `/opt/rebondpro` |
| `DEPLOY_HEALTH_URL` | `https://lebonrebond.optiquant-ia.com/api/health` |
| `DEPLOY_IMAGE` | `rebondpro-app` |
| `DEPLOY_COMPOSE_NET` | `rebondpro_default` |
| `DEPLOY_BRANCH` / `DEPLOY_GIT_REMOTE` | `main` / `origin` |
| `DEPLOY_KEEP_RELEASES` | `5` |

## Prérequis (poste qui déploie)

- Clé SSH `~/.ssh/rebondpro_deploy` (sans passphrase) autorisée sur le VPS.
- Docker n'est **pas** requis en local (le build se fait sur le VPS).
- Node 20+ (pour `git archive`, `scp`, `ssh` natifs + `fetch`).

## Notes de sécurité

- Le déploiement **ne touche jamais** `.env.production` du serveur (jamais transféré). Pour changer un secret prod : l'éditer **sur le VPS** puis `cd /opt/rebondpro && docker compose up -d`.
- `DEV_AUTOLOGIN` doit rester absent des secrets prod.
- Migrations : opt-in (`--migrate`). La plupart des déploiements (changements UI/contenu) n'en ont pas besoin.
