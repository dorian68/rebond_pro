# Business Client Mystère Report

## Context

Product: Le Bon Rebond.

Target user: propriétaire ou opérateur de la plateforme déjà super-admin.

Journey tested: donner à un collègue de confiance l’accès d’administration globale, comprendre la portée du rôle et pouvoir le retirer.

Product promise: administrer les accès sensibles sans dépendre d’une intervention SQL.

## First 30 Seconds

What I understood: la page sert à ajouter et retirer les super-admins ; ce rôle expose les données de tous les centres.

What confused me: la première version n’expliquait pas assez les conséquences de `PLATFORM_ADMIN_EMAILS` ni l’absence d’invitation automatique.

What action seemed obvious: saisir l’adresse exacte du collègue, confirmer, puis lui transmettre le lien de connexion.

## Journey

Steps tested: lecture de la portée, ajout par email, confirmation, compréhension des erreurs, liste des accès effectifs, retrait et lecture de l’historique.

Expected value: autonomie immédiate et réduction du risque d’erreur lors d’une modification de droits très sensibles.

Actual value: atteint. La copie finale précise qu’aucune invitation n’est envoyée, qu’une adresse configurée devient automatiquement active à la création du compte et que son retrait exige configuration plus redémarrage/déploiement.

## UX Review

Clarity: PASS après correction.

Trust: PASS ; portée globale, source du droit et historique sont visibles.

Friction: raisonnable et volontaire pour une action sensible.

Coherence: l’entrée est intégrée à la navigation d’administration et utilise le même rôle serveur que les autres pages `/admin`.

Empty/error states: compte absent, email non vérifié, auto-retrait, accès configuré et historique vide sont traités explicitement.

## Commercial Review

Would I pay? Oui, dans le cadre du cockpit plateforme : cette autonomie réduit une dépendance technique risquée.

Why? Le résultat est immédiat, persistant, audité et compréhensible.

What blocks purchase? Aucun blocage sur ce parcours.

## Scores

First 30-second clarity: 92/100.

Business value: 90/100.

Trust: 92/100.

UX simplicity: 91/100.

Feature depth: 88/100.

Promise alignment: 90/100.

Commercial readiness: 92/100.

Retention potential: 85/100.

Overall: 91/100.

## Verdict

PASS.

## Top Corrections

P0: aucun.

P1: aucun après correction de la copie opérationnelle.

P2: dialogue de confirmation personnalisé facultatif.
