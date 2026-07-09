# Business Client Mystère — Google OAuth

## Persona

Centre de formation partenaire qui veut créer son espace rapidement ou se reconnecter sans mot de passe.

## Scores

| Critère | Score |
|---|---:|
| Clarté de la promesse | 5/5 |
| Parcours principal | 4/5 |
| Valeur perçue | 4/5 |
| Confiance | 4/5 |
| Conversion | 4/5 |

Score global : 4.2/5.

## Forces

- Google est disponible sur login et inscription centre quand le provider est configuré.
- La création centre reste explicite : nom du centre + CGU.
- Google ouvre bien le sélecteur de compte, ce qui évite de retomber silencieusement sur un compte Google déjà connecté.
- Un compte Google inconnu en login ne crée pas de centre silencieusement.
- Un compte Google déjà présent comme invité peut désormais créer son propre centre sans tomber sur un message d'espace inactif.
- Un compte déjà actif qui clique par erreur sur l'inscription Google reste sur son espace existant et ne crée pas un deuxième centre.

## Frictions

- Les boutons Google sont masqués tant que les credentials ne sont pas configurés.
- La première configuration Google Cloud reste une action manuelle externe.
- Les comptes Google-only n'ont pas de mot de passe local ; le retour utilisateur doit passer par Google ou par un futur flux de création de mot de passe si souhaité.
- Le callback Google complet nécessite encore une validation humaine dans le navigateur, car l'agent ne peut pas saisir le compte Google réel de l'utilisateur.
- La base contient encore des utilisateurs sans espace actif ; ils sont maintenant bloqués proprement, mais le support devra savoir expliquer ou nettoyer ces comptes.

## Verdict

Verdict d'achat : paierait.

Business Client Mystère verdict for Google OAuth: PASS.
