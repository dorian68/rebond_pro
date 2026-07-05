# Technical RL / Business Client Report - Document Context Roles E2E

Date: 2026-06-28

Scope:
- Dashboard `/documents` for center user roles.
- Verify that the active dashboard instance context flows into generated documents.
- Verify role permissions and tenant isolation.

Implemented test:
- `e2e/tests/23-document-context-roles.spec.ts`

Strict checks:
- COMMERCIAL can access documents in read-only mode and cannot generate documents.
- OWNER, ADMIN and ASSISTANT can generate a CONVOCATION from the dashboard.
- The persisted `generationContextSnapshot` contains the active organization, legal data, selected session, formation, learner, company, trainer and room.
- The downloaded PDF contains the same active context.
- A poison organization/formation from another tenant is absent from snapshot and PDF text.

E2E evidence:
- Command: `$env:E2E_BASE_URL='http://localhost:3001'; npx playwright test e2e/tests/23-document-context-roles.spec.ts --project=chromium`
- Result: PASS, 5 passed in 2.1 min.

Harness evidence:
- Command: `npx playwright test --list`
- Result: PASS, 122 tests discovered in 23 files.
- Command: `npm run lint`
- Result: PASS, 0 errors, 13 existing warnings.
- Command: `npm run build`
- Result: PASS, with 2 existing Turbopack NFT warnings and local `DEV_AUTOLOGIN` safety warnings.

Self-check scores:
- Role permissions and commercial UX: 10/10.
- Context propagation to snapshot and PDF: 10/10.
- Reproducible E2E harness on this workstation: 9/10.
- Production hygiene: 8/10 because lint/build still report pre-existing warnings outside this change.

Technical RL verdict: PASS.
Business Client Mystere verdict: PASS.

Residual notes:
- The local workstation already had a RebondPro dev server on `http://localhost:3001`; `localhost:3000` served another app and caused a false 404 before the correction.
- `playwright.config.ts` now starts the local Next dev server through a Windows-compatible Node wrapper when no reusable server is present.
