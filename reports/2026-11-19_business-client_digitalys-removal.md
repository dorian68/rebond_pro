# Business Client Mystère Report — retrait de Digitalys Formation

## Contexte et périmètre

Produit : Le Bon Rebond. Public : personnes cherchant une formation et centres partenaires. Promesse : accéder à une prochaine étape professionnelle et à des interlocuteurs réellement référencés. Demande du propriétaire : retirer Digitalys Formation de l'ensemble du site public et appliquer immédiatement la mise à jour en production.

Cette revue indépendante porte uniquement sur ce retrait. Elle ne juge pas à nouveau la commercialisation globale du produit. Documents lus ou validés pour ce périmètre : protocole `AGENTS.md` racine, `AGENT_BUSINESS_CLIENT_MYSTERE.md`, `PRODUCT_PHILOSOPHY.md`, règles et critères marketplace/SEO de `FUNCTIONAL_SPECIFICATION.md`, `PRODUCTION_READINESS.md` et rapport business questionnaire précédent. Le verdict technique HTTP PASS a été communiqué par le responsable technique avant la recette finale.

## Critères d'acceptation business

- Le visiteur ne découvre plus Digitalys dans le catalogue, l'annuaire ou les résultats de recherche.
- Un ancien lien vers le centre ou l'une de ses cinq formations ne présente plus son identité, son accroche, ses coordonnées ou un parcours de mise en relation.
- Les six anciennes URLs ne figurent plus dans le plan du site.
- Les autres centres et leurs formations conservent leur visibilité et leurs liens.
- Le parcours de recherche conserve un état vide compréhensible lorsque Digitalys est recherché.

## Recette effective en production

Contrôles HTTP publics en lecture seule effectués le 19 novembre 2026, après le PASS technique ; fin de collecte à `2026-11-19T12:43:48.974Z`. Domaines contrôlés : `https://lebonrebond.fr` et `https://lebonrebond.optiquant-ia.com`. Les redirections existantes de certaines routes de l'alias vers le domaine principal ont été suivies.

La baseline indépendante, capturée avant mutation, recensait 94 URLs sitemap : 21 pages éditoriales, 10 centres et 63 formations. Les 10 fiches centre répondaient en 200. Digitalys présentait l'accroche demandée et cinq formations publiques.

| Parcours | Résultat observé |
|---|---|
| Accueil, `/centres`, `/formation`, catalogue complet | HTTP 200 sur les deux domaines ; aucune identité, accroche ou coordonnée Digitalys dans le texte HTML visible ; aucun lien vers ses anciennes fiches |
| `/marketplace?allCenters=1` | Digitalys absent ; les neuf autres centres restent proposés |
| Recherche « Digitalys Formation » | Aucun résultat de formation ; message « Aucune formation ne correspond à votre recherche. Essayez d'élargir les filtres. » ; les autres centres restent accessibles |
| Ancienne fiche `/carif-digitalys-formation` | HTTP 404 sur les deux domaines, sans contenu commercial Digitalys |
| Cinq anciennes formations `/carif-digitalys-formation/f/carif-digitalys-f01` à `f05` | HTTP 404 pour chacune sur les deux domaines, sans contenu commercial Digitalys |
| `/sitemap.xml` | 88 URLs, exactement les 94 initiales moins les six URLs Digitalys ; aucun ajout ni retrait supplémentaire |
| Neuf autres fiches centre | HTTP 200 ; titre, H1 et liste des liens de formation identiques à la baseline, soit 58 formations conservées |

Les 33 contrôles et comparaisons indépendants passent. Preuves locales : `.run/business-digitalys/before.json` et `.run/business-digitalys/after.json`. Le smoke HTTP reproductible du responsable technique est `scripts/smoke-digitalys-removal.mjs`.

## Clarté, confiance et cohérence

Le catalogue continue d'expliquer sa finalité et de proposer les centres restants. La recherche n'attribue aucun résultat au centre retiré et donne une consigne explicite pour élargir les filtres. Le plan du site et les liens commerciaux décrivent le même état public. Le retrait ne redirige pas artificiellement un ancien lien vers une autre prestation.

Du point de vue d'un centre partenaire, le maintien exact des neuf autres fiches et de leurs 58 liens de formation est la preuve utile de l'absence d'effet collatéral observé. Du point de vue du visiteur, aucune offre Digitalys n'est encore présentée comme disponible par les parcours contrôlés.

## Évaluation commerciale et scores ciblés

Le retrait ne constitue pas une prestation vendue isolément : aucun tarif ou volonté de payer n'est déduit de cette recette. Sa valeur est la cohérence du réseau présenté et la suppression d'une mise en relation devenue indésirable.

| Critère | Score ciblé |
|---|---|
| Clarté en 30 secondes | 95/100 |
| Valeur métier du retrait | 100/100 |
| Confiance et crédibilité | 98/100 |
| Simplicité du parcours restant | 95/100 |
| Couverture du retrait demandé | 100/100 |
| Alignement avec la promesse | 98/100 |
| Préparation commerciale de ce changement | 98/100 |
| Potentiel de rétention | Non réévalué par ce retrait |
| Global ciblé | 98/100 |

## Limites

Recette du HTML servi et des réponses HTTP, sans navigateur visuel, sans session privée et sans soumission de formulaire. Le rendu visuel de la page 404 n'est pas certifié par cette méthode ; aucune refonte de cet état n'était comprise dans le retrait. L'effacement des caches ou index des moteurs externes n'est pas contrôlé et n'est pas annoncé comme immédiat. Les limites globales historiques de la plateforme restent celles de `PRODUCTION_READINESS.md`.

Cet agent n'a effectué aucune mutation DB, aucun déploiement et aucun envoi de demande. Les détails de sauvegarde, d'audit et de conservation des données relèvent du rapport technique.

## Verdict

**Business Client Mystère : PASS pour le retrait public de Digitalys Formation en production.**

Aucun correctif P0/P1 identifié dans le périmètre demandé. Aucun blocage business à la clôture de ce retrait.
