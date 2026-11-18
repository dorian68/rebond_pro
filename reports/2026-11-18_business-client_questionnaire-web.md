# Business Client Mystère Report

## Périmètre

Questionnaire Le Bon Rebond V2, réponses persistées et espace de consultation/statistiques pour le propriétaire de la plateforme. Branche isolée `feat/questionnaire-rebond`, base déclarée `1ea433e`. La proposition documentaire approuvée est le fichier `outputs/questionnaire_le_bon_rebond_2026-11-18/questionnaire.json` dans le dossier parent.

Rôle de cette revue : vérifier l'expérience du répondant puis celle de l'opérateur. Aucun code applicatif, déploiement, envoi ou modification de données réelles par cet agent. Les futurs essais utilisent des fixtures isolées identifiables.

Documents lus : `AGENTS.md`, `AGENT_BUSINESS_CLIENT_MYSTERE.md`, `PRODUCT_PHILOSOPHY.md`, spécification fonctionnelle et état de production du nouveau workspace. Skill appliqué : `C:/Users/Labry/.codex/skills/b2b-product-design/SKILL.md` et grille de production associée.

## Critères d'acceptation business

| Parcours | Comportement observable attendu |
|---|---|
| Accéder au questionnaire | URL directe utilisable ; aucune nouvelle entrée dans la barre de navigation publique ; titre et finalité compris sans connaître les prestations |
| Répondre | Les douze questions et les réponses V2 approuvées sont disponibles ; affichage lisible sur mobile et opérable au clavier ; facultatif reste réellement facultatif |
| Choisir plusieurs réponses | Limites et options exclusives explicites ; aucun choix présélectionné ; erreur compréhensible sans effacement |
| Revenir en arrière | Réponses conservées entre écrans ; aucune impression d'enregistrement final prématuré |
| Choisir un projet mixte | La priorité unique ne ferme pas la possibilité emploi salarié et création ; compétences, confiance et compréhension du marché restent des besoins distincts |
| Demander un échange | Téléphone seul ou email seul selon le choix ; absence de rappel permet de terminer sans coordonnée ; pas d'inscription marketing ni email automatique |
| Terminer | Confirmation seulement après persistance réelle ; aucune promesse d'embauche, de financement ou de prestation entrepreneuriale disponible |
| Récupérer d'un échec | Contexte et saisie conservés pour réessayer ; pas de faux succès et pas de double réponse causée par le nouvel essai |
| Consulter comme administrateur | Accès protégé ; détail fidèle aux réponses, y compris abstention et absence de contact ; date et éventuel état de suivi compréhensibles ; rafraîchissement conserve l'objet |
| Lire les statistiques | Compteurs issus des réponses persistées ; périmètre et dénominateurs compréhensibles ; choix multiples et non-réponses n'engendrent pas de fausse répartition ; chargement/erreur/aucune réponse distincts |
| Protéger les réponses | Notice propre à cette collecte, entité actuelle du service, finalité/base/destinataires/durée cohérents ; accès limité ; conservation de six mois appliquée et vérifiable par le lead technique |

## Scénarios à vérifier

1. Répondant sans demande de rappel, âge et commune laissés vides.
2. Répondant demandant un appel, projet salarié avec besoin d'appui à une activité indépendante.
3. Répondant demandant un email, projet encore indécis et freins réservés à l'échange.
4. Retour à un écran précédent et correction d'un choix exclusif ; erreur de validation puis reprise.
5. Échec de soumission contrôlé dans l'environnement isolé, nouvelle tentative et constat de la réponse créée une seule fois.
6. Consultation admin du même objet ; comparaison des compteurs et distributions aux fixtures ; rafraîchissement et accès anonyme refusé.

## Revue effective du 18 novembre 2026

Revue exécutée contre `http://localhost:3105/questionnaire` et `/admin/questionnaires`, dans la base locale isolée du lead technique. Navigateur Chromium headless via Playwright. Session admin synthétique fournie par le lead, sans exposer ses identifiants. Les captures desktop, mobile, liste admin, détail et statistiques sous `.run/questionnaire` ont été inspectées.

Le parcours public a été exécuté avec une largeur mobile de 390 pixels. La revue admin utilise une largeur de 1365 pixels et un navigateur configuré sur Asia/Tokyo : l'interface garde son repère explicite d'heures de Guadeloupe. Cette configuration ne vaut pas une certification exhaustive de tous les cas horaires.

### Parcours public observé

- Continuer sans répondre produit des erreurs locales. La personne peut les corriger sans recommencer.
- Les deux choix maximum sont appliqués. Le choix exclusif d'incertitude remplace les domaines sélectionnés, puis un domaine remplace cette incertitude.
- Le retour à l'écran précédent conserve les choix et le texte libre. Le cas salarié avec idée d'activité complémentaire est représentable.
- Les freins et l'âge ont été laissés vides ; la commune a été remplie. Le parcours permet d'avancer.
- Les changements téléphone, email et sans rappel montrent uniquement les champs utiles. Sans demande d'échange, le bouton final devient « Terminer » et aucune coordonnée n'est exigée.
- Un numéro trop court produit une erreur. Un défaut de message résiduel au passage téléphone vers email a été reproduit puis corrigé par le lead. Le retest constate zéro message de validation téléphonique dans le mode email.
- Une panne HTTP 503 simulée au moment de l'envoi n'affiche pas de succès et conserve le téléphone saisi. La nouvelle tentative affiche la confirmation d'enregistrement ; une seule nouvelle réponse est visible dans l'espace admin.

Le contenu public parle à la personne concernée : envies, projet, conditions pour avancer et échange. Aucun commentaire destiné au fondateur, jargon d'implémentation ou instruction de conception n'a été relevé dans ce parcours. Les possibilités de prise en charge restent conditionnelles ; le formulaire ne promet aucune embauche ni prestation entrepreneuriale garantie.

### Parcours opérateur observé

- La nouvelle réponse est retrouvée dans la liste puis dans le détail. Le texte libre du projet mixte et les valeurs « Non renseigné » sont restitués ; téléphone et choix de rappel concordent.
- Le statut a été changé en « Traité », puis retrouvé après fermeture et rafraîchissement. Le filtre de statut restitue l'objet.
- L'onglet statistiques distingue développement des compétences et confiance. Les effectifs proviennent des réponses du filtre. L'explication des pourcentages parmi les répondants et des choix multiples supérieurs à 100 % est visible.
- Le lien d'export déclenche un téléchargement CSV réel. Le contenu filtré comprend la réponse de revue, les besoins exprimés et la date de suppression prévue.
- Le filtre sans demande d'échange restitue la fixture correspondante. Une date de début future donne un état sans résultat qui mentionne les filtres ; la réinitialisation retrouve les données.
- Une panne admin HTTP 503 simulée donne un état d'erreur distinct d'une absence de réponse. « Réessayer » retrouve les données persistées.
- Les requêtes anonymes vers la liste admin et le CSV sont refusées en 403. Le header public de l'accueil ne comporte pas de lien questionnaire. La politique de confidentialité rendue contient les dispositions propres à la collecte.

Deux réponses synthétiques nouvelles ont été créées successivement pour cette revue, puis supprimées uniquement par leur identifiant via l'API admin locale. Résultats de nettoyage : HTTP 200 pour chacune ; contrôle final à deux réponses, soit le nombre des fixtures initiales. Aucun enregistrement de production n'a été consulté ou modifié par cet agent.

### Correctif issu de la revue

**Surface :** dernier écran, choix du canal d'échange. **Reproduction initiale :** téléphone invalide « 123 », tentative d'envoi, choix email ; le message demandant un numéro valide persistait sous l'email. **Conséquence :** instruction contradictoire. **Correction réalisée par le lead :** effacement des erreurs de coordonnées au changement de Q12. **Retest : PASS**, absence du message téléphonique en mode email et parcours jusqu'à l'enregistrement réussi. Aucune autre friction bloquante reproduite après cette correction.

Certains essais de revue ont dû être repris avec des sélecteurs plus précis : un libellé exact de champ puis le double rôle `alert` du formulaire et de l'annonceur Next. Ces arrêts de script n'ont pas été assimilés à des bugs fonctionnels ; les scénarios correspondants ont ensuite été achevés.

## Valeur et jugement Client Mystère

Trois forces observées : le répondant garde le contrôle du rappel et des informations facultatives ; l'opérateur retrouve réellement la demande et son état ; les statistiques et l'export portent sur un périmètre commun explicite.

Trois limites de preuve, sans blocage local de la fonction : les quatre minutes restent estimées ; aucun bénéficiaire réel n'a été observé ; l'installation de la purge quotidienne et les vérifications de la release publique relèvent encore du déploiement effectué par le lead. Le script de purge et son installation sont documentés dans `DEPLOYMENT.md` ; leur existence n'est pas présentée comme une exécution de production constatée par cet agent.

| Critère du protocole Client Mystère | Jugement sur 5 |
|---|---:|
| Clarté de la promesse | 4,5 |
| Parcours principal | 4,5 |
| Valeur perçue par l'opérateur | 4,5 |
| Confiance | 4,5 |
| Prochaine action effective | 4,5 |
| Moyenne | 4,5 |

Ces notes sont un jugement expert issu des parcours ci-dessus, pas une mesure d'adoption, de conformité générale ou de gain commercial. Pour le répondant, la proposition est suffisamment claire pour poursuivre sans paiement. Pour l'opérateur, la collecte et son exploitation justifient un pilote encadré ; cette appréciation n'est pas une étude de disposition à payer ni une recommandation de prix.

## Verdict

**Business Client Mystère : PASS pour la fonctionnalité questionnaire V2, consultation et statistiques admin dans l'environnement local isolé, après correction du changement de canal.**

Aucun blocage business local restant identifié. Ce verdict porte sur la fonctionnalité testée, sans lever les réserves historiques du reste du site. La publication, la migration et l'installation de la purge sont sous responsabilité du lead technique ; aucune validation du déploiement public n'est revendiquée ici. Aucun email n'a été envoyé par cette revue.

## Réexamen après mise à jour du framework

Le lead a remplacé Next et sa configuration ESLint de la version 16.3.0 par 16.4.6 avant publication, sans changement annoncé du contenu ou des fonctions du questionnaire. Le navigateur local et le package réellement chargé ont été vérifiés à nouveau : `next/package.json` retourne **16.4.6**.

**Vérifications directes Business Client Mystère sur 16.4.6 :** rendu mobile à 390 pixels sans débordement horizontal ; inspection de la nouvelle capture `.run/questionnaire/public-mobile-next1646-business.png` ; progression sur les trois écrans ; freins et âge laissés facultatifs ; validation d'un téléphone invalide avec accord coché ; passage vers email sans message téléphonique résiduel ; passage sans rappel avec coordonnées masquées et bouton « Terminer » ; retour arrière avec choix conservés. Aucun POST vers `/api/questionnaire` n'a été effectué dans ce réexamen : aucune nouvelle donnée créée. La liste admin anonyme est toujours refusée en 403.

L'ancienne session admin synthétique est refusée en 403, les fixtures des répétitions techniques n'étant pas conservées. Ce contrôle n'est donc pas présenté comme une seconde revue admin authentifiée par cet agent. La revue complète admin détaillée plus haut reste la preuve business antérieure.

**Répétition technique rapportée par le lead sur 16.4.6 : PASS** du smoke UI/API complet, avec parcours public, panne et nouvelle tentative, détail admin, statut après rafraîchissement, statistiques, CSV, refus des accès anonyme et centre, mobile et Axe. Les fixtures de cette répétition ont été supprimées automatiquement. Ces résultats sont attribués au lead et ne sont pas assimilés à des observations directes de cet agent. L'image du candidat `06ac3e0` était encore en compilation lors de cette mise à jour du rapport.

**Verdict Business Client Mystère maintenu : PASS pour la fonctionnalité locale sur le périmètre décrit**, avec nouvelle vérification directe du public sur 16.4.6 et répétition technique complète des parcours privés par le lead. Aucun nouveau blocage business constaté. La production reste déclarée sur `1ea433e` à ce stade ; aucun déploiement VPS ni contrôle de la release publique n'est validé par ce réexamen.
