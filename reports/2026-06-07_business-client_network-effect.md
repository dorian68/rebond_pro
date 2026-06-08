# Business Client Mystère Report

## Context
Product: RebondPro Formation — cockpit + marketplace de visibilité.
Target user: dirigeant de centre de formation (acheteur) ; prospect apprenant/entreprise (découverte).
Journey tested: découverte marketplace multi-centres (effet réseau) + clarté de la promesse + confiance.
Product promise: « Pilotez votre centre. Gagnez en visibilité. »

## First 30 Seconds
What I understood: la landing distingue désormais clairement les deux bénéfices (gestion ET visibilité). Le bouton « Explorer le catalogue public » invite à découvrir le réseau.
What confused me: rien de bloquant ; la double cible (centre vs apprenant) reste mais est maintenant explicite.
What action seemed obvious: explorer le catalogue ou créer son cockpit.

## Journey
Steps: `/marketplace` affiche **4 centres** (Atlantique Compétences, Digital Academy 972, Institut Langues & Co, Mon Centre de Formation) et ~10 formations, chacune reliée à son centre et ses formateurs. Chaque centre porte un badge **« Centre du réseau »** (signal honnête). Fiches centre et profils formateurs accessibles et cohérents.
Expected value: un catalogue crédible donnant de la visibilité aux centres et formateurs.
Actual value: livrée — l'effet réseau est désormais tangible (plusieurs centres, catégories variées : management, digital, IA, langues, finance, bureautique).

## UX Review
Clarity: améliorée (promesse double explicite).
Trust: élevée — badge réseau honnête, données réelles, données démo identifiables, santé observable (`/api/health`).
Friction: faible. Upload de vraies photos nécessite le bucket Supabase (sinon avatars initiales — propres).
Coherence: forte — formation ↔ formateur ↔ centre navigable dans les deux sens ; demande publique → CRM du bon tenant.
Empty/error states: gérés.

## Commercial Review
Would I pay? Oui — l'effet réseau renforce la proposition (acquisition entrante) en plus du gain de gestion.
At what price? 49–99 €/mois selon volume ; la visibilité marketplace justifie le palier supérieur.
Why: deux leviers payants combinés (visibilité + productivité + agent qui exécute).
What blocks purchase: paiement/facturation (Lot 7) non livré ; preuve sociale encore limitée (réseau de démonstration) ; certifications (Qualiopi) non gérées (volontairement non simulées).
What would make it compelling: vrais centres dans le réseau, stats de visibilité par formateur, intégration certification Qualiopi réelle.

## Scores
First 30-second clarity: 88/100 (+6)
Business value: 88/100 (+2)
Trust: 91/100 (+1)
UX simplicity: 85/100
Feature depth: 86/100
Promise alignment: 89/100 (+5, double promesse clarifiée)
Commercial readiness: 73/100 (+3)
Retention potential: 82/100
Overall: 85/100 — **demo-ready solide, proche du sellable**

## Verdict
**PASS** (business). La promesse est claire, l'effet réseau est visible, la confiance est renforcée par des signaux honnêtes. Vente conditionnée au Lot 7 (paiement) et à l'amorçage réel du réseau.

## Top Corrections
P0 (hors code) : amorcer le réseau avec de vrais centres ; activer le bucket photos.
P1 : stats de visibilité formateur (vues/demandes) ; intégration Qualiopi réelle (jamais simulée).
P2 : page « pour les apprenants » dédiée pour lever l'ambiguïté de cible.
