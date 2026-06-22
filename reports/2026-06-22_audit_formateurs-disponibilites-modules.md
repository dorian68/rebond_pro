# Audit — Formateurs, disponibilités et modules

## Scope
Audit des fonctionnalités ajoutées :
- disponibilités multi-formateurs ;
- import document PDF/DOCX/XLSX/CSV/images ;
- modules de formation ;
- formateurs par module ;
- optimisation de planning tenant compte des modules.

## Commands
- `npm run smoke:document-intake`
- `npm run smoke:trainer-portal`
- `npm run smoke:formation-modules-planning`
- `npm run smoke:planning-stress`
- `npx tsc --noEmit`
- `npx eslint scripts/smoke-planning-stress.ts scripts/smoke-formation-modules-planning.ts src/server/availability-actions.ts src/server/planning.ts src/server/formations-actions.ts src/lib/ag-ui/file-extractor.ts`

## Results
- PASS: import document existant toujours valide.
- PASS: nouvelle cible `availability` valide.
- PASS: portail formateur inchangé et fonctionnel.
- PASS: disponibilités bulk persistées et auditées.
- PASS: planning stress sous contraintes.
- PASS: optimisateur modulaire.
- PASS: TypeScript.
- PASS: lint ciblé.

## Findings
### Side effects not observed
- Pas de régression constatée sur le portail formateur.
- Pas de régression constatée sur l'import document existant.
- Pas de régression constatée sur l'optimisateur historique pour les formations sans modules.
- Pas de fuite cross-tenant détectée dans les tests planning/formateur.

### Issue corrected during audit
- `smoke:planning-stress` utilisait un email statique et échouait si une ancienne donnée existait encore.
- Patch appliqué : email de test unique par exécution.
- Relance : PASS.

### Residual risks
- La migration `FormationModule` doit être appliquée avant tout déploiement du code.
- La session garde encore un `trainerId` principal ; le plan par module est calculé/affiché mais pas persisté comme planning détaillé de session.
- L'extraction tableur supporte `.xlsx` et `.csv`, pas l'ancien `.xls` binaire.

## Verdict
PASS, avec risque de déploiement lié à la migration si elle n'est pas appliquée avant le code.
