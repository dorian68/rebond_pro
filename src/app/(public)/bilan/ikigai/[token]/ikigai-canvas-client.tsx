"use client";

import { useMemo, useState } from "react";

type ZoneKey = "love" | "goodAt" | "useful" | "paidFor";

const ZONES: { key: ZoneKey; title: string; subtitle: string; color: string; options: string[] }[] = [
  {
    key: "love",
    title: "Énergie",
    subtitle: "Ce qui donne envie de recommencer",
    color: "#f28c52",
    options: ["Aider", "Créer", "Transmettre", "Organiser", "Résoudre", "Explorer", "Vendre", "Protéger"],
  },
  {
    key: "goodAt",
    title: "Talents",
    subtitle: "Ce qui semble naturel ou reconnu",
    color: "#2469a6",
    options: ["Analyser", "Communiquer", "Coordonner", "Écouter", "Former", "Négocier", "Réparer", "Structurer"],
  },
  {
    key: "useful",
    title: "Utilité",
    subtitle: "Les problèmes que je peux résoudre",
    color: "#2f9488",
    options: ["Accompagner", "Simplifier", "Sécuriser", "Faire gagner du temps", "Rendre autonome", "Améliorer", "Former", "Relier"],
  },
  {
    key: "paidFor",
    title: "Valeur marché",
    subtitle: "Ce qui peut devenir poste, mission ou formation",
    color: "#8b5cf6",
    options: ["Conseil", "Formation", "Gestion", "Relation client", "Numérique", "Administration", "Qualité", "Commercial"],
  },
];

function emptyChoices(): Record<ZoneKey, string[]> {
  return { love: [], goodAt: [], useful: [], paidFor: [] };
}

function emptyScores(): Record<ZoneKey, number> {
  return { love: 3, goodAt: 3, useful: 3, paidFor: 3 };
}

function join(values: string[]) {
  return values.length ? values.join(", ") : "A préciser";
}

export function IkigaiCanvasClient({ action, error }: { action: (formData: FormData) => void; error?: string }) {
  const [choices, setChoices] = useState<Record<ZoneKey, string[]>>(emptyChoices);
  const [scores, setScores] = useState<Record<ZoneKey, number>>(emptyScores);
  const [freeText, setFreeText] = useState<Record<ZoneKey, string>>({ love: "", goodAt: "", useful: "", paidFor: "" });
  const [synthesis, setSynthesis] = useState("");

  const payload = useMemo(() => {
    const intersections = {
      passion: `${join(choices.love)} + ${join(choices.goodAt)}`,
      mission: `${join(choices.love)} + ${join(choices.useful)}`,
      vocation: `${join(choices.useful)} + ${join(choices.paidFor)}`,
      profession: `${join(choices.goodAt)} + ${join(choices.paidFor)}`,
      center: [choices.love[0], choices.goodAt[0], choices.useful[0], choices.paidFor[0]].filter(Boolean).join(" · "),
    };
    return {
      mode: "canvas",
      choices,
      scores,
      intersections,
      love: [join(choices.love), freeText.love].filter(Boolean).join("\n"),
      goodAt: [join(choices.goodAt), freeText.goodAt].filter(Boolean).join("\n"),
      useful: [join(choices.useful), freeText.useful].filter(Boolean).join("\n"),
      paidFor: [join(choices.paidFor), freeText.paidFor].filter(Boolean).join("\n"),
      synthesis,
    };
  }, [choices, freeText, scores, synthesis]);

  const complete = ZONES.every((zone) => choices[zone.key].length > 0 || freeText[zone.key].trim().length > 0);

  function toggle(key: ZoneKey, option: string) {
    setChoices((current) => {
      const selected = current[key].includes(option);
      const next = selected ? current[key].filter((item) => item !== option) : [...current[key], option].slice(0, 5);
      return { ...current, [key]: next };
    });
  }

  return (
    <form action={action} style={{ display: "grid", gap: 18 }}>
      {error === "missing" && <div className="badge badge-danger" style={{ height: "auto", padding: "10px 12px" }}>Complétez au moins un élément dans chacune des quatre zones.</div>}
      <input type="hidden" name="ikigaiPayload" value={JSON.stringify(payload)} />

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.1fr) minmax(300px,.9fr)", gap: 18, alignItems: "start" }}>
        <div style={{ display: "grid", gap: 14 }}>
          {ZONES.map((zone) => (
            <section key={zone.key} style={{ border: "1px solid var(--border)", borderRadius: 14, padding: 14, background: "#fff" }}>
              <div className="spread" style={{ gap: 12, marginBottom: 10 }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 850, color: zone.color }}>{zone.title}</h2>
                  <p className="muted-3" style={{ fontSize: 12.5 }}>{zone.subtitle}</p>
                </div>
                <span style={{ fontSize: 12, fontWeight: 800, color: zone.color }}>{scores[zone.key]}/5</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                {zone.options.map((option) => {
                  const selected = choices[zone.key].includes(option);
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => toggle(zone.key, option)}
                      style={{
                        border: `1px solid ${selected ? zone.color : "var(--border-2)"}`,
                        background: selected ? `${zone.color}16` : "var(--surface-2)",
                        color: selected ? zone.color : "var(--ink-2)",
                        borderRadius: 999,
                        padding: "7px 10px",
                        fontSize: 12.5,
                        fontWeight: 750,
                      }}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
              <label style={{ display: "grid", gap: 7 }}>
                <span className="field-label">Nuance personnelle</span>
                <textarea
                  className="input"
                  rows={2}
                  value={freeText[zone.key]}
                  onChange={(event) => setFreeText((current) => ({ ...current, [zone.key]: event.target.value }))}
                  placeholder="Ajoutez un exemple, une situation vécue ou une précision..."
                />
              </label>
              <label style={{ display: "grid", gap: 6, marginTop: 10 }}>
                <span className="field-label">Intensité ressentie</span>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={scores[zone.key]}
                  onChange={(event) => setScores((current) => ({ ...current, [zone.key]: Number(event.target.value) }))}
                />
              </label>
            </section>
          ))}
        </div>

        <aside style={{ position: "sticky", top: 18, display: "grid", gap: 14 }}>
          <IkigaiGraph scores={scores} />
          <div style={{ border: "1px solid var(--border)", borderRadius: 14, padding: 14, background: "#fff" }}>
            <h2 style={{ fontSize: 15, fontWeight: 850, marginBottom: 10 }}>Convergences générées</h2>
            <Insight label="Passion" value={payload.intersections.passion} />
            <Insight label="Mission" value={payload.intersections.mission} />
            <Insight label="Vocation" value={payload.intersections.vocation} />
            <Insight label="Profession" value={payload.intersections.profession} />
            <label style={{ display: "grid", gap: 7, marginTop: 12 }}>
              <span className="field-label">Ce que je retiens</span>
              <textarea className="input" rows={4} value={synthesis} onChange={(event) => setSynthesis(event.target.value)} placeholder="Une évidence, une surprise, une piste à discuter..." />
            </label>
          </div>
          <button type="submit" className="btn btn-primary" disabled={!complete} style={{ justifyContent: "center" }}>
            Enregistrer mon canvas Ikigai
          </button>
          {!complete && <p className="muted-3" style={{ fontSize: 12.5, textAlign: "center" }}>Une réponse minimum est nécessaire dans chaque zone.</p>}
        </aside>
      </div>
    </form>
  );
}

function Insight({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "90px 1fr", gap: 8, padding: "7px 0", borderBottom: "1px solid var(--border)" }}>
      <span style={{ fontSize: 12, fontWeight: 850 }}>{label}</span>
      <span className="muted" style={{ fontSize: 12.5 }}>{value}</span>
    </div>
  );
}

function IkigaiGraph({ scores }: { scores: Record<ZoneKey, number> }) {
  const total = scores.love + scores.goodAt + scores.useful + scores.paidFor;
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 16, background: "linear-gradient(180deg,#fff,#f8fafc)", padding: 16 }}>
      <h2 style={{ fontSize: 15, fontWeight: 850, marginBottom: 8 }}>Carte Ikigai vivante</h2>
      <svg viewBox="0 0 320 270" role="img" aria-label="Diagramme Ikigai" style={{ width: "100%", height: "auto" }}>
        <circle cx="130" cy="105" r={42 + scores.love * 8} fill="#f28c5233" stroke="#f28c52" strokeWidth="2" />
        <circle cx="190" cy="105" r={42 + scores.goodAt * 8} fill="#2469a633" stroke="#2469a6" strokeWidth="2" />
        <circle cx="130" cy="165" r={42 + scores.useful * 8} fill="#2f948833" stroke="#2f9488" strokeWidth="2" />
        <circle cx="190" cy="165" r={42 + scores.paidFor * 8} fill="#8b5cf633" stroke="#8b5cf6" strokeWidth="2" />
        <text x="80" y="50" fontSize="13" fontWeight="700" fill="#9b4b1f">Aimer</text>
        <text x="205" y="50" fontSize="13" fontWeight="700" fill="#174d80">Savoir faire</text>
        <text x="54" y="224" fontSize="13" fontWeight="700" fill="#23756e">Utile</text>
        <text x="207" y="224" fontSize="13" fontWeight="700" fill="#6d3bd6">Valorisable</text>
        <circle cx="160" cy="135" r={Math.max(18, total * 2.2)} fill="#15314c" opacity=".82" />
        <text x="160" y="132" textAnchor="middle" fontSize="12" fontWeight="800" fill="#fff">Zone</text>
        <text x="160" y="147" textAnchor="middle" fontSize="12" fontWeight="800" fill="#fff">projet</text>
      </svg>
    </div>
  );
}
