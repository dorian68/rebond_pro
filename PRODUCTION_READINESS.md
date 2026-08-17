# Production Readiness

Dernière mise à jour : 15 août 2026. Périmètre évalué : site public, marketplace modérée, cockpit multi-tenant, parcours de contact, Roadmap 2 agentique et gestion des super-admins déployées. Les paiements publics restent volontairement désactivés. Le lot BMO complet d’Orchestration est validé localement mais n’est pas inclus dans le déploiement de production décrit ci-dessous.

| Domaine | Verdict | Preuve / condition |
|---|---|---|
| Authentification | PASS | Credentials, vérification email, reset à usage unique, politique de session, anti-bruteforce et OAuth Google testés. OAuth est configuré sur le VPS ; `DEV_AUTOLOGIN=false`. |
| Autorisation et isolation | PASS | Rôles serveur, guards plateforme et isolation cross-tenant couverts par les smokes `tenant`, `persona`, `platform`, `admin-auth` et `platform-admin-access`. L’auto-révocation et les retraits d’accès imposés par configuration sont refusés côté serveur. |
| Base et migrations | PASS production | Sauvegarde PostgreSQL fraîche et vérifiée avant migration. La production est à 28/28 migrations ; `PlatformAdminAuditLog` existe avec RLS actif, l'index Gmail anti-double envoi reste actif et 67 nœuds Roadmap 2 sont conservés. |
| Gestion des super-admins | PASS production | `/admin/super-admins` attribue le rôle uniquement à un compte existant et vérifié, distingue les accès DB/configuration, confirme les actions sensibles et journalise attribution/retrait dans la même transaction. Smoke DB réel PASS avec fixtures nettoyées. |
| Marketplace | PASS | Publication réservée aux centres activés, approuvés et associés à une revue humaine datée ; aucune donnée CARIF ou démo non revue n'est exposée. |
| Formulaires publics | PASS | Validation Zod, honeypot, quotas anonymisés, logs sans PII brute et erreur explicite si l'email échoue. |
| Connecteurs Socrate | PASS code production / CONNEXION REQUISE | Gmail super-admin est restreint à l'endpoint serveur Roadmap 2, affiche exactement le corps envoyé, exige une validation signée à usage unique et utilise un registre durable avec réconciliation et anti-double envoi. Le diagnostic post-déploiement trouve Drive `EXPIRED`/`NOT_CONNECTED` et Gmail `NOT_CONNECTED` : une reconnexion OAuth est requise avant l'E2E réel. |
| Stockage | PARTIAL fournisseur | Le fallback local et l'aperçu privé Cloudflare R2 sont couverts. Supabase Storage retourne actuellement HTTP 402 (`exceed_egress_quota`) : le quota ou plafond de dépense doit être corrigé avant de retrouver une sauvegarde documentaire complète. |
| Email | PASS technique | Transport HTML/texte/pièce jointe testé sur Mailpit ; SMTP configuré sur le VPS. La délivrabilité vers chaque domaine destinataire reste à surveiller en exploitation. |
| Paiements publics | SAFE OFF | Stripe et webhook sont configurés, mais les flags formations/bilans restent à `false`. L'activation exige les conditions juridiques et, pour le bilan, un NDA valide. |
| Confiance commerciale | PASS | Faux témoignages retirés, mentions CPF/Qualiopi non justifiées supprimées, identité éditeur/hébergeur et politique de confidentialité publiées. |
| Accessibilité | PASS local | Roadmap 2 authentifiée : Axe critique/sérieuse 0, aucun débordement en 1440/768/390 px, clavier, zoom 200 %, cibles tactiles ≥ 44 px et réinitialisation de l'état vide vérifiée dans un navigateur réel. Les états Google réellement connectés restent à confirmer. |
| SEO | PASS | Métadonnées par route principale, `metadataBase`, Open Graph, `robots.txt` et `sitemap.xml`. |
| Dépendances | PASS | Next 16.2.10, React 19.2.7 ; `npm audit --audit-level=low` retourne 0 vulnérabilité. |
| Build | PASS production | ESLint local PASS ; compilation Next.js et TypeScript PASS dans l’image Linux. La campagne précédente `smoke:all` reste à 39/39 et le nouveau smoke `platform-admin-access` passe séparément contre la base de production avec fixtures nettoyées. |
| Observabilité | PASS socle | Logs JSON, endpoint readiness DB, health-check de déploiement, rollback automatique, Caddy actif et sauvegardes quotidiennes. Un APM externe reste une amélioration non bloquante. |
| Déploiement | PASS | Commit `27d0c75` publié sur `origin/main`, image `rebondpro-app:27d0c75` active, health HTTPS et DB `up`. L'image `cf13dd4` reste disponible pour rollback. Runbook : `DEPLOYMENT.md`. |
| Orchestration BMO 2026 | PASS Technical RL + PASS Client Mystère / NON DÉPLOYÉ | Import officiel reproductible 508/180/5, inconnues conservées, 180 cibles d’ingénierie, couverture L0–L5 fermée sous L3 et 35 invariants ciblés PASS. Scores business : clarté 4,6/5, confiance 4,8/5, adoption 4,2/5, global 4,5/5. Repository mémoire, données Sarah synthétiques et absence de portail partenaire : NO-GO cohorte réelle sans chantier P0. |

## Verdict

**GO pour le périmètre actuellement commercialisé : acquisition, prise de contact, bilan, orientation, marketplace modérée et cockpit.**

**PASS Technical RL et Business Client Mystère pour le code Roadmap 2 déployé. Readiness opérationnelle Google/backup encore conditionnelle à la reconnexion OAuth et à la levée du quota Supabase Storage.**

**NO-GO pour activer les paiements publics** tant que les conditions suivantes ne sont pas toutes remplies :

1. CGV marketplace et identité du vendeur validées ;
2. médiateur de la consommation et parcours de rétractation documentés si applicables ;
3. NDA du prestataire de bilan renseigné et conformité de l'offre vérifiée ;
4. test de paiement puis remboursement réalisé en environnement contrôlé.

**GO démonstration locale pour l’import BMO 2026 dans Orchestration : double verdict Technical RL et Client Mystère PASS. NO-GO production/cohorte réelle pour ce nouveau lot tant qu’il n’est pas déployé et que la persistance, l’audit, les permissions de données, les capacités datées et les interactions partenaires ne sont pas livrés.**

## Evidence CLI

- `npm run smoke:all` : **39/39 suites PASS** sur une base PostgreSQL jetable avec 27 migrations rejouées depuis zéro (13 août 2026) ;
- `npm run smoke:platform-admin-access -- --static` : **PASS** local ; smoke DB complet : **PASS** en production après migration, attribution/révocation/audit réels et zéro fixture résiduelle ;
- chaîne propre de **28 migrations** : PASS sur schéma temporaire ; production : **28/28**, table `PlatformAdminAuditLog` avec RLS actif ;
- `npm run smoke:roadmap-2:a11y:runtime` : **PASS**, 3 viewports, zoom 200 %, cibles 44 px et reset des filtres ;
- `npm run smoke:roadmap-2:http` : **PASS** ;
- `npm run smoke:backup` : **PASS** sur succès complet simulé et panne Storage post-dump ;
- `npm run lint` : **PASS** local ; compilation Next.js + TypeScript : **PASS** dans le build Docker Linux `27d0c75` ;
- smokes production ciblés `agent`, `roadmap-2:agentic-gmail`, `roadmap-2:drive`, `backup` : **PASS**, fixtures restantes 0 ;
- health post-déploiement `27d0c75` : **PASS**, DB `up`, route `/admin/super-admins` protégée par redirection admin ;
- backup pré-migration : dump DB vérifié `rebondpro-2026-08-14-1717.sql.gz` (154 780 octets), état `PARTIAL` correctement publié sur le HTTP 402 Storage ;
- contrôle de conservation : **67 nœuds Roadmap 2**, **0 fixture smoke**, 4,5 Go libres après purge du cache et des anciennes images RebondPro ;

- `npm run smoke:all:local` : 34/34 suites PASS ;
- `npm run smoke:accessibility` : 28/28 parcours PASS ;
- `npm run smoke:ui` : PASS avec fixtures revues et nettoyées ;
- `npm run smoke:email-transport` : PASS ;
- Playwright site vitrine : 11/11 PASS ;
- `npm run lint`, `npx tsc --noEmit`, `npm run build` : PASS ;
- `npm audit --audit-level=low` : 0 vulnérabilité.
