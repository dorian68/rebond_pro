"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

type Props = {
  kind: "org_logo" | "org_cover" | "trainer_photo";
  trainerId?: string;
  currentUrl?: string | null;
  label: string;
  shape?: "circle" | "square" | "wide";
};

export function ImageUpload({ kind, trainerId, currentUrl, label, shape = "square" }: Props) {
  const [url, setUrl] = useState<string | null>(currentUrl ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const dims = shape === "wide" ? { width: 200, height: 90 } : { width: 90, height: 90 };
  const radius = shape === "circle" ? "50%" : 14;

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setError(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("kind", kind);
      if (trainerId) fd.set("trainerId", trainerId);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Échec de l'upload.");
      setUrl(data.url);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <label className="label">{label}</label>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ ...dims, borderRadius: radius, background: "var(--surface-3)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <Icon name="eye" size={22} style={{ color: "var(--ink-4)" }} />
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => inputRef.current?.click()} disabled={busy}>
            <Icon name="download" size={14} /> {busy ? "Envoi…" : url ? "Changer l'image" : "Téléverser une image"}
          </button>
          <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>PNG, JPG, WEBP — max 4 Mo</span>
          {error && <span style={{ fontSize: 12, color: "var(--danger)" }}>{error}</span>}
        </div>
        <input ref={inputRef} type="file" accept="image/*" onChange={onPick} style={{ display: "none" }} />
      </div>
    </div>
  );
}
