"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { assistantChat, weeklySummary, businessRecommendations, generateQuestionnaire, type AiText } from "@/server/ai-actions";

type Msg = { role: "user" | "assistant"; content: string };

const ACTIONS = [
  { id: "summary", label: "Résumé hebdomadaire", icon: "list-checks", user: "Génère le résumé d'activité de la semaine." },
  { id: "reco", label: "Recommandations business", icon: "trending-up", user: "Quelles actions business prioritaires me recommandes-tu ?" },
  { id: "questionnaire", label: "Questionnaire satisfaction", icon: "clipboard", user: "Génère un questionnaire de satisfaction." },
];

export function AssistantClient({ aiEnabled, firstFormation, userName }: { aiEnabled: boolean; firstFormation: { id: string; title: string } | null; userName: string | null }) {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: `Bonjour ${userName ?? ""} 👋 Je suis votre assistant de pilotage. Demandez-moi un résumé d'activité, des recommandations, ou utilisez les actions ci-dessous.` },
  ]);
  const [input, setInput] = useState("");
  const [pending, start] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight); }, [messages, pending]);

  const append = (m: Msg) => setMessages((prev) => [...prev, m]);

  const runAction = (actionId: string) => {
    const action = ACTIONS.find((a) => a.id === actionId)!;
    append({ role: "user", content: action.label });
    start(async () => {
      let r: AiText;
      if (actionId === "summary") r = await weeklySummary();
      else if (actionId === "reco") r = await businessRecommendations();
      else r = await generateQuestionnaire(firstFormation?.title ?? "votre formation");
      append({ role: "assistant", content: r.text });
    });
  };

  const send = () => {
    const text = input.trim();
    if (!text || pending) return;
    const history: Msg[] = [...messages.filter((m) => m.role === "user" || m.role === "assistant"), { role: "user", content: text }];
    append({ role: "user", content: text });
    setInput("");
    start(async () => {
      const r = await assistantChat(history.slice(-10));
      append({ role: "assistant", content: r.text });
    });
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16, alignItems: "start" }}>
      {/* Chat */}
      <div className="card" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 220px)", minHeight: 420 }}>
        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", gap: 10, flexDirection: m.role === "user" ? "row-reverse" : "row" }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: m.role === "user" ? "var(--surface-3)" : "linear-gradient(135deg,#2f9488,#2469a6)", color: m.role === "user" ? "var(--ink-2)" : "#fff" }}>
                <Icon name={m.role === "user" ? "user" : "sparkles"} size={15} />
              </div>
              <div style={{ maxWidth: "78%", padding: "10px 14px", borderRadius: 12, fontSize: 13.5, lineHeight: 1.55, whiteSpace: "pre-wrap", background: m.role === "user" ? "var(--primary)" : "var(--surface-3)", color: m.role === "user" ? "#fff" : "var(--ink)" }}>
                {m.content}
              </div>
            </div>
          ))}
          {pending && <div style={{ display: "flex", gap: 6, paddingLeft: 40, color: "var(--ink-3)", fontSize: 13 }}>L&apos;assistant réfléchit…</div>}
        </div>
        <div style={{ borderTop: "1px solid var(--border-2)", padding: 14, display: "flex", gap: 8 }}>
          <input className="input" placeholder="Posez votre question…" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} />
          <button className="btn btn-primary" onClick={send} disabled={pending || !input.trim()}><Icon name="send" size={16} /></button>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {!aiEnabled && (
          <div className="card card-pad" style={{ background: "var(--warn-bg)", border: "1px solid var(--warn-border)", fontSize: 12.5, color: "var(--warn-strong)" }}>
            Mode hors-ligne : ajoutez <strong>ANTHROPIC_API_KEY</strong> dans <code>.env.local</code> pour activer l&apos;IA. Les actions renvoient des modèles en attendant.
          </div>
        )}
        <div className="card card-pad">
          <h3 style={{ fontSize: 13, fontWeight: 800, marginBottom: 12 }}>Actions rapides</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {ACTIONS.map((a) => (
              <button key={a.id} className="btn btn-secondary btn-sm" style={{ justifyContent: "flex-start", width: "100%" }} onClick={() => runAction(a.id)} disabled={pending}>
                <Icon name={a.icon} size={15} /> {a.label}
              </button>
            ))}
            <Link href="/prospects" className="btn btn-secondary btn-sm" style={{ justifyContent: "flex-start", width: "100%" }}><Icon name="send" size={15} /> Rédiger une relance</Link>
            <Link href="/planning" className="btn btn-secondary btn-sm" style={{ justifyContent: "flex-start", width: "100%" }}><Icon name="wand" size={15} /> Créneaux optimaux</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
