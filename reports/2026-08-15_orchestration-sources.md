# Rapport de sources — Orchestration Guadeloupe

Date de consultation : 2026-08-15  
Périmètre : prototype admin `Orchestration`, filière Hôtellerie–Tourisme–Vente–Services.  
Nature : qualification documentaire, sans appel externe, prise de contact, décision d'éligibilité ni allocation financière.

## Verdict documentaire

Le corpus officiel permet de confirmer l'identité et le rôle général de plusieurs acteurs publics, l'existence de mécanismes de formation ou de financement, quelques sessions datées, le référentiel ROME et des données BMO 2026. Il ne permet pas de confirmer la capacité disponible d'un acteur, une place de formation, l'éligibilité de Sarah, l'accord d'un financeur, l'accueil en PMSMP, une embauche ou le maintien d'une offre volatile.

Le statut `VERIFIED` porte donc sur une assertion précise et sourcée, jamais sur l'acteur entier. Toute information inconnue reste `null`. Une source officielle ne transforme pas un mécanisme en `FundingAllocation`, une intention BMO en `Opportunity`, ni un plafond d'aide en montant accordé.

Socle initial avant enrichissement : 26 sources, neuf signaux de marché, quatre mécanismes, trois scénarios internes, huit exigences de preuve, douze acteurs officiels portant 26 revendications de capacité sourcées, trois services et trois offres volatiles. Le snapshot conserve les 47 IDs candidats, ajoute seulement Mobil'Izy comme identité officielle distincte et maintient les deux acteurs de démonstration séparés.

## Itération enrichissement écosystème — 15 août 2026

L'état fusionné effectivement chargé par `source-registry.ts` réunit le socle et `guadeloupe-orchestration.enrichment.json`. Il expose désormais **49 sources**, **27 identités officielles**, **56 claims de capacité vérifiés visibles**, **22 identités avec au moins un rôle de parcours documenté**, **18 services**, **10 mécanismes de financement** et **7 opportunités**, dont **3 archivées** avec `status: CLOSED`.

- **Domaines couverts.** Prescription et emploi, formation/certification et langues, alternance, financement, mobilité, garde d'enfants, handicap/compensation, logement, insertion RSA et accompagnement des professionnels du tourisme. Les apports reposent notamment sur les pages directes de la [CCI IG](https://www.guadeloupe.cci.fr/produit/cours-de-langues-la-carte), du [GRETA-CFA](https://drafpic.site.ac-guadeloupe.fr/greta-cfa-de-la-guadeloupe/), du [GEIQ Guadeloupe](https://www.geiq-guadeloupe.fr/2025/05/12/vous-avez-18-ans-et-lenvie-davancer-le-geiq-transforme-votre-motivation-en-metier/), de [Cap emploi 971](https://www.capemploi-971.com/nos-missions/laccompagnement-vers-lemploi.html), du [Conseil départemental](https://www.cg971.fr/insertion-par-lemploi/) et du [CTIG](https://www.lesilesdeguadeloupe.com/espace-pro/). Ces sources prouvent des rôles ou dispositifs précis, jamais une prise en charge individuelle.
- **Fraîcheur testable.** Une source `VERIFIED` est `CURRENT` jusqu'à `checkedAt + reviewAfterDays`, puis `REVIEW_DUE` ; toute autre source reste `NEEDS_VERIFICATION`. Les fenêtres implémentées sont principalement de 1 jour pour les offres, 7 jours pour sessions/capacités locales, 30 jours pour aides et financements, 90 jours pour rôles institutionnels et 180 jours pour certaines identités stables.
- **Offres volatiles.** Les anciennes fiches [209WMFB](https://candidat.francetravail.fr/offres/recherche/detail/209WMFB), [210QCNL](https://candidat.francetravail.fr/offres/recherche/detail/210QCNL) et [211DFSX](https://candidat.francetravail.fr/offres/recherche/detail/211DFSX) renvoient HTTP 404 au contrôle du 15 août 2026 : elles sont conservées comme traces archivées, non mobilisables. Les fiches [211ZXWZ](https://candidat.francetravail.fr/offres/recherche/detail/211ZXWZ), [212LMKV](https://candidat.francetravail.fr/offres/recherche/detail/212LMKV), [212MPPZ](https://candidat.francetravail.fr/offres/recherche/detail/212MPPZ) et [212BSXW](https://candidat.francetravail.fr/offres/recherche/detail/212BSXW) sont matérialisées `OPEN`, mais restent `NEEDS_VERIFICATION` et à rafraîchir sous 24 heures.
- **Inconnues et exclusions.** Places réellement libres, capacité, admission, coût, décision de financement, éligibilité individuelle, entreprise d'accueil en alternance, hôte/convention PMSMP et partenariat opérationnel restent inconnus. Les parcours Outremer Academy « Serveur » et « Réceptionniste » ne sont pas intégrés tant que les conflits de codes RNCP publiés (`39354` au lieu de `39534`, `40991` au lieu de `38870`) ne sont pas résolus ; la piste UMIH Formation accessible seulement sur un hôte `dev-` reste également exclue. BMO et statistiques touristiques restent des signaux de marché, jamais des opportunités.

## Matrice des sources primaires

| Domaine | Source officielle directe | Date source | Assertion vérifiable | Statut proposé | Fraîcheur / limite |
| --- | --- | --- | --- | --- | --- |
| Prescripteur | [France Travail Guadeloupe & Îles du Nord](https://www.francetravail.org/regions/guadeloupe/france-travail.html) | non indiquée | Identité territoriale et mission générale de service public de l'emploi | `VERIFIED` | identité à revoir sous 180 jours ; capacités, SLA et décisions restent inconnus |
| Prescripteur | [Mission Locale de Guadeloupe](https://missionlocaleguadeloupe.fr/) et [services jeunes](https://missionlocaleguadeloupe.fr/jeunes) | non indiquée | Accompagnement des jeunes sur emploi, formation et autonomie ; immersion et alternance présentées parmi les services | `VERIFIED` | disponibilité, capacité et éligibilité individuelle à vérifier |
| Accompagnement | [PLIE Cap Excellence](https://capexcellence.net/vivre-habiter/social/plan-local-pour-linsertion-et-lemploi-plie/433-qu-est-ce-que-le-dispositif-plie) et [public concerné](https://www.capexcellence.net/vivre-habiter/social/plan-local-pour-linsertion-et-lemploi-plie/431-a-qui-s-adresse-t-il) | non indiquée | Accompagnement renforcé et ancrage territorial Cap Excellence | `VERIFIED` | entrée effective et critères participant à vérifier |
| Handicap | [Cap emploi 971 — Service-Public](https://lannuaire.service-public.gouv.fr/guadeloupe/guadeloupe/86499ebd-0508-424d-a74f-d9adee1719cd) | annuaire actuel | Accompagnement vers et dans l'emploi des personnes en situation de handicap ou concernées par la santé | `VERIFIED` | aucune orientation individuelle déduite |
| Financeur | [Chèque Qualification — Région Guadeloupe](https://www.regionguadeloupe.fr/fileadmin/Site_Region_Guadeloupe/Annonces_legales_et_deliberations/CP_25_202_MISE_A_JOUR_DU_CADRE_REGLEMENTAIRE_DU_DISPOSITIF_CHEQUE.pdf) | décision 2025-04-14, publication 2025-05-05 | Mécanisme prescrit par France Travail ou Mission Locale ; plafond régional de 5 500 €, durée maximale de 1 200 h, décision préalable et non automatique | `VERIFIED` | règles à revoir sous 30 jours ; plafond ≠ allocation Sarah |
| Financeur | [Aide à la Formation pour la Montée en Compétences](https://aides.regionguadeloupe.fr/afmc) | publication 2026-06-18 | Campagne annoncée du 2026-06-01 au 2026-10-31 pour certaines entrées 2026–2027 | `VERIFIED` | éligibilité, instruction et montant inconnus |
| Formation | [AIF France Travail](https://www.francetravail.fr/candidat/en-formation/mes-aides-financieres/laide-individuelle-a-la-formatio.html) | non indiquée | L'AIF peut couvrir tout ou partie d'un coût pédagogique résiduel après validation du conseiller | `VERIFIED` | aucun droit ni montant participant déduit |
| Formation avant embauche | [POEI France Travail](https://www.francetravail.fr/employeur/solution-recrutement/2024/poei-une-formation-sur-mesure-av.html) | page actuelle | Mécanisme lié à un candidat et un employeur identifiés lorsque des compétences manquent | `VERIFIED` | engagement employeur et décision de financement inconnus |
| Immersion | [PMSMP France Travail](https://www.francetravail.fr/candidat/votre-projet-professionnel/definir-votre-projet-professionn/realiser-une-immersion-professio.html) | non indiquée | Prescription possible notamment par France Travail, Mission Locale et Cap emploi ; convention requise | `VERIFIED` | aucune entreprise d'accueil ni convention Sarah confirmée |
| OPCO | [AKTO Guadeloupe](https://www.akto.fr/nous-contacter/entreprises/) | mise à jour 2026-02-17 | Implantation locale et rôle OPCO incluant le secteur hôtels-cafés-restaurants | `VERIFIED` | prise en charge particulière inconnue |
| Aide apprentis | [Accompagnement social des apprentis outre-mer — AKTO](https://www.akto.fr/laccompagnement-social-des-apprentis-en-outre-mer/) | mise à jour 2026-06-11 | Aide organisée via le CFA pour certains contrats actifs ; forfait publié de 500 € | `VERIFIED` | contrat actif et conditions nécessaires ; forfait ≠ allocation |
| Mobilité | [Mobil'Izy](https://mobilizy.org/) et [mentions légales](https://mobilizy.org/mentions-legales/) | mentions en vigueur 2024-12-02 | Location sociale automobile de moyenne durée en Guadeloupe pour certains parcours d'insertion | `VERIFIED` | prix, flotte, disponibilité et éligibilité Sarah inconnus |
| Alternance | [GEIQ Archipel Guadeloupe](https://www.geiq-guadeloupe.fr/) et [annuaire national des GEIQ](https://www.lesgeiq.fr/trouver-un-geiq/geiq-archipel-guadeloupe) | site actif en 2026 | Parcours d'insertion et de qualification par l'alternance ; secteur tourisme mentionné | `VERIFIED` | offre et capacité actuelles inconnues |
| Organisation sectorielle | [UMIH 97 Guadeloupe](https://www.umih.fr/le-reseau/structures/91/umih-97-la-guadeloupe.html) | non indiquée | Identité de l'organisation territoriale HCR | `VERIFIED` | aucun emploi, accueil ou partenariat déduit |
| Formation | [GRETA-CFA Guadeloupe](https://drafpic.site.ac-guadeloupe.fr/greta-cfa-de-la-guadeloupe/) | mise à jour 2025-12-18 | Identité et mission générale de formation continue et apprentissage | `VERIFIED` | session, places, coût et module anglais inconnus |
| Formation | [FORE — BTS Tourisme](https://www.fore.fr/apprentissage/bts-tourisme/) et [catalogue alternance 2026](https://www.fore.fr/apprentissage/wp-content/uploads/2026/04/FORE-971-FILIERES-ALTERNANCE-2026-2.pdf) | mise à jour 2026-04-10 | BTS Tourisme à Baie-Mahault, 1 300 h sur deux ans, Bac requis, anglais et relation client au programme | `VERIFIED` | rentrée, places, employeur et coût à confirmer sous 7 jours |
| Formation | [Vatel Guadeloupe — Bachelor](https://candidat.francetravail.fr/formations/detail/11749175/true/false/false/false) | session 2026-09-14–2029-07-14 | Session certifiante cataloguée à Baie-Mahault, Bac requis | `VERIFIED` | admission, places, coût et financement inconnus |
| Formation | [TP Réceptionniste — Académie des Métiers Saint-Martin](https://candidat.francetravail.fr/formations/detail/11942385/true/false/false/false) | session 2026-10-26–2027-10-11 | Titre professionnel de 420 h, en alternance/professionnalisation, avec prérequis linguistiques | `VERIFIED` | territoire Îles du Nord ; admission, places et employeur inconnus |
| Métier | [Jeu de données ROME](https://www.data.gouv.fr/datasets/repertoire-operationnel-des-metiers-et-des-emplois-rome) | mise à jour 2026-06-18 | Source canonique actuelle du ROME ; code/libellé G1703 « Réceptionniste » recoupé dans le rapport tourisme | `VERIFIED` | les détails d'une fiche 2021 ne doivent pas devenir canoniques sans ingestion du millésime actuel |
| Marché | [BMO 2026 interactif](https://statistiques.francetravail.org/bmo/bmo?fa=01&fg=IZ&lc=0&pp=2026&ss=1) et [Support BMO 2026](https://www.francetravail.org/files/live/sites/peorg-gua/files/documents/Statistiques%20%26%20Analyses/Support_BMO26_v5.pdf) | millésime 2026 | Hébergement-restauration : 1 994 projets exacts, arrondis à 2 000 dans l'outil ; 38,5 % difficiles et 59 % saisonniers | `VERIFIED` | contexte 2026 uniquement ; jamais une opportunité ou une place disponible |
| Contexte tourisme | [Chiffres clés du tourisme](https://www.francetravail.org/files/live/sites/peorg-gua/files/documents/Statistiques%20%26%20Analyses/Secteurs%20d%27activit%C3%A9/GUA%20-%20Les%20chiffres-cl%C3%A9s%20du%20Tourisme%20%28Janvier%202026%29.pdf) | janvier 2026 | 2 799 offres sur douze mois à fin novembre 2025 ; répartition contractuelle publiée | `VERIFIED` | statistique historique, pas un inventaire d'offres actives |
| Employeur | [La Créole Beach Hotel & Spa](https://www.creolebeach.com/) | non indiquée | Identité et localisation au Gosier | `VERIFIED` | recrutement, PMSMP et partenariat inconnus |
| Employeur | [La Toubana Hotel & Spa](https://www.toubana.com/hotel) | non indiquée | Identité et localisation à Sainte-Anne | `VERIFIED` | recrutement, PMSMP et partenariat inconnus |
| Employeur | [Club Med La Caravelle](https://www.clubmed.fr/r/la-caravelle/y) | page actuelle | Identité du resort de Sainte-Anne | `VERIFIED` | offre locale et partenariat inconnus |
| Opportunité archivée | [Offre 209WMFB — Réceptionniste](https://candidat.francetravail.fr/offres/recherche/detail/209WMFB) | contrôle 2026-08-15 | La fiche historique décrivait une mission à Terre-de-Haut ; l'URL renvoie désormais HTTP 404 | `CLOSED` | trace documentaire uniquement ; employeur final inconnu ; ne pas mobiliser |
| Opportunité archivée | [Offre 210QCNL — Conseiller vendeur en voyages](https://candidat.francetravail.fr/offres/recherche/detail/210QCNL) | contrôle 2026-08-15 | La fiche historique décrivait un CDD de six mois ; l'URL renvoie désormais HTTP 404 | `CLOSED` | trace documentaire uniquement ; ne pas mobiliser |
| Opportunité archivée | [Offre 211DFSX — Extra serveur](https://candidat.francetravail.fr/offres/recherche/detail/211DFSX) | contrôle 2026-08-15 | La fiche historique décrivait un contrat saisonnier au Gosier ; l'URL renvoie désormais HTTP 404 | `CLOSED` | trace documentaire uniquement ; ne pas mobiliser |

## Règles testables de provenance

1. Toute assertion `VERIFIED` possède une URL officielle directe et une date de consultation.
2. BMO et statistiques sectorielles ne sont jamais typées `Opportunity`.
3. Un mécanisme de financement n'instancie aucune allocation, demande, décision, approbation ou paiement.
4. Aucun montant réel ou approuvé n'est affecté au scénario Sarah à partir d'un plafond, d'un forfait ou d'un tarif indicatif.
5. Une offre volatile ouverte reste `NEEDS_VERIFICATION` pour son activation et porte une règle de rafraîchissement ; une fiche constatée HTTP 404 est `CLOSED` et non mobilisable.
6. Les identifiants du registre sont uniques ; la déduplication reste exacte et documentée, jamais floue.
7. Les valeurs inconnues sont `null`, jamais chaîne vide, zéro ou fait supposé.

## Données à vérifier avant usage opérationnel

- résidence, statut France Travail, niveau d'anglais, contraintes horaires, mobilité et consentements de Sarah ;
- disponibilité réelle des quatre offres ouvertes et résolution de la contradiction de type de contrat sur `212BSXW` ;
- places, admissions, employeurs, coûts et calendriers réels des formations ;
- capacité et prix Mobil'Izy ;
- accord d'accueil PMSMP par un employeur ;
- toute décision AIF, POEI, Région ou AKTO ;
- qualité de partenaire Emploi'Ton, SLA, contact opérationnel et capacité de chaque acteur.

## Portée du prototype

Cette qualification augmente la confiance documentaire et la démontrabilité du registre. Elle ne change pas le verdict de production : absence de repository PostgreSQL/RLS/audit raccordé, de boucle partenaire réelle, de consentements opposables et de validation opérationnelle des capacités.
