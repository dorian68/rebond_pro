# Business Client Mystère Report — présentation salon Le Bon Rebond

## Contexte

Public : visiteurs d'un salon de l'insertion, personnes cherchant leur voie, une formation ou une prochaine étape professionnelle ; second public, les personnes qui les accompagnent. Demande : une présentation numérique dans la direction artistique du site et des visuels partageables avec QR code, adressés directement aux visiteurs.

Branche : `feat/salon-20261119`, créée après le retrait de Digitalys. La présente revue intervient après notification du PASS technique local. Elle porte sur les nouveaux fichiers publics et les parcours de découverte qu'ils proposent ; aucun autre module n'est déclaré recertifié.

Références validées : `AGENT_BUSINESS_CLIENT_MYSTERE.md` racine, `PRODUCT_PHILOSOPHY.md`, parcours et limites de `FUNCTIONAL_SPECIFICATION.md`, `PRODUCTION_READINESS.md`, présentation du site et critères transmis par le responsable technique.

## Critères d'acceptation

- Le visiteur identifie rapidement Le Bon Rebond, les besoins concernés et une prochaine action.
- Les textes s'adressent à lui en « vous », sans instructions internes ni notes de conception.
- La présentation distingue orientation, formation et partage du projet, avec des liens existants et utiles.
- Aucune embauche, sélection, prise en charge, éligibilité ou financement garanti n'est inventé.
- Le QR ouvre une vraie page de présentation, dont le contenu permet ensuite de répondre au questionnaire ou de prendre contact.
- Les affiches sont lisibles, cohérentes avec la marque et disponibles en orientations portrait et paysage.

## Recette réalisée

### Texte et parcours

Relecture intégrale de `public/salon.html` et de `public/salon-affiche.html`. Le titre « Votre prochain rebond commence ici » est immédiatement contextualisé par « Orientation · Formation · Reconversion » et la question adressée au visiteur sur sa voie, sa formation ou son nouveau départ.

Le CTA principal « Parlez-nous de votre projet » mène vers `/questionnaire`. La mention « Sans création de compte. Vous choisissez si vous souhaitez être recontacté » correspond au questionnaire déjà livré. Les trois entrées conduisent au bilan de compétences, au catalogue ou au partage de la situation. L'envie de créer une activité est présentée comme un sujet à exprimer ; aucune prestation entrepreneuriale disponible ni résultat garanti n'est promis.

La suite est expliquée en trois temps : parler de sa situation, faire le point si un échange est demandé, puis choisir une prochaine étape. Les contacts directs sont visibles. Le bloc destiné aux accompagnateurs reste secondaire et conduit vers `/contact`. Aucun nom, lieu ou programme de salon non fourni n'est inventé.

### Affiches et QR

Les deux PNG finaux ont été ouverts et inspectés visuellement avec `view_image` :

- `public/salon/le-bon-rebond-portrait.png`, 1080 × 1920 ;
- `public/salon/le-bon-rebond-paysage.png`, 1920 × 1080.

Les titres, textes, logo, photo, URL, QR et coordonnées restent dans les marges ; aucun chevauchement ou texte tronqué observé. La hiérarchie est nette : marque, besoin, prochaine étape, invitation à scanner. Le fond crème, le bleu marine, le vert/teal, les arcs et l'alternance Newsreader / Plus Jakarta Sans reprennent l'identité du site. La photo illustre la présentation sans être associée à un témoignage ou à un résultat chiffré.

Décodage indépendant OpenCV du QR présent dans chacun des deux PNG finaux et du PNG QR autonome : les trois donnent exactement `https://lebonrebond.fr/salon.html`. Il s'agit d'un décodage numérique, sans revendication de test de scan sur un écran ou une impression physique.

L'affiche HTML reprend directement ces PNG via `<picture>` selon l'orientation ; toucher ou cliquer l'affiche mène à la même page complète. Elle conserve un texte alternatif utile et un titre pour les technologies d'assistance.

### Accès HTTP et destinations

Recette indépendante de preview terminée à `2026-11-19T13:00:00.076Z`, contre `http://127.0.0.1:3116`. Les deux HTML servis sont identiques octet par octet aux fichiers relus. Quinze routes locales contrôlées répondent 200 avec un contenu non vide : pages, deux PNG, deux PDF, QR SVG/PNG, portrait, cinq polices et logo.

Six destinations métier/légales répondent déjà en 200 sur la production existante : `/questionnaire`, `/contact`, `/bilan-de-competences`, `/marketplace`, `/legal/confidentialite`, `/legal/mentions`. Aucun formulaire n'a été soumis. WhatsApp, téléphone et email ont seulement été relus ; aucun message ou appel n'a été initié.

Preuve de cette campagne : `.run/business-salon/http-preview.json`. Le smoke technique reproductible est `scripts/smoke-salon.mjs`.

## Scores ciblés

| Critère | Score |
|---|---|
| Clarté en 30 secondes | 96/100 |
| Valeur pour le visiteur | 94/100 |
| Confiance et crédibilité | 96/100 |
| Simplicité des actions proposées | 95/100 |
| Profondeur adaptée à une présentation de salon | 93/100 |
| Alignement avec la promesse | 97/100 |
| Préparation commerciale du support | 95/100 |
| Continuité après le salon | 94/100 |
| Global ciblé | 95/100 |

La valeur commerciale du support tient au lien direct entre découverte, expression du besoin et échange humain. Aucun prix ni consentement à payer n'est inféré d'une présentation d'acquisition.

## Limites et contrôle après publication

L'automatisation navigateur était indisponible ; aucune méthode alternative de contrôle navigateur n'a été utilisée. Le rendu visuel HTML de la page longue, son fonctionnement tactile et son clavier sur mobile ne sont donc pas certifiés. La source comporte une grille responsive, un texte mobile explicite, un lien d'évitement, des images dimensionnées et des styles de focus ; ces observations ne remplacent pas un essai rendu.

La preuve visuelle directe concerne les deux affiches PNG finies. Le responsable technique a en outre communiqué les contrôles PDF de dimensions, limites du texte et liens, ainsi que son PASS technique local. Les anciens verdicts techniques du questionnaire et des contacts ne sont pas remplacés par une simple requête GET.

Au moment de cette revue, les nouveaux fichiers sont candidats à publication. La clôture du déploiement exige que l'URL cible du QR et ses ressources répondent en HTTPS en production avec le même contenu. Aucune promesse de publication déjà effectuée ne découle du présent rapport.

## Verdict

**Business Client Mystère : PASS ciblé pour le contenu, les deux affiches et le parcours de découverte préparé pour publication.**

Aucun correctif P0/P1 identifié dans le périmètre observé. La limite de recette navigateur HTML doit rester explicite ; elle n'empêche pas la publication de ce support statique et de ses parcours existants. Le contrôle HTTPS final relève de la bascule de production, puis d'une confirmation de ce rapport.

## Confirmation après publication

Contrôle indépendant en lecture seule terminé le 19 novembre 2026 à `13:08:47.758Z` : `https://lebonrebond.fr/salon.html`, `/salon-affiche.html`, les deux PNG finaux et le QR SVG répondent en HTTPS 200. Les empreintes SHA-256 des cinq ressources correspondent exactement aux fichiers relus et aux affiches inspectées. La page complète conserve les liens questionnaire/contact et ne contient aucune référence à Digitalys. La cible du QR est donc bien publiée avec la présentation attendue.

Preuve : `.run/business-salon/http-production.json`. Le contrôle technique des seize ressources, dont les PDF, reste consigné séparément par le responsable technique.

**Verdict final Business Client Mystère : PASS ciblé en production**, dans les limites de recette HTML et sans certification navigateur mobile décrites ci-dessus.
