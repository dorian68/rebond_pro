# Production Readiness

Dernière mise à jour : 12 juillet 2026. Périmètre évalué : site public, marketplace modérée, cockpit multi-tenant et parcours de contact. Les paiements publics restent volontairement désactivés.

| Domaine | Verdict | Preuve / condition |
|---|---|---|
| Authentification | PASS | Credentials, vérification email, reset à usage unique, politique de session, anti-bruteforce et OAuth Google testés. OAuth est configuré sur le VPS ; `DEV_AUTOLOGIN=false`. |
| Autorisation et isolation | PASS | Rôles serveur, guards plateforme et isolation cross-tenant couverts par les smokes `tenant`, `persona`, `platform` et `admin-auth`. |
| Base et migrations | PASS | PostgreSQL 16 persistant sur le VPS, conteneur sain, sauvegarde quotidienne et sauvegarde avant `prisma migrate deploy`. |
| Marketplace | PASS | Publication réservée aux centres activés, approuvés et associés à une revue humaine datée ; aucune donnée CARIF ou démo non revue n'est exposée. |
| Formulaires publics | PASS | Validation Zod, honeypot, quotas anonymisés, logs sans PII brute et erreur explicite si l'email échoue. |
| Connecteurs Socrate | PASS | Calendriers en lecture, documents en lecture/import et emails en brouillon uniquement. Aucun envoi, événement ou fichier externe n'est créé directement. |
| Stockage | PASS | Supabase Storage configuré en production. Le fallback local refuse les clés absolues et les traversées de répertoire, avec smoke dédié. |
| Email | PASS technique | Transport HTML/texte/pièce jointe testé sur Mailpit ; SMTP configuré sur le VPS. La délivrabilité vers chaque domaine destinataire reste à surveiller en exploitation. |
| Paiements publics | SAFE OFF | Stripe et webhook sont configurés, mais les flags formations/bilans restent à `false`. L'activation exige les conditions juridiques et, pour le bilan, un NDA valide. |
| Confiance commerciale | PASS | Faux témoignages retirés, mentions CPF/Qualiopi non justifiées supprimées, identité éditeur/hébergeur et politique de confidentialité publiées. |
| Accessibilité | PASS | Axe et débordement horizontal : 14 routes, desktop + mobile, 28 parcours sans violation. |
| SEO | PASS | Métadonnées par route principale, `metadataBase`, Open Graph, `robots.txt` et `sitemap.xml`. |
| Dépendances | PASS | Next 16.2.10, React 19.2.7 ; `npm audit --audit-level=low` retourne 0 vulnérabilité. |
| Build | PASS | ESLint propre, TypeScript propre, build Next standalone propre et sans avertissement Turbopack. |
| Observabilité | PASS socle | Logs JSON, endpoint readiness DB, health-check de déploiement, rollback automatique, Caddy actif et sauvegardes quotidiennes. Un APM externe reste une amélioration non bloquante. |
| Déploiement | PASS | Pipeline versionné, releases immuables, sauvegarde/migrations, bascule Docker, health-check HTTPS et rollback. Runbook : `DEPLOYMENT.md`. |

## Verdict

**GO pour le périmètre actuellement commercialisé : acquisition, prise de contact, bilan, orientation, marketplace modérée et cockpit.**

**NO-GO pour activer les paiements publics** tant que les conditions suivantes ne sont pas toutes remplies :

1. CGV marketplace et identité du vendeur validées ;
2. médiateur de la consommation et parcours de rétractation documentés si applicables ;
3. NDA du prestataire de bilan renseigné et conformité de l'offre vérifiée ;
4. test de paiement puis remboursement réalisé en environnement contrôlé.

## Evidence CLI

- `npm run smoke:all:local` : 34/34 suites PASS ;
- `npm run smoke:accessibility` : 28/28 parcours PASS ;
- `npm run smoke:ui` : PASS avec fixtures revues et nettoyées ;
- `npm run smoke:email-transport` : PASS ;
- Playwright site vitrine : 11/11 PASS ;
- `npm run lint`, `npx tsc --noEmit`, `npm run build` : PASS ;
- `npm audit --audit-level=low` : 0 vulnérabilité.
