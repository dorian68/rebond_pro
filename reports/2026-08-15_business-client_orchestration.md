# Audit Business Client Mystère — Orchestration des parcours

Date : 2026-08-15  
Personas : coordinateur CIP Emploi’Ton et acheteur institutionnel.  
Périmètre : prototype admin `/admin/orchestration`, scénario synthétique Sarah, registre Guadeloupe, parcours, orientations, coûts et sorties.  
Preuves examinées : implémentation finale, seed et note de provenance, smoke métier 13/13, six captures dans `.run/orchestration-captures`. Aucun test E2E n’a été lancé.

## Verdict

**PASS pour une démonstration et un pilote encadré — 4,5/5 (89/100).**

En moins de 30 secondes, un coordinateur comprend ce que le produit orchestre, voit les urgences, identifie Sarah et sait ouvrir son parcours. Le prototype matérialise réellement la différence entre un annuaire de partenaires et un moteur de parcours : état participant + objectif + besoins + acteurs + étapes + boucle de retour + coûts + maintien de la sortie.

**NO-GO pour une mise en production ou un achat SaaS autonome en l’état.** Les mutations restent dans le navigateur et les orientations sont simulées. Le snapshot conserve les 47 pistes initiales, enrichit douze acteurs avec 26 capacités précisément sourcées et expose trois services ; ses trois offres restent explicitement `UNKNOWN` et à rafraîchir. Capacité courante, disponibilité, places, partenariat, éligibilité et décision restent à confirmer. Un acheteur institutionnel paierait donc pour un pilote/co-design instrumenté, pas encore pour un déploiement opérationnel multi-acteurs.

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
| Parcours principal | 4,3/5 | Sarah, le graphe, l’orientation, le Plan B, les coûts et la sortie forment un parcours cohérent ; quelques écrans restent denses. |
| Valeur perçue | 4,7/5 | Le cockpit répond à un vrai problème de coordination, de preuve et de relance. |
| Confiance | 4,8/5 | Synthétique, sourcé, inconnu et vérifié sont distingués ; aucun coût absent n’est affiché à 0 €. |
| Conversion / adoption | 4,0/5 | Le pilote donne envie d’être essayé ; la production attend données qualifiées, persistance et intégrations. |
| **Moyenne** | **4,5/5** | **Paierait pour un pilote encadré.** |

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
