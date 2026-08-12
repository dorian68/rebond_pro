ALTER TABLE "Roadmap2Node"
ADD COLUMN "isWorkspaceRoot" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "preArchiveStatus" "Roadmap2Status";

UPDATE "Roadmap2Node"
SET "isWorkspaceRoot" = true
WHERE "seedKey" = 'root'
  AND NOT EXISTS (
    SELECT 1
    FROM "Roadmap2Node" existing
    WHERE existing."workspaceId" = "Roadmap2Node"."workspaceId"
      AND existing."seedKey" = 'root'
      AND (existing."createdAt", existing."id") < ("Roadmap2Node"."createdAt", "Roadmap2Node"."id")
  );

CREATE UNIQUE INDEX "Roadmap2Node_one_root_per_workspace"
ON "Roadmap2Node" ("workspaceId")
WHERE "isWorkspaceRoot" = true;

-- parentId est la source de vérité : une cible ne peut avoir qu'un seul edge parent/enfant.
-- Les données historiques peuvent contenir des doublons logiques ; on conserve l'edge le plus ancien.
DELETE FROM "Roadmap2Edge" newer
USING "Roadmap2Edge" older
WHERE newer."workspaceId" = older."workspaceId"
  AND newer."targetNodeId" = older."targetNodeId"
  AND newer."relationType" = 'parent_child'
  AND older."relationType" = 'parent_child'
  AND (newer."createdAt", newer."id") > (older."createdAt", older."id");

CREATE UNIQUE INDEX "Roadmap2Edge_one_parent_per_target"
ON "Roadmap2Edge" ("workspaceId", "targetNodeId")
WHERE "relationType" = 'parent_child';
