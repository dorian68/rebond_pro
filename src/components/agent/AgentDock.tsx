"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useAgentConversation } from "@/hooks/useAgentConversation";
import { AgentUIBlockRenderer } from "./AgentUIBlockRenderer";

function AssistantAvatar({ size = 28 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: 8, flex: "none", background: "linear-gradient(140deg,#6a5cf0,#5850ec)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(88,80,236,.35)" }}>
      <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l5-5 4 3 7-8" /><path d="M16 4h4v4" /></svg>
    </div>
  );
}

type Suggestion = { label: string; prompt: string };

/**
 * Contexte du copilote selon la page (cohérent avec resolvePersona côté serveur) :
 * cockpit centre, espace bénéficiaire, portail formateur, admin plateforme, ou site public visiteur.
 * Évite qu'un bénéficiaire ou un visiteur voie des suggestions « centre » (ex : sessions à risque).
 */
function agentContext(pathname: string): { intro: string; suggestions: Suggestion[] } {
  const seg = pathname.split("/").filter(Boolean)[0] ?? "";

  // Espace bénéficiaire (bilan de compétences)
  if (seg === "espace") {
    return {
      intro: "Je vous accompagne dans votre bilan de compétences : suivi de votre parcours et formations adaptées à votre projet.",
      suggestions: [
        { label: "Où en est mon bilan ?", prompt: "Donne-moi l'état d'avancement de mon bilan de compétences." },
        { label: "Une formation pour moi", prompt: "Recommande-moi des formations adaptées à mon projet professionnel." },
        { label: "Comment se déroule le bilan ?", prompt: "Rappelle-moi les étapes du bilan de compétences." },
      ],
    };
  }

  // Portail formateur
  if (seg === "trainer") {
    return {
      intro: "Je vous aide à gérer votre activité de formateur : planning, disponibilités et demandes d'animation.",
      suggestions: [
        { label: "Mon planning", prompt: "Montre-moi mon planning des prochaines sessions." },
        { label: "Mes demandes", prompt: "Quelles demandes d'animation dois-je traiter en priorité ?" },
      ],
    };
  }

  // Admin plateforme (god-mode, lecture seule)
  if (seg === "admin") {
    return {
      intro: "Vue plateforme : je consolide l'activité des centres, formateurs, bénéficiaires et les flux financiers.",
      suggestions: [
        { label: "Vue d'ensemble réseau", prompt: "Donne-moi une vue d'ensemble de la plateforme : centres, formateurs, bénéficiaires." },
        { label: "Flux financiers", prompt: "Résume les flux financiers et les commissions de la plateforme." },
      ],
    };
  }

  // Cockpit centre de formation
  const center: Record<string, Suggestion[]> = {
    dashboard: [
      { label: "Résumer ma semaine", prompt: "Donne-moi un résumé de l'activité et mes priorités de la semaine." },
      { label: "Sessions à risque", prompt: "Quelles sessions sont à risque et que faire ?" },
      { label: "Indicateurs clés", prompt: "Affiche mes indicateurs clés." },
    ],
    formations: [
      { label: "Formations à remplir", prompt: "Quelles formations ont le plus faible remplissage ?" },
      { label: "Chercher une formation", prompt: "Recherche les formations Power BI." },
    ],
    sessions: [
      { label: "Sessions à risque", prompt: "Quelles sessions sont à risque ?" },
      { label: "Meilleurs créneaux", prompt: "Propose les meilleurs créneaux pour une nouvelle session Power BI." },
    ],
    prospects: [
      { label: "Qui relancer ?", prompt: "Quels prospects dois-je relancer en priorité ?" },
      { label: "Voir le pipeline", prompt: "Donne-moi un aperçu de mon pipeline commercial." },
    ],
    planning: [{ label: "Meilleurs créneaux", prompt: "Trouve les meilleurs créneaux pour programmer une session." }],
  };
  if (center[seg]) {
    return { intro: "Je peux analyser votre centre, retrouver des informations, proposer des créneaux et préparer des actions — en toute sécurité.", suggestions: center[seg] };
  }
  const cockpitSegs = ["beneficiaires", "apprenants", "formateurs", "documents", "qualite", "assistant"];
  if (cockpitSegs.includes(seg)) {
    return { intro: "Je peux analyser votre centre, retrouver des informations et préparer des actions — en toute sécurité.", suggestions: center.dashboard };
  }

  // Site public (visiteur) : pages vitrine + accueil
  return {
    intro: "Je réponds à vos questions sur le bilan de compétences, le financement CPF et les formations disponibles.",
    suggestions: [
      { label: "Le bilan de compétences", prompt: "Comment se déroule un bilan de compétences et suis-je éligible au CPF ?" },
      { label: "Trouver une formation", prompt: "Quelles formations sont disponibles dans le catalogue ?" },
    ],
  };
}

export function AgentDock({ bottomOffset = 24 }: { bottomOffset?: number } = {}) {
  const a = useAgentConversation();
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const isLanding = !a.activeId && a.messages.length === 0;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) el.scrollTo({ top: el.scrollHeight });
  }, [a.messages, a.thinking]);

  useEffect(() => { if (open) setTimeout(() => taRef.current?.focus(), 120); }, [open, a.activeId]);

  const submit = (text?: string) => {
    const value = (text ?? draft).trim();
    if (!value) return;
    a.sendMessage(value);
    setDraft("");
    if (taRef.current) taRef.current.style.height = "auto";
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
  };
  const onInput = () => {
    const ta = taRef.current;
    if (ta) { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 140) + "px"; }
  };

  return (
    <>
      {/* Bouton flottant */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Ouvrir l'assistant"
          style={{ position: "fixed", right: 24, bottom: bottomOffset, zIndex: 80, width: 56, height: 56, borderRadius: 18, border: "none", cursor: "pointer", background: "linear-gradient(140deg,#6a5cf0,#5850ec)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 30px rgba(88,80,236,.45)" }}
        >
          <Icon name="sparkles" size={24} />
        </button>
      )}

      {open && (
        <>
          {/* Backdrop mobile */}
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 89, background: "rgba(20,24,35,.25)" }} className="fade-in" />
          <aside
            className="agui-panel"
            role="dialog"
            aria-label="Assistant IA"
            style={{ position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 90, width: "min(440px, 100vw)", background: "var(--surface)", borderLeft: "1px solid var(--border)", boxShadow: "var(--shadow-pop)", display: "flex", flexDirection: "column" }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: "1px solid var(--border-2)" }}>
              <AssistantAvatar size={30} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 14 }}>Assistant RebondPro</div>
                <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{a.isRunning ? (a.activity ?? "réfléchit…") : "Copilote intégré"}</div>
              </div>
              <button className="btn btn-ghost btn-icon" title="Historique" aria-label="Historique" onClick={() => setShowHistory((s) => !s)}><Icon name="message" size={18} /></button>
              <button className="btn btn-ghost btn-icon" title="Nouvelle conversation" aria-label="Nouvelle conversation" onClick={() => { a.newChat(); setShowHistory(false); }}><Icon name="plus" size={18} /></button>
              <button className="btn btn-ghost btn-icon" title="Fermer" aria-label="Fermer" onClick={() => setOpen(false)}><Icon name="x" size={18} /></button>
            </div>

            {/* Historique */}
            {showHistory && (
              <div style={{ borderBottom: "1px solid var(--border-2)", maxHeight: 240, overflowY: "auto", background: "var(--surface-2)" }}>
                <div className="spread" style={{ padding: "10px 14px" }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "var(--ink-2)" }}>Conversations</span>
                  <button className="btn btn-secondary btn-sm" onClick={() => { a.newChat(); setShowHistory(false); }}><Icon name="plus" size={14} /> Nouvelle</button>
                </div>
                {a.conversations.length === 0 && <div className="muted-3" style={{ fontSize: 12.5, padding: "0 14px 12px" }}>Aucune conversation.</div>}
                {a.conversations.map((c) => (
                  <div key={c.id} className="spread" style={{ padding: "8px 14px", gap: 8 }}>
                    <button onClick={() => { a.openChat(c.id); setShowHistory(false); }} style={{ flex: 1, textAlign: "left", background: "none", border: "none", cursor: "pointer", minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: c.id === a.activeId ? 800 : 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</div>
                    </button>
                    <button className="btn btn-ghost btn-icon" style={{ width: 26, height: 26, color: "var(--ink-4)" }} title="Renommer" onClick={() => { const t = prompt("Renommer la conversation", c.title); if (t) a.renameChat(c.id, t); }}><Icon name="edit" size={13} /></button>
                    <button className="btn btn-ghost btn-icon" style={{ width: 26, height: 26, color: "var(--ink-4)" }} title="Supprimer" onClick={() => a.deleteChat(c.id)}><Icon name="x" size={13} /></button>
                  </div>
                ))}
              </div>
            )}

            {/* Corps */}
            <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 16 }}>
              {isLanding ? (
                <Landing pathname={pathname} onPick={(p) => submit(p)} />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {a.messages.map((m) => (
                    <div key={m.id} className="agui-msg" style={{ display: "flex", gap: 9, flexDirection: m.role === "user" ? "row-reverse" : "row", alignItems: "flex-start" }}>
                      {m.role === "assistant" && <AssistantAvatar size={26} />}
                      <div style={{ maxWidth: m.role === "user" ? "82%" : "88%" }}>
                        {m.content && (
                          <div style={{ padding: "9px 13px", borderRadius: 14, fontSize: 13.5, lineHeight: 1.55, whiteSpace: "pre-wrap", background: m.role === "user" ? "var(--primary)" : "var(--surface-3)", color: m.role === "user" ? "#fff" : "var(--ink)", borderTopRightRadius: m.role === "user" ? 4 : 14, borderTopLeftRadius: m.role === "user" ? 14 : 4 }}>
                            {m.content}
                          </div>
                        )}
                        {(m.blocks ?? []).map((b, i) => (
                          <AgentUIBlockRenderer key={i} block={b} onSuggestion={(p) => submit(p)} onApprove={a.approve} onReject={a.reject} />
                        ))}
                      </div>
                    </div>
                  ))}
                  {a.thinking && (
                    <div className="agui-msg" style={{ display: "flex", gap: 9, alignItems: "center" }}>
                      <AssistantAvatar size={26} />
                      <div style={{ padding: "11px 14px", borderRadius: 14, background: "var(--surface-3)", display: "flex", gap: 5, alignItems: "center" }} aria-label="L'assistant réfléchit">
                        <span className="agui-dot" /><span className="agui-dot" style={{ animationDelay: ".15s" }} /><span className="agui-dot" style={{ animationDelay: ".3s" }} />
                      </div>
                    </div>
                  )}
                  {a.error && (
                    <div className="card" style={{ padding: 12, border: "1px solid var(--danger-border)", background: "var(--danger-bg)" }}>
                      <div style={{ fontSize: 12.5, color: "var(--danger-strong)" }}>{a.error}</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Composer */}
            <div style={{ borderTop: "1px solid var(--border-2)", padding: 12 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end", background: "var(--surface-3)", borderRadius: 14, padding: 8, border: "1px solid var(--border)" }}>
                <textarea
                  ref={taRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={onKeyDown}
                  onInput={onInput}
                  rows={1}
                  placeholder="Demandez à l'assistant d'analyser, expliquer ou agir…"
                  aria-label="Message à l'assistant"
                  style={{ flex: 1, resize: "none", border: "none", background: "transparent", outline: "none", fontSize: 13.5, lineHeight: 1.5, maxHeight: 140, color: "var(--ink)", fontFamily: "inherit", padding: "5px 6px" }}
                />
                {a.isRunning ? (
                  <button className="btn btn-secondary btn-icon" onClick={a.stop} title="Arrêter" aria-label="Arrêter"><Icon name="x" size={16} /></button>
                ) : (
                  <button className="btn btn-primary btn-icon" onClick={() => submit()} disabled={!draft.trim()} title="Envoyer" aria-label="Envoyer"><Icon name="send" size={16} /></button>
                )}
              </div>
              <div style={{ fontSize: 10.5, color: "var(--ink-4)", textAlign: "center", marginTop: 6 }}>L&apos;assistant peut se tromper. Les actions sensibles demandent votre validation.</div>
            </div>
          </aside>

          {/* Toasts */}
          <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", zIndex: 95, display: "flex", flexDirection: "column", gap: 8 }}>
            {a.toasts.map((t) => (
              <div key={t.id} onClick={() => a.dismissToast(t.id)} className="fade-up" style={{ padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer", background: t.type === "error" ? "var(--danger)" : t.type === "success" ? "var(--positive)" : t.type === "warn" ? "var(--warn-strong)" : "var(--ink)" }}>{t.message}</div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function Landing({ pathname, onPick }: { pathname: string; onPick: (prompt: string) => void }) {
  const { intro, suggestions } = agentContext(pathname);
  return (
    <div className="fade-up" style={{ textAlign: "center", padding: "28px 12px" }}>
      <div style={{ display: "inline-flex", marginBottom: 14 }}><AssistantAvatar size={48} /></div>
      <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Comment puis-je vous aider ?</h3>
      <p style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5, maxWidth: 320, margin: "0 auto 20px" }}>
        {intro}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, textAlign: "left" }}>
        {suggestions.map((s, i) => (
          <button key={i} onClick={() => onPick(s.prompt)} className="card" style={{ padding: "11px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", textAlign: "left", background: "var(--surface)" }}>
            <span style={{ width: 26, height: 26, borderRadius: 7, background: "var(--primary-50)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Icon name="sparkles" size={14} /></span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{s.label}</span>
            <Icon name="arrow-right" size={15} style={{ marginLeft: "auto", color: "var(--ink-4)" }} />
          </button>
        ))}
      </div>
    </div>
  );
}
