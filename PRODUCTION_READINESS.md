# Production Readiness

Dernière mise à jour : 13 août 2026. Périmètre évalué : site public, marketplace modérée, cockpit multi-tenant, parcours de contact et Roadmap 2 agentique déployée. Les paiements publics restent volontairement désactivés.

| Domaine | Verdict | Preuve / condition |
|---|---|---|
| Authentification | PASS | Credentials, vérification email, reset à usage unique, politique de session, anti-bruteforce et OAuth Google testés. OAuth est configuré sur le VPS ; `DEV_AUTOLOGIN=false`. |
| Autorisation et isolation | PASS | Rôles serveur, guards plateforme et isolation cross-tenant couverts par les smokes `tenant`, `persona`, `platform` et `admin-auth`. |
| Base et migrations | PASS production | Le dump frais a été restauré en répétition avant migration. La production est à 27/27 migrations ; l'index partiel `Roadmap2EmailOperation_workspaceId_requestHash_key` est actif et 67 nœuds Roadmap 2 sont conservés. |
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
| Build | PASS production | ESLint, TypeScript et build Next sont propres. `smoke:all` passe 39/39 ; les smokes agent, Gmail, Drive et sauvegarde passent aussi directement contre le schéma production avec fixtures nettoyées. |
| Observabilité | PASS socle | Logs JSON, endpoint readiness DB, health-check de déploiement, rollback automatique, Caddy actif et sauvegardes quotidiennes. Un APM externe reste une amélioration non bloquante. |
| Déploiement | PASS | Commit `b9353fd` publié sur `origin/main`, image `rebondpro-app:b9353fd` active, health HTTPS et DB `up`. L'image `46523a0` reste disponible pour rollback. Runbook : `DEPLOYMENT.md`. |

## Verdict

**GO pour le périmètre actuellement commercialisé : acquisition, prise de contact, bilan, orientation, marketplace modérée et cockpit.**

**PASS Technical RL et Business Client Mystère pour le code Roadmap 2 déployé. Readiness opérationnelle Google/backup encore conditionnelle à la reconnexion OAuth et à la levée du quota Supabase Storage.**

**NO-GO pour activer les paiements publics** tant que les conditions suivantes ne sont pas toutes remplies :

1. CGV marketplace et identité du vendeur validées ;
2. médiateur de la consommation et parcours de rétractation documentés si applicables ;
3. NDA du prestataire de bilan renseigné et conformité de l'offre vérifiée ;
4. test de paiement puis remboursement réalisé en environnement contrôlé.

## Evidence CLI

- `npm run smoke:all` : **39/39 suites PASS** sur une base PostgreSQL jetable avec 27 migrations rejouées depuis zéro (13 août 2026) ;
- `npm run smoke:roadmap-2:a11y:runtime` : **PASS**, 3 viewports, zoom 200 %, cibles 44 px et reset des filtres ;
- `npm run smoke:roadmap-2:http` : **PASS** ;
- `npm run smoke:backup` : **PASS** sur succès complet simulé et panne Storage post-dump ;
- `npm run lint`, `npx tsc --noEmit`, `npm run build` : **PASS** sur le candidat local ;
- smokes production ciblés `agent`, `roadmap-2:agentic-gmail`, `roadmap-2:drive`, `backup` : **PASS**, fixtures restantes 0 ;
- health post-déploiement `b9353fd` : **PASS**, DB `up` ;
- backup production post-déploiement : dump DB vérifié `rebondpro-2026-08-13-1859.sql.gz`, état `PARTIAL` correctement publié sur le HTTP 402 Storage ;

- `npm run smoke:all:local` : 34/34 suites PASS ;
- `npm run smoke:accessibility` : 28/28 parcours PASS ;
- `npm run smoke:ui` : PASS avec fixtures revues et nettoyées ;
- `npm run smoke:email-transport` : PASS ;
- Playwright site vitrine : 11/11 PASS ;
- `npm run lint`, `npx tsc --noEmit`, `npm run build` : PASS ;
- `npm audit --audit-level=low` : 0 vulnérabilité.
