# Documents — Agentic UI & Tenant Routing

## Verdict
Technical RL verdict: PASS

## What was checked
- Platform templates are global defaults: `DocumentTemplate.organizationId = null`.
- Tenant templates remain tenant-scoped: `DocumentTemplate.organizationId = ctx.organizationId`.
- Resolution order is explicit:
  1. explicit template id allowed for the tenant or platform,
  2. tenant default DOCX,
  3. any active tenant DOCX,
  4. platform default DOCX,
  5. any active platform DOCX,
  6. built-in PDF fallback.
- Tenant upload and default selection already exist in `/parametres` and are role-gated to `OWNER`/`ADMIN`.
- Platform upload and default selection remain in `/admin/documents` and require platform admin.

## Socrate tools
- `list_document_templates`: exposes available templates with origin `tenant` or `platform_default`, context and scope.
- `preflight_document_generation`: non-sensitive analysis tool. It resolves the effective template and reports filled/missing variables.
- `generate_document`: sensitive tool. It requires human approval before generating a document.

## Role constraints
- Center persona can access document tools.
- Visitor persona cannot generate center documents.
- Platform admin persona remains read-only through its allowlist.
- Server actions still enforce roles with `requireRole`.

## Smoke coverage
- `npm run smoke:documents-engine`: PASS
  - explicit template is used,
  - missing/unknown variables are detected,
  - tenant default template overrides platform default template,
  - DOCX renders readable placeholders.
- `npm run smoke:connectors`: PASS
  - Socrate document tools are present,
  - `generate_document` is sensitive,
  - `preflight_document_generation` is non-sensitive,
  - visitor cannot generate center documents.
- BPF org-only preflight: PASS
  - annual/admin documents can be analyzed without session context.
