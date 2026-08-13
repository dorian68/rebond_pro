# Business Client Mystère — Roadmap 2 agentique + Gmail

## Persona

Propriétaire plateforme souhaitant piloter son projet depuis Roadmap 2.

## Score

| Critère | Score / 5 | Observation |
| --- | ---: | --- |
| Clarté de la promesse | 4,4 | Les raccourcis Roadmap 2 nomment directement emails, revue et relance. |
| Parcours principal | 4,3 | Le faux état vide est corrigé, OAuth admin raccordé et les aperçus sont complets ; Gmail réel reste à tester. |
| Valeur perçue | 4,7 | Email → action/décision → roadmap → relance réduit fortement les changements d'outil. |
| Confiance | 4,5 | Aperçu To/Cc/Cci/objet/corps, validation explicite et absence de persistance locale des emails. |
| Conversion / pas suivant | 4,3 | Les suggestions donnent un point de départ clair et l'OAuth personnel fonctionne sans membership centre. |

Score global : **4,4 / 5 — paierait**.

## Forces

1. Le projet se pilote depuis une même conversation sans perdre la roadmap.
2. Les emails sont sélectionnables et transformables en décisions/actions concrètes.
3. L'envoi définitif distingue clairement destinataire, objet, corps et impact.

## Frictions bloquantes

1. La lecture et l'envoi Gmail n'ont pas encore été démontrés sur le compte réel attendu.
2. La migration doit être appliquée en production avant activation.
3. L'agent ne modifie volontairement pas la structure Drive (titre/catégorie/parent) ; ces changements restent dans l'éditeur dédié avec prévisualisation Drive.

## Verdict Business

**PASS pour l’expérience conçue/local.** La readiness production reste conditionnée à un parcours réel de bout en bout après migration : ouvrir Gmail, choisir un email, créer/éditer un nœud, préparer une relance, vérifier l'aperçu, valider un envoi contrôlé et constater l'audit.
