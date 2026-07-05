# Technical RL / Business Client Report - Real Document Catalog E2E

Date: 2026-06-28

Scope:
- Real dashboard `/documents`, not a direct server-action shortcut.
- Full document catalog generation: 78 generatable document types.
- Center user, linked trainer portal, learner enrollment, room, modules, session and poison tenant isolation.

Implemented test:
- `e2e/tests/24-document-catalog-real.spec.ts`
- Explicit long-run flag: `E2E_REAL_DOCUMENT_CATALOG=1`

Product fix made before the green run:
- Generic built-in PDFs no longer render as only `Document.`
- Untemplated document types now include a context summary from the active center/session: formation, dates, trainer, room, learner/client, company, duration and amount when available.
- Document data enrichment now understands both legacy and expanded variable aliases, including `formation_titre`, `formateur_nom`, `apprenant_nom`, `beneficiaire_nom`, `client_entreprise`, `session_lieu`, `centre_nom`.

Real E2E evidence:
- Command: `$env:E2E_BASE_URL='http://localhost:3001'; $env:E2E_REAL_DOCUMENT_CATALOG='1'; npx playwright test e2e/tests/24-document-catalog-real.spec.ts --project=chromium`
- Result: PASS, 4 passed in 21.9 min.
- The main generation test generated all 78 document types from the UI in 21.5 min.

Strict checks:
- The UI select exposes exactly the 78 values from `GENERATABLE_DOCUMENT_TYPES`.
- Each type is generated from the manual dashboard form with the built-in PDF engine forced.
- Each generated document is persisted with status `GENERE`.
- Each generated document has `completionStatus=COMPLETE`, score >= 95 and no missing variables.
- Each `generationContextSnapshot` contains the active organization, legal data, formation, session, learner, company, trainer and room.
- Each generated file is downloaded through `/api/documents/[id]/download`.
- Each PDF text extraction contains the active organization and formation.
- PDF text also contains learner/company/trainer/location when the document catalog variables require them.
- Poison organization and poison formation markers are absent from every snapshot and PDF.
- Linked trainer portal sees the real session.
- TRAINER role is redirected to the trainer portal and cannot use the center document generator.
- Post-run cleanup leaves no `REALDOC` organization or document artifacts.

Harness evidence:
- Command: `npx playwright test --list`
- Result: PASS, 125 tests discovered in 24 files.
- Command: `npm run lint`
- Result: PASS, 0 errors, 13 existing warnings.
- Command: `npm run build`
- Result: PASS, with 2 existing Turbopack NFT warnings and local `DEV_AUTOLOGIN` safety warnings.

Self-check scores:
- Full catalog generation coverage: 10/10.
- User/trainer real-condition coverage: 10/10.
- Context propagation to snapshot and PDF: 10/10.
- Tenant isolation: 10/10.
- Reproducibility: 9/10 because the test is intentionally long and gated by `E2E_REAL_DOCUMENT_CATALOG=1`.
- Production hygiene: 8/10 because existing lint/build warnings remain outside this change.

Technical RL verdict: PASS.
Business Client Mystere verdict: PASS.
