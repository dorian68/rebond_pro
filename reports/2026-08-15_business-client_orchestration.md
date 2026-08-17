# Audit Business Client Mystère — Orchestration des parcours

Date : 2026-08-15  
Personas : coordinateur CIP Emploi’Ton et acheteur institutionnel.  
Périmètre : prototype admin `/admin/orchestration`, scénario synthétique Sarah, registre Guadeloupe, parcours, orientations, coûts et sorties.  
Preuves examinées : implémentation finale, seed et note de provenance, smoke métier 15/15, smoke sources 11/11 et six captures dans `.run/orchestration-captures`. Aucun test E2E n’a été lancé.

## Verdict

**PASS pour une démonstration et un pilote encadré — 4,6/5 (91/100).**

En moins de 30 secondes, un coordinateur comprend ce que le produit orchestre, voit les urgences, identifie Sarah et sait ouvrir son parcours. Le prototype matérialise réellement la différence entre un annuaire de partenaires et un moteur de parcours : état participant + objectif + besoins + acteurs + étapes + boucle de retour + coûts + maintien de la sortie.

**NO-GO pour une mise en production ou un achat SaaS autonome en l’état.** Les mutations restent dans le navigateur et les orientations sont simulées. Le snapshot conserve les 47 pistes initiales et expose désormais 27 identités officielles, 56 claims de capacité, 22 rôles documentés, 18 services et 7 opportunités canoniques. Les trois anciennes offres sont fermées ; les quatre offres ouvertes restent à rafraîchir sous 24 heures. Capacité courante, places, partenariat, éligibilité et décision restent à confirmer. Un acheteur institutionnel paierait donc pour un pilote/co-design instrumenté, pas encore pour un déploiement opérationnel multi-acteurs.

## Test des 30 premières secondes

Résultat : **PASS**.

- Le titre, le sous-titre et la formule du Pathway Engine expliquent immédiatement la promesse.
- Les mentions « Démo synthétique · aucune donnée réelle » et « aucune action réellement envoyée » fixent une frontière de confiance très claire.
- La barre de pilotage et « À traiter maintenant » donnent un point de départ opérationnel, sans empilement de grosses cartes génériques.
- Le CTA « Ouvrir le parcours de Sarah » rend le prochain geste évident.
- Les six vues attendues sont visibles sans concurrencer Roadmap et Roadmap 2.

## Grille Client Mystère du dépôt — 0 à 5

| Critère | Score | Lecture client |
| --- | ---: | --- |
| Clarté de la promesse | 4,8/5 | Le produit et sa différence sont compris immédiatement. |
| Parcours principal | 4,5/5 | Sarah, le graphe, l’orientation, le Plan B, les coûts et la sortie forment un parcours cohérent ; quelques écrans restent denses. |
| Valeur perçue | 4,8/5 | Le cockpit répond à un vrai problème de coordination, de preuve et de relance. |
| Confiance | 4,8/5 | Synthétique, sourcé, inconnu et vérifié sont distingués ; aucun coût absent n’est affiché à 0 €. |
| Conversion / adoption | 4,0/5 | Le pilote donne envie d’être essayé ; la production attend données qualifiées, persistance et intégrations. |
| **Moyenne** | **4,6/5** | **Paierait pour un pilote encadré.** |

## Grille de readiness historique — 0 à 100

| Dimension | Score |
| --- | ---: |
| First 30-second clarity | 96/100 |
| Business value | 95/100 |
| Trust and credibility | 95/100 |
| UX simplicity | 86/100 |
| Feature depth | 93/100 |
| Promise alignment | 96/100 |
| Commercial readiness | 72/100 |
| Retention potential | 75/100 |
| **Overall customer readiness pour un pilote** | **89/100** |

Les scores de readiness commerciale et de rétention sont volontairement plus bas : ils mesurent la capacité à utiliser le produit durablement, pas la qualité de la démonstration.

## Trois forces décisives

1. **Une différenciation produit immédiatement visible.** Le graphe montre des dépendances, du parallélisme et une branche Plan B ; il ne se réduit ni à une fiche bénéficiaire ni à une liste de partenaires.
2. **Une confiance rarement aussi explicite dans un prototype.** Le produit distingue une assertion officielle vérifiée d'une capacité opérationnelle encore inconnue, maintient les acteurs de scénario comme synthétiques, ne transforme jamais une absence de donnée en conclusion négative et conserve le coût inconnu comme « Non renseigné ». BMO reste un contexte de marché, un dispositif reste distinct d'une allocation et une offre volatile reste à rafraîchir.
3. **Un workflow réellement actionnable.** La validation remonte les responsables, échéances et preuves manquants ; l’orientation expose son cycle de réponse ; le refus exige un motif ; le Plan B s’active séparément ; chaque suivi J+7/J+30/J+60/J+90 exige date et preuve.

## Parcours Sarah — lecture métier

- Le Passeport donne la situation, la source, les Plans A/B, quatre compétences confirmées et l’anglais à combler sans confondre compétence déclarée et compétence confirmée.
- La comparaison métier est courte et explicable : 4 compétences confirmées sur 5 requises, sans score opaque ni décision automatique.
- Le studio à trois colonnes conserve le contexte participant, le graphe et le pilotage dans le même regard.
- Les 15 étapes du Plan A et la branche Plan B sont identifiables par type, texte, statut et iconographie ; zoom et minimap compensent une densité élevée.
- La checklist empêche de faire passer le brouillon pour un parcours prêt : la capture annonce honnêtement 15 points à corriger.
- La boucle d’orientation rend visibles l’envoi, l’accusé de réception, l’acceptation, l’exécution, le refus motivé et la relance.
- Le ledger sépare correctement coût prévu, coût réel, financeur, demandé, accordé, payé et reste à financer.
- La sortie ne peut pas être activée sans acteur, date et preuve ; les quatre jalons de maintien ont chacun leur propre preuve.

## Contrôle visuel des six livrables

| Capture | Verdict |
| --- | --- |
| Vue d’ensemble | PASS — hiérarchie forte, inbox lisible, démonstration explicitement bornée. |
| Passeport Sarah | PASS — objectif, gap et niveau de preuve se lisent vite ; le bas du Passeport demande un défilement interne peu signalé. |
| Parcours Plan A/B | PASS — excellent effet « studio d’orchestration » ; certains libellés de nœuds sont petits à l’échelle globale. |
| Écosystème local | PASS — registre prudent, filtres nombreux et carte compréhensible ; la donnée encore non qualifiée limite volontairement sa richesse. |
| Fiche acteur | PASS — le formulaire de vérification exige une preuve distincte, un responsable et une date. |
| Coûts & financements | PASS — les trois notions sont clairement séparées et `Non renseigné` est omniprésent ; quelques champs de tableau tronquent leur libellé. |

## Frictions P1 du prototype

- Modifier le libellé de l’objectif crée bien une nouvelle version à revoir, mais ne relance pas encore le moteur ni ne marque visuellement chaque étape devenue potentiellement obsolète.
- Le graphe complet et le ledger sont denses : certains textes de nœuds et libellés de champs sont petits ou tronqués. Une vue guidée par sous-parcours et des largeurs de colonnes adaptatives faciliteraient la prise en main.
- Le Passeport et la fiche acteur utilisent un défilement interne dont la présence pourrait être davantage signalée.
- L’enregistrement local est quasi immédiat alors que certaines microcopies suggèrent encore une action explicite de conservation ; il faut choisir une convention unique « enregistré automatiquement » ou « enregistrer ».

## Bloquants P0 avant production

1. **Qualifier le registre local au niveau opérationnel.** Les 47 pistes du seed initial restent `needs_verification`. Les nouvelles sources officielles confirment des assertions précises mais ni capacité courante, ni contact opérationnel, ni SLA, ni partenariat, ni éligibilité individuelle. Le corpus ne permet donc pas encore un matching activable sans contrôle humain.
2. **Remplacer le stockage navigateur par une persistance serveur auditée.** Il faut tenant/workspace, contrôle d’accès objet, journal des versions, concurrence multi-utilisateur, sauvegarde et restauration.
3. **Fermer la vraie boucle multi-acteurs.** Les referrals, relances et réponses doivent être reliés à un canal traçable ou à un Partner Portal ; aucune simulation locale ne doit être confondue avec une prise en charge réelle.
4. **Appliquer les vues minimisées côté serveur.** Les aperçus employeur/CFA/prescripteur démontrent le principe, mais consentements, finalités, révocation, exports et accès doivent être opposables et audités.
5. **Passer les gates de production différés.** E2E ciblé, accessibilité clavier/zoom/lecteur d’écran, tests de sécurité/IDOR/XSS, charge, restauration, observabilité et recette multi-personas.

## Données restant à vérifier

- 47 organisations candidates dans le seed initial : aucune capacité opérationnelle, disponibilité, opportunité ou relation partenariale confirmée par ce seed. Le registre officiel séparé qualifie certains faits documentaires, sans modifier cette limite.
- Territoire : 18 valeurs seulement déduites littéralement des noms, 29 non renseignées.
- Files de rapprochement manuel : Mission Locale, France Travail, PLIE, GEIQ, UMIH et ADMR ; aucune fusion silencieuse ne doit être faite.
- Noms ambigus ou incomplets, notamment CARL, Sygma, RSMA, Conseil Départemental/DSIA et Office de tourisme de la Riviera du Levant.
- Acteur mobilité effectivement disponible, centre/CFA admissible, employeur accueillant, places, capacités, disponibilités, financements accordés et coûts du scénario Sarah.
- Les deux acteurs ajoutés pour raconter la démonstration restent explicitement synthétiques et ne constituent pas des partenaires confirmés.

## Verdict d’achat par persona

### Coordinateur CIP

**Paierait pour utiliser le pilote.** Le produit remplace plusieurs suivis dispersés par un cockpit unique, impose owner/échéance/preuve et rend les blocages actionnables. Condition d’adoption : limiter la première vue à son portefeuille et guider progressivement la correction des points manquants.

### Acheteur institutionnel

**Financerait un pilote ou un co-design, mais ne signerait pas encore un déploiement de production.** La promesse, la traçabilité et le potentiel de reporting coût/résultat sont convaincants. L’achat récurrent exige toutefois un registre qualifié, une persistance opposable, une boucle partenaire réelle et des preuves d’usage sur une cohorte.

### Partenaire externe

**Non évaluable comme acheteur/utilisateur final à ce stade.** Le portail partenaire est volontairement hors périmètre ; les aperçus de partage démontrent seulement la minimisation attendue.

## Backlog recommandé

### P0 — passage pilote vers production

- Workflow de qualification des acteurs et doublons, avec source, preuve, responsable, date et renouvellement de vérification.
- Repository PostgreSQL/Supabase additif, versionnement, audit trail, tenant/RLS et reprise après incident.
- Partner Portal minimal : réception, accusé de réception, acceptation/refus motivé, feedback et dépôt de preuve.
- Consentements complets et politiques de vue appliquées côté serveur.
- Notifications et relances traçables, avec SLA, idempotence, journal et préférences.
- Recette sécurité, accessibilité et E2E ciblée avant toute donnée réelle.

### P1 — valeur du pilote

- Recalcul explicable du Pathway Engine lors d’un changement d’objectif, avec diff entre versions et conservation de l’ancienne proposition.
- Invitations à compléter le registre par besoin non couvert, sans suggérer qu’aucune solution n’existe.
- Documents de preuve attachés aux étapes, orientations, financements, sorties et suivis.
- Reporting financeur : coût connu, couverture, reste, preuves, résultat et maintien.
- Mode de lecture progressive du graphe par besoin, phase ou branche ; amélioration des champs tronqués du ledger.

### P2 — montée en puissance

- Intégrations France Travail, KAIROS, DORA et Immersion Facilitée après cadrage contractuel et sécurité.
- Assistance IA avancée uniquement comme suggestion explicable, sourcée, avec inconnues et validation humaine.
- Analytics de coûts, délais, handoffs, blocages, sorties et maintien J+90.
- Mesures de performance partenaires internes et contextualisées, sans classement public opaque.
- Cohortes et programmes supplémentaires utilisant le même moteur canonique.

## Gate de validation recommandé

Faire tester le prototype à au moins trois CIP et un acheteur sur un scénario chronométré : comprendre la promesse en 30 secondes, retrouver le blocage mobilité, corriger les points de validation, simuler une orientation puis un refus, activer le Plan B, saisir un coût inconnu puis connu, enregistrer une sortie et J+90. Le passage production exige ensuite une cohorte réelle complète sans tableur parallèle et avec consentements, preuves et boucles partenaires audités.

## Itération enrichissement écosystème — 2026-08-15

### Verdict de l’itération

**Score Client Mystère : 4,6/5 (91/100).**

**VERDICT FINAL DU LOT PROTOTYPE : PASS.** Ce PASS est le verdict Business Client Mystère attendu par `AGENTS.md` pour le périmètre démonstrateur et pilote encadré. Il ne transforme pas le prototype en produit de production et ne vaut pas autorisation de mobiliser réellement un partenaire.

- **Verdict démo : PASS.** Le produit montre désormais de façon crédible comment passer d’un besoin de Sarah à des pistes locales classées, sourcées et expliquées.
- **Verdict pilote encadré de qualification et de pré-orientation : PASS.** Un CIP peut s’en servir avec bénéfice pour rechercher, comparer et instruire des solutions, à condition que toute mobilisation reste validée humainement et confirmée hors outil.
- **Verdict pilote opérationnel multi-acteurs : FAIL.** Le prototype ne permet pas encore de mobiliser réellement une place, une aide, une offre ou un partenaire, et aucune boucle externe n’est opposable.

Le verdict d’achat reste donc : **paierait pour un pilote encadré**, avec un lot explicite de qualification terrain ; **ne signerait pas encore un abonnement de production autonome**.

### Méthode et preuve examinée

Cette contre-évaluation a relu les documents obligatoires, inspecté le registre enrichi, le moteur de classement, l’adaptateur UI et les composants des vues Parcours, Écosystème et Référentiel. Un diagnostic local en lecture seule du modèle rendu a été utilisé pour mesurer la couverture. Aucun E2E n’a été lancé et aucun code produit n’a été modifié.

Les six captures régénérées dans le worktree à 05:01 ont été contrôlées. Elles constituent bien la preuve visuelle de cette itération : la vue d’ensemble affiche le socle de sources, le parcours montre les solutions classées et le garde-fou « 0 mobilisable », la carte privilégie les identités vérifiées, la fiche Mission Locale expose rôles/entrées/sorties/claims et la vue financière présente les dix mécanismes hors ledger Sarah. Le rendu est cohérent, lisible et sans collision visible sur les six livrables. Le code et le modèle courants, contrôlés après ces captures, ajoutent sur chaque meilleure piste le CTA « Instruire la fiche acteur » et ramènent la piste CCI de 90 à 85/100 après ajout d’un contrôle linguistique humain ; la valeur 90 encore visible dans la capture n’est donc plus la valeur courante. Les deux réserves visuelles restantes sont la longueur de la fiche acteur, qui exige un défilement important, et la forte densité de la vue des dix financements.

### Grille Client Mystère — enrichissement local

| Critère | Score | Lecture client |
| --- | ---: | --- |
| Clarté de la promesse | 4,7/5 | « Mobilisable », « À instruire », « Référentiel seulement » et « Exclu » expliquent immédiatement ce qui peut ou non être fait. |
| Parcours principal | 4,5/5 | Le besoin débouche sur une piste, ses inconnues et un CTA d’instruction vers la fiche acteur, sans auto-affectation. |
| Valeur perçue | 4,8/5 | Pour un CIP, les rôles, entrées, sorties attendues, services et financements remplacent utilement un annuaire sans mode d’emploi. |
| Confiance | 4,8/5 | Le score est présenté comme qualité de preuve et mobilisabilité, jamais comme probabilité de réussite ; les inconnues bloquent l’auto-affectation. |
| Conversion / adoption | 4,0/5 | Le pilote est vendable, mais la valeur récurrente dépend encore de la qualification des disponibilités et de la vraie boucle partenaire. |
| **Moyenne** | **4,6/5** | **PASS du lot prototype, de la démo et du pilote encadré.** |

### Ce que l’enrichissement change réellement

Le modèle rendu expose désormais :

- 49 sources, dont 43 fraîches et 6 à vérifier ; trois familles de sources locales attendues restent explicitement absentes ;
- 58 acteurs locaux non synthétiques dans l’interface, dont 27 identités vérifiées et 31 encore à vérifier ; la carte compte 60 acteurs avec les deux acteurs de démonstration ;
- 22 acteurs avec un rôle de parcours documenté et 15 reliés à au moins un service concret ;
- 18 offres de service vérifiées et 10 mécanismes de financement ;
- 7 opportunités canoniques : 3 fermées et 4 ouvertes, toutes encore `NEEDS_VERIFICATION` ; les quatre sources d’offres ouvertes sont soumises à une revue sous 24 heures, et la huitième ligne visible dans la démonstration est la PMSMP synthétique de Sarah.

La couverture est donc beaucoup plus crédible qu’un simple catalogue. La fiche acteur explique le rôle dans le parcours, les entrées requises, les sorties attendues et les notes de mobilisation. La vue Services relie chaque offre à un besoin, un acteur, des règles d’éligibilité, des prérequis, une sortie attendue, une source et des réserves.

Le classement est utile et prudent. Pour Sarah, le cours d’anglais CCI arrive désormais à 85/100, à égalité avec le RSMA : l’évaluation préalable du niveau et des besoins est un contrôle humain explicite, et la proposition de parcours linguistique adaptée devient le livrable attendu. Mobil’Izy et le transport régional restent à 85/100 sur la mobilité. Le texte précise que le score classe les preuves et la mobilisabilité, sans prédire la réussite. Les pistes sans offre concrète restent au niveau « Référentiel seulement » et aucune piste « À instruire » n’est auto-affectée. Le CTA « Instruire la fiche acteur » ferme la rupture principale entre recommandation et examen humain : il ouvre la fiche du candidat choisi, tout en laissant au CIP la décision et les contrôles. Une source acteur, capacité ou service arrivée à échéance empêche maintenant tout statut `ACTIVATABLE` et force un rafraîchissement.

### Trois forces décisives

1. **Les acteurs ont enfin un mode d’emploi.** Les rôles, entrées et sorties transforment une identité institutionnelle en maillon compréhensible du parcours. Un CIP sait pourquoi contacter l’acteur et ce qu’il doit obtenir en retour.
2. **Le classement est explicable sans devenir une promesse algorithmique.** Une capacité documentaire seule ne suffit plus ; une offre exacte, vérifiée, fraîche et territorialement compatible est recherchée, puis les inconnues, prérequis et règles dures déterminent le niveau de préparation.
3. **La prudence augmente la confiance commerciale.** Les anciennes offres France Travail en 404 sont fermées et nommées comme archivées, les quatre offres ouvertes ont une échéance de revue à 24 heures, une source échue interdit `ACTIVATABLE`, les dates RSMA non prouvées ont disparu, les coûts absents restent inconnus et la validation CIP demeure obligatoire.

### Frictions prioritaires après le PASS prototype

1. **P2 — L’instruction n’est pas encore une tâche suivie.** Le CTA ouvre désormais directement la bonne fiche acteur et lève la rupture de navigation. Il ne crée toutefois pas encore une tâche de vérification assignée et datée, une demande de disponibilité ou un brouillon d’orientation ; ce chaînage sera utile pour un pilote opérationnel.
2. **Garde-fou volontaire — Zéro solution est actuellement mobilisable.** Les 18 services sont tous `QUALIFIED_WITH_CHECKS` parce que capacité acteur et places sont inconnues et que le calendrier manque presque partout. Ce 0/18 est le comportement correct du prototype, pas un échec : il empêche une fausse promesse, y compris lorsqu’une source dépasse sa date de revue. Il devient une condition de passage au pilote opérationnel, qui devra organiser la collecte datée de disponibilité, contact, délai, coût, fraîcheur et preuve de confirmation.
3. **P1 avant pilote opérationnel — Les opportunités ouvertes ne sont pas encore actionnables.** Les quatre offres ouvertes restent à vérifier, sans échéance de candidature ni nombre de places ; leurs sources sont toutefois correctement classées volatiles et devront être revues dès le 16 août 2026 à 12:00. Le besoin « Expérience métier à confirmer » de Sarah ne trouve aucun acteur `HOST_IMMERSION`. Avec le filtre vérifié par défaut, aucune opportunité réelle ne peut donc alimenter le parcours.
4. **P1 — Le statut d’opportunité est présent dans le modèle mais absent du tableau.** Les lignes n’affichent pas explicitement `OPEN`/`CLOSED`, la date de contrôle ou l’échéance. Les titres « archivée » limitent le risque pour les trois anciennes offres, mais ce n’est pas un contrôle UX généralisable.
5. **P1 — Le socle source reste incomplet, mais l’interface le signale correctement.** La capture montre 43/49 sources fraîches et une alerte jaune listant trois familles de fichiers attendues mais absentes. Ce n’est plus une friction de transparence ; c’est un backlog de données à fermer ou à déroger explicitement avant production.
6. **P1 — La densité du registre augmente plus vite que sa couverture opérationnelle.** Sur 58 acteurs locaux, 22 ont un rôle documenté et 15 un service concret. La transparence des compteurs est bonne, mais la vue par défaut devrait favoriser les acteurs reliés au besoin courant, puis les pistes documentaires, pour éviter l’effet annuaire.
7. **P2 — Deux vues restent longues.** La fiche acteur documentée nécessite un défilement important pour parcourir tous les claims et la vue des dix mécanismes est très dense sur un seul écran. Des ancres de section et un mode condensé faciliteraient l’usage quotidien, sans bloquer la démonstration.

### Verdict d’achat actualisé

**Coordinateur CIP : achète le pilote.** Le produit lui fait gagner un temps réel de qualification et réduit le risque de confondre « acteur connu » et « solution disponible ». Le CTA d’instruction rend la prochaine étape immédiate ; sa condition de montée en charge est désormais une file de vérifications assignées et datées.

**Acheteur institutionnel : finance un pilote encadré.** Les rôles territoriaux, la provenance et la discipline sur les inconnues sont suffisamment différenciants pour tester le produit avec une équipe CIP. Il demandera comme critères de sortie du pilote : un noyau d’acteurs avec disponibilité datée, un taux de besoins couverts par une offre concrète, un délai moyen de qualification, des orientations réellement tracées et une preuve de résultat.

**Acheteur production : refuse en l’état.** La persistance navigateur, l’absence de boucle partenaire réelle, l’absence de solution mobilisable et la couverture opérationnelle incomplète empêchent encore un engagement SaaS de production.

## Contre-évaluation Client Mystère — import BMO 2026 exhaustif

### Verdict

**PASS pour la démonstration et le pilote encadré.** Les trois défauts de confiance constatés au premier passage ont été corrigés.

| Critère | Score | Seuil |
| --- | ---: | ---: |
| Clarté | **4,6/5** | 4,5 |
| Confiance | **4,8/5** | 4,7 |
| Adoption | **4,2/5** | 4,0 |
| Global | **4,5/5** | 4,4 |

### Parcours contrôlé

- Les 180 familles BMO sont représentées dans un sélecteur de cible référencé par `occupationId`; l’objectif n’est plus un texte libre dissocié du moteur.
- Le recalcul vers `A1X41 — Jardiniers des espaces verts et naturels` remplace les anciens écarts et étapes métier, retire orientations et coûts, conserve le frein mobilité transversal et remet le parcours en validation humaine.
- La statistique est présentée comme borne basse `≥ 320` avec 4/5 bassins, jamais comme un total exact.
- Les 25 métiers entièrement masqués affichent « Non calculable », sont exclus des tranches numériques et disposent d’un filtre dédié.
- Aucun signal BMO ne devient une opportunité, une place ou une promesse d’activabilité.
- Le bouton Réinitialiser restaure recherche, filtres, sélection et pagination.

Preuves visuelles : `07-bmo-2026.png`, `08-selecteur-metiers-bmo.png` et `09-parcours-cible-bmo-recalculee.png`.

### Limites non bloquantes

- Remplacer la microcopie `+ 0 cellule masquée` par `1 bassin sans ligne publiée` lorsqu’un bassin est absent.
- Remplacer à terme le sélecteur natif par une recherche groupée par famille.
- Soumettre la conservation du type transversal générique `OTHER` à une confirmation humaine explicite.
- Ajouter un smoke dédié à la remise à zéro des orientations et coûts lors d’un changement de cible ; le comportement est actuellement vérifié par lecture du code et capture courte.

**Definition of Done Business : PASS pour le prototype. NO-GO production autonome inchangé.**
