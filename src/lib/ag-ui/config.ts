// Configuration AG-UI (CDC §19.1).
// Le projet a déjà une convention LLM : Anthropic Claude (src/lib/ai.ts).
// On la respecte ; provider="anthropic" par défaut. Voir AG_UI_LOCAL_DOC.md
// pour passer sur OpenAI gpt-4o-mini si souhaité.

export const agUIConfig = {
  provider: process.env.AG_UI_PROVIDER ?? "anthropic",
  // Modèle économique par défaut (équivalent coût-maîtrisé de gpt-4o-mini côté Claude).
  model: process.env.AG_UI_MODEL ?? process.env.AI_MODEL_FAST ?? "claude-haiku-4-5",
  requireApproval: process.env.AG_UI_REQUIRE_APPROVAL !== "false",
  debug: process.env.AG_UI_ENABLE_DEBUG === "true",
  maxToolRounds: 8,
};

export type AgUIConfig = typeof agUIConfig;
