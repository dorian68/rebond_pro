"use client";

import { useActionState } from "react";
import { Card } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { ImageUpload } from "@/components/app/ImageUpload";
import { updateMyProfile } from "@/server/trainer-self-actions";
import type { FormActionState } from "@/server/formations-actions";

type Defaults = { firstName: string; lastName: string; phone: string | null; bio: string | null; specialities: string[]; yearsExperience: number | null; photoUrl: string | null };

export function TrainerProfileForm({ trainerId, defaults }: { trainerId: string; defaults: Defaults }) {
  const [state, action, pending] = useActionState<FormActionState, FormData>(updateMyProfile, undefined);

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <Card>
        <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Photo</h3>
        <p className="muted-3" style={{ fontSize: 12.5, marginBottom: 14 }}>Affichée sur votre profil public si votre centre le publie.</p>
        <ImageUpload kind="trainer_photo" trainerId={trainerId} currentUrl={defaults.photoUrl} label="Ma photo" shape="circle" />
      </Card>

      <Card>
        <form action={action} style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div><label className="field-label">Prénom *</label><input className="input" name="firstName" required defaultValue={defaults.firstName} /></div>
            <div><label className="field-label">Nom *</label><input className="input" name="lastName" required defaultValue={defaults.lastName} /></div>
            <div><label className="field-label">Téléphone</label><input className="input" name="phone" defaultValue={defaults.phone ?? ""} /></div>
            <div><label className="field-label">Années d&apos;expérience</label><input className="input" type="number" min={0} name="yearsExperience" defaultValue={defaults.yearsExperience ?? ""} /></div>
          </div>
          <div><label className="field-label">Spécialités (séparées par virgule)</label><input className="input" name="specialities" placeholder="Excel, Management, Bilan de compétences" defaultValue={defaults.specialities.join(", ")} /></div>
          <div><label className="field-label">Bio</label><textarea className="input" name="bio" rows={4} defaultValue={defaults.bio ?? ""} placeholder="Présentez votre parcours, votre approche pédagogique…" /></div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button type="submit" className="btn btn-primary" disabled={pending}><Icon name="check" size={16} /> {pending ? "Enregistrement…" : "Enregistrer"}</button>
            {state?.ok && <span style={{ color: "var(--success)", fontSize: 13 }}>✓ Profil mis à jour</span>}
            {state?.error && <span style={{ color: "var(--danger)", fontSize: 13 }}>{state.error}</span>}
          </div>
        </form>
      </Card>
    </div>
  );
}
