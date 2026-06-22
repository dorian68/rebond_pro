"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Card } from "@/components/ui/primitives";
import { DocumentImportPrefill } from "@/components/app/DocumentImportPrefill";
import { BulkEntityCreate } from "@/components/app/BulkEntityCreate";
import { bulkSetTrainerAvailabilities } from "@/server/availability-actions";

type TrainerOption = { id: string; firstName: string; lastName: string };

export function AvailabilityBulkClient({ trainers }: { trainers: TrainerOption[] }) {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const trainerOptions = useMemo(
    () => trainers.map((t) => ({ value: t.id, label: `${t.firstName} ${t.lastName}` })),
    [trainers],
  );

  const applyDraft = (fields: Record<string, unknown>) => {
    setItems((rows) => [...rows, normalizeDraftItem(fields, trainers)]);
  };

  const applyMany = (draftItems: Record<string, unknown>[]) => {
    setItems(draftItems.map((item) => normalizeDraftItem(item, trainers)).filter((item) => item.trainerId && item.date));
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Card>
        <div className="spread" style={{ gap: 12, flexWrap: "wrap" }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Disponibilités multi-formateurs</h3>
            <p className="muted-3" style={{ fontSize: 13 }}>
              Ajoutez ou importez plusieurs créneaux. Rien n&apos;est enregistré tant que vous ne validez pas le lot.
            </p>
          </div>
          <Link href="/planning" className="btn btn-secondary btn-sm"><Icon name="calendar" size={15} /> Voir le planning</Link>
        </div>
      </Card>

      <DocumentImportPrefill
        target="availability"
        context={{ trainers, slots: ["MATIN", "APRES_MIDI", "JOURNEE", "SOIR"], types: ["DISPONIBLE", "INDISPONIBLE", "TENTATIVE"] }}
        onApply={applyDraft}
        onApplyMany={applyMany}
      />

      <BulkEntityCreate
        title="Créer ou modifier plusieurs disponibilités"
        description="Chaque ligne met à jour un formateur, une date et un créneau. Utilisez le statut “Libre / effacer” pour retirer une disponibilité saisie."
        fields={[
          { name: "trainerId", label: "Formateur", type: "select", required: true, options: [{ value: "", label: "—" }, ...trainerOptions] },
          { name: "date", label: "Date", type: "date", required: true },
          { name: "slot", label: "Créneau", type: "select", required: true, options: [
            { value: "JOURNEE", label: "Journée" },
            { value: "MATIN", label: "Matin" },
            { value: "APRES_MIDI", label: "Après-midi" },
            { value: "SOIR", label: "Soir" },
          ] },
          { name: "type", label: "Statut", type: "select", required: true, options: [
            { value: "INDISPONIBLE", label: "Indisponible" },
            { value: "DISPONIBLE", label: "Disponible" },
            { value: "TENTATIVE", label: "Sous réserve" },
            { value: "CLEAR", label: "Libre / effacer" },
          ] },
          { name: "note", label: "Note", placeholder: "Congé, mission externe..." },
        ]}
        action={bulkSetTrainerAvailabilities}
        items={items}
        onItemsChange={setItems}
        submitLabel={`Enregistrer ${items.length} créneau${items.length > 1 ? "x" : ""}`}
      />
    </div>
  );
}

function normalizeDraftItem(item: Record<string, unknown>, trainers: TrainerOption[]) {
  const trainerId = String(item.trainerId ?? "") || matchTrainerId(String(item.trainerName ?? ""), trainers);
  return {
    trainerId,
    date: String(item.date ?? "").slice(0, 10),
    slot: normalizeSlot(item.slot),
    type: normalizeType(item.type),
    note: String(item.note ?? ""),
  };
}

function matchTrainerId(name: string, trainers: TrainerOption[]) {
  const needle = name.trim().toLowerCase();
  if (!needle) return "";
  const found = trainers.find((t) => `${t.firstName} ${t.lastName}`.toLowerCase() === needle)
    ?? trainers.find((t) => `${t.firstName} ${t.lastName}`.toLowerCase().includes(needle) || needle.includes(`${t.firstName} ${t.lastName}`.toLowerCase()));
  return found?.id ?? "";
}

function normalizeSlot(value: unknown) {
  const raw = String(value || "JOURNEE").toUpperCase().replace(/\s+/g, "_").replace("-", "_");
  if (["MATIN", "APRES_MIDI", "JOURNEE", "SOIR"].includes(raw)) return raw;
  if (raw.includes("APRES") || raw.includes("APRÈS")) return "APRES_MIDI";
  if (raw.includes("MATIN")) return "MATIN";
  if (raw.includes("SOIR")) return "SOIR";
  return "JOURNEE";
}

function normalizeType(value: unknown) {
  const raw = String(value || "INDISPONIBLE").toUpperCase();
  if (raw.includes("DISPONIBLE") && !raw.includes("INDISPONIBLE")) return "DISPONIBLE";
  if (raw.includes("TENTATIVE") || raw.includes("RÉSERV") || raw.includes("RESERV")) return "TENTATIVE";
  if (raw.includes("LIBRE") || raw.includes("CLEAR") || raw.includes("EFFAC")) return "CLEAR";
  return "INDISPONIBLE";
}
