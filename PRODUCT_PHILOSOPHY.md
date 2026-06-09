# Product Philosophy

## Product name

RebondPro Formation.

## Target users

Trois faces complémentaires :
1. **Centres de formation** (B2B, cœur SaaS) — dirigeants et équipes opérationnelles de petits et moyens centres : le cockpit.
2. **Bénéficiaires d'un bilan de compétences** (B2C) — particuliers (salariés, demandeurs d'emploi, indépendants), positionnés en **Guadeloupe**, financés via CPF : le site vitrine + l'espace personnel.
3. **Propriétaire de la plateforme** (toi) — opère son propre bilan ET pilote tout l'écosystème via l'admin god-mode et les flux financiers.

Formateurs (portail dédié) et apprenants inscrits en session complètent le modèle.

## Problem solved

Les données utiles au pilotage sont dispersées entre tableurs, emails, calendriers et documents. Les équipes voient trop tard les sessions sous-remplies, les relances oubliées et les pièces manquantes.

## Pain point

Le centre passe du temps à rapprocher des informations sans obtenir une prochaine action fiable.

## Product promise

Réunir le catalogue, le planning, le CRM, les apprenants, les documents et les indicateurs afin de rendre visibles les actions qui améliorent réellement l'activité.

## Core value proposition

Un cockpit opérationnel relié à des données réelles, testable et explicite sur ce qui est calculé, simulé ou incomplet.

## Why the product should exist

Les solutions lourdes sont souvent disproportionnées pour les petites structures, tandis que les outils génériques ne relient pas le remplissage, le commercial et l'administratif.

## Main value-producing workflow

Publier une formation, recevoir une demande dans le CRM, planifier une session, inscrire les apprenants, produire les documents et suivre les indicateurs.

## Marketplace (visibilité)

Un catalogue public cross-centres (le « réseau de la formation ») expose les formations publiées, met en avant la **fiche de chaque centre** et donne de la **visibilité aux formateurs** via des profils publics. Objectif : générer de la demande entrante qui retombe dans le CRM du bon centre.

## Copilote agentique

Un assistant IA intégré peut non seulement lire les données mais **agir réellement** (créer/modifier/supprimer formations, sessions, prospects, apprenants, formateurs) sous **validation humaine** pour toute action sensible. Il accélère l'exécution sans contourner les permissions ni l'isolation tenant.

## What must be observable

Chaque CTA métier doit créer ou modifier un état réel visible ailleurs dans le produit. Les métriques doivent provenir de la base du tenant.

## What must never be faked

Les prospects, inscriptions, métriques, états de documents, résultats IA et statuts de conformité. Toute donnée de démonstration doit être annoncée comme telle.

## Espace bénéficiaire (bilan de compétences B2C)

Un particulier accompagné en bilan dispose d'un **espace personnel** (`/espace`) : suivi de son parcours (3 phases), catalogue de formations recommandées, achat en ligne d'une formation et règlement de son bilan. Il entre par **invitation** après un premier rendez-vous (pas d'auto-inscription publique). Le site vitrine (`/`, Guadeloupe, CPF) génère ces rendez-vous.

## Flux financiers & monétisation

La plateforme trace **chaque transaction réelle** (modèle `Transaction`, jamais de CA fictif), de trois natures :
- **Commissions** sur les achats de formation du réseau (% configurable) ;
- **Abonnements** des centres (plans FREE/PRO/PREMIUM, Stripe) ;
- **Paiements de bilan** des bénéficiaires.

Modèle d'encaissement acté : **tout encaisser puis reverser** au centre vendeur le net (montant − commission), sans Stripe Connect dans un premier temps. L'admin god-mode (`/admin/finances`) montre le brut, les revenus plateforme et le **net à reverser** par centre.

## Personas du copilote (AG-UI)

L'assistant est **lié au rôle et à la page** : visiteur (catalogue + bilan, public), bénéficiaire (son bilan), formateur (son planning), centre (cockpit complet), admin plateforme (lecture cross-tenant). Le périmètre d'outils est verrouillé côté serveur (allowlist + `requireRole`) — un visiteur n'atteint aucune donnée tenant, l'admin n'écrit pas via le chat.

## Pilotage plateforme (god-mode)

Le propriétaire monitore tout l'écosystème (`/admin`) : centres, formateurs, bénéficiaires et flux financiers consolidés, en lecture seule cross-tenant, derrière `requirePlatformAdmin()`.

## What makes it worth paying for

Côté centre : moins d'oublis, des sessions mieux remplies, des documents produits plus vite, un pilotage commercial compréhensible sans consolidation manuelle, et de la **demande entrante** via la marketplace.
Côté bénéficiaire : un accompagnement clair, finançable CPF, avec un espace personnel et des formations actionnables.
Côté plateforme : une **monétisation traçable** (commissions + abonnements + bilans) sans donnée fictive.
