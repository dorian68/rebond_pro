"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { runAgUI } from "@/lib/ag-ui/client";
import { dispatchAppAction } from "@/lib/ag-ui/app-actions";
import type { Attachment } from "@/lib/ag-ui/types";
import { PAGE_TITLES } from "@/lib/nav";
import {
  type ChatMessage,
  type Conversation,
  listConversations,
  getConversation,
  saveConversation,
  deleteConversation as delConv,
  renameConversation as renConv,
  newConversation,
  deriveTitle,
} from "@/lib/ag-ui/conversation-store";
import type { AGUIEvent, UIBlock } from "@/lib/ag-ui/types";

export type Toast = { id: string; message: string; type: "info" | "success" | "warn" | "error" };
export type { Attachment };
export type PendingApproval = { approvalId: string; approvalToken: string; tool: string; args: Record<string, unknown> };

export function useAgentConversation() {
  const router = useRouter();
  const pathname = usePathname();

  const [conversations, setConversations] = useState<Conversation[]>(() => listConversations());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [activity, setActivity] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const abortRef = useRef<AbortController | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const pushToast = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = crypto.randomUUID();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);
  const dismissToast = useCallback((id: string) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const persist = useCallback((id: string, msgs: ChatMessage[], title?: string) => {
    const existing = getConversation(id);
    const conv: Conversation = existing
      ? { ...existing, messages: msgs, updatedAt: Date.now(), title: title ?? existing.title }
      : { id, title: title ?? "Nouvelle conversation", createdAt: Date.now(), updatedAt: Date.now(), messages: msgs };
    saveConversation(conv);
    setConversations(listConversations());
  }, []);

  const appContext = useCallback(() => {
    const seg = pathname?.split("/").filter(Boolean)[0] ?? "dashboard";
    return { pathname: pathname ?? "/", title: PAGE_TITLES[seg] ?? "Le Bon Rebond" };
  }, [pathname]);

  // ---- gestion conversations ----
  const newChat = useCallback(() => {
    abortRef.current?.abort();
    setActiveId(null);
    setMessages([]);
    setError(null);
    setPendingApproval(null);
    setIsRunning(false);
    setThinking(false);
  }, []);

  const openChat = useCallback((id: string) => {
    abortRef.current?.abort();
    const conv = getConversation(id);
    if (!conv) return;
    setActiveId(id);
    setMessages(conv.messages);
    setError(null);
    setPendingApproval(null);
    setIsRunning(false);
    setThinking(false);
  }, []);

  const deleteChat = useCallback((id: string) => {
    delConv(id);
    setConversations(listConversations());
    if (activeIdRef.current === id) newChat();
  }, [newChat]);

  const renameChat = useCallback((id: string, title: string) => {
    renConv(id, title);
    setConversations(listConversations());
  }, []);

  // ---- traitement des événements AG-UI ----
  const handleEvent = useCallback((e: AGUIEvent, convId: string) => {
    switch (e.type) {
      case "TextMessageStart": {
        setMessages((prev) => {
          if (prev.some((m) => m.serverId === e.messageId)) return prev;
          return [...prev, { id: crypto.randomUUID(), serverId: e.messageId, role: "assistant", content: "", blocks: [] }];
        });
        break;
      }
      case "TextMessageContent": {
        setThinking(false);
        setMessages((prev) => prev.map((m) => (m.serverId === e.messageId ? { ...m, content: m.content + e.delta } : m)));
        break;
      }
      case "ToolCallStart": {
        setActivity(`Action : ${e.toolCallName}…`);
        break;
      }
      case "ToolCallEnd": {
        setActivity(null);
        break;
      }
      case "Custom": {
        if (e.name === "app.ui_block") {
          const v = e.value as { messageId?: string; block?: UIBlock };
          if (v?.block) {
            setThinking(false);
            if (v.block.type === "confirmation_card") {
              setPendingApproval({ approvalId: v.block.approvalId, approvalToken: v.block.approvalToken, tool: v.block.tool, args: v.block.args });
            }
            setMessages((prev) => attachBlock(prev, v.messageId, v.block!));
          }
        } else if (e.name === "app.approval.required") {
          const v = e.value as PendingApproval;
          if (v?.approvalId) setPendingApproval(v);
        } else if (e.name.startsWith("app.")) {
          dispatchAppAction(e.name, e.value, { navigate: (p) => router.push(p), refresh: () => router.refresh(), toast: pushToast });
        }
        break;
      }
      case "RunError": {
        setError(e.message || "Erreur de l'assistant.");
        setThinking(false);
        break;
      }
      case "RunFinished": {
        setIsRunning(false);
        setThinking(false);
        setActivity(null);
        persist(convId, messagesRef.current);
        break;
      }
      default:
        break;
    }
  }, [router, pushToast, persist]);

  const runStream = useCallback(async (convId: string, forwardedProps?: { approvedAction: PendingApproval }, attachments?: Attachment[]) => {
    setIsRunning(true);
    setThinking(true);
    setError(null);
    abortRef.current = new AbortController();
    const history = messagesRef.current
      .filter((m) => m.content)
      .map((m) => ({ id: m.id, role: m.role, content: m.content }));
    try {
      await runAgUI(
        { threadId: convId, messages: history, state: appContext(), forwardedProps, attachments },
        (e) => handleEvent(e, convId),
        abortRef.current.signal,
        pathname?.startsWith("/admin/roadmap-2") ? "/api/ag-ui/roadmap-2/run" : "/api/ag-ui/run",
      );
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") {
        setError(err instanceof Error ? err.message : "Connexion à l'assistant impossible.");
      }
    } finally {
      setIsRunning(false);
      setThinking(false);
      setActivity(null);
      persist(convId, messagesRef.current);
    }
  }, [appContext, handleEvent, pathname, persist]);

  const sendMessage = useCallback((content: string, attachments?: Attachment[]) => {
    const text = content.trim();
    if (!text || isRunning) return;
    let convId = activeIdRef.current;
    let title: string | undefined;
    if (!convId) {
      const conv = newConversation();
      convId = conv.id;
      title = deriveTitle(text);
      setActiveId(convId);
    }
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      ...(attachments?.length ? { attachmentNames: attachments.map((a) => a.name) } : {}),
    };
    const next = [...messagesRef.current, userMsg];
    setMessages(next);
    messagesRef.current = next;
    persist(convId, next, title);
    void runStream(convId, undefined, attachments);
  }, [isRunning, persist, runStream]);

  const approve = useCallback(() => {
    const pa = pendingApproval;
    const convId = activeIdRef.current;
    if (!pa || !convId) return;
    setPendingApproval(null);
    void runStream(convId, { approvedAction: pa });
  }, [pendingApproval, runStream]);

  const reject = useCallback(() => {
    setPendingApproval(null);
    const note: ChatMessage = { id: crypto.randomUUID(), role: "assistant", content: "Action annulée. Dites-moi si vous souhaitez autre chose." };
    const next = [...messagesRef.current, note];
    setMessages(next);
    if (activeIdRef.current) persist(activeIdRef.current, next);
  }, [persist]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setIsRunning(false);
    setThinking(false);
    setActivity(null);
  }, []);

  return {
    conversations, activeId, messages, isRunning, thinking, activity, error, pendingApproval, toasts,
    newChat, openChat, deleteChat, renameChat, sendMessage, approve, reject, stop, dismissToast,
  };
}

function attachBlock(prev: ChatMessage[], serverId: string | undefined, block: UIBlock): ChatMessage[] {
  const idx = serverId ? prev.findIndex((m) => m.serverId === serverId) : -1;
  if (idx >= 0) {
    const copy = [...prev];
    copy[idx] = { ...copy[idx], blocks: [...(copy[idx].blocks ?? []), block] };
    return copy;
  }
  // sinon, dernier message assistant
  for (let i = prev.length - 1; i >= 0; i--) {
    if (prev[i].role === "assistant") {
      const copy = [...prev];
      copy[i] = { ...copy[i], blocks: [...(copy[i].blocks ?? []), block] };
      return copy;
    }
  }
  return [...prev, { id: crypto.randomUUID(), role: "assistant", content: "", blocks: [block] }];
}
