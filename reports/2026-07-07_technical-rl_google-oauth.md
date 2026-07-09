# Technical RL — Google OAuth

## Scope

Mise en place de Google OAuth pour :

- connexion d'un compte existant ;
- création explicite d'un compte centre ;
- rattachement tenant/membership compatible avec les sessions JWT existantes.

## Implémentation

- Provider Auth.js Google activé si `AUTH_GOOGLE_ID` et `AUTH_GOOGLE_SECRET` sont présents.
- Aucun `PrismaAdapter` Auth.js n'est configuré : le schéma ne contient pas de modèle `Account`, donc Auth.js ne crée pas silencieusement de compte OAuth. La création/liaison Google passe par `resolveGoogleOAuthAccount`.
- Contexte OAuth signé et court (`lbr_google_oauth_context`) pour distinguer `login` et `register_center`.
- Création centre Google uniquement depuis l'inscription centre, avec nom du centre et CGU.
- Correction du cas utilisateur Google existant sans membership `ACTIVE` : depuis l'inscription centre, un nouveau centre et un membership `OWNER/ACTIVE` sont créés au lieu de finir sur `oauth=no_membership`.
- Hydratation JWT renforcée : si la session Google manque de tenant/role, elle est réhydratée par email local avant routage.
- Correction du routage tenant local : `requireTenant()` privilégie désormais la vraie session Auth.js avant le fallback `DEV_AUTOLOGIN`.
- `.env.local` local basculé à `DEV_AUTOLOGIN=false` pour tester les connexions Google réelles.
- Email Google accepté uniquement avec `email_verified=true`.
- Aucun mot de passe local pour les comptes créés par Google.
- Route `/oauth/complete` pour router après session vers admin, onboarding, dashboard, trainer ou espace bénéficiaire.
- Logs structurés `auth.google.*` ajoutés sans email en clair.

## Evidence

- Logs du dernier test utilisateur : `GET /api/auth/callback/google` puis `/oauth/complete`, puis `/login?oauth=no_membership`.
- Diagnostic base : le compte Google testé avait un membership `INVITED` mais aucun membership `ACTIVE`.
- `npm run smoke:google-oauth` : PASS, inclut maintenant :
  - rejet du contexte OAuth altéré et expiré ;
  - secret Auth obligatoire en production ;
  - connexion d'un compte actif sans recréation de centre ;
  - blocage d'un compte existant sans espace actif en login ;
  - création centre pour compte invité/existant sans espace actif ;
  - idempotence contre double callback/rejeu JWT ;
  - refus d'un login Google inconnu sans intention d'inscription ;
  - refus d'un email Google non vérifié ;
  - redirections `next` hostiles rejetées.
- `npm run db:diagnose` : PASS. Avertissement non bloquant : latence Supabase région `us-east-1`.
- `npm run smoke:tenant` : PASS.
- `npm run smoke:persona` : PASS.
- Test anti-autologin : sans cookie, `HEAD /dashboard` renvoie `307 location: /login`.
- `npm run smoke:business-google-oauth` : PASS.
- Tests HTTP locaux :
  - `/api/auth/providers` expose `google` et `credentials` ;
  - `/dashboard` sans session renvoie `307 location: /login`.
- Test navigateur Playwright local : PASS.
  - Le bouton "Créer mon compte centre avec Google" pose le cookie OAuth HttpOnly/SameSite=Lax et redirige vers `accounts.google.com`.
  - Le bouton "Continuer avec Google" pose le cookie OAuth HttpOnly/SameSite=Lax et redirige vers `accounts.google.com`.
  - Les deux parcours transmettent `prompt=select_account`.
- `npm run lint` : PASS, 0 erreur, 13 warnings existants hors OAuth.
- `npx tsc --noEmit` : PASS.
- `npm run build` : PASS après correction. Warnings restants : traçage Turbopack `storage.ts/next.config.ts`, hors OAuth.
- Configuration locale masquée :
  - `DEV_AUTOLOGIN=false` ;
  - Google OAuth présent ;
  - `AUTH_SECRET` présent et non-placeholder.

## smoke:all

`smoke:all` n'a pas été relancé sur cette passe. Les contrôles ciblés OAuth/tenant/build sont PASS.

## Verdict

Technical RL verdict for Google OAuth: PASS.

Limite de test : le callback Google complet avec saisie d'un vrai compte Google doit être validé manuellement, car l'agent ne peut pas s'authentifier à la place de l'utilisateur.
