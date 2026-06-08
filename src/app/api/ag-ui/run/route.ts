import { z } from "zod";
import { getSession } from "@/lib/tenant";
import type { TenantContext } from "@/lib/tenant";
import type { Role } from "@prisma/client";
import type { AGUIEvent, RunAgentInput } from "@/lib/ag-ui/types";
import { runAgent } from "@/server/agent/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const messageSchema = z.object({
  id: z.string().optional().default(() => crypto.randomUUID()),
  role: z.enum(["developer", "system", "assistant", "user", "tool", "activity", "reasoning"]),
  content: z.string().optional(),
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
  forwardedProps: z
    .object({
      approvedAction: z.object({ tool: z.string(), args: z.record(z.string(), z.unknown()), approvalId: z.string() }).optional(),
    })
    .optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id || !session.user.organizationId) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  const ctx: TenantContext = {
    userId: session.user.id,
    email: session.user.email ?? null,
    name: session.user.name ?? null,
    organizationId: session.user.organizationId,
    organizationName: session.user.organizationName,
    organizationSlug: session.user.organizationSlug,
    role: (session.user.role as Role) ?? "ASSISTANT",
  };

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
    forwardedProps: parsed.data.forwardedProps,
  };

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
      runAgent(ctx, input, emit)
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
