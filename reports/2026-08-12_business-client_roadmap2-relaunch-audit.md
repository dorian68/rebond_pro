# Audit de relance Business Client Mystère — Roadmap 2

Date de l'audit : 2026-08-13
Date de référence du chantier et du rapport : 2026-08-12
Personas : Dorian (dirigeant/pilote stratégique) et Mathurin (opérateur de la revue hebdomadaire).

> **Statut courant après recontre-audit du lot corrigé : PASS local — 4,3/5 ; PASS cible PostgreSQL de production ; PARTIAL global, uniquement faute de Google réel et des deux revues utilisateurs.** Les verdicts et réserves antérieurs sont conservés ci-dessous comme historique. L'addendum final du 13 août 2026 fait foi pour l'état courant.

## Verdict

**PARTIAL — 3,4/5. Definition of Done non atteinte.**

Le lot de fiabilité est une amélioration importante : il transforme une panne ambiguë entre Google Drive et PostgreSQL en opération durable, identifiable et, après succès fournisseur enregistré, finalisable sans rappeler Google. Cela renforce la crédibilité de la promesse « du cap stratégique aux preuves Drive ».

Le produit actuel ne mérite toutefois pas encore le Business PASS. Le registre n'existe pas dans la base active contrôlée, le compte réel est `NOT_CONNECTED`, le parcours Google complet n'a pas été exécuté et aucune des deux revues réelles prévues avec Dorian et Mathurin n'a eu lieu. Le lot est donc **PASS en code et simulation ciblée**, mais **PARTIAL en produit utilisable et adoptable**.

## Scorecard 0–5

| Critère | Score | Motif |
| --- | ---: | --- |
| Clarté de la promesse | **4,4/5** | Le cockpit, les vues et la place de Drive sont compris rapidement. |
| Parcours principal | **3,0/5** | Le parcours général est cohérent, mais les mutations Drive du nouveau lot ne peuvent pas utiliser le registre absent de la base active et le parcours Google réel reste non testé. |
| Valeur perçue | **4,0/5** | La réduction des doubles saisies et la reprise après panne ont une valeur opérationnelle nette. |
| Confiance | **3,1/5** | Le registre, les leases, la redaction et l'idempotence simulée améliorent fortement le code ; l'absence de déploiement et de preuve fournisseur réelle empêchent de transformer cette confiance théorique en confiance client. |
| Conversion / adoption | **2,7/5** | Le seed de 65 nœuds, les KPI, la vue progressive et les presets de revue restent à traiter ; aucune adoption réelle n'est mesurée. |
| **Score global** | **3,4/5** | **Paierait sous conditions.** |

Le score progresse par rapport aux **67/100** de l'audit complet, car le principal risque de cohérence distribuée possède désormais une réponse structurée. Il reste inférieur au rapport Drive statique à 4,4/5, qui évaluait surtout la promesse et l'interface et non la readiness complète de la relance.

## Verdict d'achat par persona

- **Dorian — paierait sous conditions.** Le registre de reprise réduit un risque de gouvernance important, mais il doit voir la baseline DB, un vrai cycle Google et des KPI non ambigus avant de confier le pilotage hebdomadaire à l'outil.
- **Mathurin — paierait sous conditions.** La reprise sans double upload et l'archive/restauration fiable sont utiles, mais le seed massif, l'absence de presets et l'absence de preuve de deux revues sans tableur créent encore trop de friction quotidienne.

## Ce que le lot améliore réellement

1. **Traçabilité distribuée.** `Roadmap2DriveOperation` couvre provisioning, ressources de nœud, upload, réconciliation, permissions, archive et restauration avec états explicites, hash de requête, lease, tentatives et résultat fournisseur.
2. **Reprise après succès Google.** Un résultat fournisseur durable en `provider_succeeded` ou `needs_repair` peut être finalisé côté PostgreSQL/audit sans second appel Google. Les smokes simulent notamment la perte du commit local et vérifient l'absence de seconde copie.
3. **Idempotence et faux succès.** Les clés sont conservées pendant une tentative UI, l'upload porte un marqueur d'opération, le provisioning et les dossiers de nœud ont des marqueurs stables, et les réponses Composio non réussies ne sont plus comptées comme des succès.
4. **Cycle archive/restauration.** Ces mutations passent désormais par le même registre fournisseur-first et par une finalisation locale rejouable, au lieu d'une compensation fragile dispersée.
5. **Opérabilité technique.** `repair:roadmap-2:drive` liste la file et peut finaliser une opération dont le résultat Google a déjà été enregistré. Les erreurs durables masquent URL, email et secrets.

## Preuves indépendamment vérifiées

- `npm run smoke:roadmap-2:operations` : **PASS** — retry, replay, reprise après succès fournisseur et redaction.
- `npm run smoke:roadmap-2:drive` : **PASS**, mais avec fournisseur simulé.
- `npm run smoke:roadmap-2` : **PASS** — seed 65 nœuds / 110 relations et nettoyage.
- `npm run smoke:roadmap-2:a11y` : **PASS statique**, pas un test runtime du parcours connecté.
- TypeScript, ESLint ciblé et `prisma validate` : **PASS**. Le build final est également annoncé **PASS** dans la preuve Technical RL.
- Les 25 migrations se déploient sur un schéma temporaire isolé : **PASS** selon l'audit technique.
- `npm run repair:roadmap-2:drive --` sur la base active contrôlée : **FAIL**, table `public.Roadmap2DriveOperation` absente.
- `debug:roadmap-2:drive -- --workspace=le-bon-rebond` : fournisseur configuré, mais statut réel **`NOT_CONNECTED`**, aucune racine et aucune identité confirmée.
- Les captures `.run/roadmap2-*.png` restent les huit captures générales du 12 août. Elles montrent toujours Drive « À connecter » et ne prouvent ni registre, ni upload, ni aperçu, ni archive/restauration avec Google réel.

### Preuve Google réelle

**ABSENTE.** Aucun compte Google réel n'est connecté dans l'environnement contrôlé. Il n'existe donc aucune preuve E2E de connexion, identité, provisioning, upload, preview, permissions, révocation, reconnexion, archive ou restauration auprès du vrai fournisseur.

### Deux revues Dorian/Mathurin

**ABSENTES : 0/2.** Aucun compte rendu ne prouve deux revues hebdomadaires sur le seed réel, sans tableur parallèle, avec satisfaction de chacun au moins 4/5 et réduction du temps de préparation d'au moins 30 %.

## Blocages P0 restants

1. **Activer le registre sans risquer la base.** La base active ne contient que 1/25 migration enregistrée et ne contient pas `Roadmap2DriveOperation`. Il faut sauvegarde restaurable, clone représentatif, baseline documentée, déploiement du registre, second `migrate deploy` à vide et smoke DB réel incluant la sixième table/RLS.
2. **Prouver Google réel.** Exécuter sur un compte de test isolé : OAuth et identité, racine, ressources de nœud, upload et replay, preview, Office, permissions, archive/lecture seule/restauration, révocation et reconnexion, avec vérification des effets dans Drive et PostgreSQL.
3. **Fermer le contrat de reprise.** La CLI finalise les opérations `provider_succeeded`/`needs_repair`, mais ne rejoue pas une opération `retryable` côté fournisseur. Un rechargement de page perd aussi les clés stockées seulement dans des refs React. Il faut démontrer comment toute opération listée est reprise sans doublon après fermeture/rechargement, notamment pour un upload dont les octets ne sont pas persistés.
4. **Empêcher une divergence créée par l'édition ordinaire.** La sauvegarde d'un titre, d'une catégorie ou d'un parent appelle encore directement `updateRoadmap2Node`; la prévisualisation/réconciliation Drive reste une action séparée. Le préflight avant/après doit être obligatoire avant la mutation structurelle pour tenir la promesse d'absence d'ambiguïté Drive/PostgreSQL.
5. **Obtenir l'acceptation réelle.** Réaliser les deux revues avec Dorian et Mathurin et atteindre les seuils du goal. Sans cela, la valeur et la rétention restent des hypothèses.

## P1 adoption restant

- Ajouter au seed une date d'ancrage et une attribution en masse par phase.
- Limiter la vue initiale à la racine et aux sept phases, avec expansion progressive.
- Ajouter des presets « revue hebdomadaire », « décisions » et « échéances proches », puis mémoriser vue et filtres.
- Corriger les KPI pour éviter le double comptage et afficher leur formule.
- Exécuter Axe runtime, clavier, zoom 200 %, mobile 390 px, tablette et desktop avec cibles tactiles de 44 px.
- Présenter une file de réparation compréhensible à l'opérateur ou, au minimum, afficher l'identifiant d'opération et la consigne de reprise lorsqu'une intervention est requise.

## Forces et frictions

### Trois forces

1. Le lot traite un vrai risque de confiance plutôt qu'un simple embellissement d'interface.
2. L'idempotence est pensée à la fois côté application et côté fournisseur simulé.
3. L'archive/restauration et les audits partagent désormais un mécanisme cohérent et récupérable.

### Trois frictions bloquantes

1. Le code dépend d'une table absente de la base active.
2. Aucune preuve Google réelle ne confirme les contrats simulés.
3. Aucune preuve d'usage ne montre que deux personnes peuvent abandonner leur tableur et tenir une revue hebdomadaire rapide.

## Pertinence du goal

Le goal de relance est **pertinent, bien cadré et doit rester actif**. Il met dans le bon ordre intégrité de production, adoption, puis preuve réelle. Il évite de déclarer PASS un produit dont les smokes locaux sont bons mais dont la base, le fournisseur et l'usage réel ne sont pas encore alignés.

Recommandation : conserver le goal, mettre à jour son avancement pour qualifier le registre comme **« code + simulation PASS, déploiement actif absent »**, et ne le clôturer qu'après baseline/registre actif, Google E2E, critères d'adoption et deux revues. Selon l'`AGENTS.md`, la Definition of Done exige deux verdicts PASS ; le Technical RL est encore PARTIAL global et le présent verdict Business Client Mystère est PARTIAL.

---

## Addendum de contre-audit — 2026-08-13

### Verdict actualisé

**PARTIAL maintenu — 3,4/5. Definition of Done non atteinte.**

Le nouveau lot ferme réellement plusieurs défauts du chemin principal et réduit le risque technique de la future mise en production. Il ne ferme pas encore tous les chemins UI capables de modifier la hiérarchie, ni la barrière de déploiement sur la cible. Google réel et les deux revues restent absents.

### P0 effectivement fermés dans ce lot

1. **Procédure de baseline prouvée sur clone représentatif : FERMÉE SUR CLONE.** Le rehearsal a copié 44 tables et 413 lignes, recréé les contraintes, baseliné 23 migrations historiques, déployé les 2 nouvelles migrations, obtenu un second déploiement vide et un fingerprint strictement identique. L'incertitude sur la faisabilité de la procédure est levée. Cela ne signifie pas que la cible est déjà baselinée.
2. **Perte des clés à un simple rechargement : FERMÉE POUR LES ACTIONS UI COUVERTES.** Provisioning, ressources de nœud, upload, permissions, archive et restauration utilisent désormais une clé localStorage réutilisée après reload et supprimée seulement après succès. Le smoke `smoke:roadmap-2:operation-keys` passe.
3. **Modification structurelle depuis le formulaire de détail sans préflight : FERMÉE SUR CE PARCOURS.** Un changement de titre, catégorie ou parent d'un nœud lié à Drive déclenche un aperçu serveur, affiche clairement « Avant / Après », précise qu'aucun fichier ne sera supprimé et demande une confirmation. Le jeton HMAC est lié au workspace, au nœud, à la version et au hash complet du brouillon, puis expire après dix minutes.
4. **Panne entre réconciliation Drive et écriture métier : FERMÉE POUR L'OPÉRATION `update_node_structure`.** Drive est réconcilié avant la transaction métier ; le résultat fournisseur est durable et la finalisation du nœud peut être rejouée par le runner ou par la CLI sans répéter la mutation Drive. Le repository reconnaît aussi une finalisation déjà auditée.

Les relances indépendantes de `smoke:roadmap-2:operation-keys`, `smoke:roadmap-2:structural-preflight`, `smoke:roadmap-2:operations` et `smoke:roadmap-2` sont **PASS**.

### Vérification de la promesse client dans l'UI

#### Chemin qui tient la promesse

Dans le panneau de détail, le flux est cohérent et compréhensible :

1. l'utilisateur modifie titre, catégorie ou parent ;
2. l'enregistrement détecte le changement structurel uniquement si un dossier Drive est lié ;
3. Roadmap 2 calcule le chemin actuel et le chemin proposé sans mutation ;
4. une confirmation native montre les deux chemins et annonce qu'aucun fichier ne sera supprimé ;
5. après confirmation, le serveur revérifie le jeton, la version et le brouillon ;
6. Drive est réorganisé, puis PostgreSQL est finalisé dans l'opération durable ;
7. en cas d'échec local après succès Drive, la finalisation reste réparable.

Ce parcours répond désormais à la promesse « pas de divergence silencieuse » et constitue un gain de confiance réel pour Dorian et Mathurin.

#### Chemins qui contournent encore la promesse

Le produit expose aussi la hiérarchie dans « Dépendances et contribution ». L'utilisateur peut choisir `Parent / enfant`, créer la relation puis la supprimer. Ces deux chemins appellent encore directement `createRoadmap2Edge` / `deleteRoadmap2Edge` :

- la création `parent_child` remplace le parent, recalcule la catégorie et met à jour les descendants en PostgreSQL ;
- la suppression détache le nœud en mettant `parentId=null` ;
- aucun de ces chemins ne demande l'aperçu Drive signé ;
- aucun ne passe par `update_node_structure` ni ne réconcilie Drive.

Le graphe ne crée que des dépendances et n'est pas concerné par ce défaut, mais le constructeur de relations du détail suffit à conserver un contournement utilisateur réel. La règle « tout changement de parent exige un préflight » n'est donc pas encore vraie à l'échelle du produit.

### Réserve sur la promesse « localStorage sans PII »

Les valeurs localStorage ne contiennent qu'un UUID et une date, et les emails de permissions sont résumés dans un scope non réversible : c'est correct. En revanche, le **nom de la clé** d'un upload contient actuellement `file.name`, ainsi que taille et date de modification, via `roadmap2UploadOperationScope`. Un nom comme `CV_Jean-Dupont.pdf` ou `dossier_medical.pdf` reste donc lisible dans localStorage.

Le smoke actuel vérifie les valeurs et les emails, mais ne persiste pas un scope d'upload puis n'inspecte pas les noms de clés. De plus, « sept jours » est une durée maximale de réutilisation lors d'un nouvel accès ; aucune purge globale ne retire spontanément les anciennes entrées non revisitées. La formulation « sans PII, conservé sept jours » est donc trop forte dans l'état actuel.

### P0 encore ouverts

1. **Cible active non baselinée.** Le rehearsal ferme le risque de méthode, pas l'activation. Il reste à obtenir une sauvegarde restaurable, appliquer la procédure contrôlée à la cible, vérifier 25/25 migrations, second deploy vide, fingerprint et smokes incluant le registre/RLS.
2. **Contournement du préflight par les relations parent/enfant.** Toute création ou suppression `parent_child` doit être redirigée vers le même aperçu signé et la même opération durable, ou être interdite dans le constructeur de relations lorsque le nœud possède un dossier Drive.
3. **Preuve Google réelle absente.** OAuth, identité, provisioning, upload/replay, preview, permissions, structure, archive/restauration et révocation/reconnexion restent à prouver sur le fournisseur réel.
4. **Acceptation réelle absente.** Deux revues avec Dorian et Mathurin sont toujours nécessaires ; preuve actuelle : **0/2**.

### Risques P1 restants

- Hacher ou pseudonymiser le scope d'upload avant de construire le nom de clé localStorage, puis ajouter un nettoyage des entrées expirées et un smoke inspectant **clés et valeurs**.
- Remplacer `window.confirm` par un dialogue produit accessible avec résumé du changement, statut d'exécution et consigne explicite si une réparation est requise.
- Rendre visible à l'opérateur l'identifiant d'une opération en réparation et la prochaine action, sans exposer de donnée privée.
- Terminer l'adoption : seed ancré, assignation en masse, racine + sept phases, presets, KPI expliqués et filtres mémorisés.
- Exécuter Axe runtime, clavier, zoom 200 %, mobile 390 px et cibles tactiles de 44 px sur le parcours connecté.

### Décision sur le goal

Le goal reste **pertinent et non clôturable**. Son lot d'intégrité a franchi une étape substantielle : baseline reproductible sur clone, clés survivant au reload et chemin structurel principal récupérable. La prochaine séquence recommandée est :

1. fermer le contournement `parent_child` et la fuite potentielle de nom de fichier dans localStorage ;
2. baseliner puis activer le registre sur la cible avec sauvegarde et preuves ;
3. livrer l'onboarding et la vue progressive ;
4. exécuter le Google E2E réel et l'accessibilité runtime ;
5. réaliser les deux revues et mesurer adoption, satisfaction et temps gagné.

Le verdict ne peut devenir **PASS** qu'après ces preuves, conformément à la Definition of Done à deux agents.

---

## Addendum final de recontre-audit du lot corrigé — 2026-08-13

### Verdict courant

**PASS BUSINESS LOCAL — 4,3/5 sur le lot recontrôlé.**
**PARTIAL PRODUIT GLOBAL — Definition of Done non atteinte ; restent Google réel et les deux revues utilisateurs.**

Les deux réserves techniques du précédent addendum sont fermées, le lot d'adoption est présent et la cible PostgreSQL de production est désormais migrée et vérifiée. Le parcours est assez clair, sûr et directement exploitable pour justifier un PASS Business sur ce périmètre. Ce PASS ne vaut toujours ni validation du fournisseur Google réel, ni preuve d'adoption par les deux utilisateurs attendus.

| Critère local du lot | Score | Constat |
| --- | ---: | --- |
| Clarté | **4,6/5** | L'initialisation explicite l'origine du modèle, la date d'ancrage et les responsables ; la formule des KPI est consultable. |
| Parcours principal | **4,3/5** | La vue démarre à huit éléments, s'ouvre phase par phase et propose quatre raccourcis de revue. Les mutations génériques de hiérarchie ne contournent plus le parcours structurel. |
| Valeur perçue | **4,4/5** | Le produit passe d'un graphe dense à un cockpit de revue actionnable, avec décisions, urgences, échéances et préférences mémorisées. |
| Confiance | **4,3/5** | Les liens `parent_child` sont protégés, les scopes locaux ne révèlent plus directement noms de fichiers ou emails, et les responsables sont autorisés côté serveur. |
| Conversion / adoption locale | **4,0/5** | La friction de première prise en main est nettement réduite. La conversion réelle reste à mesurer lors des deux revues. |
| **Score local** | **4,3/5** | **Paierait pour un pilote local contrôlé.** |

### 1. Création et suppression `parent_child` : PASS local

- **Interface : PASS.** `parent_child` n'est plus proposé dans le constructeur de relations. Un lien structurel existant n'affiche plus de bouton de suppression et renvoie vers le champ « Parent ».
- **Server Action : PASS fonctionnel.** La création est refusée explicitement par `createRoadmap2Edge`. La suppression appelée par `deleteRoadmap2Edge` retourne également un échec, le garde-fou étant centralisé dans le repository.
- **Repository : PASS.** `createEdge` refuse toute création `parent_child` générique et `deleteEdge` refuse la suppression d'un lien structurel existant. La création et la modification légitimes restent prises en charge par les mutations de nœud, avec le préflight structurel prévu.
- **Preuve : PASS.** Le smoke principal crée un vrai lien parent/enfant via le parcours nœud, puis vérifie que sa création et sa suppression génériques lèvent bien une erreur de validation. Le smoke de préflight signé reste PASS.

La promesse client devient cohérente sur les chemins UI disponibles : un utilisateur ne peut plus modifier silencieusement la hiérarchie depuis le bloc de relations.

### 2. Scope d'upload, inspection du stockage et purge : PASS local

- Le scope persistant d'un upload contient désormais un résumé stable calculé à partir du nœud, du nom, de la taille et de la date du fichier ; le nom brut n'apparaît plus dans la clé localStorage.
- Les scopes de permissions restent indépendants de l'ordre et de la casse, sans email brut dans la clé.
- Les valeurs persistées contiennent seulement la clé d'opération et sa date de création.
- Toute lecture/création d'une opération déclenche un balayage de toutes les entrées Roadmap 2 et supprime les entrées expirées, invalides ou illisibles, même lorsqu'elles appartiennent à un autre workspace ou scope.
- Le smoke inspecte maintenant **les noms de clés et les valeurs**, persiste un upload au nom explicite, vérifie l'absence du nom et des emails, puis prouve la purge globale d'une entrée expirée.

Qualification précise : les scopes sont **pseudonymisés**, pas anonymisés cryptographiquement. La purge est déclenchée au prochain accès à Roadmap 2 et non par une minuterie lorsque l'application est fermée. Ces deux nuances n'empêchent pas le PASS du besoin local vérifié.

### 3. Onboarding du seed : PASS local

- L'état vide demande une date d'ancrage et un responsable pour chacune des sept phases avant d'activer l'initialisation.
- Le calendrier des 65 nœuds est recalculé depuis cette date ; le smoke DB confirme que la racine porte exactement l'ancre fournie.
- Le serveur valide la forme du setup, exige une attribution pour chaque catégorie et refuse tout identifiant qui n'est ni l'acteur, ni un administrateur plateforme autorisé.
- Les sept phases et leurs descendants reçoivent le responsable de leur catégorie ; la racine reste attribuée à l'acteur qui initialise.
- Le seed demeure non rejouable sur un workspace déjà renseigné.
- Le contrat est désormais strict jusque dans le repository : un appel sans setup est refusé par une erreur de validation. Il n'existe plus de date ou d'affectation implicite hors interface. Le smoke DB vérifie explicitement ce refus et repasse **PASS**.

### 4. Vue progressive, presets, préférences et KPI : PASS local

- **Vue initiale :** racine + sept phases, soit **8 éléments** sur le seed standard de 65 nœuds.
- **Expansion :** chaque phase peut être ouverte ou repliée séparément pour révéler son premier niveau de livrables sans saturer le graphe initial.
- **Quatre presets :** « Vue d'ensemble », « Revue hebdomadaire », « Décisions » et « Échéances à 7 jours ». Le preset hebdomadaire rassemble les éléments bloqués, en revue, P0, avec décision requise ou échéance proche.
- **Persistance :** vue Graphe/Timeline/Liste, filtres, preset et phases développées sont enregistrés par workspace puis restaurés après rechargement.
- **KPI :** les agrégats utilisent uniquement les livrables feuilles actifs ; racine et phases sont exclues. La base de calcul est affichée et la progression globale est explicitée comme moyenne simple.

Ce lot répond directement aux deux objections d'adoption antérieures : surcharge cognitive au premier affichage et manque de rituel de revue. La preuve actuelle reste locale et automatisée ; elle ne remplace pas l'observation de Dorian et Mathurin en situation réelle.

### Preuves relancées indépendamment

| Commande | Résultat du 13 août 2026 |
| --- | --- |
| `npm run smoke:roadmap-2:operation-keys` | **PASS** — persistance reload, absence de PII brute inspectée dans clés/valeurs, purge globale des expirées |
| `npm run smoke:roadmap-2:adoption` | **PASS** — 8 éléments initiaux, 4 presets, préférences, ancre, responsables et KPI feuilles |
| `npm run smoke:roadmap-2:structural-preflight` | **PASS** — signature, expiration et liaison au brouillon |
| `npm run smoke:roadmap-2` | **PASS** — repository/DB, refus générique `parent_child`, setup seed obligatoire, seed 65/110, ancre et responsables, isolation et nettoyage |
| `npm run smoke:roadmap-2:a11y:runtime` | **PASS authentifié** — Axe critique/sérieuse 0 ; 1440, 768 et 390 px sans débordement ; clavier, reflow 200 % et cibles Roadmap 2 d'au moins 44 px |
| Cible PostgreSQL VPS | **PASS production** — dump frais restauré en répétition, 3 migrations déployées, second deploy vide, puis production portée de 22/25 à 25/25 avec 46 tables et 66 nœuds conservés |

Le smoke d'adoption vérifie le seed et les contrats de code. Il est désormais complété par un test navigateur authentifié sur les trois formats d'écran, le clavier, le reflow et les cibles tactiles : **accessibilité runtime générale PASS**. Cette preuve ne couvre pas les états spécifiques d'un compte Google réellement connecté, qui restent dans le blocage fournisseur ci-dessous.

### État des dépendances externes

1. **Cible active : FERMÉ SUR POSTGRESQL VPS.** La vraie cible de production était à 22/25 migrations. Un dump frais et restaurable a été créé, restauré dans une base temporaire, puis les trois migrations restantes y ont été appliquées avec un second deploy vide. La même séquence a porté la production `public` à **25/25 migrations, 46 tables et 66 nœuds Roadmap 2 conservés**. Le registre est présent et vide, ses politiques RLS sont actives, le conteneur PostgreSQL est healthy et le health applicatif confirme une DB disponible. La base Supabase à 1/25 est un environnement de développement dérivé, pas la cible de production.
2. **Google réel : OUVERT.** Le statut contrôlé reste `NOT_CONNECTED`. Il manque le parcours E2E avec un compte isolé : identité, racine, provisioning, upload/replay, aperçu, permissions, changement structurel, archive/restauration, révocation et reconnexion.
3. **Revues Dorian/Mathurin : OUVERT — 0/2.** Il faut encore deux revues sans tableur parallèle, satisfaction de chacun au moins 4/5 et mesure du gain de préparation visé.

**Réserve d'exploitation séparée, non bloquante pour la migration Roadmap 2 :** le backup global atomique DB + Supabase Storage ne peut pas publier un nouvel artefact complet, car l'inventaire Storage retourne HTTP 402. Le dump PostgreSQL utilisé pour la migration est restaurable et vérifié ; le quota ou contrat Storage doit néanmoins être corrigé pour rétablir la sauvegarde globale quotidienne.

### Décision Business Client Mystère

- **Lot corrigé local : PASS.** Les quatre corrections demandées sont présentes, cohérentes avec la promesse client et couvertes par des preuves CLI repassées indépendamment.
- **Cible PostgreSQL de production : PASS.** La barrière de migration et de conservation des données est levée ; Supabase 1/25 ne doit plus être présenté comme la cible active.
- **Achat pilote : OUI** sur le socle de production désormais migré, sous réserve de ne pas vendre encore le parcours Google comme validé.
- **Déploiement/achat complet : sous deux conditions.** Prouver Google réel et réussir les deux revues Dorian/Mathurin. La réserve de backup Storage doit être suivie en exploitation, mais ne réouvre pas la migration PostgreSQL Roadmap 2.
- **Definition of Done globale : PARTIAL.** Le passage à PASS global exige encore Google E2E réel et les deux revues utilisateurs, puis les verdicts finaux Technical RL et Business Client Mystère.
