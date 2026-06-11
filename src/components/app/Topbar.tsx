"use client";

import { useState, useEffect, useRef, useCallback, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { AlertGlyph } from "@/components/ui/primitives";
import { PAGE_TITLES } from "@/lib/nav";
import type { SearchResult } from "@/app/api/search/route";

export type TopNotif = { id: string; type: string; icon: string; title: string; text: string };

const TYPE_ICONS: Record<string, string> = { formation: "book-open", session: "calendar", prospect: "target", learner: "grad", trainer: "user" };
const TYPE_LABELS: Record<string, string> = { formation: "Formation", session: "Session", prospect: "Prospect", learner: "Apprenant", trainer: "Formateur" };

function titleFromPath(pathname: string): string {
  const seg = pathname.split("/").filter(Boolean)[0] ?? "dashboard";
  return PAGE_TITLES[seg] ?? "Le Bon Rebond";
}

function SearchModal({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [focused, setFocused] = useState(0);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (q.length < 2) { setResults([]); return; }
      startTransition(async () => {
        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
          const data = await res.json();
          setResults(data);
          setFocused(0);
        } catch { /* ignore */ }
      });
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  const navigate = useCallback((url: string) => { router.push(url); onClose(); }, [router, onClose]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") { e.preventDefault(); setFocused((f) => Math.min(f + 1, results.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setFocused((f) => Math.max(f - 1, 0)); }
      if (e.key === "Enter" && results[focused]) navigate(results[focused].url);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [results, focused, navigate, onClose]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 80 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.4)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div className="fade-up" style={{ position: "relative", width: "100%", maxWidth: 560, background: "var(--surface)", borderRadius: 16, boxShadow: "var(--shadow-pop)", overflow: "hidden", zIndex: 201 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
          <Icon name="search" size={18} style={{ color: "var(--ink-3)" }} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher formation, session, prospect, apprenant…"
            style={{ flex: 1, border: "none", outline: "none", fontSize: 16, background: "transparent", color: "var(--ink)" }}
          />
          <kbd style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-3)", background: "var(--surface-3)", border: "1px solid var(--border)", borderRadius: 6, padding: "3px 7px" }}>Esc</kbd>
        </div>

        <div style={{ maxHeight: 420, overflowY: "auto" }}>
          {q.length < 2 && (
            <div style={{ padding: "24px 18px", color: "var(--ink-3)", fontSize: 14, textAlign: "center" }}>
              Tapez au moins 2 caractères pour rechercher…
            </div>
          )}
          {q.length >= 2 && results.length === 0 && (
            <div style={{ padding: "24px 18px", color: "var(--ink-3)", fontSize: 14, textAlign: "center" }}>
              Aucun résultat pour &ldquo;{q}&rdquo;
            </div>
          )}
          {results.map((r, i) => (
            <button
              key={r.id + r.type}
              onClick={() => navigate(r.url)}
              onMouseEnter={() => setFocused(i)}
              style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", padding: "12px 18px", background: focused === i ? "var(--primary-soft)" : "transparent", border: "none", cursor: "pointer", textAlign: "left" }}
            >
              <div style={{ width: 34, height: 34, borderRadius: 8, background: "var(--surface-3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon name={TYPE_ICONS[r.type] ?? "search"} size={16} style={{ color: "var(--primary)" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</div>
                <div style={{ fontSize: 12, color: "var(--ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.subtitle}</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-3)", background: "var(--surface-3)", borderRadius: 6, padding: "2px 8px", flexShrink: 0 }}>{TYPE_LABELS[r.type]}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Topbar({ notifications = [] }: { notifications?: TopNotif[] }) {
  const pathname = usePathname();
  const title = titleFromPath(pathname);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const unread = notifications.length;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}
      <header
        style={{
          height: "var(--topbar-h)",
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "rgba(255,255,255,.82)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "0 28px",
        }}
      >
        <div style={{ flex: "none" }}>
          <div style={{ fontSize: 16.5, fontWeight: 800, letterSpacing: "-0.02em" }}>{title}</div>
        </div>
        <div style={{ flex: 1, maxWidth: 440, position: "relative" }}>
          <Icon name="search" size={17} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--ink-4)" }} />
          <button
            onClick={() => setSearchOpen(true)}
            style={{ width: "100%", height: 40, paddingLeft: 38, paddingRight: 56, background: "var(--surface-3)", border: "1px solid transparent", borderRadius: 10, textAlign: "left", color: "var(--ink-3)", fontSize: 14, cursor: "text" }}
          >
            Rechercher une formation, session, prospect…
          </button>
          <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", display: "flex", gap: 3, pointerEvents: "none" }}>
            <kbd style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-3)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 5, padding: "2px 5px" }}>⌘K</kbd>
          </span>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ position: "relative" }}>
            <button onClick={() => setNotifOpen((o) => !o)} className="btn btn-secondary btn-icon" style={{ position: "relative" }}>
              <Icon name="bell" size={18} />
              {unread > 0 && <span style={{ position: "absolute", top: 7, right: 7, width: 7, height: 7, borderRadius: 99, background: "var(--danger)", border: "2px solid #fff" }} />}
            </button>
            {notifOpen && (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setNotifOpen(false)} />
                <div
                  className="fade-up"
                  style={{ position: "absolute", right: 0, top: 48, width: 360, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, boxShadow: "var(--shadow-pop)", zIndex: 50, overflow: "hidden" }}
                >
                  <div className="spread" style={{ padding: "14px 16px", borderBottom: "1px solid var(--border-2)" }}>
                    <strong style={{ fontSize: 14 }}>Notifications</strong>
                    {unread > 0 && <span className="badge badge-danger">{unread} à traiter</span>}
                  </div>
                  <div style={{ maxHeight: 340, overflowY: "auto" }}>
                    {notifications.length === 0 && <div style={{ padding: 20, fontSize: 13, color: "var(--ink-3)", textAlign: "center" }}>Aucune notification.</div>}
                    {notifications.slice(0, 5).map((a) => (
                      <div key={a.id} style={{ display: "flex", gap: 11, padding: "13px 16px", borderBottom: "1px solid var(--border-2)" }}>
                        <AlertGlyph type={a.type} icon={a.icon} size={32} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{a.title}</div>
                          <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 2, lineHeight: 1.4 }}>{a.text}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          <Link href="/sessions/new" className="btn btn-primary">
            <Icon name="plus" size={17} /> Nouvelle session
          </Link>
        </div>
      </header>
    </>
  );
}
