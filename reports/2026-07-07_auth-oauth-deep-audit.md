# Deep Auth/OAuth Audit — 2026-07-07

## Scope

Audit profond de l'authentification centre : Google OAuth, Auth.js JWT, résolution tenant, fallback dev, routes protégées, API AG-UI, configuration locale, état base et parcours navigateur.

## Findings corrigés

### P0 — `DEV_AUTOLOGIN` masquait la session réelle

Symptôme utilisateur : peu importe l'email Google utilisé, l'application affichait le même espace.

Cause : `getSession()` retournait le fallback `DEV_AUTOLOGIN` avant de lire `auth()`. Les pages protégées pouvaient donc afficher le compte de dev même après une vraie connexion Google.

Correctif :

- `src/lib/tenant.ts` lit maintenant la vraie session Auth.js avant le fallback dev.
- `.env.local` est passé à `DEV_AUTOLOGIN="false"`.
- `.env.example` documente `DEV_AUTOLOGIN="false"` pour les tests OAuth réels.

### P0 — Token tenant stale accepté après révocation membership

Cause : si aucun membership actif n'était trouvé en base, `requireTenant()` pouvait encore faire confiance à `session.user.organizationId`.

Correctif :

- `requireTenant()` exige maintenant un membership `ACTIVE` en base.
- Si aucun membership actif n'existe, redirection vers `/login?oauth=no_membership`.
- Le tenant DB est la source de vérité.

### P0 — API AG-UI reconstruisait le tenant depuis le JWT

Cause : `/api/ag-ui/run` construisait un `TenantContext` depuis `session.user.organizationId`, sans revérifier le membership actif.

Correctif :

- Ajout de `tenantContextFromSession()`.
- `/api/ag-ui/run` utilise cette fonction et renvoie `401 no_active_membership` pour une session connectée sans tenant actif.
- Exception conservée pour le super-admin plateforme, qui peut opérer sans tenant centre.

### P1 — Secret OAuth context placeholder en production

Cause : le contexte OAuth signé pouvait retomber sur un secret placeholder si `AUTH_SECRET` manquait.

Correctif :

- `encodeGoogleOAuthContext()` refuse maintenant le placeholder en `NODE_ENV=production`.
- Smoke test ajouté : `production_secret_required`.

## Evidence

### CLI

- `npm run db:diagnose` : PASS Prisma après arrêt du serveur dev. TCP Supabase ouvert, requêtes Prisma OK.
- `npm run smoke:google-oauth` : PASS.
- `npm run smoke:tenant` : PASS.
- `npm run smoke:persona` : PASS.
- `npm run smoke:business-google-oauth` : PASS.
- `npx tsc --noEmit` : PASS.
- `npm run lint` : PASS, 0 erreur, 13 warnings existants hors OAuth.
- `npm run build` : PASS, warnings Turbopack NFT existants hors auth.

### HTTP / navigateur

- Sans cookie : `HEAD /dashboard` retourne `307 location: /login`.
- `/api/auth/providers` retourne Google + credentials actifs.
- `/api/ag-ui/run` sans cookie répond en mode visiteur public, sans tenant.
- Playwright : le bouton "Créer mon compte centre avec Google" redirige vers `accounts.google.com` et pose le cookie `lbr_google_oauth_context` en HttpOnly + SameSite=Lax.

### Base

Audit masqué :

- 25 users.
- 5 memberships actifs.
- 1 membership invité.
- 20 users sans membership actif.
- Le compte du test Google a désormais un membership `OWNER/ACTIVE`, mais garde aussi une ancienne invitation `LEARNER/INVITED`.
- Des noms d'organisation sont dupliqués, mais les slugs restent uniques.

## Risques restants

### P1 — Données orphelines

20 users sans membership actif existent. Ce n'est plus un bypass d'accès après correction, mais c'est une dette de données et d'UX : ces comptes doivent avoir une stratégie claire (suppression, rattachement, relance, ou page "aucun espace").

### P1 — Multi-organisation non modélisé côté UX

Le code sélectionne le premier membership actif (`createdAt asc`). Si un utilisateur a plusieurs centres actifs, il n'y a pas encore de sélecteur d'espace. À cadrer produit.

### P1 — Connexion Google d'un compte existant sans espace actif

Depuis le bouton inscription centre, le cas est corrigé : un centre est créé. Depuis le bouton login, le compte aboutit encore à "aucun espace actif". C'est techniquement sûr, mais UX à améliorer.

### P1 — Connexion Supabase intermittente sous serveur dev

`db:diagnose` a échoué une fois quand le serveur dev était lancé, puis a passé après arrêt. Risque de saturation/latence pooler Windows/us-east. À surveiller avant déploiement.

### P2 — Noms de centres dupliqués

Pas un bug de sécurité car `slug` est unique, mais peut brouiller les tests et l'expérience admin.

## Verdict

Technical RL verdict auth/OAuth après audit : PASS sur les garde-fous critiques corrigés.

Business Client Mystère verdict : PARTIAL tant qu'il existe des comptes orphelins et pas de parcours UX clair pour "compte Google sans espace actif".
