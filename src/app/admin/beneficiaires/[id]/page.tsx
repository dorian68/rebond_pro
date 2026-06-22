import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, Avatar } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { getPlatformBeneficiary, listBeneficiaryTransferCenters } from "@/server/platform";
import { BILAN_ROADMAP, decodeIkigaiResult, ensureBilanRoadmap, ikigaiShareUrl, IKIGAI_STEP_TITLE, roadmapIndex } from "@/server/bilan-roadmap";
import { BilanStepEditor, CopyShareLink, PlatformBeneficiaryStatus, TransferBeneficiaryForm } from "./beneficiary-admin-actions";

export const dynamic = "force-dynamic";

const STATUS_META: Record<string, { label: string; icon: string; color: string }> = {
  todo: { label: "À faire", icon: "circle", color: "var(--ink-4)" },
  in_progress: { label: "En cours", icon: "play", color: "#a86617" },
  done: { label: "Terminé", icon: "check-circle", color: "#137a45" },
};

export default async function AdminBeneficiaryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const exists = await getPlatformBeneficiary(id);
  if (!exists) notFound();
  await ensureBilanRoadmap(id);
  const beneficiary = await getPlatformBeneficiary(id);
  if (!beneficiary) notFound();

  const centers = await listBeneficiaryTransferCenters(beneficiary.organizationId);
  const activeIndex = roadmapIndex(query.page);
  const active = BILAN_ROADMAP[activeIndex];
  const stepsByTitle = new Map(beneficiary.steps.map((step) => [step.title, step]));
  const activeStep = stepsByTitle.get(active.title);
  if (!activeStep) notFound();

  const total = BILAN_ROADMAP.length;
  const done = BILAN_ROADMAP.filter((item) => stepsByTitle.get(item.title)?.status === "done").length;
  const percent = Math.round((done / total) * 100);
  const ikigaiStep = stepsByTitle.get(IKIGAI_STEP_TITLE);
  const ikigai = decodeIkigaiResult(ikigaiStep?.notes);
  const ikigaiUrl = ikigaiShareUrl(beneficiary.id);

  return (
    <div className="fade-up">
      <Link href="/admin/beneficiaires" className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }}><Icon name="chevron-left" size={15} /> Bénéficiaires</Link>

      <div className="spread" style={{ marginBottom: 22, gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Avatar size={56} color="#2f9488">{(beneficiary.firstName[0] + beneficiary.lastName[0]).toUpperCase()}</Avatar>
          <div>
            <h1 style={{ fontSize: 23, fontWeight: 800 }}>{beneficiary.firstName} {beneficiary.lastName}</h1>
            <p style={{ color: "var(--ink-2)", marginTop: 4, fontSize: 14 }}>
              {beneficiary.email ?? "—"}{beneficiary.phone ? ` · ${beneficiary.phone}` : ""}
            </p>
            <p style={{ color: "var(--ink-3)", marginTop: 4, fontSize: 12.5 }}>
              Dossier : <Link href={`/admin/centres/${beneficiary.organization.id}`} style={{ color: "var(--primary)", fontWeight: 700 }}>{beneficiary.organization.name}</Link>
            </p>
          </div>
        </div>
        <PlatformBeneficiaryStatus id={beneficiary.id} status={beneficiary.status} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr 320px", gap: 16, alignItems: "start" }}>
        <Card>
          <div className="spread" style={{ marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800 }}>Dossier numérique</h3>
            <span className="badge badge-primary">{percent}%</span>
          </div>
          <div style={{ height: 8, borderRadius: 99, background: "var(--surface-3)", overflow: "hidden", marginBottom: 14 }}>
            <div style={{ height: "100%", width: `${percent}%`, background: "linear-gradient(90deg,#2f9488,#2469a6)" }} />
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {BILAN_ROADMAP.map((item, index) => {
              const step = stepsByTitle.get(item.title);
              const meta = STATUS_META[step?.status ?? "todo"] ?? STATUS_META.todo;
              const activePage = index === activeIndex;
              return (
                <Link
                  key={item.id}
                  href={`/admin/beneficiaires/${beneficiary.id}?page=${item.id}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "24px 1fr auto",
                    gap: 9,
                    alignItems: "center",
                    padding: "10px",
                    borderRadius: 10,
                    background: activePage ? "var(--primary-50)" : "var(--surface-2)",
                    color: activePage ? "var(--primary-700)" : "var(--ink-2)",
                    border: activePage ? "1px solid rgba(36,105,166,.25)" : "1px solid transparent",
                  }}
                >
                  <Icon name={meta.icon} size={16} style={{ color: meta.color }} />
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 12, fontWeight: 800 }}>{index + 1}. {item.short}</span>
                    <span className="muted-3" style={{ display: "block", fontSize: 11.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</span>
                  </span>
                  <span style={{ fontSize: 11, color: "var(--ink-4)" }}>{meta.label}</span>
                </Link>
              );
            })}
          </div>
        </Card>

        <Card>
          <div className="spread" style={{ gap: 12, alignItems: "flex-start", marginBottom: 14 }}>
            <div>
              <div className="badge badge-neutral" style={{ marginBottom: 8 }}>Page {activeIndex + 1}/{BILAN_ROADMAP.length}</div>
              <h2 style={{ fontSize: 22, fontWeight: 850, marginBottom: 6 }}>{active.title}</h2>
              <p className="muted" style={{ lineHeight: 1.6 }}>{active.description}</p>
            </div>
            <span className="badge badge-primary">{active.phase}</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
            <div className="card" style={{ padding: 14, background: "var(--surface-2)" }}>
              <h3 style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 8 }}>Consigne client</h3>
              <p style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.55 }}>{active.clientPrompt}</p>
            </div>
            <div className="card" style={{ padding: 14, background: "var(--surface-2)" }}>
              <h3 style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 8 }}>Checkpoints</h3>
              <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 5, fontSize: 13, color: "var(--ink-2)" }}>
                {active.checkpoints.map((checkpoint) => <li key={checkpoint}>{checkpoint}</li>)}
              </ul>
            </div>
          </div>

          {active.title === IKIGAI_STEP_TITLE && (
            <div className="card" style={{ padding: 14, background: "rgba(36,105,166,.06)", marginBottom: 16 }}>
              <div className="spread" style={{ gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 800 }}>Test Ikigai portable</h3>
                  <p className="muted-3" style={{ fontSize: 12.5 }}>Partagez ce lien au bénéficiaire. Ses réponses remontent ici automatiquement.</p>
                </div>
                <CopyShareLink url={ikigaiUrl} />
              </div>
              <input className="input" readOnly value={ikigaiUrl} />
            </div>
          )}

          {ikigai && active.title === IKIGAI_STEP_TITLE && (
            <div className="card" style={{ padding: 14, background: "var(--surface-2)", marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>Résultats Ikigai collectés</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <IkigaiBox title="Ce que j'aime" text={ikigai.love} />
                <IkigaiBox title="Ce pour quoi je suis doué(e)" text={ikigai.goodAt} />
                <IkigaiBox title="Ce dont les autres ont besoin" text={ikigai.useful} />
                <IkigaiBox title="Ce qui peut être valorisé" text={ikigai.paidFor} />
              </div>
              {ikigai.synthesis && <div style={{ marginTop: 10 }}><IkigaiBox title="Synthèse personnelle" text={ikigai.synthesis} /></div>}
            </div>
          )}

          <BilanStepEditor beneficiaryId={beneficiary.id} step={{ id: activeStep.id, status: activeStep.status, notes: activeStep.notes }} />

          <div className="spread" style={{ marginTop: 18 }}>
            <Link className="btn btn-secondary" href={`/admin/beneficiaires/${beneficiary.id}?page=${BILAN_ROADMAP[Math.max(0, activeIndex - 1)].id}`}>
              <Icon name="chevron-left" size={15} /> Page précédente
            </Link>
            <Link className="btn btn-primary" href={`/admin/beneficiaires/${beneficiary.id}?page=${BILAN_ROADMAP[Math.min(BILAN_ROADMAP.length - 1, activeIndex + 1)].id}`}>
              Page suivante <Icon name="chevron-right" size={15} />
            </Link>
          </div>
        </Card>

        <div style={{ display: "grid", gap: 16 }}>
          {beneficiary.objective && (
            <Card><h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>Projet visé</h3><p style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.6 }}>{beneficiary.objective}</p></Card>
          )}
          <Card>
            <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>Migrer vers un centre</h3>
            <TransferBeneficiaryForm beneficiaryId={beneficiary.id} centers={centers} />
          </Card>
          <Card>
            <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>Formations suivies ({beneficiary.interests.length})</h3>
            {beneficiary.interests.length === 0 ? <p className="muted-3" style={{ fontSize: 13 }}>Aucune pour le moment.</p> : (
              <div style={{ display: "grid", gap: 8 }}>
                {beneficiary.interests.map((interest) => (
                  <div key={interest.id} style={{ display: "grid", gap: 3, fontSize: 13 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 99, background: interest.formation.color ?? "#2469a6" }} />
                      <span style={{ flex: 1, fontWeight: 600 }}>{interest.formation.title}</span>
                      {interest.status === "requested" && <span className="badge badge-sky">Demande</span>}
                    </div>
                    <div className="muted-3" style={{ fontSize: 11.5, paddingLeft: 17 }}>{interest.formation.organization.name}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function IkigaiBox({ title, text }: { title: string; text: string }) {
  return (
    <div style={{ padding: 10, borderRadius: 9, background: "#fff", border: "1px solid var(--border-2)" }}>
      <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 5 }}>{title}</div>
      <p style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{text || "—"}</p>
    </div>
  );
}
