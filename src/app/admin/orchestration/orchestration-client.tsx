"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { PathwayCanvas } from "./pathway-canvas";
import type {
  OrchestrationUiModel,
  OrchestrationView,
  UiActor,
  UiCostItem,
  UiOutcome,
  UiReferral,
  UiStep,
} from "./ui-types";
import styles from "./orchestration.module.css";

const STORAGE_KEY = "le-bon-rebond:orchestration:synthetic-demo:v1";
const DEMO_NOW_MS = Date.parse("2026-08-15T12:00:00.000Z");

const VIEWS: { id: OrchestrationView; label: string; icon: string }[] = [
  { id: "overview", label: "Vue d’ensemble", icon: "dashboard" },
  { id: "cohorts", label: "Cohortes", icon: "users" },
  { id: "pathway", label: "Parcours", icon: "layers" },
  { id: "ecosystem", label: "Écosystème local", icon: "globe" },
  { id: "reference", label: "Référentiel", icon: "book" },
  { id: "costs", label: "Coûts & financements", icon: "euro" },
];

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  READY: "Prête",
  ASSIGNED: "Assignée",
  SENT: "Envoyée",
  ACKNOWLEDGED: "Reçue",
  ACCEPTED: "Acceptée",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminée",
  REJECTED: "Refusée",
  BLOCKED: "Bloquée",
  NO_RESPONSE: "Sans réponse",
  CANCELLED: "Annulée",
  ACTIVE: "Active",
  AWAITING_HUMAN_APPROVAL: "À valider humainement",
  PENDING: "À suivre",
  NOT_DUE: "Non échu",
  INACTIVE: "Inactive",
  UNKNOWN: "Inconnu",
  MAINTAINED_J90: "Maintenue à J+90",
  NOT_STARTED: "Non démarré",
  REQUESTED: "Demandé",
  UNDER_REVIEW: "À l’étude",
  APPROVED: "Accordé",
  PARTIALLY_APPROVED: "Partiellement accordé",
  PAID: "Payé",
  RUPTURE: "Rupture",
  CLOSED: "Clos",
  CONFIRMED: "Confirmée",
  SELF_REPORTED: "Déclarée",
  OBSERVED: "Observée",
  INFERRED: "Inférée",
};

const COST_CATEGORY_LABELS: Record<string, string> = {
  LBR_ACCOMPANIMENT: "Accompagnement Le Bon Rebond",
  TRAINING: "Formation",
  MOBILITY: "Mobilité",
  CHILDCARE: "Garde d’enfant",
  EQUIPMENT: "Équipement",
  PSYCHOLOGICAL_SUPPORT: "Soutien psychologique",
  ADMINISTRATION: "Administration",
  IMMERSION: "Immersion",
  OTHER: "Autre",
};

const OUTCOME_TYPE_LABELS: Record<string, string> = {
  JOB: "Emploi",
  CDI: "CDI",
  CDD: "CDD",
  ALTERNANCE: "Alternance",
  TRAINING: "Formation",
  GEIQ: "GEIQ",
  SIAE: "SIAE",
  ETTI: "ETTI",
  PMSMP: "PMSMP / immersion",
  POEI: "POEI",
  OTHER: "Autre opportunité",
  OTHER_ACTIVE: "Autre sortie active",
  PATHWAY_CONTINUES: "Parcours en cours",
  NO_ACTIVE_OUTCOME: "Aucune sortie active",
};

const ACTOR_TYPE_LABELS: Record<string, string> = {
  ORCHESTRATOR: "Orchestrateur",
  PRESCRIBER: "Prescripteur",
  BUYER: "Acheteur",
  FUNDER: "Financeur",
  EMPLOYER: "Employeur",
  HOST_COMPANY: "Entreprise d’accueil",
  PROFESSIONAL_ORGANIZATION: "Organisation professionnelle",
  TRAINING_CENTER: "Centre de formation",
  CFA: "CFA",
  OPCO: "OPCO",
  SIAE: "SIAE",
  GEIQ: "GEIQ",
  MOBILITY_PARTNER: "Mobilité",
  CHILDCARE_PARTNER: "Garde d’enfant",
  DISABILITY_PARTNER: "Handicap",
  HOUSING_PARTNER: "Logement",
  SOCIAL_PARTNER: "Partenaire social",
  LOCAL_AUTHORITY: "Collectivité",
  TERRITORIAL_COORDINATOR: "Coordination territoriale",
};

const CAPABILITY_LABELS: Record<string, string> = {
  SOURCE_CANDIDATE: "Sourcer un candidat",
  ASSESS_CANDIDATE: "Évaluer un candidat",
  REFER_TO_SERVICE: "Orienter vers un service",
  ACKNOWLEDGE_REFERRAL: "Accuser réception",
  PRESCRIBE_IMMERSION: "Prescrire une immersion",
  HOST_IMMERSION: "Accueillir une immersion",
  PROVIDE_JOB: "Proposer un emploi",
  PROVIDE_CDD: "Proposer un CDD",
  PROVIDE_CDI: "Proposer un CDI",
  PROVIDE_ALTERNANCE: "Proposer une alternance",
  PROVIDE_FEEDBACK: "Fournir un retour",
  ASSESS_PREREQUISITES: "Évaluer les prérequis",
  DELIVER_TRAINING: "Délivrer une formation",
  CERTIFY_SKILL: "Certifier une compétence",
  FINANCE_TRAINING: "Financer une formation",
  FINANCE_MOBILITY: "Financer la mobilité",
  SUPPORT_MOBILITY: "Soutenir la mobilité",
  SUPPORT_CHILDCARE: "Soutenir la garde d’enfant",
  SUPPORT_HOUSING: "Soutenir le logement",
  SUPPORT_DISABILITY: "Soutenir le handicap",
  PROVIDE_SOCIAL_SUPPORT: "Accompagnement social",
  PROVIDE_EQUIPMENT: "Fournir un équipement",
  COACH_CANDIDATE: "Coacher un candidat",
  BUY_PROGRAM: "Acheter un programme",
  FOLLOW_UP: "Assurer le suivi",
  REPORT_OUTCOME: "Rapporter une sortie",
};

const REFERRAL_CYCLE = ["SENT", "ACKNOWLEDGED", "ACCEPTED", "IN_PROGRESS", "COMPLETED"];
const STEP_STATUSES = ["DRAFT", "READY", "ASSIGNED", "SENT", "ACKNOWLEDGED", "ACCEPTED", "IN_PROGRESS", "COMPLETED", "REJECTED", "BLOCKED", "NO_RESPONSE", "CANCELLED"];

type PersistedDemo = {
  steps: UiStep[];
  referrals: UiReferral[];
  costs: UiCostItem[];
  outcome: UiOutcome;
  actors: UiActor[];
  passportGoals: { planA: string; planB: string };
  planBActive: boolean;
  pathwayStatus: string;
  pathwayVersion: number;
  draftVersionCreated: boolean;
  planBReason: string;
};

function euro(cents: number | null) {
  if (cents === null) return "Non renseigné";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: cents % 100 === 0 ? 0 : 2 }).format(cents / 100);
}

function shortDate(value?: string | null) {
  if (!value) return "Non renseignée";
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function inputDate(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

function centsFromInput(value: string) {
  if (!value.trim()) return null;
  const amount = Number(value.replace(",", "."));
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : null;
}

function moneySummary(values: (number | null)[]) {
  const known = values.filter((value): value is number => value !== null);
  const unknownCount = values.length - known.length;
  const knownSubtotal = known.reduce((sum, value) => sum + value, 0);
  return {
    knownSubtotal,
    unknownCount,
    hasKnown: known.length > 0,
    complete: unknownCount === 0,
    total: unknownCount === 0 ? knownSubtotal : null,
  };
}

function statusClass(status: string) {
  if (["COMPLETED", "ACTIVE", "MAINTAINED_J90"].includes(status)) return styles.statusDone;
  if (["BLOCKED", "REJECTED", "CANCELLED", "INACTIVE"].includes(status)) return styles.statusBlocked;
  if (["NO_RESPONSE", "PENDING", "REQUESTED", "UNDER_REVIEW"].includes(status)) return styles.statusWaiting;
  if (["DRAFT", "NOT_DUE", "UNKNOWN", "NOT_STARTED"].includes(status)) return styles.statusDraft;
  return styles.statusActive;
}

function verificationBadge(actor: Pick<UiActor, "verificationStatus" | "synthetic">) {
  if (actor.synthetic) return <span className={`${styles.statusPill} ${styles.synthetic}`}><Icon name="sparkles" size={10} /> Démo synthétique</span>;
  if (actor.verificationStatus === "VERIFIED") return <span className={`${styles.statusPill} ${styles.verified}`}><Icon name="check-circle" size={10} /> Vérifié</span>;
  return <span className={`${styles.statusPill} ${styles.needsVerification}`}><Icon name="alert-circle" size={10} /> À vérifier</span>;
}

function actorTypeLabel(actor: Pick<UiActor, "actorTypes">, firstOnly = false) {
  if (actor.actorTypes.length === 0) return "Type non renseigné";
  const values = firstOnly ? actor.actorTypes.slice(0, 1) : actor.actorTypes;
  return values.map((type) => ACTOR_TYPE_LABELS[type] ?? type).join(", ");
}

function actorVerificationLabel(actor: Pick<UiActor, "verificationStatus" | "synthetic">) {
  if (actor.synthetic) return "Démo synthétique";
  return actor.verificationStatus === "VERIFIED" ? "Vérifié" : "À vérifier";
}

function SectionHeader({ kicker, title, description, actions }: { kicker: string; title: string; description: string; actions?: ReactNode }) {
  return (
    <div className={styles.sectionHeader}>
      <div>
        <div className={styles.sectionKicker}>{kicker}</div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {actions && <div className={styles.sectionActions}>{actions}</div>}
    </div>
  );
}

export function OrchestrationClient({ initialModel }: { initialModel: OrchestrationUiModel }) {
  const [view, setView] = useState<OrchestrationView>("overview");
  const [steps, setSteps] = useState(initialModel.steps);
  const [referrals, setReferrals] = useState(initialModel.referrals);
  const [costs, setCosts] = useState(initialModel.costs);
  const [outcome, setOutcome] = useState(initialModel.outcome);
  const [actors, setActors] = useState(initialModel.actors);
  const [passportGoals, setPassportGoals] = useState({ planA: initialModel.passport.planA, planB: initialModel.passport.planB });
  const [planBActive, setPlanBActive] = useState(initialModel.planBActive);
  const [pathwayStatus, setPathwayStatus] = useState(initialModel.pathwayStatus);
  const [pathwayVersion, setPathwayVersion] = useState(initialModel.pathwayVersion);
  const [draftVersionCreated, setDraftVersionCreated] = useState(false);
  const [planBReason, setPlanBReason] = useState("");
  const [ecosystemCapability, setEcosystemCapability] = useState("");
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [selectedActorId, setSelectedActorId] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const stored = JSON.parse(raw) as Partial<PersistedDemo>;
          if (Array.isArray(stored.steps)) setSteps(stored.steps);
          if (Array.isArray(stored.referrals)) setReferrals(stored.referrals);
          if (Array.isArray(stored.costs)) setCosts(stored.costs.map((cost) => ({ ...cost, amountPaid: cost.amountPaid ?? null })));
          if (stored.outcome) setOutcome({
            ...initialModel.outcome,
            ...stored.outcome,
            followups: { ...initialModel.outcome.followups, ...stored.outcome.followups },
            followupEvidence: { ...initialModel.outcome.followupEvidence, ...stored.outcome.followupEvidence },
            followupCheckedAt: { ...initialModel.outcome.followupCheckedAt, ...stored.outcome.followupCheckedAt },
          });
          if (Array.isArray(stored.actors)) setActors(stored.actors);
          if (stored.passportGoals && typeof stored.passportGoals.planA === "string" && typeof stored.passportGoals.planB === "string") setPassportGoals(stored.passportGoals);
          if (typeof stored.planBActive === "boolean") setPlanBActive(stored.planBActive);
          if (typeof stored.pathwayStatus === "string") setPathwayStatus(stored.pathwayStatus);
          if (typeof stored.pathwayVersion === "number") setPathwayVersion(stored.pathwayVersion);
          if (typeof stored.draftVersionCreated === "boolean") setDraftVersionCreated(stored.draftVersionCreated);
          if (typeof stored.planBReason === "string") setPlanBReason(stored.planBReason);
        }
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialModel.outcome]);

  useEffect(() => {
    if (!hydrated) return;
    const value: PersistedDemo = { steps, referrals, costs, outcome, actors, passportGoals, planBActive, pathwayStatus, pathwayVersion, draftVersionCreated, planBReason };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  }, [hydrated, steps, referrals, costs, outcome, actors, passportGoals, planBActive, pathwayStatus, pathwayVersion, draftVersionCreated, planBReason]);

  const model = useMemo<OrchestrationUiModel>(() => ({
    ...initialModel,
    actors,
    passport: { ...initialModel.passport, planA: passportGoals.planA, planB: passportGoals.planB },
    cohort: {
      ...initialModel.cohort,
      outcomes: ["ACTIVE", "MAINTAINED_J90"].includes(outcome.finalStatus) && !["PATHWAY_CONTINUES", "NO_ACTIVE_OUTCOME"].includes(outcome.type) ? 1 : 0,
    },
    pathwayVersion,
    pathwayStatus,
    planBActive,
  }), [actors, initialModel, outcome.finalStatus, outcome.type, passportGoals, pathwayStatus, pathwayVersion, planBActive]);

  const selectedStep = steps.find((step) => step.id === selectedStepId) ?? null;
  const selectedActor = actors.find((actor) => actor.id === selectedActorId) ?? null;

  function markPathwayChanged() {
    if (pathwayStatus !== "ACTIVE") return;
    setPathwayStatus("AWAITING_HUMAN_APPROVAL");
    setPathwayVersion((current) => current + 1);
    setDraftVersionCreated(true);
    setAnnouncement("Une modification importante a créé une nouvelle version brouillon. Une validation humaine est de nouveau requise.");
  }

  function updateSteps(next: UiStep[]) {
    markPathwayChanged();
    setSteps(next);
  }

  function updateGoals(next: { planA: string; planB: string }) {
    markPathwayChanged();
    setPassportGoals(next);
  }

  function activatePlanB(reason: string) {
    if (!reason.trim()) return;
    if (!planBActive) markPathwayChanged();
    setPlanBReason(reason.trim());
    setPlanBActive(true);
    setOutcome((current) => ({ ...current, planBActivated: true }));
    setAnnouncement("Plan B activé. La branche alternative est désormais active et reste soumise à validation humaine.");
  }

  function resetDemo() {
    window.localStorage.removeItem(STORAGE_KEY);
    setSteps(initialModel.steps);
    setReferrals(initialModel.referrals);
    setCosts(initialModel.costs);
    setOutcome(initialModel.outcome);
    setActors(initialModel.actors);
    setPassportGoals({ planA: initialModel.passport.planA, planB: initialModel.passport.planB });
    setPlanBActive(initialModel.planBActive);
    setPathwayStatus(initialModel.pathwayStatus);
    setPathwayVersion(initialModel.pathwayVersion);
    setDraftVersionCreated(false);
    setPlanBReason("");
    setSelectedStepId(null);
    setAnnouncement("Le scénario synthétique a été réinitialisé.");
  }

  function openSarah() {
    setView("pathway");
    setAnnouncement("Parcours de démonstration de Sarah ouvert.");
  }

  return (
    <section className={styles.studio} aria-label="Orchestration des parcours">
      <header className={styles.hero}>
        <div className={styles.heroTop}>
          <div className={styles.eyebrow}>Pathway Engine · studio de pilotage humain</div>
          <span className={styles.demoBadge}><Icon name="sparkles" size={13} /> Démo synthétique · aucune donnée réelle</span>
        </div>
        <div className={styles.heroMain}>
          <div>
            <h1>Orchestration des parcours</h1>
            <p className={styles.heroSubtitle}>Construire, coordonner et mesurer chaque trajectoire vers une sortie professionnelle durable.</p>
          </div>
          <div className={styles.prototypeNote}><Icon name="shield" size={16} /> Les actions de cette démonstration restent dans votre navigateur. Aucun message, financement ou dossier partenaire n’est réellement envoyé.</div>
        </div>
        <div className={styles.formula} aria-label="Vision du moteur d’orchestration">
          <span>État participant</span><b>+</b><span>État cible</span><b>+</b><span>Écosystème local</span><b>→</b><span>Parcours validé</span><b>→</b><span>Orchestration</span><b>→</b><span>Sortie</span><b>→</b><span>Coût & apprentissage</span>
        </div>
      </header>

      <nav className={styles.topNav} aria-label="Vues Orchestration">
        {VIEWS.map((item) => (
          <button key={item.id} type="button" className={`${styles.tab} ${view === item.id ? styles.tabActive : ""}`} aria-current={view === item.id ? "page" : undefined} onClick={() => setView(item.id)}>
            <Icon name={item.icon} size={15} /><span>{item.label}</span>
          </button>
        ))}
      </nav>

      <main className={styles.content}>
        {view === "overview" && <Overview model={model} steps={steps} referrals={referrals} costs={costs} outcome={outcome} onOpenSarah={openSarah} onView={setView} onSearchCapability={(capability) => { setEcosystemCapability(capability); setView("ecosystem"); }} />}
        {view === "cohorts" && <Cohorts model={model} onOpenSarah={openSarah} />}
        {view === "pathway" && (
          <PathwayStudio
            model={model}
            steps={steps}
            referrals={referrals}
            onReferrals={setReferrals}
            costs={costs}
            planBActive={planBActive}
            pathwayStatus={pathwayStatus}
            pathwayVersion={pathwayVersion}
            selectedStep={selectedStep}
            onSelectStep={setSelectedStepId}
            onSteps={updateSteps}
            onActivatePlanB={activatePlanB}
            planBReason={planBReason}
            onValidate={() => {
              setPathwayStatus("ACTIVE");
              if (!draftVersionCreated) setPathwayVersion((current) => current + 1);
              setDraftVersionCreated(false);
              setAnnouncement("Le brouillon a été validé humainement pour cette démonstration locale.");
            }}
            onShare={() => setShareOpen(true)}
            onGoals={updateGoals}
          />
        )}
        {view === "ecosystem" && <Ecosystem actors={actors} initialCapability={ecosystemCapability} onOpenActor={setSelectedActorId} />}
        {view === "reference" && <Reference model={model} costs={costs} onOpenActor={setSelectedActorId} />}
        {view === "costs" && <CostsAndOutcomes model={model} costs={costs} onCosts={setCosts} outcome={outcome} onOutcome={setOutcome} />}
      </main>

      <div className={styles.liveRegion} aria-live="polite">{announcement}</div>
      {selectedStep && (
        <StepDrawer
          step={selectedStep}
          steps={steps}
          actors={actors}
          onClose={() => setSelectedStepId(null)}
          onChange={(next) => updateSteps(steps.map((step) => step.id === next.id ? next : step))}
          onDelete={() => {
            updateSteps(steps.filter((step) => step.id !== selectedStep.id).map((step) => ({ ...step, dependencies: step.dependencies.filter((id) => id !== selectedStep.id) })));
            setSelectedStepId(null);
            setAnnouncement("Étape brouillon supprimée du parcours local.");
          }}
        />
      )}
      {selectedActor && <ActorDrawer actor={selectedActor} onChange={(next) => setActors((current) => current.map((actor) => actor.id === next.id ? next : actor))} onClose={() => setSelectedActorId(null)} />}
      {shareOpen && <SharePreview passport={model.passport} onClose={() => setShareOpen(false)} />}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
        <button type="button" className={styles.ghostButton} onClick={resetDemo}><Icon name="refresh" size={13} /> Réinitialiser la démo locale</button>
      </div>
    </section>
  );
}

function Overview({ model, steps, referrals, costs, outcome, onOpenSarah, onView, onSearchCapability }: {
  model: OrchestrationUiModel;
  steps: UiStep[];
  referrals: UiReferral[];
  costs: UiCostItem[];
  outcome: UiOutcome;
  onOpenSarah: () => void;
  onView: (view: OrchestrationView) => void;
  onSearchCapability: (capability: string) => void;
}) {
  const blocked = steps.filter((step) => step.status === "BLOCKED").length;
  const unanswered = referrals.filter((referral) => referral.status === "NO_RESPONSE" || referral.status === "SENT").length;
  const uncovered = costs.filter((cost) => cost.expectedCost === null || cost.amountApproved === null || cost.amountApproved < cost.expectedCost).length;
  const mobilityIssue = model.passport.needs.some((need) => need.type === "MOBILITY" && need.status !== "RESOLVED");
  const employerIssue = referrals.some((referral) => ["ACKNOWLEDGED", "ACCEPTED", "IN_PROGRESS"].includes(referral.status));
  const topicCount = (unanswered > 0 ? 1 : 0) + (mobilityIssue ? 1 : 0) + (employerIssue ? 1 : 0) + (uncovered > 0 ? 1 : 0);
  const now = DEMO_NOW_MS;
  const sevenDaysFromNow = now + 7 * 24 * 60 * 60 * 1000;
  const upcomingDeadlines = steps.filter((step) => step.dueDate && !["COMPLETED", "CANCELLED"].includes(step.status) && new Date(step.dueDate).getTime() >= now && new Date(step.dueDate).getTime() <= sevenDaysFromNow).length;
  const activeOutcomes = ["ACTIVE", "MAINTAINED_J90"].includes(outcome.finalStatus) ? 1 : 0;
  const metrics = [
    ["1", "Cohorte active", false],
    [String(model.cohort.participants), "Participants actifs", false],
    [String(blocked), "Parcours bloqué", blocked > 0],
    [String(unanswered), "Orientations sans retour", unanswered > 0],
    [String(upcomingDeadlines), "Échéances à 7 jours", false],
    [String(uncovered), "Coûts non financés", uncovered > 0],
    [String(activeOutcomes), "Sortie active", false],
    [outcome.followups.J90 === "ACTIVE" ? "1" : "0", "Maintenue à J+90", false],
  ] as const;

  return (
    <>
      <div className={styles.pilotBar} aria-label="Barre de pilotage">
        {metrics.map(([value, label, alert]) => <div key={label} className={`${styles.pilotMetric} ${alert ? styles.metricAlert : ""}`}><strong>{value}</strong><span>{label}</span></div>)}
      </div>
      <div className={styles.overviewGrid}>
        <section className={styles.inbox}>
          <div className={styles.inboxHeader}>
            <div className={styles.spread}><div><h3>À traiter maintenant</h3><p>Une file opérationnelle, ordonnée par impact sur les parcours.</p></div><span className={`${styles.statusPill} ${topicCount > 0 ? styles.statusWaiting : styles.statusDone}`}>{topicCount} sujet{topicCount > 1 ? "s" : ""}</span></div>
          </div>
          <div className={styles.inboxList}>
            {unanswered > 0 && <InboxItem icon="send" title={`${unanswered} orientation${unanswered > 1 ? "s" : ""} sans accusé de réception`} detail="Vérifier le destinataire, puis préparer une relance humaine." action="Voir les orientations" onClick={() => onView("pathway")} />}
            {mobilityIssue && <InboxItem danger icon="map-pin" title="Mobilité · horaires décalés" detail="Sarah a un frein validé, mais aucune solution locale vérifiée n’est encore enregistrée." action="Chercher un acteur" onClick={() => onSearchCapability("SUPPORT_MOBILITY")} />}
            {employerIssue && <InboxItem icon="building" title="Réponse employeur attendue" detail="La PMSMP de démonstration attend un retour explicite et une preuve." action="Piloter le parcours" onClick={onOpenSarah} />}
            {uncovered > 0 && <InboxItem danger icon="euro" title="Financement incomplet ou inconnu" detail="Un coût inconnu n’est jamais converti en zéro. Compléter avant décision." action="Ouvrir le ledger" onClick={() => onView("costs")} />}
            {topicCount === 0 && <div className={styles.emptyState} style={{ minHeight: 150, margin: 12 }}><span><strong>Rien d’urgent</strong><p>Les sujets réapparaîtront ici dès qu’une échéance, une orientation ou un financement demandera une action.</p></span></div>}
          </div>
        </section>
        <section className={`${styles.panel} ${styles.trajectory}`}>
          <div className={styles.sectionKicker} style={{ color: "#a9d8cc" }}>Sarah · Plan A</div>
          <h3>De l’accueil client à la réception hôtelière</h3>
          <p>Le moteur explicite les écarts, propose des interventions et laisse le CIP choisir, modifier puis valider le chemin.</p>
          <div className={styles.trajectoryLine}>
            {["Diagnostic", "Anglais métier", "Mobilité", "PMSMP", "Contrat", "J+90"].map((label, index) => (
              <span key={label} style={{ display: "contents" }}><span className={styles.trajectoryStep}><span>Étape {index + 1}</span><strong>{label}</strong></span>{index < 5 && <Icon className={styles.trajectoryArrow} name="arrow-right" size={15} />}</span>
            ))}
          </div>
          <button type="button" className={styles.primaryButton} style={{ marginTop: 16, background: "#fff", color: "#174138" }} onClick={onOpenSarah}><Icon name="arrow-right" size={14} /> Ouvrir le parcours de Sarah</button>
        </section>
      </div>
    </>
  );
}

function InboxItem({ icon, title, detail, action, danger = false, onClick }: { icon: string; title: string; detail: string; action: string; danger?: boolean; onClick: () => void }) {
  return (
    <div className={`${styles.inboxItem} ${danger ? styles.inboxDanger : ""}`}>
      <span className={styles.inboxIcon}><Icon name={icon} size={15} /></span>
      <span><strong>{title}</strong><small>{detail}</small></span>
      <button type="button" className={styles.ghostButton} onClick={onClick}>{action} <Icon name="chevron-right" size={12} /></button>
    </div>
  );
}

function Cohorts({ model, onOpenSarah }: { model: OrchestrationUiModel; onOpenSarah: () => void }) {
  return (
    <>
      <SectionHeader kicker="Programmes" title="Cohortes Emploi’Ton" description="Ouvrir une cohorte pour piloter ses participants, opportunités, acteurs mobilisés et sorties." />
      <div className={styles.cohortList}>
        <article className={styles.cohortCard}>
          <div className={styles.cohortIdentity}><div className={styles.spread}><span className={styles.demoBadge}>Démo synthétique</span><span className={`${styles.statusPill} ${styles.statusActive}`}>{STATUS_LABELS[model.cohort.status] ?? model.cohort.status}</span></div><h3>{model.cohort.name}</h3><p>{model.cohort.sector} · {model.cohort.territory} · {model.cohort.dateLabel}</p></div>
          <div className={styles.cohortStat}><span>Participants</span><strong>{model.cohort.participants}</strong></div>
          <div className={styles.cohortStat}><span>Opportunités</span><strong>{model.cohort.opportunities}</strong></div>
          <div className={styles.cohortStat}><span>Sorties</span><strong>{model.cohort.outcomes}</strong></div>
          <div className={styles.cohortStat}><span>Responsable</span><strong>{model.cohort.owner}</strong></div>
          <button type="button" className={styles.primaryButton} onClick={onOpenSarah}>Ouvrir Sarah <Icon name="arrow-right" size={13} /></button>
        </article>
      </div>
      <div className={styles.emptyState} style={{ marginTop: 12 }}><span><strong>Une seule cohorte dans ce vertical slice</strong><p>Les autres cohortes seront connectées au repository persistant après validation du modèle et des usages terrain.</p></span></div>
    </>
  );
}

function PathwayStudio({ model, steps, referrals, onReferrals, costs, planBActive, planBReason, pathwayStatus, pathwayVersion, selectedStep, onSelectStep, onSteps, onActivatePlanB, onValidate, onShare, onGoals }: {
  model: OrchestrationUiModel;
  steps: UiStep[];
  referrals: UiReferral[];
  onReferrals: (referrals: UiReferral[]) => void;
  costs: UiCostItem[];
  planBActive: boolean;
  planBReason: string;
  pathwayStatus: string;
  pathwayVersion: number;
  selectedStep: UiStep | null;
  onSelectStep: (stepId: string | null) => void;
  onSteps: (steps: UiStep[]) => void;
  onActivatePlanB: (reason: string) => void;
  onValidate: () => void;
  onShare: () => void;
  onGoals: (goals: { planA: string; planB: string }) => void;
}) {
  const [canvasMode, setCanvasMode] = useState<"graph" | "timeline">("graph");
  const [planBReasonDraft, setPlanBReasonDraft] = useState(planBReason);
  const nextStep = steps.find((step) => !["COMPLETED", "CANCELLED"].includes(step.status) && (step.planType === "A" || planBActive)) ?? steps[0];
  const pendingReferrals = referrals.filter((referral) => !["COMPLETED", "CANCELLED"].includes(referral.status));
  const expectedSummary = moneySummary(costs.map((cost) => cost.expectedCost));
  const approvedSummary = moneySummary(costs.map((cost) => cost.amountApproved));
  const remaining = expectedSummary.complete && approvedSummary.complete
    ? Math.max(expectedSummary.knownSubtotal - approvedSummary.knownSubtotal, 0)
    : null;
  const relevantSteps = steps.filter((step) => step.planType === "A" || planBActive);
  const ownerIssues = relevantSteps.filter((step) => !step.assignedActorId && !["CANCELLED"].includes(step.status));
  const deadlineIssues = relevantSteps.filter((step) => !step.dueDate && !["CANCELLED"].includes(step.status));
  const evidenceIssues = relevantSteps.filter((step) => ["BLOCKED", "COMPLETED"].includes(step.status) && step.evidence.length === 0);
  const validationIssueCount = ownerIssues.length + deadlineIssues.length + evidenceIssues.length;
  const canValidate = validationIssueCount === 0 && pathwayStatus !== "ACTIVE";

  const moveStep = useCallback((stepId: string, x: number, y: number) => {
    onSteps(steps.map((step) => step.id === stepId ? { ...step, x, y } : step));
  }, [onSteps, steps]);

  function addDraftStep() {
    const id = `draft-${Date.now()}`;
    const newPlan = selectedStep?.planType ?? "A";
    const latest = steps.filter((step) => step.planType === newPlan).at(-1);
    const draft: UiStep = {
      id,
      title: "Nouvelle étape à qualifier",
      description: "Étape ajoutée par le CIP dans le brouillon local.",
      type: "LBR_ACTION",
      status: "DRAFT",
      planType: newPlan,
      assignedActorId: null,
      assignedActorName: "Acteur à assigner",
      dependencies: selectedStep ? [selectedStep.id] : latest ? [latest.id] : [],
      plannedStart: null,
      dueDate: null,
      completedAt: null,
      expectedCost: null,
      actualCost: null,
      sourceReason: "Ajout manuel par le CIP. Motif à compléter avant validation.",
      evidence: [],
      draft: true,
      x: (steps.length % 5) * 275,
      y: 760 + Math.floor(steps.length / 5) * 175,
    };
    onSteps([...steps, draft]);
    onSelectStep(id);
  }

  return (
    <>
      <div className={styles.pathwayTitleBar}>
        <div className={styles.pathwayIdentity}><span className={styles.avatar}>S</span><div><h2>Sarah · Plan A · {model.passport.planA}</h2><p>Version {pathwayVersion} · {STATUS_LABELS[pathwayStatus] ?? pathwayStatus} · Démo synthétique</p></div></div>
        <div className={styles.pathwayTools}>
          <span className={`${styles.statusPill} ${statusClass(pathwayStatus)}`}>{STATUS_LABELS[pathwayStatus] ?? pathwayStatus}</span>
          <button type="button" className={styles.secondaryButton} onClick={addDraftStep}><Icon name="plus" size={13} /> Ajouter une étape</button>
          <button type="button" className={styles.secondaryButton} onClick={onShare}><Icon name="eye" size={13} /> Aperçu partage</button>
          <button type="button" className={styles.primaryButton} onClick={onValidate} disabled={!canValidate} title={validationIssueCount > 0 ? `${validationIssueCount} point(s) de contrôle restent à corriger` : undefined}><Icon name="check" size={13} /> {pathwayStatus === "ACTIVE" ? "Validé humainement" : validationIssueCount > 0 ? `${validationIssueCount} point(s) à corriger` : "Valider le brouillon"}</button>
        </div>
      </div>
      <div className={styles.pathwayLayout}>
        <PassportPanel model={model} onShare={onShare} onGoals={onGoals} />
        <section className={styles.graphPanel} aria-label="Graphe du parcours">
          <div className={styles.graphToolbar}>
            <div className={styles.graphToolbarLeft}>
              <div className={styles.segmented} aria-label="Mode d’affichage">
                <button type="button" className={`${styles.segmentedButton} ${canvasMode === "graph" ? styles.segmentedActive : ""}`} onClick={() => setCanvasMode("graph")}><Icon name="layers" size={12} /> Graphe</button>
                <button type="button" className={`${styles.segmentedButton} ${canvasMode === "timeline" ? styles.segmentedActive : ""}`} onClick={() => setCanvasMode("timeline")}><Icon name="calendar-range" size={12} /> Timeline</button>
              </div>
              <span className={styles.graphHint}>Sélectionner une étape pour la piloter · glisser, zoomer, déplacer</span>
            </div>
            <div className={styles.graphToolbarRight}>
              <span className={`${styles.statusPill} ${planBActive ? styles.statusActive : styles.statusDraft}`}>Plan B · {planBActive ? "actif" : "en réserve"}</span>
              {!planBActive && <input aria-label="Motif d’activation du Plan B" value={planBReasonDraft} placeholder="Motif obligatoire" onChange={(event) => setPlanBReasonDraft(event.target.value)} />}
              <button type="button" className={styles.secondaryButton} disabled={planBActive || !planBReasonDraft.trim()} onClick={() => onActivatePlanB(planBReasonDraft)}><Icon name="refresh" size={12} /> {planBActive ? "Plan B activé" : "Activer Plan B"}</button>
            </div>
          </div>
          <PathwayCanvas steps={steps} selectedId={selectedStep?.id ?? null} planBActive={planBActive} mode={canvasMode} onSelect={(id) => onSelectStep(id)} onMove={moveStep} />
        </section>
        <aside className={styles.pilotPanel} aria-label="Pilotage du parcours">
          <div className={styles.columnTitle}><strong>Pilotage</strong><Icon name="gauge" size={15} /></div>
          <div className={styles.pilotSection}><h4>Checklist de validation</h4><div className={styles.miniList}><div className={styles.miniRow}><span className={styles.miniRowIcon}><Icon name={ownerIssues.length ? "alert-circle" : "check-circle"} size={12} /></span><span><strong>Responsables</strong><small>{ownerIssues.length ? `${ownerIssues.length} étape(s) sans acteur` : "Chaque action a un responsable"}</small></span></div><div className={styles.miniRow}><span className={styles.miniRowIcon}><Icon name={deadlineIssues.length ? "alert-circle" : "check-circle"} size={12} /></span><span><strong>Échéances</strong><small>{deadlineIssues.length ? `${deadlineIssues.length} échéance(s) manquante(s)` : "Chaque responsable a une échéance"}</small></span></div><div className={styles.miniRow}><span className={styles.miniRowIcon}><Icon name={evidenceIssues.length ? "alert-circle" : "check-circle"} size={12} /></span><span><strong>Preuves</strong><small>{evidenceIssues.length ? `${evidenceIssues.length} blocage(s)/fin(s) sans preuve` : "Blocages et fins sont documentés"}</small></span></div></div></div>
          <div className={styles.pilotSection}><h4>Prochaine meilleure action</h4><div className={styles.nextAction}><strong>{nextStep?.title ?? "Aucune action active"}</strong><p>{nextStep?.sourceReason ?? "Le CIP doit définir la prochaine action."}</p></div></div>
          <div className={styles.pilotSection}><h4>Orientations en attente</h4><div className={styles.miniList}>{pendingReferrals.length ? pendingReferrals.slice(0, 3).map((referral) => <div className={styles.miniRow} key={referral.id}><span className={styles.miniRowIcon}><Icon name="send" size={12} /></span><span><strong>{referral.toActorName}</strong><small>{referral.title}</small></span><span className={`${styles.statusPill} ${statusClass(referral.status)}`}>{STATUS_LABELS[referral.status] ?? referral.status}</span></div>) : <small>Aucune orientation en attente.</small>}</div></div>
          <div className={styles.pilotSection}><h4>Blocages</h4><div className={styles.miniList}>{model.passport.needs.filter((need) => need.blocking).map((need) => <div className={styles.miniRow} key={need.id}><span className={styles.miniRowIcon} style={{ background: "var(--orch-red-soft)", color: "var(--orch-red)" }}><Icon name="alert-triangle" size={12} /></span><span><strong>{need.label}</strong><small>{need.evidence}</small></span></div>)}</div></div>
          <div className={styles.pilotSection}><h4>Coûts & couverture</h4><div className={styles.moneyLine}><span>{expectedSummary.hasKnown ? "Sous-total prévu connu" : "Coût prévisionnel"}</span><strong>{expectedSummary.hasKnown ? euro(expectedSummary.knownSubtotal) : "Non renseigné"}</strong></div>{expectedSummary.unknownCount > 0 && <div className={styles.unknown}>{expectedSummary.unknownCount} coût(s) non renseigné(s)</div>}<div className={styles.moneyLine}><span>{approvedSummary.hasKnown ? "Sous-total accordé connu" : "Financement accordé"}</span><strong>{approvedSummary.hasKnown ? euro(approvedSummary.knownSubtotal) : "Non renseigné"}</strong></div>{approvedSummary.unknownCount > 0 && <div className={styles.unknown}>{approvedSummary.unknownCount} couverture(s) inconnue(s)</div>}<div className={styles.moneyLine}><span>Reste à financer</span><strong>{euro(remaining)}</strong></div></div>
          <div className={styles.pilotSection}><h4>Historique</h4><div className={styles.evidence}>{pathwayStatus === "ACTIVE" ? `Version ${pathwayVersion} validée localement par le CIP (démo).` : `Version ${pathwayVersion} · brouillon en attente de validation humaine.`}{planBActive ? ` Plan B activé : ${planBReason}.` : ""}</div></div>
        </aside>
      </div>
      <ReferralDesk actors={model.actors} steps={steps} referrals={referrals} onReferrals={onReferrals} onActivatePlanB={onActivatePlanB} />
    </>
  );
}

function ReferralDesk({ actors, steps, referrals, onReferrals, onActivatePlanB }: {
  actors: UiActor[];
  steps: UiStep[];
  referrals: UiReferral[];
  onReferrals: (referrals: UiReferral[]) => void;
  onActivatePlanB: (reason: string) => void;
}) {
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);
  const [newActorId, setNewActorId] = useState("");
  const [newStepId, setNewStepId] = useState("");
  const [newReason, setNewReason] = useState("");

  function update(id: string, patch: Partial<UiReferral>) {
    onReferrals(referrals.map((referral) => referral.id === id ? { ...referral, ...patch } : referral));
  }

  function nextStatus(referral: UiReferral) {
    if (referral.status === "DRAFT") return "SENT";
    const currentIndex = REFERRAL_CYCLE.indexOf(referral.status);
    return currentIndex >= 0 && currentIndex < REFERRAL_CYCLE.length - 1 ? REFERRAL_CYCLE[currentIndex + 1] : referral.status;
  }

  function addReferral() {
    const target = actors.find((actor) => actor.id === newActorId);
    const step = steps.find((candidate) => candidate.id === newStepId);
    if (!target || !step || !newReason.trim()) return;
    onReferrals([...referrals, {
      id: `referral-${Date.now()}`,
      stepId: step.id,
      title: step.title,
      fromActorId: actors.find((actor) => actor.actorTypes.includes("ORCHESTRATOR"))?.id ?? "lbr-demo",
      toActorId: target.id,
      toActorName: target.name,
      reason: newReason.trim(),
      requestedAction: "Accuser réception puis répondre explicitement.",
      status: "DRAFT",
      expectedResponseAt: null,
      sentAt: null,
      acknowledgedAt: null,
      acceptedAt: null,
      completedAt: null,
      lastRelaunchAt: null,
      response: null,
      rejectionReason: null,
      relaunchCount: 0,
    }]);
    setCreating(false);
    setNewActorId("");
    setNewStepId("");
    setNewReason("");
  }

  return (
    <section className={styles.panel} style={{ marginTop: 11 }} aria-label="Boucle des orientations">
      <div className={styles.spread}><div><div className={styles.sectionKicker}>Boucle de retour</div><h3 style={{ marginTop: 4 }}>Orientations traçables</h3></div><button type="button" className={styles.secondaryButton} onClick={() => setCreating((current) => !current)}><Icon name={creating ? "x" : "plus"} size={12} /> {creating ? "Annuler" : "Préparer une orientation"}</button></div>
      <div className={styles.sourceBox} style={{ marginTop: 10, marginBottom: 10 }}>Simulation locale uniquement : aucun email ni appel externe. Un refus exige un motif ; une absence de réponse permet une relance ; un refus peut activer le Plan B.</div>
      {creating && <div className={styles.panel} style={{ marginBottom: 10, background: "var(--orch-green-soft)" }}><div className={styles.outcomeGrid}><label className={styles.field}><span>Étape concernée</span><select value={newStepId} onChange={(event) => setNewStepId(event.target.value)}><option value="">Choisir une étape…</option>{steps.map((step) => <option value={step.id} key={step.id}>Plan {step.planType} · {step.title}</option>)}</select></label><label className={styles.field}><span>Acteur destinataire</span><select value={newActorId} onChange={(event) => setNewActorId(event.target.value)}><option value="">Choisir explicitement…</option>{actors.map((actor) => <option value={actor.id} key={actor.id}>{actor.name} · {actorTypeLabel(actor, true)} · {actorVerificationLabel(actor)}</option>)}</select></label></div><label className={styles.field} style={{ marginTop: 8 }}><span>Motif et action demandée</span><textarea value={newReason} placeholder="Pourquoi cet acteur, pour quel besoin, quelle réponse attendue ?" onChange={(event) => setNewReason(event.target.value)} /></label><div className={styles.referralActions}><button type="button" className={styles.primaryButton} disabled={!newStepId || !newActorId || !newReason.trim()} onClick={addReferral}><Icon name="check" size={12} /> Créer le brouillon local</button><span className={`${styles.statusPill} ${styles.statusDraft}`}>Statut initial · Brouillon</span></div></div>}
      <div className={styles.referralList}>
        {referrals.map((referral) => {
          const next = nextStatus(referral);
          const rejectionReason = rejectionReasons[referral.id] ?? "";
          const response = responses[referral.id] ?? referral.response ?? "";
          const currentIndex = REFERRAL_CYCLE.indexOf(referral.status);
          const terminal = ["COMPLETED", "REJECTED", "CANCELLED"].includes(referral.status);
          return (
            <article className={styles.referralCard} key={referral.id}>
              <div className={styles.referralTop}><div><h4>{referral.title} → {referral.toActorName}</h4><p>{referral.reason}</p></div><span className={`${styles.statusPill} ${statusClass(referral.status)}`}>{STATUS_LABELS[referral.status] ?? referral.status}</span></div>
              <div className={styles.referralCycle} aria-label={`Cycle de statut de ${referral.title}`}>{REFERRAL_CYCLE.map((status, index) => <span className={`${styles.cycleStep} ${index < currentIndex ? styles.cycleDone : ""} ${status === referral.status ? styles.cycleCurrent : ""}`} key={status}>{STATUS_LABELS[status]}</span>)}</div>
              <div className={styles.sourceLine} style={{ marginTop: 8 }}><Icon name="file-text" size={10} /> Source : simulation locale · envoyée {shortDate(referral.sentAt)} · réponse attendue {shortDate(referral.expectedResponseAt)} · dernière relance {shortDate(referral.lastRelaunchAt)}</div>
              <div className={styles.outcomeGrid}>
                <label className={styles.field}><span>Réponse reçue</span><input value={response} placeholder="Résumé du retour" onChange={(event) => setResponses((current) => ({ ...current, [referral.id]: event.target.value }))} /></label>
                <label className={styles.field}><span>Motif de refus obligatoire</span><input value={rejectionReason} placeholder="Renseigner avant de refuser" onChange={(event) => setRejectionReasons((current) => ({ ...current, [referral.id]: event.target.value }))} /></label>
              </div>
              <div className={styles.referralActions}>
                {!terminal && next !== referral.status && <button type="button" className={styles.primaryButton} onClick={() => { const at = new Date().toISOString(); update(referral.id, { status: next, response: response || referral.response, ...(next === "SENT" ? { sentAt: at } : {}), ...(next === "ACKNOWLEDGED" ? { acknowledgedAt: at } : {}), ...(next === "ACCEPTED" ? { acceptedAt: at } : {}), ...(next === "COMPLETED" ? { completedAt: at } : {}) }); }}><Icon name={referral.status === "DRAFT" ? "send" : "check-circle"} size={12} /> {referral.status === "DRAFT" ? "Envoyer la simulation" : `Passer à « ${STATUS_LABELS[next]} »`}</button>}
                {!terminal && referral.status !== "DRAFT" && <button type="button" className={styles.secondaryButton} onClick={() => update(referral.id, { status: "NO_RESPONSE" })}><Icon name="clock" size={12} /> Marquer sans réponse</button>}
                {referral.status === "NO_RESPONSE" && <button type="button" className={styles.secondaryButton} onClick={() => update(referral.id, { status: "SENT", relaunchCount: referral.relaunchCount + 1, lastRelaunchAt: new Date().toISOString() })}><Icon name="refresh" size={12} /> Relancer ({referral.relaunchCount})</button>}
                {!terminal && <button type="button" className={styles.dangerButton} disabled={!rejectionReason.trim()} title={rejectionReason.trim() ? "Enregistrer le refus motivé" : "Un motif est obligatoire"} onClick={() => update(referral.id, { status: "REJECTED", rejectionReason })}><Icon name="user-x" size={12} /> Enregistrer le refus</button>}
                {referral.status === "REJECTED" && <button type="button" className={styles.secondaryButton} onClick={() => onActivatePlanB(referral.rejectionReason ?? "Refus motivé de l’orientation") }><Icon name="refresh" size={12} /> Activer séparément le Plan B</button>}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function PassportPanel({ model, onShare, onGoals }: { model: OrchestrationUiModel; onShare: () => void; onGoals: (goals: { planA: string; planB: string }) => void }) {
  const { passport } = model;
  const [editingGoals, setEditingGoals] = useState(false);
  const [draftGoals, setDraftGoals] = useState({ planA: passport.planA, planB: passport.planB });
  const confirmedSkillLabels = new Set(passport.skills.filter((skill) => skill.confidence === "CONFIRMED").map((skill) => skill.label.toLocaleLowerCase("fr")));
  const matchedRequirements = model.occupation.requiredSkills.filter((skill) => confirmedSkillLabels.has(skill.toLocaleLowerCase("fr")));
  const missingRequirements = model.occupation.requiredSkills.filter((skill) => !confirmedSkillLabels.has(skill.toLocaleLowerCase("fr")));
  return (
    <aside className={styles.passportPanel} aria-label="Passeport Rebond de Sarah">
      <div className={styles.columnTitle}><strong>Passeport Rebond</strong><span className={styles.demoBadge}>Démo</span></div>
      <div className={styles.passportHero}><h3>{passport.firstName}</h3><p>{passport.ageLabel} · {passport.currentSituation}<br />Source : {passport.sourceLabel}</p></div>
      <div className={styles.passportSection}><div className={styles.spread}><h4><Icon name="target" size={12} /> Objectifs</h4><button type="button" className={styles.ghostButton} onClick={() => { setDraftGoals({ planA: passport.planA, planB: passport.planB }); setEditingGoals((current) => !current); }}><Icon name="edit" size={11} /> {editingGoals ? "Annuler" : "Modifier"}</button></div>{editingGoals ? <div className={styles.planBlock}><div className={styles.sourceBox}>Modifier l’objectif invalide la proposition actuelle : une nouvelle version brouillon devra être revue et validée humainement.</div><label className={styles.field}><span>Plan A</span><input value={draftGoals.planA} onChange={(event) => setDraftGoals((current) => ({ ...current, planA: event.target.value }))} /></label><label className={styles.field}><span>Plan B</span><input value={draftGoals.planB} onChange={(event) => setDraftGoals((current) => ({ ...current, planB: event.target.value }))} /></label><button type="button" className={styles.primaryButton} disabled={!draftGoals.planA.trim() || !draftGoals.planB.trim()} onClick={() => { onGoals(draftGoals); setEditingGoals(false); }}><Icon name="check" size={12} /> Créer une version à revoir</button></div> : <div className={styles.planBlock}><div className={styles.planRow}><span>Plan A</span><strong>{passport.planA}</strong></div><div className={styles.planRow}><span>Plan B</span><strong>{passport.planB}</strong></div></div>}</div>
      <div className={styles.passportSection}><h4><Icon name="search" size={12} /> Écart avec le métier cible</h4><div className={styles.evidence}><strong>{matchedRequirements.length}/{model.occupation.requiredSkills.length}</strong> compétence(s) requise(s) confirmée(s) · comparaison explicable, sans décision automatique.</div><div className={styles.tagList} style={{ marginTop: 7 }}>{matchedRequirements.map((skill) => <span className={styles.skillTag} key={skill}><Icon name="check" size={9} /> {skill}</span>)}{missingRequirements.map((skill) => <span className={styles.barrierTag} key={skill}><Icon name="alert-circle" size={9} /> À combler : {skill}</span>)}</div></div>
      <div className={styles.passportSection}><h4><Icon name="check-circle" size={12} /> Compétences & preuves</h4><div className={styles.tagList}>{passport.skills.map((skill) => <span className={styles.skillTag} key={skill.id}><Icon name={skill.confidence === "CONFIRMED" ? "check" : "alert-circle"} size={9} /> {skill.label}</span>)}</div>{passport.skills.slice(0, 2).map((skill) => <div className={styles.evidence} key={`${skill.id}-evidence`}><strong>{skill.label}</strong> · {skill.evidence} · {STATUS_LABELS[skill.confidence] ?? skill.confidence.toLowerCase()}</div>)}</div>
      <div className={styles.passportSection}><h4><Icon name="alert-triangle" size={12} /> Freins & besoins</h4><div className={styles.tagList}>{passport.needs.map((need) => <span className={styles.barrierTag} key={need.id}><Icon name="alert-circle" size={9} /> {need.label}{need.blocking ? " · bloquant" : ""}</span>)}</div></div>
      <div className={styles.passportSection}><h4><Icon name="map-pin" size={12} /> Contexte</h4><div className={styles.evidence}><strong>Mobilité</strong> · {passport.mobility}</div><div className={styles.evidence}><strong>Disponibilité</strong> · {passport.availability}</div><div className={styles.evidence}><strong>Expérience</strong> · {passport.experienceSummary}</div></div>
      <div className={styles.passportSection}><h4><Icon name="shield" size={12} /> Consentements</h4>{passport.consents.length ? passport.consents.map((consent) => <div className={styles.evidence} key={consent.label}><Icon name={consent.granted ? "check-circle" : "alert-circle"} size={10} /> {consent.label} · {consent.granted ? "accordé" : "non accordé"}</div>) : <div className={styles.evidence}>Aucun consentement simulé enregistré.</div>}<button type="button" className={`${styles.secondaryButton} ${styles.sharePreviewButton}`} onClick={onShare}><Icon name="eye" size={12} /> Voir les vues limitées</button><div className={styles.privacyNote}>Le Passeport maître ne circule jamais intégralement. Chaque destinataire ne voit que le minimum nécessaire.</div></div>
    </aside>
  );
}

function StepDrawer({ step, steps, actors, onClose, onChange, onDelete }: { step: UiStep; steps: UiStep[]; actors: UiActor[]; onClose: () => void; onChange: (step: UiStep) => void; onDelete: () => void }) {
  function patch<K extends keyof UiStep>(key: K, value: UiStep[K]) {
    onChange({ ...step, [key]: value });
  }
  return (
    <aside className={styles.stepDrawer} role="dialog" aria-modal="true" aria-labelledby="step-title">
      <div className={styles.drawerHeader}><div><div className={styles.eyebrow}>Étape · Plan {step.planType}</div><h2 id="step-title">{step.title}</h2></div><button type="button" className={styles.iconButton} aria-label="Fermer le détail" onClick={onClose}><Icon name="x" size={16} /></button></div>
      <div className={styles.drawerBody}>
        <label className={styles.field}><span>Titre</span><input value={step.title} onChange={(event) => patch("title", event.target.value)} /></label>
        <label className={styles.field}><span>Description</span><textarea value={step.description} onChange={(event) => patch("description", event.target.value)} /></label>
        <label className={styles.field}><span>Statut écrit</span><select value={step.status} onChange={(event) => patch("status", event.target.value)}>{STEP_STATUSES.map((status) => <option value={status} key={status}>{STATUS_LABELS[status] ?? status}</option>)}</select></label>
        <label className={styles.field}><span>Acteur responsable</span><select value={step.assignedActorId ?? ""} onChange={(event) => { const id = event.target.value || null; onChange({ ...step, assignedActorId: id, assignedActorName: id ? actors.find((actor) => actor.id === id)?.name ?? "Acteur à vérifier" : "Acteur à assigner" }); }}><option value="">À assigner</option>{actors.map((actor) => <option value={actor.id} key={actor.id}>{actor.name} · {actorVerificationLabel(actor)}</option>)}</select></label>
        <label className={styles.field}><span>Dépendances (sélection multiple)</span><select multiple size={5} value={step.dependencies} onChange={(event) => patch("dependencies", Array.from(event.target.selectedOptions, (option) => option.value))}>{steps.filter((candidate) => candidate.id !== step.id).map((candidate) => <option value={candidate.id} key={candidate.id}>Plan {candidate.planType} · {candidate.title}</option>)}</select></label>
        <label className={styles.field}><span>Échéance</span><input type="date" value={inputDate(step.dueDate)} onChange={(event) => patch("dueDate", event.target.value ? `${event.target.value}T12:00:00.000Z` : null)} /></label>
        <label className={styles.field}><span>Coût prévisionnel (€)</span><input inputMode="decimal" value={step.expectedCost === null ? "" : String(step.expectedCost / 100)} placeholder="Non renseigné" onChange={(event) => patch("expectedCost", centsFromInput(event.target.value))} /></label>
        <label className={styles.field}><span>Preuves (une par ligne)</span><textarea value={step.evidence.join("\n")} placeholder="Obligatoire pour un blocage ou une étape terminée" onChange={(event) => patch("evidence", event.target.value.split("\n").map((value) => value.trim()).filter(Boolean))} /></label>
        <div className={styles.explanation}><strong><Icon name="sparkles" size={12} /> Suggestion à valider</strong>{step.sourceReason}<br /><br /><b>Données utilisées :</b> objectif, besoins validés, acteurs et offres disponibles. <b>Inconnues :</b> disponibilité et capacités non vérifiées restent explicitement inconnues. <b>Confiance :</b> limitée tant qu’une capacité, une offre ou une disponibilité reste non vérifiée.</div>
        {step.evidence.length > 0 && <div className={styles.sourceBox}><strong>Preuves</strong><br />{step.evidence.join(" · ")}</div>}
        <div className={styles.drawerActions}><button type="button" className={styles.primaryButton} onClick={onClose}><Icon name="check" size={13} /> Conserver les changements</button><button type="button" className={styles.dangerButton} disabled={!step.draft} title={step.draft ? "Supprimer cette étape brouillon" : "Seules les étapes brouillon peuvent être supprimées"} onClick={onDelete}><Icon name="trash-2" size={13} /> Supprimer le brouillon</button></div>
      </div>
    </aside>
  );
}

function Ecosystem({ actors, initialCapability, onOpenActor }: { actors: UiActor[]; initialCapability: string; onOpenActor: (id: string) => void }) {
  const [mode, setMode] = useState<"map" | "list">("map");
  const [search, setSearch] = useState("");
  const [territory, setTerritory] = useState("");
  const [basin, setBasin] = useState("");
  const [type, setType] = useState("");
  const [capability, setCapability] = useState(initialCapability);
  const [verification, setVerification] = useState("");
  const [availability, setAvailability] = useState("");
  const [sector, setSector] = useState("");
  const filtered = actors.filter((actor) => {
    const haystack = `${actor.name} ${actor.legalName ?? ""}`.toLocaleLowerCase("fr");
    return (!search || haystack.includes(search.toLocaleLowerCase("fr")))
      && (!territory || actor.territory.includes(territory))
      && (!basin || (basin === "UNKNOWN" ? actor.employmentBasin === null : actor.employmentBasin === basin))
      && (!type || actor.actorTypes.includes(type))
      && (!capability || actor.capabilities.includes(capability))
      && (!verification || actor.verificationStatus === verification)
      && (!availability || (availability === "KNOWN" ? actor.capacity !== null : actor.capacity === null))
      && (!sector || sector === "UNKNOWN")
      && actor.active;
  });
  const territories = Array.from(new Set(actors.map((actor) => actor.territory))).filter(Boolean);
  const basins = Array.from(new Set(actors.map((actor) => actor.employmentBasin).filter((value): value is string => Boolean(value))));
  const types = Object.keys(ACTOR_TYPE_LABELS);
  const capabilities = Object.keys(CAPABILITY_LABELS);
  const verifiedActorCount = actors.filter((actor) => actor.verificationStatus === "VERIFIED" && !actor.synthetic).length;

  return (
    <>
      <SectionHeader kicker="Registre territorial" title="Écosystème local" description="Cartographier ce qui est documenté — et rendre visible ce qui doit encore être vérifié — avant toute mobilisation." actions={<div className={styles.viewSwitch}><button type="button" className={`${styles.segmentedButton} ${mode === "map" ? styles.segmentedActive : ""}`} onClick={() => setMode("map")}><Icon name="globe" size={12} /> Carte</button><button type="button" className={`${styles.segmentedButton} ${mode === "list" ? styles.segmentedActive : ""}`} onClick={() => setMode("list")}><Icon name="list-checks" size={12} /> Liste</button></div>} />
      <div className={styles.filterBar}>
        <input aria-label="Rechercher un acteur" placeholder="Rechercher un acteur…" value={search} onChange={(event) => setSearch(event.target.value)} />
        <select aria-label="Filtrer par territoire" value={territory} onChange={(event) => setTerritory(event.target.value)}><option value="">Tous les territoires</option>{territories.map((value) => <option key={value}>{value}</option>)}</select>
        <select aria-label="Filtrer par bassin d’emploi" value={basin} onChange={(event) => setBasin(event.target.value)}><option value="">Tous les bassins</option>{basins.map((value) => <option key={value}>{value}</option>)}<option value="UNKNOWN">Bassin non renseigné</option></select>
        <select aria-label="Filtrer par catégorie" value={type} onChange={(event) => setType(event.target.value)}><option value="">Toutes les catégories</option>{types.map((value) => <option value={value} key={value}>{ACTOR_TYPE_LABELS[value] ?? value}</option>)}</select>
        <select aria-label="Filtrer par capacité" value={capability} onChange={(event) => setCapability(event.target.value)}><option value="">Toutes les capacités documentées</option>{capabilities.map((value) => <option value={value} key={value}>{CAPABILITY_LABELS[value] ?? value}</option>)}</select>
        <select aria-label="Filtrer par vérification" value={verification} onChange={(event) => setVerification(event.target.value)}><option value="">Tous les statuts</option><option value="VERIFIED">Vérifiés uniquement</option><option value="NEEDS_VERIFICATION">À vérifier</option></select>
        <select aria-label="Filtrer par disponibilité" value={availability} onChange={(event) => setAvailability(event.target.value)}><option value="">Toutes les disponibilités</option><option value="KNOWN">Capacité renseignée</option><option value="UNKNOWN">Capacité inconnue</option></select>
        <select aria-label="Filtrer par filière" value={sector} onChange={(event) => setSector(event.target.value)}><option value="">Toutes les filières</option><option value="UNKNOWN">Filière non renseignée</option></select>
        <button type="button" className={styles.secondaryButton} onClick={() => { setSearch(""); setTerritory(""); setBasin(""); setType(""); setCapability(""); setVerification(""); setAvailability(""); setSector(""); }}><Icon name="refresh" size={12} /> Effacer</button>
      </div>
      <div className={styles.sourceBox} style={{ marginBottom: 12 }}><strong>Lecture prudente des sources</strong><br />Les sources candidates initiales ne confirment aucune capacité, aucun service, contact ou disponibilité. {verifiedActorCount === 0 ? "Les acteurs sourcés restent donc tous « À vérifier » jusqu’à une revue humaine." : `${verifiedActorCount} acteur(s) ont depuis reçu une vérification humaine locale ; les autres restent « À vérifier ».`}</div>
      {filtered.length === 0 ? <div className={styles.emptyState}><span><strong>Aucun acteur ne répond à ces critères</strong><p>L’absence de donnée vérifiée n’est pas une conclusion négative. Une recherche et une validation manuelles sont nécessaires.</p></span></div> : mode === "map" ? <><div className={styles.sourceLine} style={{ marginBottom: 7 }}><Icon name="eye" size={11} /> Carte : {Math.min(filtered.length, 12)} acteur(s) affiché(s) sur {filtered.length}. Passer en liste pour tous les consulter.</div><ActorMap actors={filtered} onOpen={onOpenActor} /></> : <ActorList actors={filtered} onOpen={onOpenActor} />}
    </>
  );
}

function ActorMap({ actors, onOpen }: { actors: UiActor[]; onOpen: (id: string) => void }) {
  const positions = [[18, 20], [48, 12], [79, 20], [88, 48], [79, 77], [49, 87], [20, 77], [11, 48], [32, 32], [68, 34], [67, 66], [32, 67]];
  return (
    <div className={styles.ecosystemMap} aria-label="Carte des acteurs locaux">
      <div className={styles.ecosystemCenter}><div><strong>Le Bon Rebond</strong><span>Orchestrateur · démo synthétique</span></div></div>
      {actors.slice(0, 12).map((actor, index) => <button type="button" key={actor.id} className={styles.actorOrbit} style={{ "--actor-x": `${positions[index]?.[0] ?? 50}%`, "--actor-y": `${positions[index]?.[1] ?? 50}%` } as CSSProperties} onClick={() => onOpen(actor.id)}><strong>{actor.name}</strong><span>{actorTypeLabel(actor, true)} · {actorVerificationLabel(actor)}</span></button>)}
    </div>
  );
}

function ActorList({ actors, onOpen }: { actors: UiActor[]; onOpen: (id: string) => void }) {
  return <div className={styles.actorList}>{actors.map((actor) => <button type="button" className={styles.actorCard} key={actor.id} onClick={() => onOpen(actor.id)}><div className={styles.actorHeader}><div className={styles.actorIdentity}><span className={styles.actorLogo}>{actor.name.slice(0, 2).toUpperCase()}</span><span><strong>{actor.name}</strong><small>{actor.territory}</small></span></div>{verificationBadge(actor)}</div><div className={styles.capabilityList}>{actor.capabilities.length ? actor.capabilities.slice(0, 3).map((capability) => <span className={styles.capability} key={capability}>{CAPABILITY_LABELS[capability] ?? capability}</span>) : <span className={styles.capability}>Capacités non documentées</span>}</div><div className={styles.sourceLine}><Icon name="file-text" size={10} /> Source : {actor.sourceLabel}</div></button>)}</div>;
}

function ActorDrawer({ actor, onChange, onClose }: { actor: UiActor; onChange: (actor: UiActor) => void; onClose: () => void }) {
  const [capabilityToAdd, setCapabilityToAdd] = useState("");
  const [verificationForm, setVerificationForm] = useState({ source: actor.verificationSource ?? "", owner: actor.verifiedBy ?? "", date: inputDate(actor.lastVerifiedAt) });
  const canVerify = Boolean(verificationForm.source.trim() && verificationForm.owner.trim() && verificationForm.date);
  return (
    <aside className={styles.actorDrawer} role="dialog" aria-modal="true" aria-labelledby="actor-title">
      <div className={styles.drawerHeader}><div><div className={styles.eyebrow}>Fiche acteur</div><h2 id="actor-title">{actor.name}</h2></div><button type="button" className={styles.iconButton} aria-label="Fermer la fiche acteur" onClick={onClose}><Icon name="x" size={16} /></button></div>
      <div className={styles.drawerBody}>
        <div className={styles.spread}>{verificationBadge(actor)}{actor.usedInPathway && <span className={`${styles.statusPill} ${styles.statusActive}`}><Icon name="layers" size={10} /> Mobilisé dans Sarah</span>}</div>
        <div className={styles.actorDetailGrid}><div className={styles.detailBox}><span>Rôle(s)</span><strong>{actorTypeLabel(actor)}</strong></div><div className={styles.detailBox}><span>Territoire</span><strong>{actor.territory}</strong></div><div className={styles.detailBox}><span>Capacité actuelle</span><strong>{actor.capacity ?? "Non renseignée"}</strong></div><div className={styles.detailBox}><span>Délai de réponse</span><strong>{actor.responseSla ?? "Non renseigné"}</strong></div></div>
        <section className={styles.panel}><div className={styles.spread}><h3>Capacités</h3><span className={`${styles.statusPill} ${styles.needsVerification}`}>Toute modification reste à vérifier</span></div><div className={styles.capabilityList} style={{ marginTop: 9 }}>{actor.capabilities.length ? actor.capabilities.map((capability) => <button type="button" className={styles.capability} title="Retirer cette capacité locale" key={capability} onClick={() => onChange({ ...actor, capabilities: actor.capabilities.filter((value) => value !== capability), verificationStatus: "NEEDS_VERIFICATION", lastVerifiedAt: null })}>{CAPABILITY_LABELS[capability] ?? capability} · à vérifier <Icon name="x" size={9} /></button>) : <span className={styles.unknown}>Aucune capacité documentée. Vérification manuelle requise.</span>}</div><div className={styles.referralActions}><select aria-label="Capacité à ajouter" value={capabilityToAdd} onChange={(event) => setCapabilityToAdd(event.target.value)}><option value="">Choisir une capacité…</option>{Object.entries(CAPABILITY_LABELS).filter(([id]) => !actor.capabilities.includes(id)).map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select><button type="button" className={styles.secondaryButton} disabled={!capabilityToAdd} onClick={() => { onChange({ ...actor, capabilities: [...actor.capabilities, capabilityToAdd], verificationStatus: "NEEDS_VERIFICATION", lastVerifiedAt: null }); setCapabilityToAdd(""); }}><Icon name="plus" size={12} /> Ajouter à vérifier</button></div></section>
        <section className={styles.panel}><h3>Services & opportunités</h3><div className={styles.evidence}><strong>Services :</strong> {actor.services.length ? actor.services.join(" · ") : "Non renseignés"}</div><div className={styles.evidence}><strong>Opportunités :</strong> {actor.opportunities.length ? actor.opportunities.join(" · ") : "Non renseignées"}</div></section>
        <section className={styles.panel}><h3>Contacts</h3><div className={styles.evidence}>{actor.contacts.length ? actor.contacts.join(" · ") : "Aucun contact fourni"}</div></section>
        <section className={styles.panel}><div className={styles.spread}><h3>Vérification manuelle</h3>{verificationBadge(actor)}</div><div className={styles.sourceBox} style={{ marginTop: 9 }}>Une présence dans une liste ne prouve pas une capacité. La source candidate reste conservée séparément. L’admin doit ajouter une nouvelle preuve de contrôle, s’identifier et dater la revue.</div><div className={styles.drawerBody} style={{ gap: 8 }}><label className={styles.field}><span>Nouvelle preuve de vérification</span><input value={verificationForm.source} onChange={(event) => setVerificationForm((current) => ({ ...current, source: event.target.value }))} placeholder="Compte rendu daté, registre contrôlé, confirmation écrite…" /></label><label className={styles.field}><span>Responsable de la vérification</span><input value={verificationForm.owner} onChange={(event) => setVerificationForm((current) => ({ ...current, owner: event.target.value }))} placeholder="Nom du responsable" /></label><label className={styles.field}><span>Date de vérification</span><input type="date" value={verificationForm.date} onChange={(event) => setVerificationForm((current) => ({ ...current, date: event.target.value }))} /></label><button type="button" className={styles.primaryButton} disabled={!canVerify} onClick={() => onChange({ ...actor, verificationSource: verificationForm.source.trim(), verifiedBy: verificationForm.owner.trim(), lastVerifiedAt: `${verificationForm.date}T12:00:00.000Z`, verificationStatus: "VERIFIED" })}><Icon name="check-circle" size={12} /> Confirmer la vérification humaine</button>{actor.verificationStatus === "VERIFIED" && <button type="button" className={styles.secondaryButton} onClick={() => onChange({ ...actor, verificationStatus: "NEEDS_VERIFICATION", lastVerifiedAt: null })}><Icon name="refresh" size={12} /> Repasser à vérifier</button>}</div></section>
        <div className={styles.sourceBox}><strong>Traçabilité actuelle</strong><br />Source candidate conservée : {actor.sourceLabel}{actor.sourceLocation ? ` · ${actor.sourceLocation}` : ""}<br />Preuve de contrôle : {actor.verificationSource ?? "Non renseignée"}<br />Dernière vérification : {shortDate(actor.lastVerifiedAt)}<br />Responsable : {actor.verifiedBy ?? "Non renseigné"}</div>
      </div>
    </aside>
  );
}

function Reference({ model, costs, onOpenActor }: { model: OrchestrationUiModel; costs: UiCostItem[]; onOpenActor: (id: string) => void }) {
  const [tab, setTab] = useState<"occupations" | "skills" | "actors" | "services" | "opportunities" | "funding">("occupations");
  const tabs = [["occupations", "Métiers"], ["skills", "Compétences"], ["actors", "Acteurs"], ["services", "Services"], ["opportunities", "Opportunités"], ["funding", "Dispositifs de financement"]] as const;
  return (
    <>
      <SectionHeader kicker="Objets canoniques" title="Référentiel" description="Un vocabulaire commun entre profil, métier cible, besoins, acteurs, services, opportunités et financement." />
      <div className={styles.referenceTabs} role="tablist" aria-label="Sous-vues du référentiel">{tabs.map(([id, label]) => <button type="button" role="tab" aria-selected={tab === id} className={`${styles.secondaryButton} ${tab === id ? styles.segmentedActive : ""}`} key={id} onClick={() => setTab(id)}>{label}</button>)}</div>
      <div className={styles.referenceTableWrap}>
        {tab === "occupations" && <table className={styles.referenceTable}><thead><tr><th>Métier</th><th>Code ROME</th><th>Compétences requises</th><th>Contraintes</th><th>Vérification</th></tr></thead><tbody><tr><td><strong>{model.occupation.label}</strong><small>{model.occupation.sector}</small></td><td>{model.occupation.code ?? "Non renseigné"}</td><td>{model.occupation.requiredSkills.join(" · ")}</td><td>{model.occupation.constraints.join(" · ") || "Non renseignées"}</td><td><span className={`${styles.statusPill} ${styles.needsVerification}`}>À vérifier</span></td></tr></tbody></table>}
        {tab === "skills" && <table className={styles.referenceTable}><thead><tr><th>Compétence</th><th>Niveau</th><th>Confiance</th><th>Preuve</th></tr></thead><tbody>{model.passport.skills.map((skill) => <tr key={skill.id}><td><strong>{skill.label}</strong></td><td>{skill.level}</td><td>{skill.confidence === "CONFIRMED" ? "Confirmée" : skill.confidence}</td><td>{skill.evidence}</td></tr>)}</tbody></table>}
        {tab === "actors" && <table className={styles.referenceTable}><thead><tr><th>Acteur</th><th>Catégories</th><th>Territoire</th><th>Capacités</th><th>Source</th></tr></thead><tbody>{model.actors.map((actor) => <tr key={actor.id}><td><button type="button" className={styles.ghostButton} onClick={() => onOpenActor(actor.id)}>{actor.name}</button></td><td>{actorTypeLabel(actor)}</td><td>{actor.territory}</td><td>{actor.capabilities.length ? actor.capabilities.map((capability) => CAPABILITY_LABELS[capability] ?? capability).join(" · ") : "Non documentées"}</td><td>{actor.sourceLabel}<small>{actorVerificationLabel(actor)}</small></td></tr>)}</tbody></table>}
        {tab === "services" && <table className={styles.referenceTable}><thead><tr><th>Service</th><th>Acteur</th><th>Compétences développées</th><th>Places</th><th>Coût</th><th>Vérification</th></tr></thead><tbody>{model.services.length ? model.services.map((service) => <tr key={service.id}><td><strong>{service.name}</strong></td><td>{service.actorName}</td><td>{service.skills.join(" · ") || "Non renseignées"}</td><td>{service.places ?? "Non renseigné"}</td><td>{euro(service.cost)}</td><td>À vérifier</td></tr>) : <tr><td colSpan={6}>Aucun service sourcé. Une recherche manuelle est nécessaire.</td></tr>}</tbody></table>}
        {tab === "opportunities" && <table className={styles.referenceTable}><thead><tr><th>Opportunité</th><th>Type</th><th>Acteur</th><th>Lieu</th><th>Places</th><th>Vérification</th></tr></thead><tbody>{model.opportunities.length ? model.opportunities.map((opportunity) => <tr key={opportunity.id}><td><strong>{opportunity.title}</strong></td><td>{OUTCOME_TYPE_LABELS[opportunity.type] ?? opportunity.type}</td><td>{opportunity.providerName}</td><td>{opportunity.location}</td><td>{opportunity.vacancies}</td><td>À vérifier</td></tr>) : <tr><td colSpan={6}>Aucune opportunité vérifiée. L’absence de donnée ne constitue pas une conclusion négative.</td></tr>}</tbody></table>}
        {tab === "funding" && <table className={styles.referenceTable}><thead><tr><th>Poste de coût</th><th>Financeur potentiel</th><th>Mécanisme</th><th>Demandé</th><th>Accordé</th><th>Statut</th></tr></thead><tbody>{costs.map((cost) => <tr key={cost.id}><td><strong>{cost.label}</strong></td><td>{cost.funderActorId ? model.actors.find((actor) => actor.id === cost.funderActorId)?.name ?? "À vérifier" : "Non affecté"}</td><td>{cost.mechanism ?? "Non renseigné"}</td><td>{euro(cost.amountRequested)}</td><td>{euro(cost.amountApproved)}</td><td>{STATUS_LABELS[cost.fundingStatus] ?? cost.fundingStatus}</td></tr>)}</tbody></table>}
      </div>
    </>
  );
}

function CostsAndOutcomes({ model, costs, onCosts, outcome, onOutcome }: { model: OrchestrationUiModel; costs: UiCostItem[]; onCosts: (costs: UiCostItem[]) => void; outcome: UiOutcome; onOutcome: (outcome: UiOutcome) => void }) {
  const expectedSummary = moneySummary(costs.map((cost) => cost.expectedCost));
  const actualSummary = moneySummary(costs.map((cost) => cost.actualCost));
  const approvedSummary = moneySummary(costs.map((cost) => cost.amountApproved));
  const remaining = expectedSummary.complete && approvedSummary.complete
    ? Math.max(expectedSummary.knownSubtotal - approvedSummary.knownSubtotal, 0)
    : null;

  function updateCost(id: string, patch: Partial<UiCostItem>) {
    onCosts(costs.map((cost) => cost.id === id ? { ...cost, ...patch } : cost));
  }

  function addCost() {
    onCosts([...costs, {
      id: `cost-${Date.now()}`,
      stepId: null,
      label: "Nouveau coût à qualifier",
      category: "OTHER",
      expectedCost: null,
      actualCost: null,
      funderActorId: null,
      mechanism: null,
      amountRequested: null,
      amountApproved: null,
      amountPaid: null,
      fundingStatus: "NOT_STARTED",
      verificationStatus: "NEEDS_VERIFICATION",
    }]);
  }

  return (
    <>
      <SectionHeader kicker="Cost Ledger" title="Coûts & financements" description="Le coût, le financeur, la couverture et le reste à financer restent quatre informations distinctes." actions={<button type="button" className={styles.primaryButton} onClick={addCost}><Icon name="plus" size={13} /> Enregistrer un coût</button>} />
      <div className={styles.costSummary}>
        <article><span>{expectedSummary.hasKnown ? "Sous-total prévisionnel connu" : "Coût prévisionnel"}</span><strong>{expectedSummary.hasKnown ? euro(expectedSummary.knownSubtotal) : "Non renseigné"}</strong><small>{expectedSummary.unknownCount ? `${expectedSummary.unknownCount} coût(s) non renseigné(s)` : "Tous les postes sont renseignés"}</small></article>
        <article><span>{approvedSummary.hasKnown ? "Sous-total accordé connu" : "Financement accordé"}</span><strong>{approvedSummary.hasKnown ? euro(approvedSummary.knownSubtotal) : "Non renseigné"}</strong><small>{approvedSummary.unknownCount ? `${approvedSummary.unknownCount} couverture(s) inconnue(s)` : "Couverture renseignée pour chaque poste"}</small></article>
        <article className={styles.fundingGap}><span>Reste à financer</span><strong>{euro(remaining)}</strong><small>{remaining === null ? "Non calculable tant que coût ou couverture reste incomplet." : "Calculé sur des montants entièrement renseignés."}</small></article>
      </div>
      <div className={styles.costEquation}><strong>Coût total</strong><b>≠</b><strong>Financement total</strong><b>≠</b><strong>Reste à financer</strong><span>· Une inconnue reste « Non renseigné », jamais 0 €.</span></div>
      <div className={styles.costTableWrap}>
        <table className={styles.costTable}>
          <thead><tr><th>Poste</th><th>Catégorie</th><th>Prévu (€)</th><th>Réel (€)</th><th>Financeur</th><th>Mécanisme</th><th>Demandé (€)</th><th>Accordé (€)</th><th>Payé (€)</th><th>Statut</th></tr></thead>
          <tbody>{costs.map((cost) => <tr key={cost.id}><td><input aria-label={`Libellé ${cost.label}`} value={cost.label} onChange={(event) => updateCost(cost.id, { label: event.target.value })} /></td><td><select aria-label={`Catégorie ${cost.label}`} value={cost.category} onChange={(event) => updateCost(cost.id, { category: event.target.value })}>{["LBR_ACCOMPANIMENT", "TRAINING", "MOBILITY", "CHILDCARE", "EQUIPMENT", "ADMINISTRATION", "IMMERSION", "OTHER"].map((category) => <option key={category} value={category}>{COST_CATEGORY_LABELS[category] ?? category}</option>)}</select></td><td><input aria-label={`Coût prévu ${cost.label}`} inputMode="decimal" placeholder="Non renseigné" value={cost.expectedCost === null ? "" : String(cost.expectedCost / 100)} onChange={(event) => updateCost(cost.id, { expectedCost: centsFromInput(event.target.value) })} />{cost.expectedCost === null && <span className={styles.costUnknownCell}>Non renseigné</span>}</td><td><input aria-label={`Coût réel ${cost.label}`} inputMode="decimal" placeholder="Non renseigné" value={cost.actualCost === null ? "" : String(cost.actualCost / 100)} onChange={(event) => updateCost(cost.id, { actualCost: centsFromInput(event.target.value) })} /></td><td><select aria-label={`Financeur ${cost.label}`} value={cost.funderActorId ?? ""} onChange={(event) => updateCost(cost.id, { funderActorId: event.target.value || null })}><option value="">Non affecté</option>{model.actors.map((actor) => <option value={actor.id} key={actor.id}>{actor.name} · {actorVerificationLabel(actor)}</option>)}</select></td><td><input aria-label={`Mécanisme ${cost.label}`} placeholder="Non renseigné" value={cost.mechanism ?? ""} onChange={(event) => updateCost(cost.id, { mechanism: event.target.value || null })} /></td><td><input aria-label={`Montant demandé ${cost.label}`} inputMode="decimal" placeholder="Non renseigné" value={cost.amountRequested === null ? "" : String(cost.amountRequested / 100)} onChange={(event) => updateCost(cost.id, { amountRequested: centsFromInput(event.target.value) })} /></td><td><input aria-label={`Montant accordé ${cost.label}`} inputMode="decimal" placeholder="Non renseigné" value={cost.amountApproved === null ? "" : String(cost.amountApproved / 100)} onChange={(event) => updateCost(cost.id, { amountApproved: centsFromInput(event.target.value) })} /></td><td><input aria-label={`Montant payé ${cost.label}`} inputMode="decimal" placeholder="Non renseigné" value={cost.amountPaid === null ? "" : String(cost.amountPaid / 100)} onChange={(event) => updateCost(cost.id, { amountPaid: centsFromInput(event.target.value) })} /></td><td><select aria-label={`Statut financement ${cost.label}`} value={cost.fundingStatus} onChange={(event) => updateCost(cost.id, { fundingStatus: event.target.value })}>{["NOT_STARTED", "REQUESTED", "UNDER_REVIEW", "APPROVED", "PARTIALLY_APPROVED", "REJECTED", "PAID", "CANCELLED"].map((status) => <option key={status} value={status}>{STATUS_LABELS[status] ?? status}</option>)}</select></td></tr>)}</tbody>
        </table>
      </div>
      <div className={styles.costTotals} style={{ marginTop: 9, color: "var(--orch-muted)", fontSize: 11 }}><span>{actualSummary.hasKnown ? "Sous-total réel connu" : "Coût réel"} : <strong>{actualSummary.hasKnown ? euro(actualSummary.knownSubtotal) : "Non renseigné"}</strong>{actualSummary.unknownCount ? ` · ${actualSummary.unknownCount} inconnu(s)` : ""}</span><span>Scénario local · données synthétiques ou à vérifier</span></div>
      <OutcomePanel model={model} outcome={outcome} onOutcome={onOutcome} />
    </>
  );
}

function OutcomePanel({ model, outcome, onOutcome }: { model: OrchestrationUiModel; outcome: UiOutcome; onOutcome: (outcome: UiOutcome) => void }) {
  const milestones = ["J7", "J30", "J60", "J90"] as const;
  const outcomeReady = Boolean(outcome.providerActorId && outcome.startDate && outcome.evidence.trim());

  function updateCore(patch: Partial<UiOutcome>) {
    const next = { ...outcome, ...patch };
    const ready = Boolean(next.providerActorId && next.startDate && next.evidence.trim());
    if (ready || !["ACTIVE", "MAINTAINED_J90"].includes(next.finalStatus)) {
      onOutcome(next);
      return;
    }
    onOutcome({
      ...next,
      finalStatus: "PENDING",
      followups: Object.fromEntries(Object.entries(next.followups).map(([key, value]) => [key, value === "ACTIVE" ? "PENDING" : value])) as UiOutcome["followups"],
    });
  }

  return (
    <div className={styles.outcomeLayout}>
      <section className={styles.outcomeCard}>
        <div className={styles.spread}><h3>Sortie enregistrée</h3><span className={`${styles.statusPill} ${statusClass(outcome.finalStatus)}`}>{STATUS_LABELS[outcome.finalStatus] ?? outcome.finalStatus}</span></div>
        <div className={styles.outcomeGrid}>
          <label className={styles.field}><span>Type de sortie</span><select value={outcome.type} onChange={(event) => updateCore({ type: event.target.value })}>{["CDI", "CDD", "ALTERNANCE", "TRAINING", "GEIQ", "SIAE", "ETTI", "OTHER_ACTIVE", "PATHWAY_CONTINUES", "NO_ACTIVE_OUTCOME"].map((type) => <option key={type} value={type}>{OUTCOME_TYPE_LABELS[type] ?? type}</option>)}</select></label>
          <label className={styles.field}><span>Acteur de sortie</span><select value={outcome.providerActorId ?? ""} onChange={(event) => updateCore({ providerActorId: event.target.value || null })}><option value="">Non renseigné</option>{model.actors.map((actor) => <option value={actor.id} key={actor.id}>{actor.name} · {actorVerificationLabel(actor)}</option>)}</select></label>
          <label className={styles.field}><span>Date de début</span><input type="date" value={inputDate(outcome.startDate)} onChange={(event) => updateCore({ startDate: event.target.value ? `${event.target.value}T12:00:00.000Z` : null })} /></label>
          <label className={styles.field}><span>Statut final</span><select value={outcome.finalStatus} onChange={(event) => updateCore({ finalStatus: event.target.value })}>{["PENDING", "ACTIVE", "MAINTAINED_J90", "RUPTURE", "CLOSED"].map((status) => <option key={status} value={status} disabled={(!outcomeReady && ["ACTIVE", "MAINTAINED_J90"].includes(status)) || (status === "MAINTAINED_J90" && outcome.followups.J90 !== "ACTIVE")}>{STATUS_LABELS[status] ?? status}</option>)}</select></label>
        </div>
        <label className={styles.field} style={{ marginTop: 9 }}><span>Preuve de sortie</span><textarea value={outcome.evidence} onChange={(event) => updateCore({ evidence: event.target.value })} placeholder="Aucune sortie sans preuve" /></label>
        {!outcomeReady && <div className={styles.sourceBox} style={{ marginTop: 9 }}><strong>Activation verrouillée</strong><br />Renseigner un acteur, une date de début et une preuve avant de déclarer la sortie active.</div>}
      </section>
      <section className={styles.outcomeCard}>
        <div className={styles.spread}><h3>Maintien dans la sortie</h3><span className={styles.demoBadge}>Suivis simulés</span></div>
        <div className={styles.followups}>{milestones.map((milestone) => {
          const active = outcome.followups[milestone] === "ACTIVE";
          const evidence = outcome.followupEvidence[milestone];
          const checkedAt = outcome.followupCheckedAt[milestone];
          const ready = outcomeReady && ["ACTIVE", "MAINTAINED_J90"].includes(outcome.finalStatus) && Boolean(evidence.trim() && checkedAt);
          return <article key={milestone} className={`${styles.followup} ${active ? styles.followupActive : ""}`}><span>{milestone.replace("J", "J+")}</span><strong>{active ? "Sortie maintenue" : STATUS_LABELS[outcome.followups[milestone]] ?? outcome.followups[milestone]}</strong><label className={styles.field}><span>Date du suivi</span><input type="date" value={inputDate(checkedAt)} onChange={(event) => { const value = event.target.value ? `${event.target.value}T12:00:00.000Z` : null; onOutcome({ ...outcome, followupCheckedAt: { ...outcome.followupCheckedAt, [milestone]: value }, followups: { ...outcome.followups, [milestone]: active && !value ? "PENDING" : outcome.followups[milestone] } }); }} /></label><label className={styles.field}><span>Preuve du suivi</span><input value={evidence} placeholder="Compte rendu, appel…" onChange={(event) => { const value = event.target.value; onOutcome({ ...outcome, followupEvidence: { ...outcome.followupEvidence, [milestone]: value }, followups: { ...outcome.followups, [milestone]: active && !value.trim() ? "PENDING" : outcome.followups[milestone] } }); }} /></label><button type="button" className={active ? styles.secondaryButton : styles.primaryButton} disabled={!active && !ready} onClick={() => { const next = active ? "PENDING" : "ACTIVE"; onOutcome({ ...outcome, followups: { ...outcome.followups, [milestone]: next }, finalStatus: milestone === "J90" ? (next === "ACTIVE" ? "MAINTAINED_J90" : "ACTIVE") : outcome.finalStatus }); }}>{active ? "Annuler le maintien" : "Enregistrer le maintien"}</button>{!active && !ready && <small>Sortie active, acteur, dates et preuves requis.</small>}</article>;
        })}</div>
        <div className={styles.privacyNote}>Une sortie ne vaut pas maintien. J+7, J+30, J+60 et J+90 sont enregistrés séparément avec leur propre preuve.</div>
      </section>
    </div>
  );
}

function SharePreview({ passport, onClose }: { passport: OrchestrationUiModel["passport"]; onClose: () => void }) {
  const [audience, setAudience] = useState<"employer" | "cfa" | "prescriber">("employer");
  const scopes = {
    employer: { label: "Vue employeur", description: "Candidature et disponibilité uniquement", allowed: ["Identité utile", "Expérience d’accueil", "Compétences confirmées", "Disponibilité", "CV ciblé"], denied: ["Freins sociaux", "Notes d’accompagnement", "Autres orientations"] },
    cfa: { label: "Vue CFA", description: "Projet et prérequis de formation", allowed: ["Projet professionnel", "Compétences pertinentes", "Prérequis à évaluer", "Statut du financement"], denied: ["Notes sociales", "Données sans lien avec la formation"] },
    prescriber: { label: "Vue prescripteur", description: "Avancement et résultat du parcours", allowed: ["Prise en charge", "Statut du parcours", "Prochaine étape", "Résultat final"], denied: ["Détail des feedbacks employeur", "Passeport maître complet"] },
  };
  const scope = scopes[audience];
  return (
    <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="share-title">
        <div className={styles.drawerHeader}><div><div className={styles.eyebrow}>Minimisation des données</div><h2 id="share-title" style={{ margin: "4px 0 0", fontFamily: "Newsreader, Georgia, serif", color: "var(--orch-green-dark)" }}>Aperçu de partage · {passport.firstName}</h2></div><button type="button" className={styles.iconButton} aria-label="Fermer l’aperçu" onClick={onClose}><Icon name="x" size={16} /></button></div>
        <div className={styles.shareGrid}>{Object.entries(scopes).map(([id, item]) => <button type="button" key={id} className={`${styles.shareCard} ${audience === id ? styles.shareCardActive : ""}`} onClick={() => setAudience(id as typeof audience)}><h3>{item.label}</h3><p>{item.description}</p></button>)}</div>
        <div className={styles.shareScope}><strong>{scope.label} · données visibles</strong>{scope.allowed.map((item) => <span key={item}><Icon name="check-circle" size={13} style={{ color: "var(--orch-green)" }} /> {item}</span>)}{scope.denied.map((item) => <span key={item} className={styles.shareDenied}><Icon name="x" size={13} /> Masqué : {item}</span>)}</div>
        <div className={styles.prototypeNote} style={{ maxWidth: "none", marginTop: 14 }}><Icon name="shield" size={15} /> Cet écran est un aperçu conceptuel. Aucun compte externe n’est créé et aucune donnée n’est envoyée dans ce prototype.</div>
      </section>
    </div>
  );
}
