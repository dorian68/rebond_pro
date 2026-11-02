# Technical RL Iteration Report

## Context

- Product: Le Bon Rebond, site public `https://lebonrebond.fr`.
- Feature: navigation explorable, identité structurée, hiérarchie des pages et sitemap du catalogue publié.
- Base: `e07e03c`, confirmée active par lecture de `/opt/rebondpro/DEPLOYED_COMMIT` sur le VPS. Les checkouts de développement `REBOND_PRO/rebondpro` et `rebondpro-admin-go`, qui contiennent des travaux préexistants, n'ont pas été modifiés.
- Checkout isolé: `FLOW_AGENCY/outputs/seo-worktrees/rebondpro-seo-20261103`, branche `seo/sitelinks-geo-20261103`.
- Spec: `FUNCTIONAL_SPECIFICATION.md`, section 18, critères SEO publics du 3 novembre 2026.

## Evidence before the patch

- Les huit pages éditoriales contrôlées répondent en HTTP 200 avec leur canonique propre et un H1. Les précédents correctifs de domaine/canoniques ne sont pas à refaire.
- Aucun bloc JSON-LD sur ces pages.
- Les menus « Nos bilans » et « À propos » ne créaient leurs liens qu'après survol. Le HTML commun ne contenait pas les liens vers le bilan d'orientation, la méthode et le journal.
- Le sitemap public contient 21 URL éditoriales. Une requête SQL en transaction `READ ONLY`, terminée par `ROLLBACK`, constate 10 centres et 63 formations déjà publiables selon la garde serveur actuelle; aucune formation ne manque de `publicSlug`.
- Les 73 fiches correspondantes ont toutes été contrôlées en HTTP public : 73 réponses 200, un H1 par page, aucune balise canonique. Certaines fiches utilisent un slug CARIF mais sont déjà approuvées, revues et publiques; le patch ne publie aucun nouvel enregistrement.

## Patch

- Remplace les menus conditionnés au survol par des disclosures HTML natifs `details/summary`. Les liens existent dès le rendu initial et restent utilisables sans survol. Le menu mobile et les parcours de connexion/RDV sont conservés.
- Ajoute les liens vers la méthode, le bilan d'orientation et le journal dans la navigation pertinente.
- Décrit la marque Le Bon Rebond, son `WebSite` et son éditeur `Organization` OPTIQUANT IA, conformément aux mentions légales. Coordonnées déjà publiques uniquement; aucun avis, prix, statut associatif, certification, `SearchAction` ou résultat commercial inventé.
- Ajoute des `BreadcrumbList` correspondant aux fils visibles existants. Le composant visible n'est ajouté que là où il remplace le fil du blog ou complète réellement la méthode/fiche formation. Pas de seconde barre sur les six pages client qui en possèdent déjà une.
- Ajoute une canonique et une URL Open Graph propres aux fiches centre/formation. Les noms issus de la base sont échappés dans les scripts JSON-LD.
- Ajoute les fiches du catalogue au sitemap avec exactement les critères actuels : formation publique, publiée et non supprimée; centre non supprimé, profil activé, statut approuvé et revue humaine renseignée. Seuls `publicSlug` et le slug public du centre sont sélectionnés. Aucun identifiant privé ni donnée personnelle n'est envoyé au sitemap.
- Une formation sans `publicSlug` n'obtient pas de fausse URL fondée sur son slug interne. Les URL sont dédupliquées et leurs segments encodés. La limite protège le format sitemap; un catalogue dépassant 24 000 formations requiert une pagination explicite.
- Si la lecture du catalogue échoue, le sitemap conserve les 21 pages éditoriales et émet un avertissement structuré sans secret. Il ne prétend pas avoir publié le catalogue.

## Tests

| Commande / contrôle | Résultat |
| --- | --- |
| `npm run smoke:public-seo` | PASS, six contrôles purs sans DB |
| `npm run smoke:public-seo -- --base-url http://127.0.0.1:3763` | PASS, 18 contrôles : six purs, dix pages HTTP, sitemap, vraie 404 |
| ESLint ciblé sur les sources et le smoke modifiés | PASS, zéro erreur et zéro warning après correction de l'import inutilisé |
| `tsc --noEmit --incremental false` | PASS |
| `npm run build -- --webpack` | PASS sur le candidat final, compilation, TypeScript et 47 pages statiques |
| `git diff --check` | PASS |
| Catalogue existant, SQL READ ONLY et HTTP public | 10 centres + 63 formations publiables, 73/73 HTTP 200, aucune écriture |

Le build Turbopack local ne peut pas suivre la jonction `node_modules` qui pointe vers les dépendances déjà installées du worktree de base. Le build Webpack officiel valide le code local. Le workflow Linux `.github/workflows/seo-image-build.yml` doit construire le commit exact avec une installation propre et le build standard avant publication. Aucune compilation n'a été lancée sur le VPS; l'incident mémoire du précédent chantier est ainsi évité.

La preview ne contient aucun secret ni accès à la base de production. Le mode HTTP valide le sitemap éditorial de repli. Les 94 URL attendues avec les données actuellement publiées (21 + 10 + 63) et les canoniques des fiches doivent être relues sur le candidat connecté à la vraie base, puis en production. Ce test n'est pas remplacé par les contrôles purs.

## Smoke journey

1. Lire le HTML initial sans interaction : les six liens prioritaires sont présents.
2. Lire l'identité : la marque Le Bon Rebond est distinguée de l'éditeur OPTIQUANT IA.
3. Lire dix pages : HTTP 200, un H1, une canonique `.fr`, JSON-LD valide et hiérarchie conservée.
4. Lire le sitemap : URL uniques, domaine canonique, 21 pages éditoriales conservées, aucune route privée.
5. Lire un article inexistant : vraie réponse HTTP 404.
6. Vérifier le filtre du catalogue : verrou public existant réutilisé, aucune URL de formation interne ou non résoluble ajoutée.

## Iterations

1. Patch ciblé depuis la release active; smoke pur et build/HTTP passants.
2. Retrait de six barres de fil d'Ariane supplémentaires repérées avant finalisation : conservation des fils visibles existants, ajout uniquement du JSON-LD correspondant. Nouveau build et smoke HTTP complet PASS.

## Verdict

**Technical RL : PASS local pour le périmètre SEO public vérifié.** La validation du catalogue complet sur un runtime connecté et le build Linux standard restent requis avant de déclarer la publication validée.

**Business Client Mystère : revue statique sans blocage; contrôle UI desktop/mobile/clavier non certifié.** Computer Use a bloqué l'accès au navigateur avant le rendu de preview; le second agent conserve un verdict PARTIAL tant que le parcours réel n'est pas observé. Aucun PASS visuel ne doit être déduit du rendu HTML ou de l'usage d'éléments natifs.

Les NO-GO et limites préexistants de l'admin, des paiements et des autres modules ne sont pas levés par ce correctif.

## Remaining risks and next actions

- Construire le commit exact en CI Linux puis vérifier le catalogue et les canoniques avant bascule. Conserver l'image active `e07e03c` pour retour arrière; aucune migration de base n'est nécessaire.
- Terminer la revue UI indépendante si le navigateur peut être contrôlé avec l'URL vérifiée.
- Après publication, lire le sitemap complet et soumettre une seule fois le fichier corrigé via Search Console. Inspecter des URL représentatives, dont une page centre et une formation; le compteur de sitemap n'est pas un décompte d'indexation.
- Les sitelinks, l'indexation et les citations génératives sont décidés par les moteurs. Le patch facilite l'exploration et la compréhension, sans garantir leur apparition ou une échéance.

Sources : [Google, sitelinks](https://developers.google.com/search/docs/appearance/sitelinks), [noms de sites](https://developers.google.com/search/docs/appearance/site-names), [Organization](https://developers.google.com/search/docs/appearance/structured-data/organization), [BreadcrumbList](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb). Les guides Next installés pour Metadata, sitemap et JSON-LD ont été lus avant implémentation.
