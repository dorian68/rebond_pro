"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useAgentConversation } from "@/hooks/useAgentConversation";
import { AgentUIBlockRenderer } from "./AgentUIBlockRenderer";
import { extractFileContent, type ExtractionResult } from "@/lib/ag-ui/file-extractor";

// ── Inline markdown parser ───────────────────────────────────────────────────
function parseInline(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let rem = text;
  let k = 0;
  while (rem) {
    let m: RegExpMatchArray | null;
    // Bold + italic ***
    if ((m = rem.match(/^(.*?)\*\*\*([^*]+?)\*\*\*/))) {
      if (m[1]) out.push(m[1]);
      out.push(<strong key={k++}><em>{m[2]}</em></strong>);
      rem = rem.slice(m[0].length); continue;
    }
    // Bold **
    if ((m = rem.match(/^(.*?)\*\*([^*]+?)\*\*/))) {
      if (m[1]) out.push(m[1]);
      out.push(<strong key={k++}>{m[2]}</strong>);
      rem = rem.slice(m[0].length); continue;
    }
    // Italic *
    if ((m = rem.match(/^(.*?)\*([^*\n]+?)\*/))) {
      if (m[1]) out.push(m[1]);
      out.push(<em key={k++}>{m[2]}</em>);
      rem = rem.slice(m[0].length); continue;
    }
    // Inline code
    if ((m = rem.match(/^(.*?)`([^`]+)`/))) {
      if (m[1]) out.push(m[1]);
      out.push(
        <code key={k++} style={{ fontSize: "0.87em", background: "var(--surface-2)", borderRadius: 4, padding: "1px 6px", fontFamily: "monospace", color: "var(--primary)" }}>
          {m[2]}
        </code>
      );
      rem = rem.slice(m[0].length); continue;
    }
    out.push(rem); break;
  }
  return out;
}

// ── Block markdown component (applied to assistant messages only) ─────────────
function MarkdownContent({ text }: { text: string }) {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    let m: RegExpMatchArray | null;

    // Fenced code block
    if (line.startsWith("```")) {
      const code: string[] = []; i++;
      while (i < lines.length && !lines[i].startsWith("```")) { code.push(lines[i]); i++; }
      nodes.push(
        <pre key={`cb${i}`} style={{ background: "var(--surface-2)", borderRadius: 8, padding: "10px 12px", overflowX: "auto", margin: "6px 0", fontSize: 12, fontFamily: "monospace", lineHeight: 1.55 }}>
          <code>{code.join("\n")}</code>
        </pre>
      );
      i++; continue;
    }

    // Headings
    if ((m = line.match(/^### (.+)/))) {
      nodes.push(<div key={i} style={{ fontWeight: 800, fontSize: 13, marginTop: 10, marginBottom: 2, color: "var(--ink)" }}>{parseInline(m[1])}</div>);
      i++; continue;
    }
    if ((m = line.match(/^## (.+)/))) {
      nodes.push(<div key={i} style={{ fontWeight: 800, fontSize: 14, marginTop: 12, marginBottom: 4, paddingBottom: 4, borderBottom: "1px solid var(--border-2)", color: "var(--ink)" }}>{parseInline(m[1])}</div>);
      i++; continue;
    }
    if ((m = line.match(/^# (.+)/))) {
      nodes.push(<div key={i} style={{ fontWeight: 800, fontSize: 15, marginTop: 14, marginBottom: 6, color: "var(--ink)" }}>{parseInline(m[1])}</div>);
      i++; continue;
    }

    // Ordered list — collect consecutive items
    if (line.match(/^\d+\.\s/)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && lines[i].match(/^\d+\.\s/)) {
        const t = lines[i].replace(/^\d+\.\s/, "");
        items.push(<li key={i} style={{ marginBottom: 2 }}>{parseInline(t)}</li>);
        i++;
      }
      nodes.push(<ol key={`ol${i}`} style={{ paddingLeft: 22, margin: "4px 0", display: "flex", flexDirection: "column", gap: 1 }}>{items}</ol>);
      continue;
    }

    // Bullet list — collect consecutive items
    if (line.match(/^[-*•]\s/)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && lines[i].match(/^[-*•]\s/)) {
        const t = lines[i].replace(/^[-*•]\s/, "");
        items.push(<li key={i} style={{ marginBottom: 2 }}>{parseInline(t)}</li>);
        i++;
      }
      nodes.push(<ul key={`ul${i}`} style={{ paddingLeft: 18, margin: "4px 0", listStyle: "disc", display: "flex", flexDirection: "column", gap: 1 }}>{items}</ul>);
      continue;
    }

    // Divider
    if (line.match(/^---+$/)) {
      nodes.push(<hr key={i} style={{ border: "none", borderTop: "1px solid var(--border-2)", margin: "8px 0" }} />);
      i++; continue;
    }

    // Empty line — small gap
    if (!line.trim()) {
      nodes.push(<div key={i} style={{ height: 6 }} />);
      i++; continue;
    }

    // Regular line
    nodes.push(<span key={i} style={{ display: "block", lineHeight: 1.6 }}>{parseInline(line)}</span>);
    i++;
  }
  return <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>{nodes}</div>;
}

// ── Socrate avatar ───────────────────────────────────────────────────────────
function SocrateAvatar({ size = 28 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: Math.round(size * 0.3), flex: "none",
      background: "linear-gradient(140deg,#2f9488,#2469a6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: `0 2px 10px rgba(36,105,166,.4)`,
    }}>
      {/* Stylised "S" — serif italic, the hallmark of Socratic thought */}
      <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 20 20">
        <text x="10" y="15" textAnchor="middle" fontSize="15" fontWeight="bold" fontStyle="italic" fill="#fff" fontFamily="Georgia, 'Times New Roman', serif">S</text>
      </svg>
    </div>
  );
}

// ── Education quotes for nudge bubbles ──────────────────────────────────────
const NUDGE_QUOTES = [
  { q: "« L'éducation est l'arme la plus puissante pour changer le monde. »", a: "Nelson Mandela" },
  { q: "« La connaissance s'acquiert par l'expérience, tout le reste n'est que de l'information. »", a: "Albert Einstein" },
  { q: "« Celui qui ouvre une école ferme une prison. »", a: "Victor Hugo" },
  { q: "« Investis dans ton savoir. Il rapporte les meilleurs intérêts. »", a: "Benjamin Franklin" },
  { q: "« Il n'y a pas de vent favorable pour celui qui ne sait pas où il va. »", a: "Sénèque" },
  { q: "« Le vrai voyage de découverte ne consiste pas à chercher de nouveaux paysages, mais à avoir de nouveaux yeux. »", a: "Marcel Proust" },
  { q: "« Chaque expert a d'abord été un débutant. »", a: "Helen Hayes" },
  { q: "« La plus grande gloire n'est pas de ne jamais tomber, mais de se relever à chaque chute. »", a: "Confucius" },
];
const NUDGE_COUNT_KEY = "socrate-nudge-count";
const NUDGE_LAST_KEY = "socrate-nudge-last";
const NUDGE_MAX = 30; // nudges autorisées par session
const NUDGE_DELAY_FIRST = 3_000; // 3s premier nudge
const NUDGE_DELAY_REPEAT = 15_000; // 15s entre nudges suivants
// NB : les bulles s'arrêtent dès que l'utilisateur ouvre le chat (bulle ou bouton flottant)
// → cf. dismiss(true) et le onClick du FAB qui écrivent NUDGE_COUNT_KEY = NUDGE_MAX.

function NudgeBubble({ onOpen, bottomOffset }: { onOpen: () => void; bottomOffset: number }) {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const [quote] = useState(() => NUDGE_QUOTES[Math.floor(Math.random() * NUDGE_QUOTES.length)]);

  const nudgeCount = useRef(0);

  const dismiss = useCallback((opened = false) => {
    setFading(true);
    setTimeout(() => {
      setVisible(false);
      try {
        const next = nudgeCount.current + 1;
        sessionStorage.setItem(NUDGE_COUNT_KEY, String(next));
        sessionStorage.setItem(NUDGE_LAST_KEY, String(Date.now()));
        if (opened) sessionStorage.setItem(NUDGE_COUNT_KEY, String(NUDGE_MAX)); // user engaged → stop
      } catch { /* ignore */ }
    }, 280);
  }, []);

  useEffect(() => {
    let count = 0;
    let last = 0;
    try {
      count = parseInt(sessionStorage.getItem(NUDGE_COUNT_KEY) ?? "0") || 0;
      last = parseInt(sessionStorage.getItem(NUDGE_LAST_KEY) ?? "0") || 0;
    } catch { return; }
    nudgeCount.current = count;
    if (count >= NUDGE_MAX) return;
    const elapsed = Date.now() - last;
    const delay = count === 0 ? NUDGE_DELAY_FIRST : Math.max(0, NUDGE_DELAY_REPEAT - elapsed);
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, []); // intentional empty deps: read sessionStorage once on mount

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => dismiss(), 9000);
    return () => clearTimeout(t);
  }, [visible, dismiss]);

  if (!visible) return null;

  return (
    <div
      onClick={() => { dismiss(true); onOpen(); }}
      style={{
        position: "fixed", right: 16, bottom: bottomOffset + 56, zIndex: 79,
        width: 268,
        background: "rgba(255,255,255,.97)",
        backdropFilter: "blur(16px)",
        borderRadius: 16,
        padding: "14px 16px 14px",
        boxShadow: "0 12px 40px rgba(21,49,76,.16), 0 0 0 1px rgba(21,49,76,.07)",
        cursor: "pointer",
        opacity: fading ? 0 : 1,
        transform: fading ? "translateY(6px)" : "translateY(0)",
        transition: "opacity .3s ease, transform .3s ease",
      }}
    >
      {/* Dismiss × */}
      <button
        onClick={(e) => { e.stopPropagation(); dismiss(false); }}
        style={{ position: "absolute", top: 8, right: 8, background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 4, display: "flex", color: "rgba(21,49,76,.3)", lineHeight: 1 }}
        aria-label="Fermer"
      >
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1.5 1.5l8 8M9.5 1.5l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
      </button>

      {/* Quote */}
      <p style={{ fontSize: 12, lineHeight: 1.6, color: "#15314C", fontStyle: "italic", margin: "0 18px 6px 0", fontFamily: "Georgia, serif" }}>
        {quote.q}
      </p>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".09em", textTransform: "uppercase", color: "#2C8E86", marginBottom: 12 }}>
        — {quote.a}
      </div>

      {/* CTA */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "#2469a6", fontWeight: 700 }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        Discuter avec Socrate
      </div>

      {/* Arrow pointer pointing down toward the button */}
      <div style={{ position: "absolute", bottom: -8, right: 32, width: 0, height: 0, borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderTop: "8px solid rgba(255,255,255,.97)" }} />
    </div>
  );
}

// ── Agent context (inchangé) ─────────────────────────────────────────────────
type Suggestion = { label: string; prompt: string };

function agentContext(pathname: string): { intro: string; suggestions: Suggestion[] } {
  const seg = pathname.split("/").filter(Boolean)[0] ?? "";

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

  if (seg === "trainer") {
    return {
      intro: "Je vous aide à gérer votre activité de formateur : planning, disponibilités et demandes d'animation.",
      suggestions: [
        { label: "Mon planning", prompt: "Montre-moi mon planning des prochaines sessions." },
        { label: "Mes demandes", prompt: "Quelles demandes d'animation dois-je traiter en priorité ?" },
      ],
    };
  }

  if (seg === "admin") {
    return {
      intro: "Vue plateforme : je consolide l'activité des centres, formateurs, bénéficiaires et les flux financiers.",
      suggestions: [
        { label: "Vue d'ensemble réseau", prompt: "Donne-moi une vue d'ensemble de la plateforme : centres, formateurs, bénéficiaires." },
        { label: "Flux financiers", prompt: "Résume les flux financiers et les commissions de la plateforme." },
      ],
    };
  }

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

  return {
    intro: "Je réponds à vos questions sur le bilan de compétences, le financement CPF et les formations disponibles.",
    suggestions: [
      { label: "Le bilan de compétences", prompt: "Comment se déroule un bilan de compétences et suis-je éligible au CPF ?" },
      { label: "Trouver une formation", prompt: "Quelles formations sont disponibles dans le catalogue ?" },
    ],
  };
}

// ── Landing screen ───────────────────────────────────────────────────────────
function Landing({ pathname, onPick }: { pathname: string; onPick: (prompt: string) => void }) {
  const { intro, suggestions } = agentContext(pathname);
  return (
    <div className="fade-up" style={{ textAlign: "center", padding: "28px 12px" }}>
      <div style={{ display: "inline-flex", marginBottom: 16 }}>
        <SocrateAvatar size={52} />
      </div>

      <h3 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 21, fontWeight: 400, fontStyle: "italic", margin: "0 0 8px", color: "var(--ink)", letterSpacing: "-.01em" }}>
        Posez-moi une question.
      </h3>

      {/* Agentic identity tag */}
      <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginBottom: 14, background: "var(--primary-50)", borderRadius: 100, padding: "4px 10px" }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#5FB14E", flexShrink: 0, display: "inline-block" }} />
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--primary)" }}>
          Agent IA · accès données · actions temps réel
        </span>
      </div>

      <p style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.55, maxWidth: 310, margin: "0 auto 22px" }}>
        {intro}
      </p>

      {/* Suggestion chips — inchangés */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, textAlign: "left" }}>
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => onPick(s.prompt)}
            className="card"
            style={{ padding: "11px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", textAlign: "left", background: "var(--surface)", transition: "transform .15s, box-shadow .15s" }}
          >
            <span style={{ width: 26, height: 26, borderRadius: 7, background: "var(--primary-50)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
              <Icon name="sparkles" size={14} />
            </span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{s.label}</span>
            <Icon name="arrow-right" size={15} style={{ marginLeft: "auto", color: "var(--ink-4)" }} />
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main AgentDock component ─────────────────────────────────────────────────
export function AgentDock({
  bottomOffset = 24,
  accentGradient = "linear-gradient(140deg,#2f9488,#2469a6)",
  accentShadow = "rgba(36,105,166,.45)",
}: { bottomOffset?: number; accentGradient?: string; accentShadow?: string } = {}) {
  const a = useAgentConversation();
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [draft, setDraft] = useState("");
  const [extractions, setExtractions] = useState<ExtractionResult[]>([]);
  const [extracting, setExtracting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    const hasFiles = extractions.length > 0;
    if (!value && !hasFiles) return;

    // Sépare les extractions texte (Route A) des visions (Route B)
    const textRoutes = extractions.filter((r) => r.mode === "text");
    const visionRoutes = extractions.filter((r) => r.mode === "vision");

    // Construit le bloc texte à injecter dans le message (Route A — 0 token vision)
    const textBlock = textRoutes.length > 0
      ? "\n\n" + textRoutes.map((r) =>
          `---\n📄 **${r.filename}** — ${r.pageCount} page(s) extraites sans vision (${(r.charCount ?? 0).toLocaleString()} caractères)\n\n${r.extractedText}\n---`
        ).join("\n\n")
      : "";

    const finalText = (value || "Peux-tu analyser ce(s) document(s) dans le cadre d'un bilan de compétences ?") + textBlock;

    // Noms affichés dans l'historique (mode indiqué)
    const attachmentNames = extractions.map((r) =>
      r.mode === "text" ? `📄 ${r.filename} (texte extrait)` : `📎 ${r.filename} (vision)`
    );

    // Route B uniquement pour les pièces jointes vision
    const visionAttachments = visionRoutes.map((r) => r.attachment!).filter(Boolean);

    a.sendMessage(finalText, visionAttachments.length > 0 ? visionAttachments : undefined);
    // Override attachmentNames sur le dernier message (hook ne l'expose pas directement,
    // les noms sont déjà inclus dans le texte et dans le bloc textuel — suffisant pour l'UX)
    void attachmentNames; // référencé pour éviter le warning unused

    setDraft("");
    setExtractions([]);
    if (taRef.current) taRef.current.style.height = "auto";
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
  };
  const onInput = () => {
    const ta = taRef.current;
    if (ta) { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 140) + "px"; }
  };

  const onFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    const MAX = 5 * 1024 * 1024;
    const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    const valid = files.filter((f) => (ALLOWED.includes(f.type) || f.name.toLowerCase().endsWith(".docx")) && f.size <= MAX);
    if (!valid.length) return;

    setExtracting(true);
    try {
      const results = await Promise.all(valid.map(extractFileContent));
      setExtractions((prev) => [...prev, ...results].slice(0, 5));
    } catch {
      // Silently skip failed extractions
    } finally {
      setExtracting(false);
    }
  };

  return (
    <>
      {/* ── Keyframes injected once ── */}
      <style>{`
        @keyframes socrate-glow {
          0%,100% { box-shadow: 0 8px 24px ${accentShadow}; }
          50%      { box-shadow: 0 8px 32px ${accentShadow}, 0 0 0 6px rgba(36,105,166,.10); }
        }
        @keyframes socrate-pulse {
          0%,100% { opacity:1; transform:scale(1); }
          50%     { opacity:.55; transform:scale(.78); }
        }
        .socrate-fab { animation: socrate-glow 3.2s ease-in-out infinite; }
        .socrate-dot { display:inline-block; width:7px; height:7px; border-radius:50%; background:#5FB14E; animation: socrate-pulse 2.2s ease-in-out infinite; flex-shrink:0; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* ── Nudge bubble (hidden after first session interaction) ── */}
      {!open && <NudgeBubble onOpen={() => setOpen(true)} bottomOffset={bottomOffset} />}

      {/* ── Floating pill button ── */}
      {!open && (
        <button
          className="socrate-fab"
          onClick={() => { setOpen(true); try { sessionStorage.setItem(NUDGE_COUNT_KEY, String(NUDGE_MAX)); } catch { /* ignore */ } }}
          aria-label="Ouvrir Socrate"
          style={{
            position: "fixed", right: 20, bottom: bottomOffset, zIndex: 80,
            height: 44, padding: "0 16px 0 14px",
            borderRadius: 100, border: "none", cursor: "pointer",
            background: accentGradient, color: "#fff",
            display: "flex", alignItems: "center", gap: 8,
            fontFamily: "inherit", fontWeight: 700, fontSize: 13.5,
            letterSpacing: "-.01em",
          }}
        >
          <Icon name="sparkles" size={16} />
          <span>Socrate</span>
          <span className="socrate-dot" />
        </button>
      )}

      {open && (
        <>
          {/* Backdrop mobile */}
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 89, background: "rgba(20,24,35,.22)" }} className="fade-in" />

          <aside
            className="agui-panel"
            role="dialog"
            aria-label="Socrate — Intelligence agentique"
            style={{ position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 90, width: "min(440px, 100vw)", background: "var(--surface)", borderLeft: "1px solid var(--border)", boxShadow: "var(--shadow-pop)", display: "flex", flexDirection: "column" }}
          >
            {/* ── Header gradient premium ── */}
            <div style={{
              background: "linear-gradient(135deg, #15314C 0%, #1d5e58 100%)",
              padding: "13px 14px",
              display: "flex", alignItems: "center", gap: 10,
              borderBottom: "1px solid rgba(255,255,255,.07)",
              flexShrink: 0,
            }}>
              <SocrateAvatar size={32} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#fff", letterSpacing: "-.02em", lineHeight: 1.2 }}>Socrate</div>
                <div style={{ fontSize: 10, letterSpacing: ".07em", textTransform: "uppercase", marginTop: 2, color: a.isRunning ? "#5FB14E" : "rgba(255,255,255,.45)" }}>
                  {a.isRunning ? (a.activity ?? "Analyse en cours…") : "Intelligence agentique · Le Bon Rebond"}
                </div>
              </div>
              <button className="btn btn-ghost btn-icon" style={{ color: "rgba(255,255,255,.55)" }} title="Historique" aria-label="Historique" onClick={() => setShowHistory((s) => !s)}>
                <Icon name="message" size={18} />
              </button>
              <button className="btn btn-ghost btn-icon" style={{ color: "rgba(255,255,255,.55)" }} title="Nouvelle conversation" aria-label="Nouvelle conversation" onClick={() => { a.newChat(); setShowHistory(false); }}>
                <Icon name="plus" size={18} />
              </button>
              <button className="btn btn-ghost btn-icon" style={{ color: "rgba(255,255,255,.55)" }} title="Fermer" aria-label="Fermer" onClick={() => setOpen(false)}>
                <Icon name="x" size={18} />
              </button>
            </div>

            {/* ── Historique ── */}
            {showHistory && (
              <div style={{ borderBottom: "1px solid var(--border-2)", maxHeight: 240, overflowY: "auto", background: "var(--surface-2)", flexShrink: 0 }}>
                <div className="spread" style={{ padding: "10px 14px" }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "var(--ink-2)" }}>Conversations</span>
                  <button className="btn btn-secondary btn-sm" onClick={() => { a.newChat(); setShowHistory(false); }}><Icon name="plus" size={14} /> Nouvelle</button>
                </div>
                {a.conversations.length === 0 && (
                  <div className="muted-3" style={{ fontSize: 12.5, padding: "0 14px 12px" }}>Aucune conversation.</div>
                )}
                {a.conversations.map((c) => (
                  <div key={c.id} className="spread" style={{ padding: "8px 14px", gap: 8 }}>
                    <button onClick={() => { a.openChat(c.id); setShowHistory(false); }} style={{ flex: 1, textAlign: "left", background: "none", border: "none", cursor: "pointer", minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: c.id === a.activeId ? 800 : 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</div>
                    </button>
                    <button className="btn btn-ghost btn-icon" style={{ width: 26, height: 26, color: "var(--ink-4)" }} title="Renommer" onClick={() => { const t = prompt("Renommer la conversation", c.title); if (t) a.renameChat(c.id, t); }}>
                      <Icon name="edit" size={13} />
                    </button>
                    <button className="btn btn-ghost btn-icon" style={{ width: 26, height: 26, color: "var(--ink-4)" }} title="Supprimer" onClick={() => a.deleteChat(c.id)}>
                      <Icon name="x" size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* ── Corps ── */}
            <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 16 }}>
              {isLanding ? (
                <Landing pathname={pathname} onPick={(p) => submit(p)} />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {a.messages.map((m) => (
                    <div key={m.id} className="agui-msg" style={{ display: "flex", gap: 9, flexDirection: m.role === "user" ? "row-reverse" : "row", alignItems: "flex-start" }}>
                      {m.role === "assistant" && <SocrateAvatar size={26} />}
                      <div style={{ maxWidth: m.role === "user" ? "82%" : "88%", display: "flex", flexDirection: "column", gap: 4, alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
                        {/* Attachment name chips on user messages */}
                        {m.role === "user" && (m.attachmentNames ?? []).length > 0 && (
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
                            {(m.attachmentNames ?? []).map((name, i) => (
                              <span key={i} style={{ fontSize: 10.5, background: "var(--primary-50)", color: "var(--primary)", borderRadius: 6, padding: "2px 7px", fontWeight: 700 }}>
                                📎 {name}
                              </span>
                            ))}
                          </div>
                        )}
                        {m.content && (
                          <div style={{
                            padding: "9px 13px", borderRadius: 14, fontSize: 13.5, lineHeight: 1.55,
                            background: m.role === "user" ? "var(--primary)" : "var(--surface-3)",
                            color: m.role === "user" ? "#fff" : "var(--ink)",
                            borderTopRightRadius: m.role === "user" ? 4 : 14,
                            borderTopLeftRadius: m.role === "user" ? 14 : 4,
                          }}>
                            {m.role === "assistant" ? (
                              <MarkdownContent text={m.content} />
                            ) : (
                              m.content
                            )}
                          </div>
                        )}
                        {(m.blocks ?? []).map((b, i) => (
                          <AgentUIBlockRenderer key={i} block={b} onSuggestion={(p) => submit(p)} onApprove={a.approve} onReject={a.reject} />
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Thinking dots */}
                  {a.thinking && (
                    <div className="agui-msg" style={{ display: "flex", gap: 9, alignItems: "center" }}>
                      <SocrateAvatar size={26} />
                      <div style={{ padding: "11px 14px", borderRadius: 14, background: "var(--surface-3)", display: "flex", gap: 5, alignItems: "center" }} aria-label="Socrate réfléchit">
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

            {/* ── Composer ── */}
            <div style={{ borderTop: "1px solid var(--border-2)", padding: 12, flexShrink: 0 }}>
              {/* Fichiers — chips avec indicateur de route (A=texte / B=vision) */}
              {(extractions.length > 0 || extracting) && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                  {extractions.map((r, i) => {
                    const isText = r.mode === "text";
                    const isImg = r.mimeType.startsWith("image/");
                    const preview = isImg && r.attachment ? `data:${r.mimeType};base64,${r.attachment.data}` : null;
                    return (
                      <div
                        key={i}
                        title={r.routingReason}
                        style={{ display: "flex", alignItems: "center", gap: 5, background: isText ? "rgba(47,148,136,.08)" : "var(--surface-2)", border: `1px solid ${isText ? "rgba(47,148,136,.3)" : "var(--border)"}`, borderRadius: 8, padding: "4px 6px 4px 5px", maxWidth: 220 }}
                      >
                        {/* Thumbnail / icône */}
                        {preview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={preview} alt="" style={{ width: 24, height: 24, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 24, height: 24, borderRadius: 4, background: isText ? "rgba(47,148,136,.15)" : "#dc264318", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {isText
                              ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2f9488" strokeWidth="2.2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
                              : <Icon name="file-pdf" size={13} style={{ color: "#dc2643" }} />}
                          </div>
                        )}

                        {/* Nom + badge route */}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 120, color: "var(--ink)" }}>{r.filename}</div>
                          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: ".06em", color: isText ? "#2f9488" : "var(--ink-3)" }}>
                            {isText
                              ? `TEXTE • ${(r.charCount ?? 0).toLocaleString()} c`
                              : `VISION • ${r.pageCount ? `${r.pageCount}p` : "img"}`}
                          </div>
                        </div>

                        {/* Supprimer */}
                        <button onClick={() => setExtractions((p) => p.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "var(--ink-4)", display: "flex", borderRadius: 3, flexShrink: 0 }}>
                          <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                        </button>
                      </div>
                    );
                  })}

                  {/* Spinner pendant l'extraction */}
                  {extracting && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "4px 10px", fontSize: 11, color: "var(--ink-3)", fontWeight: 600 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" style={{ animation: "spin 1s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                      Analyse du fichier…
                    </div>
                  )}
                </div>
              )}

              {/* Input row */}
              <div style={{ display: "flex", gap: 6, alignItems: "flex-end", background: "var(--surface-3)", borderRadius: 14, padding: "6px 8px", border: "1px solid var(--border)" }}>
                {/* Paperclip */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  title="Joindre un fichier (image ou PDF)"
                  aria-label="Joindre un fichier"
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 5, color: "var(--ink-3)", display: "flex", borderRadius: 6, flexShrink: 0 }}
                >
                  <Icon name="paperclip" size={18} />
                </button>
                <input ref={fileInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx" onChange={onFilePick} style={{ display: "none" }} />

                <textarea
                  ref={taRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={onKeyDown}
                  onInput={onInput}
                  rows={1}
                  placeholder="Demandez à Socrate d'analyser, expliquer ou agir…"
                  aria-label="Message à Socrate"
                  style={{ flex: 1, resize: "none", border: "none", background: "transparent", outline: "none", fontSize: 13.5, lineHeight: 1.5, maxHeight: 140, color: "var(--ink)", fontFamily: "inherit", padding: "4px 4px" }}
                />
                {a.isRunning ? (
                  <button className="btn btn-secondary btn-icon" onClick={a.stop} title="Arrêter" aria-label="Arrêter"><Icon name="x" size={16} /></button>
                ) : (
                  <button className="btn btn-primary btn-icon" onClick={() => submit()} disabled={(!draft.trim() && extractions.length === 0) || extracting} title="Envoyer" aria-label="Envoyer"><Icon name="send" size={16} /></button>
                )}
              </div>
              <div style={{ fontSize: 10, color: "var(--ink-4)", textAlign: "center", marginTop: 6 }}>
                Socrate peut analyser vos CV, offres d'emploi ou documents PDF · Les actions sensibles demandent votre validation.
              </div>
            </div>
          </aside>

          {/* ── Toasts ── */}
          <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", zIndex: 95, display: "flex", flexDirection: "column", gap: 8 }}>
            {a.toasts.map((t) => (
              <div key={t.id} onClick={() => a.dismissToast(t.id)} className="fade-up" style={{ padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer", background: t.type === "error" ? "var(--danger)" : t.type === "success" ? "var(--positive)" : t.type === "warn" ? "var(--warn-strong)" : "var(--ink)" }}>
                {t.message}
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
