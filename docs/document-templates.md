# Module Documents

La rubrique Documents fonctionne comme une usine documentaire souple :

1. Le CRM construit un contexte à partir du centre, de la formation, de la session, des apprenants, du formateur et de la salle.
2. Un modèle est choisi selon la priorité : modèle choisi manuellement, modèle par défaut du centre, modèle global plateforme, PDF intégré.
3. Un préflight calcule les variables remplies, manquantes et inconnues.
4. La génération reste possible même si des données manquent.
5. Les données manquantes sont rendues avec un placeholder lisible, par exemple `[À compléter : Numéro NDA]`.

## Créer un modèle DOCX

Dans Word ou LibreOffice, insérez des variables entre accolades :

```text
{org_name}
{org_legal_name}
{org_nda}
{formation_title}
{session_date_range}
{trainer_name}
{learner_name}
{amountText}
{generatedAt}
```

Les variables reconnues sont centralisées dans `src/lib/document-variables.ts`.

## Import par un centre

Un administrateur du centre va dans `Paramètres > Modèles de documents`, choisit le type, nomme le modèle, importe un `.docx`, puis peut le définir comme modèle par défaut.

Le produit affiche :

- les variables détectées ;
- les variables reconnues par le CRM ;
- les variables inconnues ;
- si le modèle est plateforme ou centre ;
- s'il est actif, archivé ou par défaut.

## Bibliothèque globale plateforme

Les modèles globaux sont décrits dans `document-templates/defaults/manifest.json`.

Commande :

```bash
npm run import:document-templates
```

Le script ne plante pas si les fichiers DOCX ne sont pas encore présents. Il affiche un résumé des modèles créés, mis à jour ou ignorés.

## Variables manquantes

La stratégie par défaut est `readable_placeholder`.

Exemple :

```text
{funding_organization}
```

devient :

```text
[À compléter : Financeur]
```

Les documents gardent en base :

- `completionStatus` : `COMPLETE`, `PARTIAL`, `DRAFT` ;
- `completionScore` ;
- `missingVariables` ;
- `generationContextSnapshot` ;
- `manualOverrides`.
