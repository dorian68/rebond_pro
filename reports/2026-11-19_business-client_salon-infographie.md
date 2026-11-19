# Business Client Mystère — flyer infographique salon

## Demande et périmètre

Le visiteur doit comprendre les prestations au premier coup d'œil, grâce à un flyer visuel et une infographie, sans devoir lire des paragraphes. Branche candidate : `feat/salon-infographie-20261119`. Revue indépendante après communication du PASS technique local, sans modification applicative, navigateur, soumission ni déploiement par cet agent.

Références : `PRODUCT_PHILOSOPHY.md`, parcours et critères salon de `FUNCTIONAL_SPECIFICATION.md`, `PRODUCTION_READINESS.md`, sources des pages bilan de compétences, formation et bilan d'orientation. Les trois offres existent dans ces sources. Elles sont pertinentes pour un salon insertion, avec une distinction explicite du public collégiens/lycéens/étudiants pour le bilan d'orientation. La formation correspond à une orientation et une mise en relation avec les centres ; aucune place, embauche ou prise en charge garantie ne doit être suggérée.

## Critères de compréhension en cinq secondes

1. Reconnaître la marque et nommer les trois prestations sans lire de détail.
2. Identifier une prestation pour sa situation et distinguer le public jeune.
3. Comprendre visuellement une aide et une suite concrète, sans paragraphe explicatif.
4. Repérer une seule action principale et la relation entre QR, page et questionnaire.
5. Conserver cette hiérarchie à une largeur de téléphone, avec des noms de prestations lisibles.
6. Ne présenter aucune promesse d'emploi, de financement, de certification ou d'admission inventée.

## Revue visuelle effective

Artefacts ouverts avec `view_image` : les deux PNG finaux `public/salon/le-bon-rebond-{portrait,paysage}.png`, puis leurs réductions `.run/salon-infographic/portrait-390.png` et `paysage-1280.png`. La dernière optimisation du logo conserve la composition ; les empreintes des fichiers finaux ont été vérifiées ensuite en HTTP local.

| Lecture rapide | Résultat observé |
|---|---|
| Qu'est-ce qui est proposé ? | Trois blocs immédiatement nommés : bilan de compétences, formations professionnelles, bilan d'orientation |
| Pour qui ? | Faire le point ou développer ses compétences ; collégiens, lycéens et étudiants explicitement identifiés dans le troisième bloc |
| Quelle aide ? | Forces + envies vers un cap ; projet vers formation/centre ; études, métiers, parcours vers des choix plus clairs |
| Quelle suite ? | Schéma court « Votre besoin → Un échange → La suite » |
| Que faire ? | Bouton orange « Je partage mon projet », associé au QR et à l'URL |

Les offres occupent la surface principale. Les schémas et connecteurs portent une information ; aucune grande photographie ne détourne le regard. Le paysage développe trois petits mécanismes visuels, le portrait en conserve la version courte, adaptée à la lecture sur téléphone.

À 390 pixels de large, les trois noms, leurs résultats courts et le CTA restent lisibles sans zoom dans l'artefact réduit. Aucun texte tronqué, chevauchement ou débordement observé. Les couleurs, typographies et arcs restent cohérents avec Le Bon Rebond. Le logo ne remplace pas la lecture de l'offre.

Cette évaluation « cinq secondes » est un jugement de revue visuelle, pas une étude chronométrée auprès d'un échantillon de visiteurs. Les noms des prestations et l'action sont néanmoins accessibles sans aucune lecture longue.

## Exactitude de l'offre et densité

Les bénéfices affichés correspondent aux sources produit : identifier forces/envies et construire une direction ; rechercher une formation et un centre ; clarifier les choix d'études et de métiers des jeunes. Le paysage nomme expressément la mise en relation ; le portrait la condense en « Votre projet → le bon centre ».

Aucun prix, délai garanti, financement, CPF, admission, certification ou résultat d'emploi n'est ajouté. Aucun propos destiné au concepteur ne figure dans le flyer. Le décompte des groupes de texte dessinés donne 61 mots/unités en portrait et 82 en paysage, coordonnées et numéros inclus, hors texte du logo : la densité reste sous les quelque 120 mots utiles demandés.

## Parcours et vérifications indépendantes

- Les QR des deux PNG finaux ont été décodés indépendamment avec OpenCV : exactement `https://lebonrebond.fr/salon.html` pour chacun.
- Les deux HTML, les deux SVG et les deux PNG sont servis en HTTP 200 sur `http://127.0.0.1:3116`, avec SHA-256 identiques aux fichiers relus. Contrôle final : `2026-11-19T15:14:27.447Z`.
- La source de `/salon.html` affiche directement le SVG autonome correspondant à la largeur. Aucun paragraphe ni dépendance de police externe n'est nécessaire pour restituer l'infographie.
- Les trois cartes et le CTA sont associés à des liens HTML : `/bilan-de-competences`, `/marketplace`, `/bilan-orientation`, `/questionnaire`. Ces quatre destinations et `/contact` répondent déjà en 200 sur le site public existant.
- Les liens possèdent des libellés accessibles et des styles de focus dans la source. Le QR et les exports restent partageables. Aucun message, appel ou formulaire n'a été envoyé.

Preuves : `.run/business-salon-infographic/preview-http.json` et `preview-http-final.json`. Le responsable technique a communiqué les contrôles supplémentaires de 18 ressources locales, PDF, QR et liens des PDF.

## Scores et verdict candidat

| Critère | Score ciblé |
|---|---|
| Compréhension rapide des prestations | 97/100 |
| Valeur pour le visiteur du salon | 96/100 |
| Confiance et exactitude | 96/100 |
| Simplicité de l'action | 96/100 |
| Utilité des schémas | 94/100 |
| Alignement avec le besoin exprimé | 98/100 |
| Utilisabilité du support commercial | 96/100 |
| Continuité après le salon | 95/100 |
| Global ciblé | 96/100 |

**Business Client Mystère : PASS ciblé pour le flyer infographique candidat à publication.** Aucun P0/P1 identifié dans le périmètre observé.

## Limites et clôture

Le navigateur reste indisponible ; aucune automatisation alternative n'a été tentée. La revue visuelle porte sur les artefacts finaux et leurs réductions, et l'inspection du HTML/SVG servi. L'usage tactile, le clavier réel et l'alignement des zones cliquables ne sont pas certifiés par un essai navigateur de cet agent. La page utilise le même SVG autonome que la composition inspectée, ce qui réduit l'incertitude de restitution du texte ; cela ne remplace pas le contrôle des interactions.

Le décodage numérique ne vaut pas test de scan d'une impression ou d'un écran distant. Aucune volonté de payer ni conversion réelle n'est déduite de la revue. La publication exige encore le contrôle HTTPS du contenu final à l'URL du QR ; ce rapport sera confirmé après bascule.
