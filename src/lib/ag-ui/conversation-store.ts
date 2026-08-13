import type { UIBlock } from "./types";

// Persistance locale des conversations (CDC §29.5 — fallback localStorage,
// migration backend recommandée documentée dans AG_UI_LOCAL_DOC.md).

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  serverId?: string; // messageId AG-UI
  role: ChatRole;
  content: string;
  blocks?: UIBlock[];
  /** Noms des pièces jointes (affichage uniquement — pas de base64 en localStorage). */
  attachmentNames?: string[];
};

export type Conversation = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
};

const KEY = "rebondpro.agui.conversations.v1";

function read(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Conversation[]) : [];
  } catch {
    return [];
  }
}

function write(list: Conversation[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, 50)));
  } catch { /* quota */ }
}

function safeForLocalStorage(conv: Conversation): Conversation {
  return {
    ...conv,
    messages: conv.messages.map((message) => ({
      ...message,
      // Les cartes Gmail contiennent des extraits privés et les confirmations
      // portent un jeton éphémère : elles restent uniquement en mémoire vive.
      blocks: message.blocks?.filter((block) => block.type !== "confirmation_card" && block.type !== "email_list"),
    })),
  };
}

export function listConversations(): Conversation[] {
  return read().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getConversation(id: string): Conversation | undefined {
  return read().find((c) => c.id === id);
}

export function saveConversation(conv: Conversation) {
  const list = read();
  const safe = safeForLocalStorage(conv);
  const idx = list.findIndex((c) => c.id === conv.id);
  if (idx >= 0) list[idx] = safe;
  else list.unshift(safe);
  write(list);
}

export function deleteConversation(id: string) {
  write(read().filter((c) => c.id !== id));
}

export function renameConversation(id: string, title: string) {
  const list = read();
  const c = list.find((x) => x.id === id);
  if (c) { c.title = title; c.updatedAt = Date.now(); write(list); }
}

export function newConversation(): Conversation {
  return { id: crypto.randomUUID(), title: "Nouvelle conversation", createdAt: Date.now(), updatedAt: Date.now(), messages: [] };
}

/** Titre auto à partir du premier message utilisateur. */
export function deriveTitle(text: string): string {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length > 42 ? t.slice(0, 42) + "…" : t || "Nouvelle conversation";
}
