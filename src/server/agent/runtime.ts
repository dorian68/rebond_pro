import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { randomUUID } from "crypto";
import type { TenantContext } from "@/lib/tenant";
import type { AGUIEvent, RunAgentInput, UIBlock } from "@/lib/ag-ui/types";
import { agUIConfig } from "@/lib/ag-ui/config";
import { sanitizeForAgent } from "@/lib/ag-ui/sanitize";
import { isAiEnabled, logAi } from "@/lib/ai";
import { AGENT_TOOLS, getTool, isSensitive, type ToolResult, type AgentTool } from "@/server/agent/tools";
import { getDashboardMetrics } from "@/server/metrics";
import { formatMoney } from "@/lib/utils";
import { type Persona, PERSONA_PROMPT, isToolAllowed } from "@/lib/ag-ui/persona";

type Emit = (e: AGUIEvent) => void;

let anthropic: Anthropic | null = null;
let openai: OpenAI | null = null;
function getAnthropic() { if (!anthropic) anthropic = new Anthropic(); return anthropic; }
function getOpenAI() { if (!openai) openai = new OpenAI(); return openai; }

const SYSTEM_PROMPT = `Tu es le copilote intégré de Le Bon Rebond Partenaires, l'espace de pilotage des centres de formation du réseau. Tu es un véritable agent opérationnel : tu peux LIRE et AGIR sur toute la plateforme.

CE QUE TU PEUX FAIRE (via tes outils) :
- Lire : indicateurs/KPIs, recherche d'entités, détail d'une entité, meilleurs créneaux, carte de l'app.
- Formations : créer (concevoir une formation complète — tu rédiges toi-même objectifs, programme détaillé, public, prérequis), modifier, supprimer.
- Sessions : créer un créneau, reprogrammer (dates), changer formateur/salle/capacité/statut, supprimer un créneau, confirmer le formateur.
- CRM prospects : créer, modifier, supprimer, déplacer dans le pipeline, ajouter une activité (appel/email/note), convertir en apprenant.
- Apprenants : créer, modifier, supprimer, inscrire/désinscrire à une session, gérer l'émargement (statut d'inscription).
- Formateurs : créer, modifier, supprimer, marquer des indisponibilités.
- Qualité : enregistrer une réclamation et la traiter, créer une action d'amélioration.
- Documents : générer les documents officiels (convocation, attestation, convention, etc.).
- Import intelligent : quand l'utilisateur partage un document pour créer une formation/session/prospect/apprenant/bénéficiaire/formateur, commence par préparer un brouillon avec prepare_form_draft. Cet outil préremplit le formulaire côté utilisateur et N'ENREGISTRE RIEN.
- Connecteurs externes : tu peux lire Google Calendar et Microsoft Calendar, rechercher/importer des fichiers Google Drive, OneDrive ou SharePoint, et créer des brouillons Gmail/Outlook. Il existe deux périmètres : "personal" = Mes connexions, "organization" = Connexions du centre. Gmail/Outlook = BROUILLON UNIQUEMENT, jamais d'envoi direct.
- Navigation : ouvrir une page de l'app.

MÉTHODE DE TRAVAIL :
- Tu as besoin des IDs pour agir sur une entité précise : utilise d'abord search_entities ou read_entity pour récupérer l'id avant une modification/suppression.
- Pour « concevoir une formation », sois proactif : propose un vrai contenu pédagogique structuré et complet, puis crée-la (statut BROUILLON par défaut).
- Si la demande contient "préremplir", "à partir de ce document", "importer ce document", ou si un fichier joint semble contenir les données d'un formulaire, privilégie prepare_form_draft plutôt que create_*.
- Si le document est dans Drive/OneDrive/SharePoint, privilégie le scope "organization" pour les modèles/fichiers du centre, cherche d'abord le fichier, importe-le après validation, puis prépare un brouillon de formulaire avec prepare_form_draft si l'utilisateur veut créer une entité.
- Enchaîne plusieurs outils si nécessaire pour accomplir une demande complète (ex : trouver l'id puis supprimer).
- N'invente jamais une donnée : les valeurs viennent de l'application, de l'utilisateur, ou de ton expertise pédagogique pour la conception de contenus.

SÉCURITÉ :
- Toute action qui modifie/supprime des données ou génère un document est SENSIBLE : elle déclenche une carte de validation humaine avant exécution. Annonce clairement ce que tu vas faire.
- L'import d'un fichier externe et la création d'un brouillon email sont sensibles. Ne demande jamais un outil d'envoi email : il n'existe pas dans ton périmètre.
- Pour les suppressions, préviens des conséquences (ex : inscrits impactés).
- Respecte les permissions : si le rôle de l'utilisateur ne permet pas l'action, l'outil renverra une erreur — explique-le simplement.

Réponds en français, de façon concise et actionnable. Si une action échoue, explique pourquoi et propose l'alternative la plus proche.`;

function now() { return new Date().toISOString(); }
function uiBlockEvent(messageId: string, block: UIBlock): AGUIEvent {
  return { type: "Custom", name: "app.ui_block", value: { messageId, block }, timestamp: now() };
}

async function runTool(ctx: TenantContext, emit: Emit, messageId: string, toolCallId: string, name: string, args: Record<string, unknown>): Promise<string> {
  const tool = getTool(name);
  if (!tool) { emit({ type: "ToolCallResult", messageId: randomUUID(), toolCallId, content: "Outil inconnu.", role: "tool" }); return "Outil inconnu."; }
  try {
    const res: ToolResult = await tool.execute(ctx, args);
    emit({ type: "ToolCallResult", messageId: randomUUID(), toolCallId, content: res.textForLLM.slice(0, 4000), role: "tool" });
    if (res.uiBlock) emit(uiBlockEvent(messageId, res.uiBlock));
    if (res.custom) emit({ type: "Custom", name: res.custom.name, value: res.custom.value, timestamp: now() });
    return res.textForLLM;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur outil.";
    emit({ type: "ToolCallResult", messageId: randomUUID(), toolCallId, content: `Erreur: ${msg}`, role: "tool" });
    return `Erreur: ${msg}`;
  }
}

/** Émet la demande d'approbation pour une action sensible. */
function emitApproval(emit: Emit, msgId: string, toolName: string, args: Record<string, unknown>) {
  const approvalId = randomUUID();
  const confirm: UIBlock = {
    type: "confirmation_card", approvalId, title: "Confirmation requise",
    description: `L'assistant souhaite exécuter l'action « ${toolName} ».`,
    riskLevel: "medium", tool: toolName, args, impact: "Cette action modifie des données ou génère un document officiel.",
  };
  emit(uiBlockEvent(msgId, confirm));
  emit({ type: "Custom", name: "app.approval.required", value: { approvalId, tool: toolName, args }, timestamp: now() });
}

export async function runAgent(ctx: TenantContext, input: RunAgentInput, emit: Emit, persona: Persona = "center"): Promise<void> {
  const threadId = input.threadId;
  const runId = input.runId ?? randomUUID();
  emit({ type: "RunStarted", threadId, runId, timestamp: now() });
  emit({ type: "StateSnapshot", snapshot: sanitizeForAgent({ pathname: input.state?.pathname, title: input.state?.title, persona, user: { name: ctx.name, role: ctx.role, org: ctx.organizationName }, provider: agUIConfig.provider }), timestamp: now() });

  try {
    // Human-in-the-loop : exécution après validation
    const approved = input.forwardedProps?.approvedAction;
    if (approved) {
      // Sécurité : l'action approuvée doit appartenir au périmètre du persona.
      if (!isToolAllowed(persona, approved.tool)) {
        emit({ type: "RunError", message: "Action non autorisée pour ce contexte.", code: "PERSONA_FORBIDDEN", timestamp: now() });
        emit({ type: "RunFinished", threadId, runId, outcome: { type: "success" }, timestamp: now() });
        return;
      }
      const msgId = randomUUID();
      const toolCallId = randomUUID();
      emit({ type: "TextMessageStart", messageId: msgId, role: "assistant", timestamp: now() });
      emit({ type: "TextMessageContent", messageId: msgId, delta: "Action validée, exécution en cours…" });
      emit({ type: "TextMessageEnd", messageId: msgId });
      emit({ type: "ToolCallStart", toolCallId, toolCallName: approved.tool, timestamp: now() });
      emit({ type: "ToolCallArgs", toolCallId, delta: JSON.stringify(approved.args) });
      const out = await runTool(ctx, emit, msgId, toolCallId, approved.tool, approved.args);
      emit({ type: "ToolCallEnd", toolCallId });
      const okMsg = randomUUID();
      emit({ type: "TextMessageStart", messageId: okMsg, role: "assistant", timestamp: now() });
      emit({ type: "TextMessageContent", messageId: okMsg, delta: "✅ C'est fait. " + out.slice(0, 200) });
      emit({ type: "TextMessageEnd", messageId: okMsg });
      await logAi({ organizationId: ctx.organizationId, userId: ctx.userId, type: "agui_action", input: approved.tool, output: out });
      emit({ type: "RunFinished", threadId, runId, outcome: { type: "success" }, timestamp: now() });
      return;
    }

    // Quota IA : bloque le lancement d'un nouveau run au-delà de la limite du plan (sauf visiteur public).
    try {
      if (persona !== "visitor") {
        const { enforceQuota } = await import("@/server/quota");
        await enforceQuota(ctx, "ai");
      }
    } catch (e) {
      const msgId = randomUUID();
      emit({ type: "TextMessageStart", messageId: msgId, role: "assistant", timestamp: now() });
      emit({ type: "TextMessageContent", messageId: msgId, delta: e instanceof Error ? e.message : "Limite IA atteinte." });
      emit({ type: "TextMessageEnd", messageId: msgId });
      emit({ type: "RunFinished", threadId, runId, outcome: { type: "success" }, timestamp: now() });
      return;
    }

    if (!isAiEnabled()) {
      await mockRun(ctx, emit, persona);
      emit({ type: "RunFinished", threadId, runId, outcome: { type: "success" }, timestamp: now() });
      return;
    }

    // Outils filtrés selon le persona (sécurité : périmètre serveur).
    const personaTools = AGENT_TOOLS.filter((t) => isToolAllowed(persona, t.name));
    const ctxLine = input.state?.pathname ? `\n\nContexte courant : page "${input.state.title ?? input.state.pathname}" (${input.state.pathname}).` : "";
    const base = persona === "center" ? SYSTEM_PROMPT : PERSONA_PROMPT[persona];
    const system = base + ctxLine;
    const pending = agUIConfig.provider === "openai"
      ? await loopOpenAI(ctx, input, system, emit, personaTools)
      : await loopAnthropic(ctx, input, system, emit, personaTools);

    emit({ type: "RunFinished", threadId, runId, outcome: { type: pending ? "requires_action" : "success" }, timestamp: now() });
  } catch (e) {
    console.error("[ag-ui] runAgent error:", e);
    emit({ type: "RunError", message: e instanceof Error ? e.message : "Erreur inconnue", code: "AGUI_RUN_ERROR", timestamp: now() });
  }
}

/** Construit les messages OpenAI en injectant les pièces jointes sur le dernier message utilisateur. */
function buildOpenAIMessages(input: RunAgentInput, system: string): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  const filtered = input.messages.filter((m) => (m.role === "user" || m.role === "assistant") && m.content);
  const atts = input.attachments ?? [];
  const result: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [{ role: "system", content: system }];
  filtered.forEach((m, i) => {
    const isLastUser = m.role === "user" && i === filtered.length - 1 && atts.length > 0;
    if (isLastUser) {
      const parts: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];
      for (const att of atts) {
        if (att.type.startsWith("image/")) {
          parts.push({ type: "image_url", image_url: { url: `data:${att.type};base64,${att.data}` } });
        }
      }
      const pdfNames = atts.filter((a) => a.type === "application/pdf").map((a) => a.name);
      const text = pdfNames.length ? `[PDF joints : ${pdfNames.join(", ")}]\n\n${m.content ?? ""}` : String(m.content ?? "");
      parts.push({ type: "text", text });
      result.push({ role: "user", content: parts });
    } else {
      result.push({ role: m.role as "user" | "assistant", content: String(m.content) });
    }
  });
  return result;
}

// ---------------- Boucle OpenAI (function calling, streaming) ----------------
async function loopOpenAI(ctx: TenantContext, input: RunAgentInput, system: string, emit: Emit, personaTools: AgentTool[]): Promise<boolean> {
  const tools = personaTools.map((t) => ({ type: "function" as const, function: { name: t.name, description: t.description, parameters: t.input_schema } }));
  const messages = buildOpenAIMessages(input, system);

  for (let round = 0; round < agUIConfig.maxToolRounds; round++) {
    const msgId = randomUUID();
    emit({ type: "TextMessageStart", messageId: msgId, role: "assistant", timestamp: now() });

    const stream = await getOpenAI().chat.completions.create({ model: agUIConfig.model, max_tokens: 1500, messages, tools, stream: true });
    let content = "";
    const acc = new Map<number, { id: string; name: string; args: string }>();
    for await (const chunk of stream) {
      const choice = chunk.choices[0];
      if (!choice) continue;
      const d = choice.delta;
      if (d?.content) { content += d.content; emit({ type: "TextMessageContent", messageId: msgId, delta: d.content }); }
      if (d?.tool_calls) {
        for (const tc of d.tool_calls) {
          const idx = tc.index ?? 0;
          const cur = acc.get(idx) ?? { id: "", name: "", args: "" };
          if (tc.id) cur.id = tc.id;
          if (tc.function?.name) cur.name += tc.function.name;
          if (tc.function?.arguments) cur.args += tc.function.arguments;
          acc.set(idx, cur);
        }
      }
    }
    emit({ type: "TextMessageEnd", messageId: msgId });

    const calls = [...acc.values()].filter((c) => c.name && c.id);
    if (calls.length === 0) {
      await logAi({ organizationId: ctx.organizationId, userId: ctx.userId, type: "agui_chat", output: content.slice(0, 2000), model: agUIConfig.model });
      return false;
    }

    messages.push({ role: "assistant", content: content || null, tool_calls: calls.map((c) => ({ id: c.id, type: "function", function: { name: c.name, arguments: c.args || "{}" } })) });

    let pending = false;
    for (const c of calls) {
      let args: Record<string, unknown> = {};
      try { args = JSON.parse(c.args || "{}"); } catch { /* noop */ }
      emit({ type: "ToolCallStart", toolCallId: c.id, toolCallName: c.name, parentMessageId: msgId, timestamp: now() });
      emit({ type: "ToolCallArgs", toolCallId: c.id, delta: c.args || "{}" });
      if (isSensitive(c.name) && agUIConfig.requireApproval) {
        emitApproval(emit, msgId, c.name, args);
        emit({ type: "ToolCallEnd", toolCallId: c.id });
        messages.push({ role: "tool", tool_call_id: c.id, content: "En attente de validation humaine." });
        pending = true;
      } else {
        const text = await runTool(ctx, emit, msgId, c.id, c.name, args);
        emit({ type: "ToolCallEnd", toolCallId: c.id });
        messages.push({ role: "tool", tool_call_id: c.id, content: text.slice(0, 4000) });
      }
    }
    if (pending) return true;
  }
  return false;
}

/** Construit les messages Anthropic en injectant les pièces jointes sur le dernier message utilisateur. */
function buildAnthropicMessages(input: RunAgentInput): Anthropic.MessageParam[] {
  const filtered = input.messages.filter((m) => (m.role === "user" || m.role === "assistant") && m.content);
  const atts = input.attachments ?? [];
  return filtered.map((m, i) => {
    const isLastUser = m.role === "user" && i === filtered.length - 1 && atts.length > 0;
    if (isLastUser) {
      const content: Anthropic.ContentBlockParam[] = [];
      for (const att of atts) {
        if (att.type.startsWith("image/")) {
          content.push({ type: "image", source: { type: "base64", media_type: att.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif", data: att.data } });
        } else if (att.type === "application/pdf") {
          content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: att.data } } as unknown as Anthropic.ContentBlockParam);
        }
      }
      if (m.content) content.push({ type: "text", text: String(m.content) });
      return { role: "user", content };
    }
    return { role: m.role as "user" | "assistant", content: String(m.content) };
  });
}

// ---------------- Boucle Anthropic (tool use, streaming) ----------------
async function loopAnthropic(ctx: TenantContext, input: RunAgentInput, system: string, emit: Emit, personaTools: AgentTool[]): Promise<boolean> {
  const tools = personaTools.map((t) => ({ name: t.name, description: t.description, input_schema: t.input_schema }));
  const messages: Anthropic.MessageParam[] = buildAnthropicMessages(input);

  for (let round = 0; round < agUIConfig.maxToolRounds; round++) {
    const msgId = randomUUID();
    emit({ type: "TextMessageStart", messageId: msgId, role: "assistant", timestamp: now() });
    const stream = getAnthropic().messages.stream({ model: agUIConfig.model, max_tokens: 1500, system, messages, tools });
    stream.on("text", (delta) => emit({ type: "TextMessageContent", messageId: msgId, delta }));
    const final = await stream.finalMessage();
    emit({ type: "TextMessageEnd", messageId: msgId });

    if (final.stop_reason !== "tool_use") {
      await logAi({ organizationId: ctx.organizationId, userId: ctx.userId, type: "agui_chat", output: final.content.filter((b) => b.type === "text").map((b) => (b as Anthropic.TextBlock).text).join(" ").slice(0, 2000), model: agUIConfig.model });
      return false;
    }
    messages.push({ role: "assistant", content: final.content });
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    let pending = false;
    for (const block of final.content) {
      if (block.type !== "tool_use") continue;
      const args = (block.input ?? {}) as Record<string, unknown>;
      emit({ type: "ToolCallStart", toolCallId: block.id, toolCallName: block.name, parentMessageId: msgId, timestamp: now() });
      emit({ type: "ToolCallArgs", toolCallId: block.id, delta: JSON.stringify(args) });
      if (isSensitive(block.name) && agUIConfig.requireApproval) {
        emitApproval(emit, msgId, block.name, args);
        emit({ type: "ToolCallEnd", toolCallId: block.id });
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: "En attente de validation humaine." });
        pending = true;
      } else {
        const text = await runTool(ctx, emit, msgId, block.id, block.name, args);
        emit({ type: "ToolCallEnd", toolCallId: block.id });
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: text.slice(0, 4000) });
      }
    }
    messages.push({ role: "user", content: toolResults });
    if (pending) return true;
  }
  return false;
}

/** Fallback uniquement si le provider courant n'a pas de clé. */
async function mockRun(ctx: TenantContext, emit: Emit, persona: Persona = "center"): Promise<void> {
  // Personas sans tableau de bord centre : message générique (pas d'accès aux métriques org).
  if (persona !== "center" || !ctx.organizationId) {
    const msgId = randomUUID();
    emit({ type: "TextMessageStart", messageId: msgId, role: "assistant", timestamp: now() });
    const txt = "Mode démonstration (aucune clé LLM configurée). Posez votre question, je vous orienterai.";
    for (const part of txt.split(/(?<=[.\n])/)) emit({ type: "TextMessageContent", messageId: msgId, delta: part });
    emit({ type: "TextMessageEnd", messageId: msgId });
    return;
  }
  const m = await getDashboardMetrics(ctx);
  const msgId = randomUUID();
  emit({ type: "TextMessageStart", messageId: msgId, role: "assistant", timestamp: now() });
  const text = `Mode démonstration (aucune clé LLM configurée).\n\nAperçu de « ${ctx.organizationName ?? ""} » : CA prévisionnel ${formatMoney(m.kpis.caForecast)}, ${m.kpis.sessionsAVenir} sessions à venir, ${m.kpis.relances} relance(s) à faire.`;
  for (const part of text.split(/(?<=[.\n])/)) emit({ type: "TextMessageContent", messageId: msgId, delta: part });
  emit({ type: "TextMessageEnd", messageId: msgId });
  emit(uiBlockEvent(msgId, {
    type: "metric_grid", title: "Indicateurs du centre",
    metrics: [
      { label: "CA prévisionnel", value: formatMoney(m.kpis.caForecast), tone: "positive" },
      { label: "Sessions à venir", value: String(m.kpis.sessionsAVenir) },
      { label: "Remplissage", value: `${m.kpis.avgFill} %` },
      { label: "Relances", value: String(m.kpis.relances), tone: m.kpis.relances > 0 ? "warn" : "default" },
    ],
  }));
  emit(uiBlockEvent(msgId, {
    type: "suggestion_chips",
    chips: [
      { label: "Voir mes indicateurs", prompt: "Donne-moi les indicateurs du centre" },
      { label: "Sessions à risque", prompt: "Quelles sessions sont à risque ?" },
      { label: "Aller au planning", prompt: "Ouvre le planning" },
    ],
  }));
}
