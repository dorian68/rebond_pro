import { z } from "zod";
import { getSession, tenantContextFromSession } from "@/lib/tenant";
import type { TenantContext } from "@/lib/tenant";
import type { AGUIEvent, RunAgentInput } from "@/lib/ag-ui/types";
import { runAgent } from "@/server/agent/runtime";
import { resolvePersona } from "@/lib/ag-ui/persona";
import { isPlatformAdmin } from "@/lib/platform";
import { rateLimit, clientIp } from "@/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"] as const;
const MAX_ATTACHMENT_BYTES = 7_340_032; // ~5 MB base64 headroom

const messageSchema = z.object({
  id: z.string().optional().default(() => crypto.randomUUID()),
  role: z.enum(["developer", "system", "assistant", "user", "tool", "activity", "reasoning"]),
  content: z.string().optional(),
});

const attachmentSchema = z.object({
  name: z.string().max(255),
  type: z.enum(ALLOWED_MIME),
  data: z.string().max(MAX_ATTACHMENT_BYTES),
  size: z.number().int().max(5_242_880),
});

const inputSchema = z.object({
  threadId: z.string().min(1).optional(),
  runId: z.string().optional(),
  parentRunId: z.string().nullish(),
  state: z
    .object({
      pathname: z.string().optional(),
      title: z.string().optional(),
      query: z.record(z.string(), z.string()).optional(),
      selectedEntity: z.object({ type: z.string(), id: z.string() }).optional(),
    })
    .optional(),
  messages: z.array(messageSchema).default([]),
  attachments: z.array(attachmentSchema).max(5).optional(),
  forwardedProps: z
    .object({
      approvedAction: z.object({ tool: z.string(), args: z.record(z.string(), z.unknown()), approvalId: z.string().uuid(), approvalToken: z.string().min(40).max(4096) }).optional(),
    })
    .optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  const hasSession = Boolean(session?.user?.id);
  const tenantCtx = hasSession ? await tenantContextFromSession(session) : null;
  const platformAdmin = hasSession ? await isPlatformAdmin() : false;

  if (hasSession && !tenantCtx && !platformAdmin) {
    return new Response(JSON.stringify({ error: "no_active_membership", detail: "Aucun espace actif n'est rattaché à ce compte." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Anti-abus : le flux visiteur (anonyme) déclenche des appels LLM facturés,
  // sans quota de plan — on borne par IP (les personas connectés ont enforceQuota).
  if (!hasSession) {
    const ip = clientIp(req);
    if (!rateLimit(`agui:min:${ip}`, 8, 60_000) || !rateLimit(`agui:hour:${ip}`, 40, 3_600_000)) {
      return new Response(JSON.stringify({ error: "rate_limited", detail: "Trop de requêtes. Réessayez dans quelques minutes." }), {
        status: 429,
        headers: { "Content-Type": "application/json", "Retry-After": "60" },
      });
    }
  }

  // Contexte : tenant si connecté, sinon contexte PUBLIC (visiteur) sans organisation.
  const ctx: TenantContext = tenantCtx
    ? tenantCtx
    : platformAdmin && session?.user?.id
      ? { userId: session.user.id, email: session.user.email ?? null, name: session.user.name ?? null, organizationId: "", organizationName: null, organizationSlug: null, role: "OWNER" }
      : { userId: "", email: null, name: null, organizationId: "", organizationName: null, organizationSlug: null, role: "LEARNER" };

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "invalid_request", detail: parsed.error.issues[0]?.message }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const input: RunAgentInput = {
    threadId: parsed.data.threadId ?? crypto.randomUUID(),
    runId: parsed.data.runId,
    parentRunId: parsed.data.parentRunId ?? null,
    state: parsed.data.state,
    messages: parsed.data.messages.map((m) => ({ id: m.id, role: m.role, content: m.content })),
    attachments: parsed.data.attachments,
    forwardedProps: parsed.data.forwardedProps,
  };

  // Persona = rôle + page courante (sécurité : périmètre d'outils côté serveur).
  const persona = resolvePersona({ hasSession, role: ctx.role, pathname: input.state?.pathname, isPlatformAdmin: platformAdmin });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const emit = (e: AGUIEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
        } catch {
          closed = true;
        }
      };
      runAgent(ctx, input, emit, persona)
        .catch((err) => emit({ type: "RunError", message: err instanceof Error ? err.message : "Erreur", code: "AGUI_RUN_ERROR" }))
        .finally(() => {
          if (!closed) {
            try { controller.enqueue(encoder.encode("data: [DONE]\n\n")); } catch { /* noop */ }
            closed = true;
            controller.close();
          }
        });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
