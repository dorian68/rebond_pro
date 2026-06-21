"use client";

import { useActionState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Card } from "@/components/ui/primitives";
import type { FormActionState } from "@/server/formations-actions";

export type BulkField = {
  name: string;
  label: string;
  type?: "text" | "email" | "number" | "date" | "checkbox" | "textarea" | "select";
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
};

type Props = {
  title: string;
  description: string;
  fields: BulkField[];
  action: (prev: FormActionState, formData: FormData) => Promise<FormActionState>;
  items: Record<string, unknown>[];
  onItemsChange: (items: Record<string, unknown>[]) => void;
  submitLabel: string;
};

const MAX_ROWS = 50;

function valueToString(value: unknown) {
  if (value == null) return "";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

export function BulkEntityCreate({ title, description, fields, action, items, onItemsChange, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState<FormActionState, FormData>(action, undefined);
  const rows = items;
  const payload = JSON.stringify(rows);

  const update = (index: number, field: string, value: unknown) => {
    onItemsChange(rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const addRow = () => {
    if (rows.length >= MAX_ROWS) return;
    const next: Record<string, unknown> = {};
    for (const field of fields) next[field.name] = field.type === "checkbox" ? false : "";
    onItemsChange([...rows, next]);
  };

  const removeRow = (index: number) => {
    onItemsChange(rows.filter((_, i) => i !== index));
  };

  if (rows.length === 0) {
    return (
      <button type="button" className="btn btn-secondary btn-sm" onClick={addRow}>
        <Icon name="users" size={15} /> Ajouter plusieurs
      </button>
    );
  }

  return (
    <Card>
      <div className="spread" style={{ gap: 12, alignItems: "flex-start" }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>{title}</h3>
          <p className="muted-3" style={{ fontSize: 12.5 }}>{description}</p>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={addRow} disabled={rows.length >= MAX_ROWS}>
          <Icon name="plus" size={15} /> Ligne
        </button>
      </div>

      <form action={formAction} style={{ marginTop: 14, display: "grid", gap: 12 }}>
        <input type="hidden" name="itemsJson" value={payload} />
        <div style={{ display: "grid", gap: 10 }}>
          {rows.map((row, index) => (
            <div key={index} className="card" style={{ padding: 12, background: "var(--surface-2)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
                {fields.map((field) => {
                  const value = row[field.name];
                  if (field.type === "select") {
                    return (
                      <label key={field.name} style={{ display: "grid", gap: 5, fontSize: 12.5, fontWeight: 700 }}>
                        {field.label}{field.required ? " *" : ""}
                        <select className="select" value={valueToString(value)} onChange={(e) => update(index, field.name, e.target.value)}>
                          {(field.options ?? []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </label>
                    );
                  }
                  if (field.type === "checkbox") {
                    return (
                      <label key={field.name} style={{ display: "flex", alignItems: "end", gap: 8, fontSize: 12.5, fontWeight: 700, paddingBottom: 10 }}>
                        <input type="checkbox" checked={Boolean(value)} onChange={(e) => update(index, field.name, e.target.checked)} /> {field.label}
                      </label>
                    );
                  }
                  return (
                    <label key={field.name} style={{ display: "grid", gap: 5, fontSize: 12.5, fontWeight: 700 }}>
                      {field.label}{field.required ? " *" : ""}
                      <input
                        className="input"
                        type={field.type ?? "text"}
                        value={valueToString(value)}
                        placeholder={field.placeholder}
                        required={field.required}
                        onChange={(e) => update(index, field.name, e.target.value)}
                      />
                    </label>
                  );
                })}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeRow(index)}>
                  <Icon name="x" size={14} /> Retirer
                </button>
              </div>
            </div>
          ))}
        </div>
        {state?.ok && <div className="badge badge-positive" style={{ height: "auto", padding: "8px 10px" }}>Création en lot terminée.</div>}
        {state?.error && <div className="badge badge-danger" style={{ height: "auto", padding: "8px 10px", whiteSpace: "normal" }}>{state.error}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button type="button" className="btn btn-secondary" onClick={() => onItemsChange([])}>Annuler le lot</button>
          <button type="submit" className="btn btn-primary" disabled={pending || rows.length === 0}>
            <Icon name="check" size={16} /> {pending ? "Création…" : submitLabel}
          </button>
        </div>
      </form>
    </Card>
  );
}
