# Technical RL - Production hardening

Date : 12 juillet 2026

## Périmètre

- site public et formulaires ;
- marketplace et fiches publiques ;
- connecteurs Socrate ;
- transport email, stockage et paiements ;
- dépendances, accessibilité, SEO, build et déploiement VPS.

## Corrections principales

- capacités connecteurs limitées à la lecture, l'import et la création de brouillons ;
- publication marketplace conditionnée par une revue humaine explicite ;
- données CARIF et démonstrations non revues retirées du catalogue public ;
- formulaires publics protégés par honeypot et quotas anonymisés, sans faux succès ;
- paiements publics derrière des flags désactivés par défaut ;
- témoignages fictifs et promesses CPF/Qualiopi non démontrées supprimés ;
- mentions légales, confidentialité, SEO et métadonnées corrigés ;
- SMTP migré vers `emailjs`, dépendances mises à jour et audit ramené à zéro ;
- stockage local protégé contre les traversées de chemin ;
- accessibilité et hiérarchie sémantique corrigées sans changement de composition visuelle ;
- intitulé demandé validé sur les deux offres : « La méthode Rebond ».

## Validation

| Contrôle | Résultat |
|---|---|
| Smokes headless | PASS, 34/34 |
| Smoke HTTP | PASS |
| Email HTML/texte/pièce jointe | PASS |
| Axe desktop/mobile | PASS, 28/28 |
| Playwright site vitrine | PASS, 11/11 |
| ESLint / TypeScript | PASS |
| Build Next standalone | PASS, sans avertissement |
| Audit npm | PASS, 0 vulnérabilité |

## Risques résiduels

- Les paiements publics doivent rester désactivés jusqu'aux validations juridiques et métier listées dans `PRODUCTION_READINESS.md`.
- La délivrabilité SMTP et les alertes externes doivent être suivies en exploitation.
- Une marketplace vide est un état valide tant qu'aucun centre n'a reçu de revue humaine.

## Verdict

**Technical RL : PASS pour le périmètre déployé, paiements publics désactivés.**
