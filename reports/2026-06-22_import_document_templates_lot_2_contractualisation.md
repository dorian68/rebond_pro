# Import Templates — Lot 2 Contractualisation

## Source
`C:\Users\Labry\Downloads\templates_contractualisation_lot_2\templates_contractualisation_lot_2`

## Imported templates
- Convention de formation entreprise
- Contrat de formation particulier
- Devis formation
- Bon de commande
- CGV B2B
- CGV B2C
- Convocation apprenant
- Convocation formateur
- Livret d'accueil
- Règlement intérieur

## Backend changes
- Added precise `DocumentType` enum values for contractualisation templates.
- Added labels in `src/lib/document-types.ts`.
- Added missing variables in `src/lib/document-variables.ts`.
- Added manifest `manifest_lot_2_contractualisation.json` beside source files.
- Added migration `20260622031500_add_contractualisation_document_types`.

## Import result
- Created: 2
- Updated: 8
- Missing: 0
- Final count: 10
- Active: 10
- Defaults: 10
- Unknown variables: 0
- Storage: Supabase verified with `template_contrat_formation_particulier.docx` read successfully.

## Validation
- `npx prisma generate`: PASS
- `npx prisma validate`: PASS
- `npx tsc --noEmit`: PASS
- targeted eslint: PASS
- `npm run build`: PASS

## Notes
The first import stopped on missing historical enum value `LIVRET_ACCUEIL`; the historical document template migration was applied, then the idempotent import was re-run successfully.
