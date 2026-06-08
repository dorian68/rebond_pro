"use client";

import { useState, useActionState, useTransition } from "react";
import { Card } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { ImageUpload } from "@/components/app/ImageUpload";
import { updateOrganization, inviteMember, updateMemberRole, removeMember, saveDocumentTemplate, loadDemoDataAction } from "@/server/parametres-actions";
import { createCheckoutSession, createBillingPortalSession } from "@/server/billing-actions";
import type { BillingState } from "@/server/billing";
import type { Plan } from "@prisma/client";
import type { FormActionState } from "@/server/formations-actions";

type Org = {
  id: string; name: string; slug: string; siret: string | null; website: string | null; description: string | null;
  logoUrl: string | null; coverImageUrl: string | null; tagline: string | null; city: string | null; timezone: string | null; currency: string;
  legalName: string | null; legalAddress: string | null; nda: string | null; legalRep: string | null;
  publicProfileEnabled: boolean; publicEmail: string | null; publicPhone: string | null;
  socialLinks: unknown; specialties: string[]; modalities: string[]; certifications: string[];
  plan: string; billingStatus: string | null; trialEndsAt: Date | null;
};
type Member = {
  id: string; role: string; status: string; invitedEmail: string | null;
  user: { id: string; name: string | null; email: string | null; lastLoginAt: Date | null };
};
type Template = { id: string; type: string; name: string; contentTemplate: string };

const TABS = [
  { id: "profil", label: "Profil du centre", icon: "building" },
  { id: "abonnement", label: "Abonnement", icon: "euro" },
  { id: "membres", label: "Membres & accès", icon: "users" },
  { id: "templates", label: "Modèles de documents", icon: "file-text" },
  { id: "avance", label: "Avancé", icon: "settings" },
] as const;

type Tab = (typeof TABS)[number]["id"];

export function ParametresClient({ org, members, templates, role, billing }: { org: Org; members: Member[]; templates: Template[]; role: string; billing: BillingState }) {
  const [tab, setTab] = useState<Tab>("profil");

  return (
    <div>
      <div style={{ display: "flex", gap: 4, marginBottom: 28, borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              display: "flex", alignItems: "center", gap: 7, padding: "10px 16px",
              fontWeight: tab === t.id ? 700 : 500, fontSize: 14,
              color: tab === t.id ? "var(--primary)" : "var(--ink-2)",
              borderBottom: `2px solid ${tab === t.id ? "var(--primary)" : "transparent"}`,
              background: "none", border: "none", borderRadius: 0, cursor: "pointer", marginBottom: -1,
            }}
          >
            <Icon name={t.icon} size={15} /> {t.label}
          </button>
        ))}
      </div>

      {tab === "profil" && <ProfilTab org={org} role={role} />}
      {tab === "abonnement" && <AbonnementTab billing={billing} role={role} />}
      {tab === "membres" && <MembresTab members={members} role={role} />}
      {tab === "templates" && <TemplatesTab templates={templates} role={role} />}
      {tab === "avance" && <AvanceTab role={role} orgName={org.name} />}
    </div>
  );
}

// ── Profil ────────────────────────────────────────────────────────
function ProfilTab({ org, role }: { org: Org; role: string }) {
  const canEdit = ["OWNER", "ADMIN"].includes(role);
  const [state, action, pending] = useActionState<FormActionState, FormData>(updateOrganization, undefined);

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {canEdit && (
        <Card>
          <h3 style={{ fontWeight: 700, marginBottom: 6, fontSize: 15 }}>Vitrine marketplace</h3>
          <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 20 }}>
            Ces éléments apparaissent sur votre fiche publique et dans le catalogue. Page publique : <a href={`/${org.slug}`} target="_blank" style={{ color: "var(--primary)" }}>/{org.slug}</a>
          </p>
          <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
            <ImageUpload kind="org_logo" currentUrl={org.logoUrl} label="Logo du centre" shape="square" />
            <ImageUpload kind="org_cover" currentUrl={org.coverImageUrl} label="Bannière de couverture" shape="wide" />
          </div>
        </Card>
      )}

      <Card>
        <h3 style={{ fontWeight: 700, marginBottom: 20, fontSize: 15 }}>Identité du centre</h3>
        <form action={action} style={{ display: "grid", gap: 16 }}>
          <Field label="Nom du centre *" name="name" defaultValue={org.name} disabled={!canEdit} />
          <Field label="Accroche (tagline)" name="tagline" defaultValue={org.tagline ?? ""} disabled={!canEdit} placeholder="La formation qui transforme les compétences en résultats." />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Ville" name="city" defaultValue={org.city ?? ""} disabled={!canEdit} placeholder="Fort-de-France" />
            <Field label="SIRET" name="siret" defaultValue={org.siret ?? ""} disabled={!canEdit} placeholder="12345678901234" />
          </div>
          <Field label="Site web" name="website" defaultValue={org.website ?? ""} disabled={!canEdit} placeholder="https://..." />
          <Field label="Description" name="description" defaultValue={org.description ?? ""} disabled={!canEdit} textarea />
          {canEdit && (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</button>
              {state?.ok && <span style={{ color: "var(--success)", fontSize: 13 }}>✓ Enregistré</span>}
              {state?.error && <span style={{ color: "var(--danger)", fontSize: 13 }}>{state.error}</span>}
            </div>
          )}
        </form>
      </Card>

      <Card>
        <div className="spread" style={{ marginBottom: 6 }}>
          <h3 style={{ fontWeight: 700, fontSize: 15 }}>Profil public du centre</h3>
          <a href={`/${org.slug}`} target="_blank" className="btn btn-secondary btn-sm">Voir ma page publique</a>
        </div>
        <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 18 }}>Ces informations apparaissent sur votre fiche publique et dans le catalogue du réseau.</p>
        {(() => {
          const sl = (org.socialLinks ?? {}) as { linkedin?: string | null; facebook?: string | null; instagram?: string | null };
          return (
            <form action={action} style={{ display: "grid", gap: 16 }}>
              <input type="hidden" name="name" value={org.name} />
              <input type="hidden" name="hasPublicProfile" value="1" />
              <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, fontWeight: 600 }}>
                <input type="checkbox" name="publicProfileEnabled" defaultChecked={org.publicProfileEnabled} disabled={!canEdit} /> Publier ma fiche centre (visible dans le catalogue)
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Field label="Email public" name="publicEmail" type="email" defaultValue={org.publicEmail ?? ""} disabled={!canEdit} placeholder="contact@centre.fr" />
                <Field label="Téléphone public" name="publicPhone" defaultValue={org.publicPhone ?? ""} disabled={!canEdit} />
              </div>
              <Field label="Domaines de spécialité (virgules)" name="specialties" defaultValue={org.specialties.join(", ")} disabled={!canEdit} placeholder="Bureautique, Management, Langues" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Field label="Modalités (virgules)" name="modalities" defaultValue={org.modalities.join(", ")} disabled={!canEdit} placeholder="Présentiel, Distanciel, Hybride" />
                <Field label="Certifications / labels (virgules)" name="certifications" defaultValue={org.certifications.join(", ")} disabled={!canEdit} placeholder="Qualiopi, Datadock" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                <Field label="LinkedIn" name="linkedin" defaultValue={sl.linkedin ?? ""} disabled={!canEdit} placeholder="https://…" />
                <Field label="Facebook" name="facebook" defaultValue={sl.facebook ?? ""} disabled={!canEdit} placeholder="https://…" />
                <Field label="Instagram" name="instagram" defaultValue={sl.instagram ?? ""} disabled={!canEdit} placeholder="https://…" />
              </div>
              {canEdit && (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer le profil public"}</button>
                  {state?.ok && <span style={{ color: "var(--success)", fontSize: 13 }}>✓ Enregistré</span>}
                </div>
              )}
            </form>
          );
        })()}
      </Card>

      <Card>
        <h3 style={{ fontWeight: 700, marginBottom: 20, fontSize: 15 }}>Informations légales</h3>
        <form action={action} style={{ display: "grid", gap: 16 }}>
          <input type="hidden" name="name" value={org.name} />
          <Field label="Nom légal" name="legalName" defaultValue={org.legalName ?? ""} disabled={!canEdit} />
          <Field label="Adresse légale" name="legalAddress" defaultValue={org.legalAddress ?? ""} disabled={!canEdit} textarea />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="N° déclaration activité (NDA)" name="nda" defaultValue={org.nda ?? ""} disabled={!canEdit} placeholder="97972XXXXXXX" />
            <Field label="Représentant légal" name="legalRep" defaultValue={org.legalRep ?? ""} disabled={!canEdit} />
          </div>
          {canEdit && (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</button>
              {state?.ok && <span style={{ color: "var(--success)", fontSize: 13 }}>✓ Enregistré</span>}
            </div>
          )}
        </form>
      </Card>

    </div>
  );
}

// ── Abonnement ────────────────────────────────────────────────────
function AbonnementTab({ billing, role }: { billing: BillingState; role: string }) {
  const canBill = ["OWNER", "ADMIN"].includes(role);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function go(fn: () => Promise<{ url?: string; error?: string }>, key: string) {
    setBusy(key); setError(null);
    try {
      const r = await fn();
      if (r.url) { window.location.href = r.url; return; }
      setError(r.error ?? "Action impossible.");
    } catch { setError("Erreur inattendue."); }
    finally { setBusy(null); }
  }

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <Card>
        <div className="spread" style={{ alignItems: "flex-start" }}>
          <div>
            <h3 style={{ fontWeight: 700, fontSize: 15 }}>Votre abonnement</h3>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginTop: 14 }}>
              <KV label="Plan actuel" value={billing.planName} />
              <KV label="Statut" value={billing.billingStatus ?? "—"} />
              {billing.trialEndsAt && <KV label="Fin d'essai" value={new Date(billing.trialEndsAt).toLocaleDateString("fr-FR")} />}
              {billing.currentPeriodEnd && <KV label="Prochaine échéance" value={new Date(billing.currentPeriodEnd).toLocaleDateString("fr-FR")} />}
            </div>
          </div>
          {canBill && billing.hasSubscription && (
            <button className="btn btn-secondary" onClick={() => go(createBillingPortalSession, "portal")} disabled={busy === "portal"}>
              <Icon name="settings" size={15} /> {busy === "portal" ? "Ouverture…" : "Gérer / facturation"}
            </button>
          )}
        </div>
        {!billing.stripeEnabled && (
          <p style={{ marginTop: 16, fontSize: 13, color: "var(--ink-3)", padding: "10px 12px", background: "var(--surface-3)", borderRadius: 10 }}>
            La facturation en ligne n&apos;est pas encore activée sur cet environnement (clé Stripe absente). Les plans ci-dessous sont présentés à titre indicatif.
          </p>
        )}
        {error && <p style={{ marginTop: 12, fontSize: 13, color: "var(--danger)" }}>{error}</p>}
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {billing.plans.map((p) => {
          const current = p.id === billing.plan;
          return (
            <Card key={p.id} style={{ border: current ? "2px solid var(--primary)" : undefined, position: "relative" }}>
              {current && <span className="badge badge-primary" style={{ position: "absolute", top: 14, right: 14 }}>Actuel</span>}
              <h3 style={{ fontWeight: 800, fontSize: 17 }}>{p.name}</h3>
              <div style={{ fontSize: 22, fontWeight: 800, margin: "6px 0 14px" }}>{p.priceLabel}</div>
              <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 8, fontSize: 13, color: "var(--ink-2)" }}>
                {p.features.map((f) => (
                  <li key={f} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}><Icon name="check" size={15} style={{ color: "var(--success)", flexShrink: 0, marginTop: 1 }} /> {f}</li>
                ))}
              </ul>
              {canBill && !current && p.id !== "FREE" && (
                <button className="btn btn-primary btn-block" style={{ marginTop: 16 }} disabled={busy === p.id || !billing.stripeEnabled}
                  onClick={() => go(() => createCheckoutSession(p.id as Plan), p.id)}>
                  {busy === p.id ? "Redirection…" : `Passer au plan ${p.name}`}
                </button>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ── Membres ───────────────────────────────────────────────────────
function MembresTab({ members, role }: { members: Member[]; role: string }) {
  const canEdit = ["OWNER", "ADMIN"].includes(role);
  const [state, action, pending] = useActionState<FormActionState, FormData>(inviteMember, undefined);
  const [removing, startRemove] = useTransition();

  const ROLE_LABELS: Record<string, string> = { OWNER: "Propriétaire", ADMIN: "Administrateur", ASSISTANT: "Assistant", COMMERCIAL: "Commercial", TRAINER: "Formateur" };

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <Card>
        <h3 style={{ fontWeight: 700, marginBottom: 20, fontSize: 15 }}>Membres de l&apos;organisation ({members.length})</h3>
        <div style={{ display: "grid", gap: 1 }}>
          {members.map((m) => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: "1px solid var(--border-2)" }}>
              <div style={{ width: 38, height: 38, borderRadius: 99, background: "var(--primary-soft)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, color: "var(--primary)", flexShrink: 0 }}>
                {(m.user.name ?? m.user.email ?? "?")[0]?.toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{m.user.name ?? m.user.email}</div>
                <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{m.invitedEmail ?? m.user.email} · {m.status === "INVITED" ? "Invitation en attente" : `Dernière connexion : ${m.user.lastLoginAt ? new Date(m.user.lastLoginAt).toLocaleDateString("fr-FR") : "jamais"}`}</div>
              </div>
              {canEdit && m.role !== "OWNER" ? (
                <select
                  defaultValue={m.role}
                  onChange={(e) => startRemove(() => updateMemberRole(m.id, e.target.value))}
                  className="input"
                  style={{ width: 140, height: 34 }}
                  disabled={removing}
                >
                  {["ADMIN", "ASSISTANT", "COMMERCIAL", "TRAINER"].map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              ) : (
                <span className="badge">{ROLE_LABELS[m.role] ?? m.role}</span>
              )}
              {canEdit && m.role !== "OWNER" && (
                <button className="btn btn-danger btn-icon" style={{ width: 34, height: 34 }} onClick={() => startRemove(() => removeMember(m.id))} disabled={removing} title="Retirer le membre">
                  <Icon name="trash-2" size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
      </Card>

      {canEdit && (
        <Card>
          <h3 style={{ fontWeight: 700, marginBottom: 20, fontSize: 15 }}>Inviter un nouveau membre</h3>
          <form action={action} style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: 16 }}>
              <Field label="Email" name="email" type="email" placeholder="prenom.nom@email.fr" />
              <div>
                <label className="label">Rôle</label>
                <select name="role" className="input" style={{ height: 44 }}>
                  <option value="ASSISTANT">Assistant</option>
                  <option value="COMMERCIAL">Commercial</option>
                  <option value="ADMIN">Administrateur</option>
                  <option value="TRAINER">Formateur</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button type="submit" className="btn btn-primary" disabled={pending}><Icon name="send" size={15} /> {pending ? "Envoi…" : "Inviter"}</button>
              {state?.ok && <span style={{ color: "var(--success)", fontSize: 13 }}>✓ Invitation envoyée</span>}
              {state?.error && <span style={{ color: "var(--danger)", fontSize: 13 }}>{state.error}</span>}
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}

// ── Modèles de documents ──────────────────────────────────────────
const DOC_TYPES = [
  { value: "CONVENTION", label: "Convention de formation" },
  { value: "CONVOCATION", label: "Convocation" },
  { value: "ATTESTATION", label: "Attestation de formation" },
  { value: "PROGRAMME", label: "Programme de formation" },
  { value: "EMARGEMENT", label: "Feuille d'émargement" },
  { value: "DEVIS", label: "Devis" },
];

function TemplatesTab({ templates, role }: { templates: Template[]; role: string }) {
  const canEdit = ["OWNER", "ADMIN"].includes(role);
  const [selectedType, setSelectedType] = useState("CONVENTION");
  const existing = templates.find((t) => t.type === selectedType);
  const [state, action, pending] = useActionState<FormActionState, FormData>(saveDocumentTemplate, undefined);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 24 }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10, color: "var(--ink-3)" }}>Types de documents</div>
        {DOC_TYPES.map((dt) => {
          const hasCustom = templates.some((t) => t.type === dt.value);
          return (
            <button key={dt.value} onClick={() => setSelectedType(dt.value)}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "10px 14px", marginBottom: 4, borderRadius: 8, background: selectedType === dt.value ? "var(--primary-soft)" : "transparent", color: selectedType === dt.value ? "var(--primary)" : "var(--ink)", fontWeight: selectedType === dt.value ? 700 : 500, fontSize: 13, border: "none", cursor: "pointer", textAlign: "left" }}
            >
              {dt.label}
              {hasCustom && <span style={{ width: 7, height: 7, borderRadius: 99, background: "var(--primary)", display: "inline-block" }} />}
            </button>
          );
        })}
      </div>

      <Card>
        <h3 style={{ fontWeight: 700, marginBottom: 4, fontSize: 15 }}>{DOC_TYPES.find((d) => d.value === selectedType)?.label}</h3>
        <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 20 }}>
          Personnalisez ce modèle avec des variables : <code>{`{{formation_title}}`}</code>, <code>{`{{learner_name}}`}</code>, <code>{`{{session_date}}`}</code>, <code>{`{{org_name}}`}</code>, <code>{`{{trainer_name}}`}</code>.
        </p>
        <form action={action} style={{ display: "grid", gap: 16 }}>
          <input type="hidden" name="type" value={selectedType} />
          <Field label="Nom du modèle" name="name" defaultValue={existing?.name ?? DOC_TYPES.find((d) => d.value === selectedType)?.label ?? ""} disabled={!canEdit} />
          <div>
            <label className="label">Contenu du modèle (texte)</label>
            <textarea name="contentTemplate" className="input" rows={14} defaultValue={existing?.contentTemplate ?? ""} disabled={!canEdit}
              style={{ fontFamily: "monospace", fontSize: 13, resize: "vertical" }} />
          </div>
          {canEdit && (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer le modèle"}</button>
              {state?.ok && <span style={{ color: "var(--success)", fontSize: 13 }}>✓ Modèle enregistré</span>}
              {state?.error && <span style={{ color: "var(--danger)", fontSize: 13 }}>{state.error}</span>}
            </div>
          )}
        </form>
      </Card>
    </div>
  );
}

// ── Avancé ────────────────────────────────────────────────────────
function AvanceTab({ role, orgName }: { role: string; orgName: string }) {
  const isOwner = role === "OWNER";
  const [demoState, setDemoState] = useState<{ loading: boolean; ok?: boolean; error?: string }>({ loading: false });

  async function handleLoadDemo() {
    if (!confirm(`Charger les données de démo dans "${orgName}" ? Cela supprimera toutes les données existantes (formations, sessions, apprenants, prospects).`)) return;
    setDemoState({ loading: true });
    try {
      const result = await loadDemoDataAction();
      setDemoState({ loading: false, ok: result?.ok, error: result?.error });
    } catch {
      setDemoState({ loading: false, error: "Erreur inattendue." });
    }
  }

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {isOwner && (
        <Card>
          <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 15 }}>Données de démonstration</h3>
          <p style={{ fontSize: 14, color: "var(--ink-2)", marginBottom: 20, lineHeight: 1.6 }}>
            Charge un jeu de données réaliste (4 formations, 5 sessions, 8 apprenants, 10 prospects, 4 formateurs…) dans votre organisation. <strong style={{ color: "var(--danger)" }}>Attention : cette action supprime toutes vos données existantes.</strong>
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="btn btn-secondary" onClick={handleLoadDemo} disabled={demoState.loading}>
              <Icon name="database" size={15} /> {demoState.loading ? "Chargement…" : "Charger les données de démo"}
            </button>
            {demoState.ok && <span style={{ color: "var(--success)", fontSize: 13 }}>✓ Données chargées avec succès</span>}
            {demoState.error && <span style={{ color: "var(--danger)", fontSize: 13 }}>{demoState.error}</span>}
          </div>
        </Card>
      )}

      <Card>
        <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 15 }}>Exporter vos données</h3>
        <p style={{ fontSize: 14, color: "var(--ink-2)", marginBottom: 20 }}>Téléchargez vos données au format CSV pour les consulter dans Excel ou les migrer.</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a href="/api/export/learners" download className="btn btn-secondary"><Icon name="download" size={15} /> Apprenants (.csv)</a>
          <a href="/api/export/sessions" download className="btn btn-secondary"><Icon name="download" size={15} /> Sessions (.csv)</a>
          <a href="/api/export/prospects" download className="btn btn-secondary"><Icon name="download" size={15} /> Prospects (.csv)</a>
        </div>
      </Card>

      <Card>
        <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 15 }}>Informations techniques</h3>
        <p style={{ fontSize: 13, color: "var(--ink-3)", lineHeight: 1.8 }}>
          Si vous rencontrez des problèmes d&apos;affichage ou de cache, vous pouvez vider le cache applicatif en rechargeant la page (Ctrl+Maj+R).<br />
          Pour toute assistance technique : <a href="mailto:support@rebondpro.fr" style={{ color: "var(--primary)" }}>support@rebondpro.fr</a>
        </p>
      </Card>
    </div>
  );
}

// ── Primitives ────────────────────────────────────────────────────
function Field({ label, name, defaultValue, disabled, placeholder, type = "text", textarea }: {
  label: string; name: string; defaultValue?: string; disabled?: boolean; placeholder?: string; type?: string; textarea?: boolean;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      {textarea ? (
        <textarea name={name} className="input" rows={3} defaultValue={defaultValue} disabled={disabled} placeholder={placeholder} style={{ resize: "vertical" }} />
      ) : (
        <input name={name} type={type} className="input" defaultValue={defaultValue} disabled={disabled} placeholder={placeholder} />
      )}
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: "12px 20px", background: "var(--surface-3)", borderRadius: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 15 }}>{value}</div>
    </div>
  );
}
