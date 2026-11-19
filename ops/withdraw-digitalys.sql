-- Explicit owner request, 2026-11-19. Dry run unless psql -v apply=true.
\set ON_ERROR_STOP on
\if :{?apply}
\else
  \set apply false
\endif

BEGIN ISOLATION LEVEL SERIALIZABLE;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $withdraw$
DECLARE
  target "Organization"%ROWTYPE;
  before_state jsonb;
  after_state jsonb;
  other_orgs text;
  other_formations text;
  formation_count integer;
BEGIN
  IF (SELECT count(*) FROM "Organization"
      WHERE name ILIKE '%digitalys%' OR slug ILIKE '%digitalys%') <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one Digitalys organization';
  END IF;
  SELECT * INTO STRICT target FROM "Organization"
    WHERE id = 'carifv1001' AND slug = 'carif-digitalys-formation'
      AND name = 'Digitalys Formation' FOR UPDATE;
  PERFORM id FROM "Formation" WHERE "organizationId" = target.id FOR UPDATE;
  SELECT count(*) INTO formation_count FROM "Formation" WHERE "organizationId" = target.id;
  IF formation_count <> 5 THEN
    RAISE EXCEPTION 'Expected five formations, found %', formation_count;
  END IF;

  SELECT md5(string_agg(to_jsonb(o)::text, '' ORDER BY id)) INTO other_orgs
    FROM "Organization" o WHERE id <> target.id;
  SELECT md5(string_agg(to_jsonb(f)::text, '' ORDER BY id)) INTO other_formations
    FROM "Formation" f WHERE "organizationId" <> target.id;
  SELECT jsonb_build_object(
    'publicProfileEnabled', target."publicProfileEnabled",
    'marketplaceStatus', target."marketplaceStatus",
    'marketplaceReviewedAt', target."marketplaceReviewedAt",
    'marketplaceReviewedBy', target."marketplaceReviewedBy",
    'marketplaceRejectionReason', target."marketplaceRejectionReason",
    'formations', (SELECT jsonb_agg(jsonb_build_object('id', id, 'isPublic', "isPublic") ORDER BY id)
      FROM "Formation" WHERE "organizationId" = target.id)
  ) INTO before_state;

  UPDATE "Organization" SET "publicProfileEnabled" = false,
    "marketplaceStatus" = 'REJECTED', "marketplaceReviewedAt" = NULL,
    "marketplaceReviewedBy" = NULL,
    "marketplaceRejectionReason" = 'Retrait du référencement public demandé par le propriétaire du site le 19 novembre 2026.',
    "updatedAt" = CURRENT_TIMESTAMP
    WHERE id = target.id;
  UPDATE "Formation" SET "isPublic" = false, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "organizationId" = target.id AND "isPublic";

  IF EXISTS (SELECT 1 FROM "Formation" WHERE "organizationId" = target.id AND "isPublic")
    OR EXISTS (SELECT 1 FROM "Organization" WHERE id = target.id
      AND ("publicProfileEnabled" OR "marketplaceStatus" <> 'REJECTED')) THEN
    RAISE EXCEPTION 'Public withdrawal failed';
  END IF;
  IF other_orgs IS DISTINCT FROM (SELECT md5(string_agg(to_jsonb(o)::text, '' ORDER BY id))
      FROM "Organization" o WHERE id <> target.id)
    OR other_formations IS DISTINCT FROM (SELECT md5(string_agg(to_jsonb(f)::text, '' ORDER BY id))
      FROM "Formation" f WHERE "organizationId" <> target.id) THEN
    RAISE EXCEPTION 'Unrelated organization or formation changed';
  END IF;

  SELECT jsonb_build_object('publicProfileEnabled', false, 'marketplaceStatus', 'REJECTED',
    'reason', 'explicit_site_owner_request_2026-11-19',
    'formations', (SELECT jsonb_agg(jsonb_build_object('id', id, 'isPublic', "isPublic") ORDER BY id)
      FROM "Formation" WHERE "organizationId" = target.id)) INTO after_state;
  INSERT INTO "AuditLog" (id, "organizationId", action, "entityType", "entityId", before, after, "createdAt")
    VALUES ('ops-digitalys-withdrawal-20261119', target.id, 'PUBLIC_CATALOG_WITHDRAWAL',
      'Organization', target.id, before_state, after_state, CURRENT_TIMESTAMP)
    ON CONFLICT (id) DO NOTHING;
  RAISE NOTICE 'PASS: one center and five formations withdrawn; unrelated centers/formations unchanged';
END
$withdraw$;

\if :apply
  COMMIT;
\else
  ROLLBACK;
\endif
