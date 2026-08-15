# Sources du registre Orchestration

Ce dossier contient le seed V0 du registre local utilisé par le prototype Orchestration : `guadeloupe-ecosystem.seed.json`.

## Résultat de l'audit

- 47 noms d'acteurs candidats ont été conservés.
- 47 sur 47 portent `verification_status = needs_verification`.
- 18 territoires sont renseignés uniquement parce qu'ils figurent littéralement dans le nom fourni; 29 restent inconnus.
- Aucun SIRET, identifiant interne, contact, adresse, bassin d'emploi, capacité, service, opportunité, coût ou financement n'a été confirmé ou ajouté.
- Aucun élément métier du registre ne peut donc être qualifié de « Vérifié » à ce stade. Les seules informations techniquement vérifiées sont la présence des trois classeurs, leurs cellules lues et leurs empreintes SHA-256.

## Sources trouvées

### `financement/excel/Cofinancements_Partenaires_AAP.xlsx`

- Onglet lu : `Partenaires`, cellules `A1:E9`.
- Empreinte SHA-256 : `38C517963DCEA375CDF32EC4078B033B8B7A5F5CEB30640D6BEB113A1EF8F7AF`.
- Les lignes 2 et 3 nomment respectivement `Mission Locale` et `France Travail`.
- Le classeur parle de « rôle attendu » et de « preuve à obtenir ». Ces mentions sont conservées dans la provenance comme observations de planification, jamais comme capacités confirmées.
- Les lignes `Rectorat / MLDS / CIO`, `CFA`, `Conseil départemental`, `Communes / CCAS`, `Centres de formation` et `Entreprises` n'ont pas créé d'acteur : elles sont composites, génériques ou insuffisamment territorialisées.

### `financement/excel/Matrice_Prestations_Financeurs_Preuve.xlsx`

- Onglets lus : `Prestations financeurs` (`A1:H11`) et `Preuves financeur` (`A1:C9`).
- Empreinte SHA-256 : `60DDF18CC739B6A5BC1A9CDAC56C6ED0E395C901D7190FCB79C610AE4369D23B`.
- Le contenu décrit des catégories génériques de prestations, financeurs et preuves. Il n'identifie pas assez précisément des acteurs locaux et n'a produit ni capacité ni financement dans le seed.

### `financement/excel/Budgets_AAP_Le_Bon_Rebond.xlsx`

- Onglets lus : `Synthese`, `AAP1 Jeunes`, `AAP2 Decrochage`, `AAP3 AS RUP`.
- Empreinte SHA-256 : `CD3B8FF03F5FA0149D329EA97509F8D04F61FC450DDCA69008C09909461DB987`.
- Le contenu est un budget de projets. Aucun montant, coût, financement ou acteur n'a été importé dans le registre.

### Prompt utilisateur

Les sections `/local_ecosystem` et `<liste_acteurs_non_exhaustive>` ont fourni les autres noms candidats. La liste étant explicitement non exhaustive et à vérifier, elle ne vaut pas preuve d'identité légale, de présence territoriale, de partenariat ou de capacité.

## Sources demandées mais absentes du dépôt audité

- `LE_BON_REBOND_STRAT*.xlsx`;
- `Support_BMO26_v5.pdf`;
- tout CSV ou TSV d'acteurs locaux;
- tout PDF d'acteurs locaux;
- toute pièce exploitable nommée ACTEURS, ENTREPRISES, CFA, PARTENAIRES, PRESCRIPTEURS, OPPORTUNITES ou EMPLOITON.

Les fichiers applicatifs dont le nom contient `centres` (pages HTML/TSX) ont été repérés mais ne constituent pas des pièces de registre et n'ont pas été importés.

## Déduplication

Le seed applique l'ordre demandé : SIRET, identifiant interne, puis nom normalisé + territoire avec revue explicite. Aucun rapprochement flou n'est automatique.

Trois répétitions textuelles ont été regroupées et documentées dans `deduplication_policy.merges_performed` : Région Guadeloupe, UMIH Guadeloupe et AKTO. Les rapprochements suivants restent volontairement en attente de validation :

- Mission Locale / Mission Locale Guadeloupe;
- France Travail / France Travail Guadeloupe & Îles du Nord;
- PLIE / PLIE Cap Excellence;
- GEIQ Guadeloupe / GEIQ Archipel Guadeloupe;
- UMIH 971 / UMIH Guadeloupe;
- ADMR / ADMR de Guadeloupe.

## Données restant à vérifier

Pour chaque acteur : raison sociale exacte, SIRET, type d'acteur, implantation et bassin d'emploi, adresse, contacts, capacités, offres de service, éligibilité, prérequis, livrables, SLA, capacité disponible, coûts, règles de partage, statut actif réel, date et responsable de vérification.

Les libellés ambigus (`CARL`, `Sygma`, `RSMA`, `Conseil Départemental (DSIA)`, `Office de tourisme de la Rivviera du levant`, notamment) doivent être désambiguïsés avant toute utilisation opérationnelle.

## Règle d'utilisation du prototype

Le seed est un registre de pistes, pas une preuve de partenariat. Tant qu'un acteur ne dispose pas d'une source probante et d'une validation humaine datée, l'interface doit afficher « À vérifier » et le Pathway Engine ne doit pas présenter ses capacités, services, disponibilités ou financements comme confirmés.
