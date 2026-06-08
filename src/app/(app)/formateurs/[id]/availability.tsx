"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { removeUnavailability } from "@/server/availability-actions";

export function RemoveUnavailButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button className="btn btn-ghost btn-icon" style={{ width: 26, height: 26, color: "var(--ink-3)" }} disabled={pending}
      onClick={() => start(async () => { await removeUnavailability(id); router.refresh(); })} title="Retirer">
      <Icon name="x" size={14} />
    </button>
  );
}
