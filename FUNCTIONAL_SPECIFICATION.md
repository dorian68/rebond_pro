# Functional Specification

## 1. Product overview

RebondPro Formation est un SaaS multi-tenant de pilotage des centres de formation.

## 2. Target users

Dirigeant, administrateur, assistant, commercial, formateur et apprenant.

## 3. User roles

`OWNER`, `ADMIN`, `ASSISTANT`, `COMMERCIAL`, `TRAINER`, `LEARNER`. Les mutations sensibles exigent un rôle explicitement autorisé.

## 4. Core user journeys

1. Visiteur → landing → inscription → onboarding → dashboard activé.
2. Gestionnaire → formation → publication → demande publique → prospect CRM.
3. Gestionnaire → session → inscription → documents → suivi.
4. Gestionnaire → planning/CRM → action prioritaire → indicateurs mis à jour.

## 5. Functional modules

Auth et tenant, dashboard, formations, sessions, planning, formateurs, apprenants, CRM, documents, IA, qualité, pages publiques, **marketplace cross-centres**, **copilote agentique (AG-UI)** et paramètres.

## 6. Detailed feature list

- Lots 0 à 4 : fondations, CRUD, planning, documents/emails et IA opérationnelle.
- Lot 5 : landing publique, essai, onboarding persistant, publication SSR et CTA vers CRM.
- Lot 6 : qualité complète, portails et notifications.
- Marketplace : `/marketplace` (catalogue cross-centres + filtres q/catégorie/modalité/niveau/ville), fiche centre `(public)/[orgSlug]`, profil formateur public `(public)/formateur/[trainerId]`. Alimentée automatiquement par les formations `isPublic`. Upload logo/cover/photo (Supabase Storage public, fallback avatars initiales).
- Copilote AG-UI : outils de lecture + ~26 outils d'écriture CRUD (`src/server/agent/write-tools.ts`), tous sensibles → validation humaine (human-in-the-loop). Dispatch et exécution dans `src/server/agent/runtime.ts`.
- Lot 7 (en cours) : **facturation Stripe** livrée — plans FREE/PRO/PREMIUM, Checkout, portail client, webhook (`/api/stripe/webhook`) qui synchronise plan/billingStatus ; fallback propre si Stripe non configuré ; UI Paramètres → Abonnement. Reste : quotas appliqués, calendrier sync, signature électronique, portail apprenant.

## 7. Inputs and outputs

Les formulaires sont validés par Zod. Les sorties sont des pages SSR, mutations Prisma, PDF, emails ou réponses normalisées.

## 8. State transitions

Les statuts métier utilisent les enums Prisma. Toute transition persistante doit être visible dans les listes, métriques ou activités associées.

## 9. Data model

La source de vérité est `prisma/schema.prisma`. Toute entité métier porte `organizationId`.

## 10. API contracts

Les server actions protégées appellent `requireTenant()` et vérifient les rôles. Les actions publiques résolvent le tenant par `orgSlug` et une formation explicitement publiée.

## 11. Business rules

- Une page publique exige `isPublic=true`, `status=PUBLIE` et un `publicSlug`.
- Une demande publique crée un prospect dans le tenant de la formation.
- Une demande répétée avec le même email et la même formation met à jour le prospect actif.
- Les métriques sont calculées depuis la base, jamais codées en dur.
- La marketplace n'expose QUE des formations publiées ; une fiche centre n'est visible que si le centre a au moins une formation publiée.
- Le copilote n'exécute une action sensible qu'après validation humaine et dans le respect du rôle et du tenant de l'utilisateur.

## 12. Error states

Validation explicite, formation publique indisponible, ressource hors tenant, rôle interdit, provider externe indisponible et erreurs de persistance.

## 13. Empty states

Un dashboard non configuré affiche une checklist d'activation et ne présente pas l'absence de données comme une réussite.

## 14. Mock/demo mode rules

Les données de démonstration sont optionnelles, modifiables et annoncées. Aucun fallback ne doit être présenté comme un résultat réel.

## 15. Authentication and permissions

Auth.js credentials, session JWT et membership tenant. Un compte doit confirmer son email via un jeton haché expirant avant de pouvoir se connecter.

## 16. CLI-testability requirements

`npm run smoke:lot5`, `smoke:auth`, `smoke:registration`, `smoke:crud`, `smoke:agent`, `smoke:marketplace`, `smoke:tenant`, `smoke:business`, `smoke:all`, `npm run lint`, `npm run build`, `npm run smoke:production`. Voir `CLI_TESTABILITY_CONTRACT.md`.

## 17. Acceptance criteria

### Lot 5

- `/` explique la cible, la promesse et propose inscription et démo.
- L'inscription crée User, Organization, membership et trial, puis redirige vers l'onboarding.
- L'onboarding persiste les repères et peut créer formation, formateur, session et prospect initiaux.
- La page `/{orgSlug}/f/{publicSlug}` est SSR et inaccessible si dépubliée.
- Le CTA public crée ou met à jour un prospect dans le bon tenant.
- Le parcours public est vérifiable depuis la CLI.

## 18. Production readiness criteria

Build reproductible, migrations appliquées, secrets hors dépôt, auth et autorisations vérifiées, logs sans secrets, tests CLI passants, emails et stockage configurés, observabilité et sauvegardes documentées.
