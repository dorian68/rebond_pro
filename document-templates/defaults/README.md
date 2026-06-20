# Modèles documentaires par défaut

Déposez ici les fichiers `.docx` fournis par la plateforme.

Le fichier `manifest.json` associe chaque fichier à un type de document :

```json
[
  {
    "type": "CONVOCATION",
    "name": "Convocation standard",
    "file": "convocation-standard.docx",
    "description": "Modèle fourni par la plateforme",
    "isDefault": true
  }
]
```

Variables attendues dans les DOCX : `{org_name}`, `{formation_title}`, `{session_date_range}`, `{learner_name}`, etc.

Le script `npm run import:document-templates` crée ou met à jour les modèles globaux avec `organizationId = null`. Il ignore proprement les fichiers absents pour permettre de versionner le manifest avant l'ajout des vrais DOCX.
