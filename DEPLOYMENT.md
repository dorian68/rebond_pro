# Déploiement — RebondPro Formation

Runbook de mise en production. La base est **Supabase (PostgreSQL)**. L'app est **Next.js 16**.

## 1. Prérequis (à faire une fois)

### 1.1 Base de données Supabase
- Projet Supabase créé (région proche des utilisateurs).
- Récupérer la connection string **pooler** (Settings → Database → Connection pooling, mode "Transaction" pour la prod) :
  `postgresql://postgres.<ref>:<password>@aws-<n>-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1`
- Pour les migrations, prévoir aussi l'URL **directe** (port 5432) si l'hôte de build peut l'atteindre.

### 1.2 Bucket de stockage public (images)
- Supabase → Storage → **créer un bucket public** nommé `public-assets`.
- Renseigner `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (Service Role), `SUPABASE_PUBLIC_BUCKET=public-assets`.
- Tant que le bucket n'existe pas : les avatars initiales/couleur s'affichent (fonctionnel, pas de blocage).

### 1.3 Email transactionnel
- Fournisseur SMTP de prod (Resend/Postmark) → `EMAIL_SMTP_*`, `EMAIL_FROM`.

### 1.4 Facturation Stripe (Lot 7)
- Créer les produits/prix Stripe (Pro, Premium) → renseigner `STRIPE_PRICE_PRO`, `STRIPE_PRICE_PREMIUM`.
- `STRIPE_SECRET_KEY` (live), et configurer un webhook Stripe vers `https://<domaine>/api/stripe/webhook` → `STRIPE_WEBHOOK_SECRET`.
- Événements à écouter : `checkout.session.completed`, `customer.subscription.created/updated/deleted`.
- En dev : `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
- Sans ces clés : l'app reste utilisable en FREE, l'upgrade est simplement désactivé (pas de blocage).

## 2. Variables d'environnement (prod)

Obligatoires (validées au démarrage par `src/lib/env.ts`) :
- `DATABASE_URL` (pooler Supabase)
- `AUTH_SECRET` (≥ 16 caractères ; `openssl rand -base64 32`)

Recommandées :
- `AUTH_URL` / `APP_PUBLIC_URL` (URL publique de l'app)
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_PUBLIC_BUCKET`
- `EMAIL_SMTP_HOST/PORT/USER/PASSWORD`, `EMAIL_FROM`
- `ANTHROPIC_API_KEY` ou `OPENAI_API_KEY` (+ `AG_UI_PROVIDER`, `AG_UI_MODEL`)
- `STORAGE_DRIVER=supabase`

⛔ **Ne jamais définir `DEV_AUTOLOGIN=true` en production** (bypass d'auth). Le code le neutralise et l'avertit, mais il ne doit pas figurer dans les secrets prod.

## 3. Migrations base

Depuis un hôte pouvant atteindre Supabase en direct :
```bash
npx prisma migrate deploy
```
> Note Windows/VPN : si la CLI Prisma échoue (`P1001`), couper tout VPN. En dernier recours, appliquer le SQL des migrations dans le **SQL Editor Supabase** (les colonnes marketplace/auth/dedup ont été posées ainsi en dev — voir historique `prisma/migrations` + index `Prospect_public_dedup_key`).

## 4. Build & run

```bash
npm ci
npx prisma generate
npm run build      # doit sortir en exit 0
npm run start      # serveur de production (port 3000 par défaut)
```

Hébergement recommandé : Vercel (Next.js natif) ou conteneur Node 20+ (Docker). Définir les variables d'env dans le gestionnaire de secrets de la plateforme.

## 5. Vérifications post-déploiement (santé)

```bash
curl -fsS https://<domaine>/api/health      # attendu : 200 {"ok":true,"db":"up"}
```
Suite de fumée (depuis un environnement avec `DATABASE_URL` de prod, hors heures de pointe) :
```bash
npm run smoke:health
npm run smoke:all     # crée/nettoie des données jetables — à réserver à un env de staging
```

## 6. Observabilité

- Logs : `src/lib/logger.ts` émet du JSON structuré (secrets masqués) → brancher la collecte de logs de la plateforme.
- Liveness/readiness : `/api/health` (à connecter au load balancer / uptime monitor).
- À ajouter pour la prod : APM/alerting externe (Sentry, Better Stack, etc.). **Bloqueur P0 restant.**

## 7. Sauvegardes & RGPD

- Activer les **sauvegardes automatiques** Supabase (PITR selon le plan).
- Export utilisateur disponible in-app (Paramètres → Avancé → CSV).
- Voir `/legal/confidentialite` pour la politique.

## 8. Checklist Go-Live

- [ ] `DATABASE_URL` pooler + `AUTH_SECRET` (≥16) configurés
- [ ] `DEV_AUTOLOGIN` absent des secrets prod
- [ ] Bucket `public-assets` créé (si upload d'images voulu)
- [ ] SMTP prod configuré + email de test reçu
- [ ] `prisma migrate deploy` appliqué (+ index `Prospect_public_dedup_key`)
- [ ] `npm run build` exit 0
- [ ] `/api/health` → 200
- [ ] APM/alerting branché
- [ ] Sauvegardes activées
