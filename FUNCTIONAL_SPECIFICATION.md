# Functional Specification

## 1. Product overview

RebondPro Formation est un SaaS multi-tenant de pilotage des centres de formation.

## 2. Target users

Dirigeant, administrateur, assistant, commercial, formateur, apprenant — **bénéficiaire d'un bilan de compétences (B2C)** et **propriétaire de la plateforme**.

## 3. User roles

Rôles tenant (enum `Role`) : `OWNER`, `ADMIN`, `ASSISTANT`, `COMMERCIAL`, `TRAINER`, `LEARNER`. Le rôle `LEARNER` porte l'accès **bénéficiaire** (`/espace`). Flag transverse `User.platformAdmin` : accès god-mode `/admin` (cross-tenant, lecture seule) derrière `requirePlatformAdmin()`. Les mutations sensibles exigent un rôle explicitement autorisé.

> Distinction à conserver : `Beneficiary` (personne en bilan, a un compte/`userId`, rôle LEARNER, espace `/espace`) ≠ `Learner` (apprenant inscrit en session, géré par le centre, sans compte).

## 4. Core user journeys

1. **Centre** : visiteur → `/centres` → inscription → onboarding → dashboard activé.
2. **Centre** : formation → publication → demande publique → prospect CRM.
3. **Centre** : session → inscription → documents → suivi → indicateurs.
4. **Bénéficiaire (B2C)** : site vitrine `/` → contact/RDV → (invitation centre) → `/espace` → suivi parcours bilan + catalogue → paiement bilan/formation (Stripe).
5. **Formateur** : `/trainer` → disponibilités → planning → demandes d'animation.
6. **Propriétaire plateforme** : `/admin` → centres/formateurs/bénéficiaires + `/admin/finances` (traçabilité de chaque transaction).

## 5. Functional modules

Auth et tenant, dashboard, formations, sessions, planning, formateurs, apprenants, CRM, documents, IA, qualité, pages publiques, **marketplace cross-centres**, **copilote agentique (AG-UI) à personas**, **site vitrine B2C bilan**, **espace bénéficiaire**, **portail formateur**, **admin god-mode plateforme**, **flux financiers (ledger + Stripe paiements)** et paramètres.

## 6. Detailed feature list

- Lots 0 à 4 : fondations, CRUD, planning, documents/emails et IA opérationnelle.
- Lot 5 : landing publique, essai, onboarding persistant, publication SSR et CTA vers CRM.
- Lot 6 : qualité complète, portails et notifications.
- Marketplace : `/marketplace` (catalogue cross-centres + filtres q/catégorie/modalité/niveau/ville), fiche centre `(public)/[orgSlug]`, profil formateur public `(public)/formateur/[trainerId]`. Alimentée automatiquement par les formations `isPublic`. Upload logo/cover/photo (Supabase Storage public, fallback avatars initiales).
- Copilote AG-UI : outils de lecture + ~26 outils d'écriture CRUD (`src/server/agent/write-tools.ts`), tous sensibles → validation humaine (human-in-the-loop). Dispatch et exécution dans `src/server/agent/runtime.ts`.
- Lot 7 : **facturation Stripe** livrée — plans FREE/PRO/PREMIUM, Checkout, portail client, webhook (`/api/stripe/webhook`) qui synchronise plan/billingStatus ; fallback propre si Stripe non configuré ; UI Paramètres → Abonnement ; **quotas de plan appliqués** (`smoke:quota`).
- Lot 8 (livré, code) : **écosystème multi-faces**.
  - **Site vitrine B2C** (`src/app/(site)/`) : bilan de compétences (Guadeloupe, CPF), pages méthode/déroulement/tarifs/pour-qui/témoignages/contact/centres. Formulaire de contact réel (server action → email équipe + log) ; verdict d'éligibilité CPF instantané.
  - **Espace bénéficiaire** (`/espace`) : vue d'ensemble, parcours (3 phases), catalogue, profil ; achat formation + règlement bilan via Stripe (`createFormationCheckout`, `createBilanCheckout`). Modèle `Beneficiary`. Testé `smoke:beneficiary`.
  - **Portail formateur** (`/trainer`) : disponibilités, planning, demandes, profil. Testé `smoke:trainer-portal`.
  - **Admin god-mode** (`/admin`) : vue d'ensemble cross-tenant, centres, formateurs, bénéficiaires, **flux financiers**. `requirePlatformAdmin()`. Testé `smoke:platform`.
  - **Personas AG-UI** (`src/lib/ag-ui/persona.ts`) : visitor/beneficiary/trainer/center/platform_admin ; allowlist d'outils côté serveur ; `resolvePersona(role+pathname+isPlatformAdmin)`. Testé `smoke:persona`.
  - **Flux financiers** (`src/server/finance.ts`, modèle `Transaction`) : commissions (achats formation), abonnements, bilans ; `recordTransaction` idempotent ; `getFinanceSummary` (brut, commissions, net à reverser). Webhook branché (FORMATION_PURCHASE/BILAN/SUBSCRIPTION/invoice.paid). Testé `smoke:finance`. **Table `Transaction` à migrer** (route `/api/migrate-finance`).
  - **Inscription auto à l'achat** (livré, `src/server/enrollment-from-purchase.ts`) : un achat FORMATION_PURCHASE crée/retrouve un `Learner` et l'inscrit (`Enrollment`) à la prochaine session OUVERTE ; idempotent ; lien `Transaction.enrollmentId`.
  - **Suivi du reversement** (livré) : `Transaction.payoutStatus`/`settledAt`, action `markTransactionSettled` (god-mode), UI `/admin/finances`.
  - **Achat public** (livré, `src/server/public-purchase.ts` + `BuyFormationButton`) : un visiteur non connecté achète une formation depuis la fiche publique (checkout invité Stripe, email collecté par Stripe). Le webhook crée un `Learner` + `Enrollment` dans le centre vendeur (pas de `Beneficiary` : on préserve la distinction Learner≠Beneficiary) et envoie un email de confirmation. Bandeau de confirmation `?achat=success`. Testé `smoke:public-purchase`. **Hors scope (futur)** : portail de connexion apprenant (un acheteur public est inscrit mais n'a pas encore d'espace personnel propre).

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
- Le persona du copilote est dérivé du rôle et de la page ; son périmètre d'outils est verrouillé côté serveur. Un visiteur sans session n'atteint aucune donnée tenant ; l'admin plateforme est en lecture seule.
- Toute transaction financière est persistée (`Transaction`) avec sa commission ; le CA affiché provient du ledger, jamais d'une heuristique. La commission n'existe que sur les achats de formation.
- Le bénéficiaire entre par invitation (rôle LEARNER dans le tenant du centre opérateur) ; pas d'auto-inscription publique au bilan.
- L'accès god-mode exige `User.platformAdmin` (configuré via `PLATFORM_ADMIN_EMAILS`) ; il ne permet aucune écriture cross-tenant.

## 12. Error states

Validation explicite, formation publique indisponible, ressource hors tenant, rôle interdit, provider externe indisponible et erreurs de persistance.

## 13. Empty states

Un dashboard non configuré affiche une checklist d'activation et ne présente pas l'absence de données comme une réussite.

## 14. Mock/demo mode rules

Les données de démonstration sont optionnelles, modifiables et annoncées. Aucun fallback ne doit être présenté comme un résultat réel.

## 15. Authentication and permissions

Auth.js credentials, session JWT et membership tenant. Un compte doit confirmer son email via un jeton haché expirant avant de pouvoir se connecter.

## 16. CLI-testability requirements

`npm run smoke:health`, `smoke:lot5`, `smoke:auth`, `smoke:registration`, `smoke:crud`, `smoke:agent`, `smoke:marketplace`, `smoke:tenant`, `smoke:password-reset`, `smoke:dedup`, `smoke:billing`, `smoke:quota`, `smoke:trainer-portal`, `smoke:beneficiary`, `smoke:platform`, `smoke:persona`, `smoke:finance`, `smoke:business`, `smoke:business-marketplace`, `smoke:all`, `npm run lint`, `npm run build`, `npm run smoke:production`. Voir `CLI_TESTABILITY_CONTRACT.md`.

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
