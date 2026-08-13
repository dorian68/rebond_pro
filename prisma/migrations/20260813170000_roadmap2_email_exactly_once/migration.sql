-- Une même intention d'envoi peut recevoir plusieurs identifiants de validation
-- UI. Le registre durable reste néanmoins unique par contenu et workspace.
CREATE UNIQUE INDEX "Roadmap2EmailOperation_workspaceId_requestHash_key"
  ON "Roadmap2EmailOperation"("workspaceId", "requestHash")
  WHERE "status" IN ('running', 'provider_succeeded', 'needs_repair', 'succeeded');
