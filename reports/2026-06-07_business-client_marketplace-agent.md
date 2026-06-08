# Business Client Mystère Report

## Context
Product: RebondPro Formation — cockpit SaaS pour centres de formation + marketplace de visibilité.
Target user: dirigeant/équipe d'un petit ou moyen centre de formation ; secondairement, prospects apprenants/entreprises découvrant les formations.
Journeys tested: (1) découverte marketplace → fiche centre → profil formateur → demande ; (2) copilote agentique ; (3) activation post-inscription.
Product promise: rendre visibles les prochaines actions utiles + donner de la visibilité aux centres et formateurs.

## First 30 Seconds
What I understood: landing claire (« Le cockpit intelligent des centres de formation »), double porte d'entrée — créer son cockpit OU explorer le catalogue. La marketplace annonce immédiatement « Trouvez la formation et le formateur qu'il vous faut ».
What confused me: la promesse double (outil de gestion + marketplace) demande un effort pour comprendre qui est servi en premier (le centre, pas l'apprenant).
What action seemed obvious: rechercher une formation / créer un compte.

## Journey
### A. Marketplace (visibilité)
Steps: `/marketplace` (recherche, filtres catégorie/modalité/niveau/ville, grille de formations, annuaire centres) → fiche centre (`Nos formateurs` en avant, formations, à propos, témoignages, ville) → profil formateur (bio, expérience, formations animées) → page formation publique (sessions, `Vos formateurs` cliquables, lien fiche centre, CTA « Demander une inscription »).
Expected value: visibilité crédible des centres et formateurs + capture de demande.
Actual value: livrée. La chaîne formation → formateur → centre est cohérente et navigable. La demande publique retombe dans le CRM du bon tenant (prouvé par `smoke:lot5`).

### B. Copilote agentique
Steps: ouvrir le copilote, demander une action (créer/supprimer). 
Actual value: l'agent **agit réellement** (création/suppression vérifiées en base) avec **validation humaine** avant toute action sensible. Forte différenciation : ce n'est pas un chatbot décoratif.

### C. Activation post-inscription
Steps: inscription → onboarding 3 étapes → dashboard. Dashboard honnête (checklist d'activation quand vide, pas de faux chiffres).

## UX Review
Clarity: bonne. Pages titrées, prochaines actions visibles.
Trust: élevée. Données réelles issues du tenant ; données démo explicitement chargées ; pas de chiffres factices ; actions agent confirmées.
Friction: l'upload de vraies photos exige un bucket Supabase (sinon avatars initiales — acceptable). Double promesse à clarifier.
Coherence: forte. Les CTAs créent des états réels visibles ailleurs (prospect, formation, session).
Empty/error states: gérés (dashboard vide honnête, marketplace « aucun résultat », formation dépubliée inaccessible).

## Commercial Review
Would I pay? Oui, pour un petit/moyen centre — le gain (visibilité + moins d'oublis + exécution accélérée par l'agent) justifie un abonnement.
At what price? Hypothèse 39–99 €/mois selon volume (sessions/formateurs), la marketplace pouvant justifier le palier supérieur.
Why: la marketplace apporte de l'acquisition entrante et l'agent réduit le temps administratif — deux leviers payants.
What blocks purchase: pas de paiement/facturation (Lot 7), pas de preuve sociale à grande échelle (1 centre en démo), upload photos à activer.
What would make it compelling: plusieurs centres réels dans la marketplace (effet réseau), badges qualité (Qualiopi), et statistiques de visibilité par formateur.

## Scores
First 30-second clarity: 82/100
Business value: 86/100
Trust: 90/100
UX simplicity: 84/100
Feature depth: 85/100
Promise alignment: 84/100
Commercial readiness: 70/100 (manque paiement + effet réseau)
Retention potential: 80/100
Overall: 83/100 — **demo-ready, proche du sellable**

## Verdict
**PASS** (business, demo-ready). La valeur est compréhensible, crédible et observable ; un client cible comprendrait et voudrait l'utiliser. La vente nécessite le Lot 7 (paiement) et de l'amorçage marketplace.

## Top Corrections
P0: amorcer la marketplace (plusieurs centres/démos) pour rendre l'effet réseau tangible ; activer le bucket photos.
P1: clarifier la double promesse sur la landing (gérer vs être visible) ; ajouter des stats de visibilité formateur.
P2: badges qualité/Qualiopi sur les fiches centre pour renforcer la confiance.
