-- Les imports CARIF et le tenant de démonstration ne constituent pas une preuve
-- de partenariat. Ils doivent repasser par la modération humaine avant exposition.
UPDATE "Organization"
SET
  "publicProfileEnabled" = false,
  "marketplaceStatus" = 'PENDING',
  "marketplaceReviewedAt" = NULL,
  "marketplaceReviewedBy" = NULL,
  "marketplaceRejectionReason" = NULL
WHERE
  ("slug" LIKE 'carif-%' OR "slug" = 'academie-horizon')
  AND "marketplaceReviewedBy" IS NULL;
