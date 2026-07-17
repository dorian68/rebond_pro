import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, Avatar } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { getPlatformBeneficiary, listBeneficiaryTransferCenters, listPlatformBeneficiaryDocuments } from "@/server/platform";
import { decodeIkigaiResult, ensureBilanRoadmap, getBilanRoadmap, ikigaiShareUrl, IKIGAI_STEP_TITLES, roadmapIndex } from "@/server/bilan-roadmap";
import { workspaceForPage } from "@/lib/bilan-workspaces";
import { getBilanProgram, parseBilanProgramId } from "@/lib/bilan-programs";
import { BeneficiaryDossierDocuments, BeneficiaryProgramSelector, BilanStepEditor, BilanWorkspaceEditor, CompetenceCanvasEditor, CopyShareLink, PlatformBeneficiaryStatus, TransferBeneficiaryForm } from "./beneficiary-admin-actions";

export const dynamic = "force-dynamic";

const STATUS_META: Record<string, { label: string; icon: string; color: string }> = {
  todo: { label: "À compléter", icon: "circle", color: "var(--ink-4)" },
  in_progress: { label: "En cours", icon: "play", color: "#a86617" },
  done: { label: "Validé", icon: "check-circle", color: "#137a45" },
};

const PHASE_LABELS: Record<string, string> = {
  preliminaire: "Phase préliminaire",
  investigation: "Investigation",
  conclusion: "Conclusion",
  suivi: "Suivi",
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
  const programArtifact = exists.artifacts.find((artifact) => artifact.key === "prestation-program");
  const programContent = programArtifact?.content && typeof programArtifact.content === "object" ? programArtifact.content as Record<string, unknown> : {};
  const programId = parseBilanProgramId(programContent.programId);
  const program = getBilanProgram(programId);
  await ensureBilanRoadmap(id, programId);
  const beneficiary = await getPlatformBeneficiary(id);
  if (!beneficiary) notFound();

  const [centers, documents] = await Promise.all([
    listBeneficiaryTransferCenters(beneficiary.organizationId),
    listPlatformBeneficiaryDocuments(beneficiary.id),
  ]);
  const activeIndex = roadmapIndex(query.page, programId);
  const roadmap = getBilanRoadmap(programId);
  const active = roadmap[activeIndex];
  const stepsByTitle = new Map(beneficiary.steps.map((step) => [step.title, step]));
  const artifactsByKey = new Map(beneficiary.artifacts.map((artifact) => [artifact.key, artifact]));
  const activeStep = stepsByTitle.get(active.title);
  if (!activeStep) notFound();
  const activeWorkspace = workspaceForPage(active.id);
  const activeArtifact = activeWorkspace ? artifactsByKey.get(activeWorkspace.key) ?? null : null;

  const total = roadmap.length;
  const done = roadmap.filter((item) => stepsByTitle.get(item.title)?.status === "done").length;
  const percent = Math.round((done / total) * 100);
  const nextStep = roadmap.find((item) => stepsByTitle.get(item.title)?.status !== "done") ?? null;
  const latestDocument = documents[0] ?? null;
  const shareableArtifacts = beneficiary.artifacts.filter((artifact) => artifact.key !== "prestation-program" && (artifact.shareable || artifact.status === "shareable" || artifact.status === "validated")).length;
  const readinessItems = [
    { label: "Email bénéficiaire renseigné", ok: Boolean(beneficiary.email) },
    { label: "Accompagnement sélectionné", ok: Boolean(programId) },
    { label: "Éléments métier documentés", ok: shareableArtifacts > 0 || done > 0 },
    { label: "PDF généré pour relecture", ok: Boolean(latestDocument) },
  ];
  const ikigaiStep = IKIGAI_STEP_TITLES.map((title) => stepsByTitle.get(title)).find(Boolean);
  const ikigai = decodeIkigaiResult(ikigaiStep?.notes);
  const ikigaiUrl = ikigaiShareUrl(beneficiary.id);
  const activeIsIkigai = active.id === "ikigai" || IKIGAI_STEP_TITLES.includes(active.title as (typeof IKIGAI_STEP_TITLES)[number]);

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
              Dossier de prestation numérique · {program.label} · Opéré par <Link href={`/admin/centres/${beneficiary.organization.id}`} style={{ color: "var(--primary)", fontWeight: 700 }}>{beneficiary.organization.name}</Link>
            </p>
          </div>
        </div>
        <PlatformBeneficiaryStatus id={beneficiary.id} status={beneficiary.status} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr 320px", gap: 16, alignItems: "start" }}>
        <Card>
          <div className="spread" style={{ marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800 }}>Parcours séance</h3>
            <span className="badge badge-primary">{percent}%</span>
          </div>
          <p className="muted-3" style={{ fontSize: 12.5, lineHeight: 1.45, marginBottom: 12 }}>
            Support : {program.subtitle}
          </p>
          <div style={{ height: 8, borderRadius: 99, background: "var(--surface-3)", overflow: "hidden", marginBottom: 14 }}>
            <div style={{ height: "100%", width: `${percent}%`, background: "linear-gradient(90deg,#2f9488,#2469a6)" }} />
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {roadmap.map((item, index) => {
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
              <div className="badge badge-neutral" style={{ marginBottom: 8 }}>Séance {activeIndex + 1}/{roadmap.length}</div>
              <h2 style={{ fontSize: 22, fontWeight: 850, marginBottom: 6 }}>{active.title}</h2>
              <p className="muted" style={{ lineHeight: 1.6 }}>{active.description}</p>
              <p className="muted-3" style={{ marginTop: 6, fontSize: 12.5 }}>{program.label} · {program.audience}</p>
            </div>
            <span className="badge badge-primary">{PHASE_LABELS[active.phase] ?? active.phase}</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
            <div className="card" style={{ padding: 14, background: "var(--surface-2)" }}>
              <h3 style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 8 }}>Question à travailler</h3>
              <p style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.55 }}>{active.clientPrompt}</p>
            </div>
            <div className="card" style={{ padding: 14, background: "var(--surface-2)" }}>
              <h3 style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 8 }}>À valider en séance</h3>
              <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 5, fontSize: 13, color: "var(--ink-2)" }}>
                {active.checkpoints.map((checkpoint) => <li key={checkpoint}>{checkpoint}</li>)}
              </ul>
            </div>
          </div>

          {activeIsIkigai && (
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

          {ikigai && activeIsIkigai && (
            <div className="card" style={{ padding: 14, background: "var(--surface-2)", marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>Canvas Ikigai collecté</h3>
              <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 14, alignItems: "start" }}>
                <AdminIkigaiGraph scores={ikigai.scores} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <IkigaiBox title="Énergie" text={ikigai.love} />
                  <IkigaiBox title="Talents" text={ikigai.goodAt} />
                  <IkigaiBox title="Utilité" text={ikigai.useful} />
                  <IkigaiBox title="Valeur marché" text={ikigai.paidFor} />
                </div>
              </div>
              {ikigai.intersections && <IkigaiIntersections intersections={ikigai.intersections} />}
              {ikigai.synthesis && <div style={{ marginTop: 10 }}><IkigaiBox title="Synthèse personnelle" text={ikigai.synthesis} /></div>}
            </div>
          )}

          {active.id === "competences" ? (
            <CompetenceCanvasEditor
              beneficiaryId={beneficiary.id}
              step={{ id: activeStep.id, status: activeStep.status, notes: activeStep.notes }}
              artifact={artifactsByKey.get("competence-map") ? {
                id: artifactsByKey.get("competence-map")!.id,
                status: artifactsByKey.get("competence-map")!.status,
                shareable: artifactsByKey.get("competence-map")!.shareable,
                content: artifactsByKey.get("competence-map")!.content,
              } : null}
            />
          ) : activeWorkspace ? (
            <BilanWorkspaceEditor
              beneficiaryId={beneficiary.id}
              step={{ id: activeStep.id, status: activeStep.status }}
              workspace={activeWorkspace}
              artifact={activeArtifact ? { id: activeArtifact.id, status: activeArtifact.status, shareable: activeArtifact.shareable, content: activeArtifact.content } : null}
            />
          ) : (
            <BilanStepEditor beneficiaryId={beneficiary.id} step={{ id: activeStep.id, status: activeStep.status, notes: activeStep.notes }} />
          )}

          <div className="spread" style={{ marginTop: 18 }}>
            <Link className="btn btn-secondary" href={`/admin/beneficiaires/${beneficiary.id}?page=${roadmap[Math.max(0, activeIndex - 1)].id}`}>
              <Icon name="chevron-left" size={15} /> Page précédente
            </Link>
            <Link className="btn btn-primary" href={`/admin/beneficiaires/${beneficiary.id}?page=${roadmap[Math.min(roadmap.length - 1, activeIndex + 1)].id}`}>
              Page suivante <Icon name="chevron-right" size={15} />
            </Link>
          </div>
        </Card>

        <div style={{ display: "grid", gap: 16 }}>
          <Card>
            <div className="spread" style={{ gap: 10, marginBottom: 10 }}>
              <h3 style={{ fontSize: 14, fontWeight: 900 }}>Brief séance</h3>
              <span className={"badge " + (percent >= 70 ? "badge-positive" : "badge-neutral")}>{percent >= 70 ? "Présentable" : "À compléter"}</span>
            </div>
            <div style={{ display: "grid", gap: 9, fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5 }}>
              <div><strong>Page active :</strong> {active.short} · {PHASE_LABELS[active.phase] ?? active.phase}</div>
              <div><strong>Progression :</strong> {done}/{total} étapes validées</div>
              <div><strong>Prochaine étape :</strong> {nextStep ? nextStep.title : "Parcours complet"}</div>
            </div>
            <div style={{ display: "grid", gap: 7, marginTop: 12 }}>
              {readinessItems.map((item) => (
                <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: item.ok ? "var(--ink-2)" : "var(--ink-4)" }}>
                  <Icon name={item.ok ? "check-circle" : "circle"} size={14} style={{ color: item.ok ? "#137a45" : "var(--ink-4)" }} />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
            <p className="muted-3" style={{ fontSize: 12, lineHeight: 1.45, marginTop: 10 }}>
              Usage face client : compléter, générer le PDF, le relire, puis seulement l’envoyer.
            </p>
          </Card>
          <Card>
            <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>Support numérique</h3>
            <BeneficiaryDossierDocuments beneficiaryId={beneficiary.id} beneficiaryEmail={beneficiary.email} documents={documents} />
          </Card>
          <Card>
            <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>Prestation Le Bon Rebond</h3>
            <BeneficiaryProgramSelector beneficiaryId={beneficiary.id} programId={programId} />
          </Card>
          {beneficiary.objective && (
            <Card><h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>Projet visé</h3><p style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.6 }}>{beneficiary.objective}</p></Card>
          )}
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
          <Card>
            <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>Éléments du dossier ({beneficiary.artifacts.length})</h3>
            {beneficiary.artifacts.length === 0 ? <p className="muted-3" style={{ fontSize: 13 }}>Aucun élément enregistré pour le moment.</p> : (
              <div style={{ display: "grid", gap: 8 }}>
                {beneficiary.artifacts.slice(0, 8).map((artifact) => (
                  <div key={artifact.id} style={{ padding: 9, borderRadius: 9, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 12.5, fontWeight: 850 }}>{artifact.title}</div>
                    <div className="muted-3" style={{ fontSize: 11.5 }}>{artifact.status}{artifact.shareable ? " · partageable" : ""}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <details className="card" style={{ padding: 16 }}>
            <summary style={{ cursor: "pointer", fontSize: 14, fontWeight: 900 }}>Actions avancées</summary>
            <div style={{ marginTop: 12 }}>
              <h3 style={{ fontSize: 13, fontWeight: 800, marginBottom: 8 }}>Migrer vers un centre</h3>
              <TransferBeneficiaryForm beneficiaryId={beneficiary.id} centers={centers} />
            </div>
          </details>
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

function AdminIkigaiGraph({ scores }: { scores?: Record<string, number> }) {
  const s = { love: 3, goodAt: 3, useful: 3, paidFor: 3, ...scores };
  const total = Number(s.love) + Number(s.goodAt) + Number(s.useful) + Number(s.paidFor);
  return (
    <div style={{ padding: 10, borderRadius: 12, background: "#fff", border: "1px solid var(--border-2)" }}>
      <svg viewBox="0 0 260 220" role="img" aria-label="Diagramme Ikigai bénéficiaire" style={{ width: "100%", height: "auto" }}>
        <circle cx="105" cy="86" r={30 + Number(s.love) * 7} fill="#f28c5233" stroke="#f28c52" strokeWidth="2" />
        <circle cx="155" cy="86" r={30 + Number(s.goodAt) * 7} fill="#2469a633" stroke="#2469a6" strokeWidth="2" />
        <circle cx="105" cy="136" r={30 + Number(s.useful) * 7} fill="#2f948833" stroke="#2f9488" strokeWidth="2" />
        <circle cx="155" cy="136" r={30 + Number(s.paidFor) * 7} fill="#8b5cf633" stroke="#8b5cf6" strokeWidth="2" />
        <circle cx="130" cy="111" r={Math.max(14, total * 1.8)} fill="#15314c" opacity=".82" />
        <text x="130" y="108" textAnchor="middle" fontSize="10" fontWeight="800" fill="#fff">Zone</text>
        <text x="130" y="121" textAnchor="middle" fontSize="10" fontWeight="800" fill="#fff">projet</text>
      </svg>
    </div>
  );
}

function IkigaiIntersections({ intersections }: { intersections: NonNullable<ReturnType<typeof decodeIkigaiResult>>["intersections"] }) {
  if (!intersections) return null;
  const rows = [
    ["Passion", intersections.passion],
    ["Mission", intersections.mission],
    ["Vocation", intersections.vocation],
    ["Profession", intersections.profession],
    ["Centre projet", intersections.center],
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginTop: 12 }}>
      {rows.map(([label, value]) => (
        <div key={label} style={{ padding: 10, borderRadius: 10, background: "#fff", border: "1px solid var(--border-2)" }}>
          <div style={{ fontSize: 11.5, fontWeight: 850, marginBottom: 5 }}>{label}</div>
          <div className="muted-3" style={{ fontSize: 11.5, lineHeight: 1.4 }}>{value || "—"}</div>
        </div>
      ))}
    </div>
  );
}
