import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

// Façade IA multi-provider (CDC §9 + AG-UI §19.1).
// Provider piloté par AG_UI_PROVIDER ("openai" | "anthropic").
// Sans clé du provider courant, fallback déterministe (le produit reste fonctionnel).

export const LLM_PROVIDER = (process.env.AG_UI_PROVIDER ?? (process.env.OPENAI_API_KEY ? "openai" : "anthropic")).toLowerCase();

const OPENAI_MODEL = process.env.AG_UI_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const ANTHROPIC_MODEL_COMPLEX = process.env.AI_MODEL_COMPLEX ?? "claude-opus-4-8";
const ANTHROPIC_MODEL_FAST = process.env.AI_MODEL_FAST ?? "claude-haiku-4-5";

let anthropic: Anthropic | null = null;
let openai: OpenAI | null = null;
function getAnthropic() { if (!anthropic) anthropic = new Anthropic(); return anthropic; }
function getOpenAI() { if (!openai) openai = new OpenAI(); return openai; }

export function isAiEnabled(): boolean {
  return LLM_PROVIDER === "openai" ? !!process.env.OPENAI_API_KEY : !!process.env.ANTHROPIC_API_KEY;
}

export type GenerateOptions = { system: string; prompt: string; maxTokens?: number; fast?: boolean };
export type GenerateResult = { text: string; source: "ai" | "fallback"; model?: string };

export async function generateText(opts: GenerateOptions, fallback: string): Promise<GenerateResult> {
  if (!isAiEnabled()) return { text: fallback, source: "fallback" };
  try {
    if (LLM_PROVIDER === "openai") {
      const model = OPENAI_MODEL;
      const resp = await getOpenAI().chat.completions.create({
        model,
        max_tokens: opts.maxTokens ?? 1500,
        messages: [{ role: "system", content: opts.system }, { role: "user", content: opts.prompt }],
      });
      const text = (resp.choices[0]?.message?.content ?? "").trim();
      return { text: text || fallback, source: text ? "ai" : "fallback", model };
    }
    const model = opts.fast ? ANTHROPIC_MODEL_FAST : ANTHROPIC_MODEL_COMPLEX;
    const resp = await getAnthropic().messages.create({
      model,
      max_tokens: opts.maxTokens ?? 1500,
      system: opts.system,
      messages: [{ role: "user", content: opts.prompt }],
    });
    const text = resp.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("\n").trim();
    return { text: text || fallback, source: text ? "ai" : "fallback", model };
  } catch (e) {
    console.error("[ai] generateText error:", e);
    return { text: fallback, source: "fallback" };
  }
}

export async function chat(messages: { role: "user" | "assistant"; content: string }[], system: string, fallback: string): Promise<GenerateResult> {
  if (!isAiEnabled()) return { text: fallback, source: "fallback" };
  try {
    if (LLM_PROVIDER === "openai") {
      const model = OPENAI_MODEL;
      const resp = await getOpenAI().chat.completions.create({
        model,
        max_tokens: 1500,
        messages: [{ role: "system", content: system }, ...messages.map((m) => ({ role: m.role, content: m.content }))],
      });
      const text = (resp.choices[0]?.message?.content ?? "").trim();
      return { text: text || fallback, source: text ? "ai" : "fallback", model };
    }
    const model = ANTHROPIC_MODEL_COMPLEX;
    const resp = await getAnthropic().messages.create({ model, max_tokens: 1500, system, messages });
    const text = resp.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("\n").trim();
    return { text: text || fallback, source: text ? "ai" : "fallback", model };
  } catch (e) {
    console.error("[ai] chat error:", e);
    return { text: fallback, source: "fallback" };
  }
}

export async function logAi(params: { organizationId: string; userId?: string | null; type: string; input?: string; output?: string; model?: string }): Promise<void> {
  if (!params.organizationId) return; // contexte public (visiteur) : pas de traçabilité tenant
  try {
    await prisma.aiInteraction.create({
      data: {
        organizationId: params.organizationId,
        userId: params.userId ?? null,
        type: params.type,
        inputContext: params.input?.slice(0, 4000),
        output: params.output?.slice(0, 8000),
        model: params.model,
      },
    });
  } catch (e) {
    console.error("[ai] logAi error:", e);
  }
}
