# Import Templates — Lot 6 Administratif & Finance

## Source
`C:\Users\Labry\Downloads\templates_administratif_finance_lot_6`

## Imported templates
- Facture
- Avoir
- Reçu de paiement
- Relance paiement
- Relevé financements
- Dossier OPCO / financeur
- Justificatif financeur
- Bilan pédagogique et financier
- Tableau annuel qualité
- Rapport activité centre

## Import result
- Created: 10
- Updated: 0
- Missing: 0
- Final count: 10
- Active: 10
- Defaults: 10
- Variables detected: 133
- Unknown variables: 0
- Storage: Supabase verified with `template_facture.docx` read successfully, 39,083 bytes.

## Backend changes
- Added precise document types for finance/admin templates.
- Added finance/admin variables to the registry.
- Added catalog metadata: family, contexts, scope, and bulk generation behavior.
- Added manifest `manifest_lot_6_administratif_finance.json`.

## Validation
- `npx prisma generate`: PASS
- `npx prisma validate`: PASS
- `npx tsc --noEmit`: PASS
- targeted eslint: PASS
- `npm run smoke:documents-engine`: PASS
- `npm run smoke:connectors`: PASS
- BPF org-only preflight smoke: PASS
- `npm run build`: PASS
