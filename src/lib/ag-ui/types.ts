// AG-UI — Agent–User Interaction Protocol — types (CDC §15).

export type AGUIRole = "developer" | "system" | "assistant" | "user" | "tool" | "activity" | "reasoning";

export type AGUIMessage = {
  id: string;
  role: AGUIRole;
  content?: string;
};

/** Pièce jointe multimodale (base64, sans préfixe data-URL). Max 5 MB chacune. */
export type Attachment = {
  name: string;
  type: "image/jpeg" | "image/png" | "image/webp" | "image/gif" | "application/pdf";
  data: string; // base64 raw (sans "data:…;base64,")
  size: number; // octets
};

export type RunAgentInput = {
  threadId: string;
  runId?: string;
  parentRunId?: string | null;
  state?: AppAgentState;
  messages: AGUIMessage[];
  tools?: unknown[];
  context?: { description: string; value: string }[];
  forwardedProps?: ForwardedProps;
  /** Pièces jointes associées au dernier message utilisateur. */
  attachments?: Attachment[];
};

export type ForwardedProps = {
  /** Décision d'approbation human-in-the-loop renvoyée par le client. */
  approvedAction?: { tool: string; args: Record<string, unknown>; approvalId: string; approvalToken: string };
};

/** État applicatif transmis par le client (sans secret). */
export type AppAgentState = {
  pathname?: string;
  title?: string;
  query?: Record<string, string>;
  selectedEntity?: { type: string; id: string };
};

// ---- Événements AG-UI ----
export type AGUIEvent =
  | { type: "RunStarted"; threadId: string; runId: string; timestamp?: string }
  | { type: "RunFinished"; threadId?: string; runId?: string; outcome?: { type: string }; timestamp?: string }
  | { type: "RunError"; message: string; code?: string; timestamp?: string }
  | { type: "StepStarted"; stepName: string; timestamp?: string }
  | { type: "StepFinished"; stepName: string; timestamp?: string }
  | { type: "TextMessageStart"; messageId: string; role: AGUIRole; timestamp?: string }
  | { type: "TextMessageContent"; messageId: string; delta: string; timestamp?: string }
  | { type: "TextMessageEnd"; messageId: string; timestamp?: string }
  | { type: "ToolCallStart"; toolCallId: string; toolCallName: string; parentMessageId?: string; timestamp?: string }
  | { type: "ToolCallArgs"; toolCallId: string; delta: string; timestamp?: string }
  | { type: "ToolCallEnd"; toolCallId: string; timestamp?: string }
  | { type: "ToolCallResult"; messageId: string; toolCallId: string; content: string; role?: "tool"; timestamp?: string }
  | { type: "StateSnapshot"; snapshot: unknown; timestamp?: string }
  | { type: "Custom"; name: string; value: unknown; timestamp?: string }
  | { type: "Raw"; event: unknown; source?: string; timestamp?: string };

// ---- UIBlocks (allowlist) ----
export type UIBlock =
  | { type: "metric_grid"; id?: string; title?: string; metrics: { label: string; value: string; tone?: "default" | "positive" | "warn" | "danger" }[] }
  | { type: "entity_card"; id?: string; entityType: string; title: string; subtitle?: string; href?: string; fields?: { label: string; value: string }[]; color?: string }
  | { type: "data_table"; id?: string; title?: string; columns: string[]; rows: string[][]; emptyText?: string }
  | { type: "suggestion_chips"; id?: string; chips: { label: string; prompt: string }[] }
  | { type: "progress_steps"; id?: string; title?: string; steps: { label: string; status: "done" | "active" | "pending" }[] }
  | { type: "confirmation_card"; id?: string; approvalId: string; approvalToken: string; title: string; description?: string; riskLevel?: "low" | "medium" | "high"; tool: string; args: Record<string, unknown>; impact?: string; fields?: { label: string; value: string }[]; preview?: string }
  | { type: "email_list"; id?: string; title?: string; mailbox?: string; emails: { messageId: string; threadId?: string; from: string; subject: string; receivedAt?: string; snippet?: string; unread?: boolean }[]; emptyText?: string }
  | { type: "connector_oauth_card"; id?: string; connector: string; scope: "personal" | "organization"; label: string; title: string; description?: string; policy: "READ_ONLY" | "DRAFT_ONLY" | "SEND" | "WRITE"; canConnect: boolean; blockedReason?: string }
  | { type: "error_card"; id?: string; title: string; message: string };

export const ALLOWED_UI_BLOCKS = [
  "metric_grid",
  "entity_card",
  "data_table",
  "suggestion_chips",
  "progress_steps",
  "confirmation_card",
  "email_list",
  "connector_oauth_card",
  "error_card",
] as const;

export function isAllowedUIBlock(b: unknown): b is UIBlock {
  return !!b && typeof b === "object" && "type" in b && (ALLOWED_UI_BLOCKS as readonly string[]).includes((b as { type: string }).type);
}
