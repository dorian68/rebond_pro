import Image from "next/image";

export function Logo({
  size = 46,
  compact = false,
  priority = false,
}: {
  size?: number;
  light?: boolean;
  compact?: boolean;
  priority?: boolean;
}) {
  const aspectRatio = compact ? 500 / 530 : 1330 / 530;
  const width = Math.round(size * aspectRatio);

  return (
    <span
      style={{
        display: "inline-flex",
        width,
        height: size,
        flex: "none",
        overflow: "hidden",
        borderRadius: compact ? 8 : 6,
        background: "#fff",
      }}
    >
      <Image
        src={compact ? "/brand/logo-mark-le-bon-rebond.png" : "/brand/logo-le-bon-rebond.png"}
        alt="Le Bon Rebond — Un nouveau départ, la bonne direction"
        width={width}
        height={size}
        priority={priority}
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
      />
    </span>
  );
}
