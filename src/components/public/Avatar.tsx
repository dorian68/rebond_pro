import Image from "next/image";

type AvatarProps = {
  name: string;
  photoUrl?: string | null;
  initials?: string | null;
  color?: string | null;
  size?: number;
  rounded?: "full" | "lg";
};

function deriveInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

/** Avatar : photo si disponible, sinon initiales sur fond coloré (dégradé). */
export function Avatar({ name, photoUrl, initials, color, size = 56, rounded = "full" }: AvatarProps) {
  const radius = rounded === "full" ? "50%" : "16px";
  const c = color || "#2469a6";

  if (photoUrl) {
    return (
      <Image
        src={photoUrl}
        alt={name}
        width={size}
        height={size}
        style={{ width: size, height: size, borderRadius: radius, objectFit: "cover", flexShrink: 0, background: "var(--surface-3)" }}
        unoptimized
      />
    );
  }

  return (
    <div
      aria-hidden
      style={{
        width: size, height: size, borderRadius: radius, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: `linear-gradient(135deg, ${c}, ${c}bb)`,
        color: "#fff", fontWeight: 800, fontSize: size * 0.4, letterSpacing: "-0.02em",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,.15)",
      }}
    >
      {(initials || deriveInitials(name)).slice(0, 2)}
    </div>
  );
}
