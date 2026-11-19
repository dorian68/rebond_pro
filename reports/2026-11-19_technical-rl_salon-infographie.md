# Technical RL - flyer infographique salon

## Demande et acceptation

Le propriétaire demande que `/salon.html` soit un flyer visuel dont l'offre se comprend au premier regard, sans paragraphes. La section « Refonte infographique salon » de FUNCTIONAL_SPECIFICATION.md définit trois prestations réelles et leurs résultats courts, un parcours graphique et un CTA/QR.

## Modification

La page longue est remplacée par deux infographies vectorielles autonomes : format paysage 1920×1080 et portrait 1080×1920. Trois prestations lisibles, schémas courts et résultats : bilan de compétences (forces + envies → cap et plan d'action), formations professionnelles (projet → formation → centre adapté), bilan d'orientation explicitement destiné aux collégiens/lycéens/étudiants. La photographie dominante et les paragraphes ont disparu. Un parcours besoin → échange → suite conduit au CTA orange et au QR existant, dont la destination ne change pas.

Les textes des SVG sont tracés avec les fontes licenciées du site, et le logo est embarqué. Aucun chargement de photo, police ou script externe n'est requis pour afficher le flyer : 269706 octets paysage, 250499 octets portrait. La page affiche exactement les SVG dont les PNG ont été inspectés. Ses trois liens d'offres, son CTA et son agrandissement QR sont des liens HTML avec libellés pour les technologies d'assistance, focus visible et coordonnées compilées depuis les mêmes artboards. Les exports PNG/PDF et l'affiche existante sont actualisés ensemble. Le générateur historique délègue au nouveau pour conserver une seule source.

## Vérifications avant publication

- `python scripts/create-salon-infographic.py` : PASS ; dimensions, largeurs des textes, limites des zones et décodage du QR sur les deux PNG finaux.
- Inspection directe des PNG 1920×1080 et 1080×1920, puis réductions 1280 px et 390 px : PASS après correction d'un espacement de titre et d'un chevauchement pictogramme/titre pendant l'itération.
- SVG XML autonomes : aucun script, uniquement références locales de glyphes ou images data URI.
- PDF : une page chacun, cinq liens vers les destinations prévues ; rendu PDF rechargé et QR décodé à nouveau avec OpenCV.
- `SMOKE_BASE_URL=http://127.0.0.1:3116 node scripts/smoke-salon.mjs` : PASS, **18 fichiers HTTP 200 aux SHA-256 exacts**, trois offres et CTA reliés, pas de paragraphes.
- `node --check scripts/smoke-salon.mjs`, `git diff --check` : PASS.
- Aucun formulaire, message ou appel n'est soumis. Aucune donnée ou API métier n'est modifiée.

## Exploitation et limites

Publication sur l'image active `c91318310585a8b48573a02bec29c1d01f606818` par les deux seules couches de fichiers publics, sans compilation de l'application, migration, secrets ou modification d'autres services. Source committée/poussée, archive de contexte issue du commit et octets vérifiés avant transfert. Image précédente conservée pour rollback. Santé et contrôle HTTPS après bascule requis avant finalisation du marqueur de release.

La recette ne dépend pas d'un navigateur pour la composition : le flyer servi est le même SVG que celui rasterisé et inspecté, sans adaptation de texte HTML. Le contrôle automatisé des interactions clavier/tactiles n'est pas revendiqué ; les liens restent des ancres HTML natives.

## Verdict

**Technical RL et Business Client Mystère : PASS ciblés en production.**

## Publication et contrôle final

Source `bc6060f7703cd708daaac76689d4b76f3344ea4a` poussée sur `origin/feat/salon-infographie-20261119`. Le contexte Git limité aux fichiers nécessaires mesure 2406400 octets ; ses 18 assets ont été comparés octet par octet aux fichiers validés avant transfert. Les quatorze couches de la base active restent identiques et seules deux couches publiques sont ajoutées. Le service app seul a été recréé, l'image précédente reste disponible.

`node scripts/smoke-salon.mjs` sur `https://lebonrebond.fr` : **PASS, 18 assets HTTP 200 aux SHA-256 exacts**, sept destinations publiques HTTP 200, santé et DB up. Les six anciennes URLs Digitalys restent 404. `DEPLOYED_COMMIT` finalisé après comparaison de l'image réellement exécutée avec la candidate et les contrôles HTTPS. Confirmation métier indépendante : les deux HTML, les deux SVG et les deux PNG de production correspondent aux fichiers inspectés, PASS final du rapport métier.
