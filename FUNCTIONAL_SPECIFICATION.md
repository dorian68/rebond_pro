# Functional Specification

## 1. Product overview

Le Bon Rebond est une plateforme d’orientation et de formation destinée aux personnes en transition professionnelle. Elle relie deux parcours publics principaux — trouver une formation ou clarifier sa direction par un bilan — à un réseau de centres partenaires équipé d’un cockpit SaaS multi-tenant.

## 2. Target users

Personne en transition professionnelle, élève ou étudiant en orientation, bénéficiaire d’un bilan, dirigeant de centre partenaire, administrateur, assistant, commercial, formateur, apprenant et propriétaire de la plateforme.

## 3. User roles

Rôles tenant (enum `Role`) : `OWNER`, `ADMIN`, `ASSISTANT`, `COMMERCIAL`, `TRAINER`, `LEARNER`. Le rôle `LEARNER` porte l'accès **bénéficiaire** (`/espace`). Flag transverse `User.platformAdmin` : accès god-mode `/admin` (cross-tenant, lecture seule) derrière `requirePlatformAdmin()`. Les mutations sensibles exigent un rôle explicitement autorisé.

> Distinction à conserver : `Beneficiary` (personne en bilan, a un compte/`userId`, rôle LEARNER, espace `/espace`) ≠ `Learner` (apprenant inscrit en session, géré par le centre, sans compte).

## 4. Core user journeys

1. **Particulier orienté formation** : `/` → choix « Je cherche une formation » → `/marketplace` → fiche formation/centre → demande ou achat.
2. **Particulier en doute** : `/` → choix « Je veux faire un bilan » → `/bilan-de-competences` → contact/RDV → invitation → `/espace` → parcours Rebond Clarté.
3. **Élève ou étudiant** : `/bilan-orientation` → contact → accompagnement d’orientation.
4. **Centre partenaire** : `/centres` → inscription → onboarding → publication → demandes publiques → CRM → sessions et suivi.
5. **Formateur** : `/trainer` → disponibilités → planning → demandes d'animation.
6. **Propriétaire plateforme** : `/admin` → centres/formateurs/bénéficiaires + `/admin/finances` (traçabilité de chaque transaction).

## 5. Functional modules

Site public Le Bon Rebond, orientation, bilan de compétences, bilan d’orientation, marketplace cross-centres, pages centres/formateurs/formations, auth et tenant, espace partenaires, dashboard, formations, sessions, planning, formateurs, apprenants, CRM, documents, IA, qualité, espace bénéficiaire, portail formateur, admin plateforme, flux financiers et paramètres.

## 6. Detailed feature list

- Lots 0 à 4 : fondations, CRUD, planning, documents/emails et IA opérationnelle.
- Lot 5 : landing publique, essai, onboarding persistant, publication SSR et CTA vers CRM.
- Lot 6 : qualité complète, portails et notifications.
- Marketplace : `/marketplace` (catalogue cross-centres + filtres q/catégorie/modalité/niveau/ville), fiche centre `(public)/[orgSlug]`, profil formateur public `(public)/formateur/[trainerId]`. Alimentée automatiquement par les formations `isPublic`. Upload logo/cover/photo (Supabase Storage public, fallback avatars initiales).
- Copilote AG-UI : outils de lecture + ~26 outils d'écriture CRUD (`src/server/agent/write-tools.ts`), tous sensibles → validation humaine (human-in-the-loop). Dispatch et exécution dans `src/server/agent/runtime.ts`.
- Connecteurs Socrate via Composio : Google Calendar et Microsoft Calendar en lecture seule ; Google Drive, OneDrive et SharePoint en recherche/import de fichiers ; Gmail et Outlook en création de brouillons uniquement, sans outil d'envoi direct. Deux périmètres UX : **Mes connexions** (utilisateur) et **Connexions du centre** (organisation). Configuration dans Paramètres → Connecteurs. Testé par `smoke:connectors`.
- Lot 7 : **facturation Stripe** livrée — plans FREE/PRO/PREMIUM, Checkout, portail client, webhook (`/api/stripe/webhook`) qui synchronise plan/billingStatus ; fallback propre si Stripe non configuré ; UI Paramètres → Abonnement ; **quotas de plan appliqués** (`smoke:quota`).
- Lot 8 (livré, code) : **écosystème multi-faces**.
  - **Site public Le Bon Rebond** (`src/app/(site)/`) : accueil à deux entrées, formation, bilan de compétences, bilan d’orientation, méthode Rebond Clarté, à propos, blog, contact et espace partenaires. Formulaire de contact réel (server action → email équipe + log) ; verdict d'éligibilité CPF instantané.
  - **Espace bénéficiaire** (`/espace`) : vue d'ensemble, parcours (3 phases), catalogue, profil ; achat formation + règlement bilan via Stripe (`createFormationCheckout`, `createBilanCheckout`). Modèle `Beneficiary`. Testé `smoke:beneficiary`.
  - **Portail formateur** (`/trainer`) : disponibilités, planning, demandes, profil. Testé `smoke:trainer-portal`.
  - **Admin god-mode** (`/admin`) : vue d'ensemble cross-tenant, centres, formateurs, bénéficiaires, **flux financiers**. `requirePlatformAdmin()`. Testé `smoke:platform`.
  - **Personas AG-UI** (`src/lib/ag-ui/persona.ts`) : visitor/beneficiary/trainer/center/platform_admin ; allowlist d'outils côté serveur ; `resolvePersona(role+pathname+isPlatformAdmin)`. Testé `smoke:persona`.
  - **Flux financiers** (`src/server/finance.ts`, modèle `Transaction`) : commissions (achats formation), abonnements, bilans ; `recordTransaction` idempotent ; `getFinanceSummary` (brut, commissions, net à reverser). Webhook branché (FORMATION_PURCHASE/BILAN/SUBSCRIPTION/invoice.paid). Testé `smoke:finance`. **Table `Transaction` à migrer** (route `/api/migrate-finance`).
  - **Inscription auto à l'achat** (livré, `src/server/enrollment-from-purchase.ts`) : un achat FORMATION_PURCHASE crée/retrouve un `Learner` et l'inscrit (`Enrollment`) à la prochaine session OUVERTE ; idempotent ; lien `Transaction.enrollmentId`.
  - **Suivi du reversement** (livré) : `Transaction.payoutStatus`/`settledAt`, action `markTransactionSettled` (god-mode), UI `/admin/finances`.
- **Achat public** (livré, `src/server/public-purchase.ts` + `BuyFormationButton`) : un visiteur non connecté achète une formation depuis la fiche publique (checkout invité Stripe, email collecté par Stripe). Le webhook crée un `Learner` + `Enrollment` dans le centre vendeur (pas de `Beneficiary` : on préserve la distinction Learner≠Beneficiary) et envoie un email de confirmation. Bandeau de confirmation `?achat=success`. Testé `smoke:public-purchase`. **Hors scope (futur)** : portail de connexion apprenant (un acheteur public est inscrit mais n'a pas encore d'espace personnel propre).
- Admin bilan de compétences : `/admin/beneficiaires/[id]` expose un dossier numérique page par page et par artefacts structurés (`BilanArtifact`). L'étape Ikigai utilise un canvas portable partageable au bénéficiaire avec cartes, intensités, graphe et intersections. L'étape compétences côté admin utilise une cartographie par cartes/preuves/niveaux. Les autres pages utilisent des workspaces thématiques (situation, engagement, motivations, pistes, décision, plan d'action, synthèse) plutôt qu'une unique zone de notes.
- Planning formateurs avancé : un centre peut saisir/importer en lot des disponibilités formateurs depuis `/formateurs/disponibilites`. Les fichiers passent par le pipeline sobre d'import document : extraction fonctionnelle PDF/DOCX/image quand possible, puis IA uniquement pour structurer le brouillon, sans persistance avant validation humaine. Les formations peuvent être découpées en modules (`FormationModule`) et chaque module peut être couvert par un ou plusieurs formateurs (`FormationModuleTrainer`). L'optimisateur de créneaux doit tenir compte de la couverture des modules lorsqu'elle existe, tout en conservant l'ancien rattachement global formation ↔ formateur.

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
- Les connecteurs externes n'exposent aucune action d'envoi email ou d'écriture calendrier ; l'import de fichier externe et la création de brouillon email exigent une validation humaine.
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

Auth.js credentials + Google OAuth, session JWT et membership tenant. Un compte credentials doit confirmer son email via un jeton haché expirant avant de pouvoir se connecter. Un compte Google est accepté uniquement si Google retourne `email_verified=true`. La connexion Google ne crée pas silencieusement de centre : la création d'un nouveau compte centre par Google exige une intention d'inscription explicite, le nom du centre et l'acceptation des CGU.

## 16. CLI-testability requirements

`npm run smoke:health`, `smoke:lot5`, `smoke:auth`, `smoke:google-oauth`, `smoke:registration`, `smoke:crud`, `smoke:agent`, `smoke:marketplace`, `smoke:tenant`, `smoke:password-reset`, `smoke:dedup`, `smoke:billing`, `smoke:quota`, `smoke:trainer-portal`, `smoke:beneficiary`, `smoke:platform`, `smoke:persona`, `smoke:connectors`, `smoke:finance`, `smoke:business`, `smoke:business-marketplace`, `smoke:business-google-oauth`, `smoke:all`, `npm run lint`, `npm run build`, `npm run smoke:production`. Voir `CLI_TESTABILITY_CONTRACT.md`.

## 17. Acceptance criteria

### Lot 5

- `/` présente Le Bon Rebond et propose immédiatement les deux choix « Je cherche une formation » et « Je veux faire un bilan ».
- `/formation`, `/bilan-de-competences`, `/bilan-orientation`, `/a-propos` et `/blog` portent la promesse publique.
- `/marketplace` permet d’explorer les formations et centres partenaires.
- L'inscription crée User, Organization, membership et trial, puis redirige vers l'onboarding.
- L'onboarding persiste les repères et peut créer formation, formateur, session et prospect initiaux.
- La page `/{orgSlug}/f/{publicSlug}` est SSR et inaccessible si dépubliée.
- Le CTA public crée ou met à jour un prospect dans le bon tenant.
- Le parcours public est vérifiable depuis la CLI.

### Admin bilan de compétences

- Un admin plateforme peut ouvrir le dossier d'un bénéficiaire depuis `/admin/beneficiaires/[id]`.
- Le dossier présente une progression page par page, pas seulement une liste de formulaires.
- Le lien Ikigai portable est signé, partageable et ne donne accès qu'au canvas du bénéficiaire concerné.
- Le canvas Ikigai collecte les quatre zones, les choix, les intensités et les convergences, puis remonte dans le dossier admin.
- La page compétences permet une cartographie par cartes, preuves concrètes, énergie et maîtrise.
- Les pages non spécialisées enregistrent des artefacts structurés : contenu JSON, source, statut, partageabilité.
- Les mutations restent auditées et passent par les server actions protégées.
- Le parcours est couvert par `npm run smoke:platform-beneficiaries`.

### Planning formateurs et modules

- Un centre OWNER/ADMIN/ASSISTANT peut ouvrir `/formateurs/disponibilites`.
- Le centre peut enregistrer plusieurs disponibilités en une seule validation.
- L'import document des disponibilités ne crée rien directement : il prépare un brouillon modifiable.
- Toute disponibilité bulk reste scopée au tenant et produit un audit log.
- Une formation peut contenir plusieurs modules.
- Un module peut être animé par un ou plusieurs formateurs.
- Une formation sans module continue d'utiliser les formateurs éligibles globaux.
- Une formation avec modules n'est proposée par l'optimisateur que si chaque module a au moins un formateur disponible sur la plage.
- Le parcours est couvert par `npm run smoke:formation-modules-planning`.

## 18. Production readiness criteria

Build reproductible, migrations appliquées, secrets hors dépôt, auth et autorisations vérifiées, logs sans secrets, tests CLI passants, emails et stockage configurés, observabilité et sauvegardes documentées.
