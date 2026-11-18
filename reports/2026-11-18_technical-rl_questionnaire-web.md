# Technical RL Questionnaire web

## Périmètre

Questionnaire V2 approuvé, page directe `/questionnaire` sans ajout aux liens publics, collecte persistante PostgreSQL, vue `/admin/questionnaires`, statistiques, filtres, suivi et export CSV. Développement dans le worktree isolé `rebondpro-questionnaire`, base de production vérifiée `1ea433e51c8d2ab9abd589101594bbed7f848bb2`. Le checkout historique avec modifications antérieures reste intact.

## Architecture

Trente migrations appliquées dans une nouvelle base locale `rebond_questionnaire`, dont une seule nouvelle table plateforme `QuestionnaireResponse`. RLS activé, schéma et valeurs validés serveur, origines refusées si externes/invalides, corps limité à 16 Kio, honeypot et débit borné. Réessais idempotents par UUID et empreinte, y compris concurrence. Pas d'email externe, de score automatique, de compte obligatoire ou de partage partenaire. Prénom/créneau facultatifs ; coordonnées supprimées de la charge persistée sans rappel et canal unique si rappel. Accord horodaté et versionné ; expiration six mois calendaires.

Les API de liste, détail, CSV, statut et suppression contrôlent les droits plateforme. Une personne administrateur d'un centre n'accède pas à cette collecte. Les agrégats portent sur l'ensemble filtré, avec dénominateurs et non-réponses explicites. Dates civiles Guadeloupe. CSV protégé contre les formules. États chargement, vide, erreur et succès distincts. Dialogue natif pour le détail et suppression confirmée.

## Vérifications locales

- Contenu de `definition.json` comparé au questionnaire V2 approuvé : douze questions, libellés, réponses, maxima et caractère facultatif identiques.
- `npm ci`, `prisma generate`, `prisma migrate deploy` : PASS dans une base locale dédiée.
- `npx tsc --noEmit`, `npm run lint`, `npm run build` : PASS.
- `npm run smoke:questionnaire` : PASS persistance, simultanéité/rejeu, conflit explicite, validation, consentement, absence de coordonnées, statistiques, CSV, fuseau et expiration.
- `npm run smoke:questionnaire:ui` : parcours public réel, panne/réessai, enregistrement, contrôles API, accès anonymes et de centre refusés, session super-admin synthétique, détail, statut après refresh, statistiques et CSV ; rendu desktop/mobile et Axe. Les fixtures sont isolées de la production.
- Client mystère indépendant : défaut du message téléphone conservé lors du passage à l'email reproduit puis corrigé ; retest PASS. Voir le rapport business.

## Suite globale

`smoke:all:local` passe le nouveau smoke et les suites précédant `smoke:roadmap-2:agentic-gmail`, puis échoue sur le séparateur « — » attendu dans un corps de message. Ce code et ce test sont inchangés par le patch. Blocage antérieur documenté dans PRODUCTION_READINESS, aucune validation globale nouvelle de la plateforme.

## Déploiement

Le contrôle des dépendances avant publication a signalé Next.js 16.3.0 dans la plage de vulnérabilités critiques (notamment [optimisation AVIF](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4) et [fonctions use cache](https://github.com/advisories/GHSA-673q-mjm6-r5xr)). Next et sa configuration ESLint ont été mis à jour ensemble vers 16.4.6, avec verrou de dépendances actualisé. Le nouvel audit des dépendances de production ne signale plus Next ni de vulnérabilité critique ; six alertes hautes et une modérée restent dans les dépendances préexistantes. Ce constat ne constitue pas une certification générale du site. Les recettes du questionnaire sont relancées sur cette version avant activation.

L'image sera précompilée hors VPS, selon le précédent déploiement qui évite les builds sur ce serveur. Vérification préalable : production exacte et 29 migrations ; disque à 99 %. Trois anciennes archives de transfert d'images, toutes sous `/opt/rebondpro/releases`, ont été identifiées puis retirées après contrôle des chemins et empreintes ; les sources, images actuelles, données et sauvegardes sont conservées. Espace retrouvé : environ 1,2 Gio.

La sauvegarde quotidienne du stockage distant est déjà PARTIAL ; une sauvegarde PostgreSQL préalable à la migration de cette table est requise. Le périmètre ne change aucun fichier bénéficiaire ni le stockage distant. L'activation inclura la purge quotidienne de cette collecte, la santé applicative, la garde admin et la page publique.

Un ancien conteneur de vérification SEO arrêté depuis deux semaines, sans montage, et son image non utilisée ont ensuite été retirés après vérification de l'absence de référence par un autre conteneur. Espace disponible avant transfert : environ 1,6 Gio. L'image actuellement exécutée reste conservée pour rollback.

## Verdict

Technical RL : PASS local pour le périmètre questionnaire. Business Client Mystère : PASS local après correction. Validation de la release et de la purge production à consigner après activation. Durée réelle de réponse et usages terrain non mesurés.
