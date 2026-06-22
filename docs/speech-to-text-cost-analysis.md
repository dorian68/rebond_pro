# Analyse coût et faisabilité - Speech-to-text Socrate

Date : 2026-06-22

## Objectif

Ajouter la voix à Socrate sans faire exploser les coûts IA. Le principe produit reste : la voix assiste, transcrit et préremplit ; elle ne déclenche pas seule une action sensible.

Source pricing à revalider avant mise en production commerciale : page officielle OpenAI Pricing, section Audio / speech-to-text et Realtime.

## Architecture de coût

Le coût réel dépend de cinq variables :

- minutes audio transcrites par utilisateur ;
- nombre d'appels de synthèse/extraction après transcription ;
- conservation ou non du verbatim ;
- usage ponctuel ou session live continue ;
- modèle choisi pour transcription, extraction et réponse Socrate.

Formule simple :

```text
coût session = coût transcription audio + coût extraction structurée + coût réponse Socrate + stockage éventuel
```

Pour maîtriser la marge, ne jamais envoyer tout l'audio à un gros modèle conversationnel en continu si une transcription spécialisée suffit.

## Phase 1 - Dictée simple dans Socrate

Expérience :

- bouton micro dans Socrate ;
- l'utilisateur parle ;
- l'audio est transcrit ;
- le texte remplit le champ de discussion ;
- Socrate répond ensuite comme aujourd'hui.

Technique :

- capture micro navigateur ;
- upload court au backend ;
- speech-to-text ;
- insertion du transcript dans le message Socrate ;
- pas de streaming nécessaire.

Coût :

- faible à modéré ;
- proportionnel aux minutes audio ;
- contrôlable par limite de durée, par exemple 60 à 180 secondes par message.

Garde-fous :

- quota mensuel par plan ;
- durée max par enregistrement ;
- compression audio ;
- suppression du fichier audio après transcription ;
- stockage du transcript uniquement si utile au dossier.

Verdict :

Priorité haute. C'est le meilleur ratio impact / complexité / coût.

## Phase 2 - Entretien guidé avec transcription structurée

Expérience :

- Socrate pose une question ;
- le bénéficiaire répond vocalement ;
- le système extrait des éléments métier : compétences, contraintes, valeurs, pistes ;
- le dossier se préremplit mais reste validé par l'admin.

Technique :

- speech-to-text ;
- extraction structurée par fonction ;
- résumé incrémental ;
- écriture brouillon dans les notes du parcours ;
- validation humaine avant statut final.

Coût :

- coût audio + coût d'extraction texte ;
- nettement moins cher qu'une conversation vocale continue ;
- le transcript brut peut être résumé puis archivé ou supprimé.

Garde-fous :

- extraction par blocs ;
- pas de renvoi de tout l'historique à chaque tour ;
- contexte Socrate limité aux synthèses validées ;
- journal d'audit : `voice.transcribed`, `voice.extracted`, `bilan.prefill.proposed`.

Verdict :

Priorité très haute pour le bilan de compétences. C'est là que la voix crée le plus de valeur.

## Phase 3 - Transcription live

Expérience :

- l'utilisateur parle ;
- les mots apparaissent en temps réel ;
- le conseiller peut interrompre, corriger et valider.

Technique :

- Realtime / WebRTC ou WebSocket ;
- transcription partielle ;
- consolidation finale ;
- extraction structurée à la fin de chaque séquence, pas à chaque token.

Coût :

- plus élevé que la dictée simple ;
- sensible au temps de session ouvert ;
- nécessite timeouts stricts et arrêt automatique en silence.

Garde-fous :

- session max, par exemple 10 à 20 minutes ;
- activation uniquement dans les plans payants ;
- indicateur visible "micro actif" ;
- consentement explicite ;
- pas de conservation audio par défaut.

Verdict :

Intéressant après validation usage. À réserver à l'admin et aux bénéficiaires premium.

## Phase 4 - Conversation vocale complète avec Socrate

Expérience :

- dialogue oral fluide ;
- Socrate parle et écoute ;
- interruptions naturelles ;
- mode entretien complet.

Technique :

- Realtime audio in/out ;
- voix synthétique ;
- orchestration outils Socrate ;
- garde human-in-the-loop pour toute action réelle.

Coût :

- le plus élevé ;
- dépend du temps de conversation audio en entrée et en sortie ;
- risque de coût dormant si une session reste ouverte.

Garde-fous :

- feature payante ;
- compteur minutes visible ;
- arrêt automatique ;
- plafond par dossier ;
- pas d'actions sensibles sans validation ;
- logs sans audio brut ni secrets.

Verdict :

À traiter comme fonctionnalité premium. Elle peut devenir différenciante, mais pas comme première étape.

## Recommandation produit

Ordre recommandé :

1. Phase 1 : dictée simple dans Socrate.
2. Phase 2 : entretien guidé qui préremplit le dossier bilan.
3. Phase 3 : transcription live pour les rendez-vous admin.
4. Phase 4 : conversation vocale complète Socrate, uniquement premium.

## Modèle économique suggéré

- Gratuit / Free : pas de voix ou essai très court.
- Pro : dictée simple avec quota mensuel.
- Premium : entretien guidé + transcription live limitée.
- Option add-on : packs de minutes voix.

Ne pas vendre la voix comme gadget. La vendre comme réduction de charge administrative : moins de saisie, meilleure synthèse, dossier plus complet.

## Risques

P0 :

- confidentialité des données personnelles et professionnelles ;
- consentement explicite avant micro ;
- conservation audio à désactiver par défaut.

P1 :

- qualité de transcription en environnement bruyant ;
- accents, noms propres, métiers locaux ;
- coût incontrôlé si session live sans timeout.

P2 :

- UX trop magique : l'utilisateur doit comprendre ce qui a été capté, extrait et validé.

## Critères d'acceptation avant production

- La voix ne peut pas déclencher une mutation sensible seule.
- Le transcript est visible et modifiable avant validation.
- L'audio brut n'est pas stocké par défaut.
- Les quotas sont appliqués côté serveur.
- Les coûts sont observables par utilisateur et par organisation.
- Les logs ne contiennent ni secret, ni token, ni fichier audio brut.
- Un smoke test CLI vérifie au moins le pipeline mocké : audio fixture -> transcript -> extraction -> brouillon dossier.
