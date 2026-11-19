# Technical RL — supports numériques pour le salon

## Demande et périmètre

Après le retrait Digitalys, le propriétaire demande une présentation Le Bon Rebond pour un salon de l'insertion : page complète dans la DA du site, QR et supports numériques, avec des textes qui s'adressent aux visiteurs. Référence : section « Présentation pour le salon » de FUNCTIONAL_SPECIFICATION.md.

`public/salon.html` présente le service, les besoins, le parcours et les contacts. Ses CTA réutilisent le questionnaire et les pages existantes ; elle ne collecte rien elle-même. `public/salon-affiche.html` affiche les PNG vérifiés selon l'orientation de l'écran et constitue un grand lien vers la présentation. QR SVG/PNG, affiches PNG/PDF verticales et horizontales, photo optimisée et fontes locales avec licences OFL sont inclus dans `public/salon/`. Aucun ajout à la navigation principale ou au sitemap ; pages noindex.

## Vérification avant publication

- `python scripts/create-salon-visuals.py` : génération des deux PDF, avec fontes instanciées depuis le dépôt officiel Google Fonts et photo/logo déjà utilisés par le site.
- `pdftoppm -png -singlefile -r 72` : PNG portrait **1080×1920**, paysage **1920×1080**.
- Inspection directe des deux PNG : aucun chevauchement ou texte coupé ; identité et mise en page validées.
- Décodage OpenCV du QR autonome et des deux PNG finaux : exactement `https://lebonrebond.fr/salon.html`.
- PDF : une page chacun, tous les blocs texte dans la page, deux liens cliquables vers la présentation.
- `SMOKE_BASE_URL=http://127.0.0.1:3116 node scripts/smoke-salon.mjs` : PASS, **16 assets HTTP 200 avec SHA-256 identiques aux fichiers source**, zéro formulaire soumis.
- `node --check scripts/smoke-salon.mjs`, `git diff --check` : PASS.
- Six destinations existantes (questionnaire, marketplace, bilan, contact, confidentialité, mentions) : HTTP 200 dans la recette métier.
- Business Client Mystère : **PASS ciblé**, rapport indépendant `reports/2026-11-19_business-client_salon.md`.

## Limite de vérification visuelle HTML

Le navigateur connecté était indisponible ; le contrôle natif a ensuite été arrêté par Computer Use, faute de pouvoir déterminer l'URL active Windows avec assez de certitude. Aucun autre chemin d'automatisation navigateur n'a été utilisé. Le rendu des PNG/PDF est vérifié ; le rendu HTML adaptatif et les interactions tactiles/clavier ne sont pas certifiés par une recette navigateur. La page statique et l'affiche restent utilisables sans script client.

## Publication prévue

La base applicative exacte active est `rebondpro-app:06ac3e044ede7a70b8ea8b6e9739ec85aa0bb2dd`, image `sha256:3f95e96b8387690558034f08e80e1bda5ef4962a1ddec0fe8fb23b0cd93355f3`. `ops/Dockerfile.public-assets` ajoute uniquement les nouveaux fichiers publics à cette image, sans nouvelle compilation, installation de dépendances, modification des secrets ou migration. Le Dockerfile principal du dépôt inclut ces mêmes fichiers lors des builds complets futurs.

Source committée/poussée puis archive Git vers la release correspondante ; image antérieure conservée. Bascule du seul service `app`, contrôles HTTPS des SHA-256 et des CTA, santé DB et non-régression du retrait Digitalys avant finalisation de `DEPLOYED_COMMIT`. Aucun autre service n'est modifié, aucune purge de disque n'est requise.

## Verdict

**Technical RL PASS ciblé avant publication**, avec limite navigateur explicitée. Publication et recette HTTPS à consigner après bascule ; ce rapport ne déclare pas une recette globale des autres fonctionnalités.
