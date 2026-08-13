# Production Readiness

Dernière mise à jour : 13 août 2026. Périmètre évalué : site public, marketplace modérée, cockpit multi-tenant, parcours de contact et candidat local Roadmap 2 agentique. Les paiements publics restent volontairement désactivés.

| Domaine | Verdict | Preuve / condition |
|---|---|---|
| Authentification | PASS | Credentials, vérification email, reset à usage unique, politique de session, anti-bruteforce et OAuth Google testés. OAuth est configuré sur le VPS ; `DEV_AUTOLOGIN=false`. |
| Autorisation et isolation | PASS | Rôles serveur, guards plateforme et isolation cross-tenant couverts par les smokes `tenant`, `persona`, `platform` et `admin-auth`. |
| Base et migrations | PASS existant / À DÉPLOYER Roadmap 2 | PostgreSQL 16 persistant sur le VPS. Les 27 migrations, dont l'index partiel anti-double envoi Gmail, se rejouent depuis zéro sur une base isolée. La nouvelle migration `20260813170000_roadmap2_email_exactly_once` n'est pas encore appliquée en production. |
| Marketplace | PASS | Publication réservée aux centres activés, approuvés et associés à une revue humaine datée ; aucune donnée CARIF ou démo non revue n'est exposée. |
| Formulaires publics | PASS | Validation Zod, honeypot, quotas anonymisés, logs sans PII brute et erreur explicite si l'email échoue. |
| Connecteurs Socrate | PASS local / À REVALIDER réel | Gmail super-admin est restreint à l'endpoint serveur Roadmap 2, affiche exactement le corps envoyé, exige une validation signée à usage unique et utilise un registre durable avec réconciliation et anti-double envoi. Aucun compte Gmail réel actif n'a encore permis le test succès/rejet/timeout/réconciliation. |
| Stockage | PARTIAL fournisseur | Le fallback local et l'aperçu privé Cloudflare R2 sont couverts. Supabase Storage retourne actuellement HTTP 402 (`exceed_egress_quota`) : le quota ou plafond de dépense doit être corrigé avant de retrouver une sauvegarde documentaire complète. |
| Email | PASS technique | Transport HTML/texte/pièce jointe testé sur Mailpit ; SMTP configuré sur le VPS. La délivrabilité vers chaque domaine destinataire reste à surveiller en exploitation. |
| Paiements publics | SAFE OFF | Stripe et webhook sont configurés, mais les flags formations/bilans restent à `false`. L'activation exige les conditions juridiques et, pour le bilan, un NDA valide. |
| Confiance commerciale | PASS | Faux témoignages retirés, mentions CPF/Qualiopi non justifiées supprimées, identité éditeur/hébergeur et politique de confidentialité publiées. |
| Accessibilité | PASS local | Roadmap 2 authentifiée : Axe critique/sérieuse 0, aucun débordement en 1440/768/390 px, clavier, zoom 200 %, cibles tactiles ≥ 44 px et réinitialisation de l'état vide vérifiée dans un navigateur réel. Les états Google réellement connectés restent à confirmer. |
| SEO | PASS | Métadonnées par route principale, `metadataBase`, Open Graph, `robots.txt` et `sitemap.xml`. |
| Dépendances | PASS | Next 16.2.10, React 19.2.7 ; `npm audit --audit-level=low` retourne 0 vulnérabilité. |
| Build | PASS candidat local | ESLint, TypeScript et build Next sont propres. `smoke:all` passe 39/39 sur une base isolée ayant rejoué les 27 migrations. |
| Observabilité | PASS socle | Logs JSON, endpoint readiness DB, health-check de déploiement, rollback automatique, Caddy actif et sauvegardes quotidiennes. Un APM externe reste une amélioration non bloquante. |
| Déploiement | ATTENTE D'AUTORISATION Roadmap 2 | Le pipeline existant reste opérationnel. Le candidat Roadmap 2 est volontairement non commité et non déployé ; aucune migration production n'a été lancée sans autorisation explicite. Runbook : `DEPLOYMENT.md`. |

## Verdict

**GO pour le périmètre actuellement commercialisé : acquisition, prise de contact, bilan, orientation, marketplace modérée et cockpit.**

**PASS local Technical RL et Business Client Mystère pour le candidat Roadmap 2. NO-GO production Roadmap 2 tant que le lot n'est pas commité/déployé, que la migration anti-double envoi n'est pas appliquée, que le parcours Google réel n'est pas contrôlé et que le quota Supabase Storage n'est pas levé.**

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

- `npm run smoke:all:local` : 34/34 suites PASS ;
- `npm run smoke:accessibility` : 28/28 parcours PASS ;
- `npm run smoke:ui` : PASS avec fixtures revues et nettoyées ;
- `npm run smoke:email-transport` : PASS ;
- Playwright site vitrine : 11/11 PASS ;
- `npm run lint`, `npx tsc --noEmit`, `npm run build` : PASS ;
- `npm audit --audit-level=low` : 0 vulnérabilité.
