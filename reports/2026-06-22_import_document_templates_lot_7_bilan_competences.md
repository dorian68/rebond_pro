# Import Templates — Lot 7 Bilan de Compétences

## Source
`C:\Users\Labry\Downloads\templates_bilan_competences_lot_7\templates_bilan_competences_lot_7`

## Imported templates
- Convention / contrat bilan
- Feuille de route bénéficiaire
- Phase préliminaire
- Phase investigation
- Phase conclusion
- Synthèse bilan de compétences
- Plan d'action 3-6 mois
- Restitution Ikigai
- Cartographie compétences
- Autorisation partage dossier
- Dossier numérique exportable

## Import result
- Created: 11
- Updated: 0
- Missing: 0
- Final count: 11
- Active: 11
- Defaults: 11
- Variables detected: 163
- Unknown variables: 0
- Storage: Supabase verified with `template_synthese_bilan.docx` read successfully, 39,037 bytes.

## Backend changes
- Added precise document types for bilan de compétences templates.
- Added bilan, Ikigai, sharing and dossier numérique variables to the registry.
- Added catalog metadata: contexts `beneficiary`, `bilan`, `ikigai`, `sharing`, and learner scope.
- Added manifest `manifest_lot_7_bilan_competences.json`.

## Validation
- `npx prisma generate`: PASS
- `npx prisma validate`: PASS
- `npx tsc --noEmit`: PASS
- targeted eslint: PASS
- `npm run smoke:documents-engine`: PASS
- `npm run smoke:connectors`: PASS
- `npm run build`: PASS
