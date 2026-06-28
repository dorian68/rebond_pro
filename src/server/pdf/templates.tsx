import "server-only";
import React from "react";
import { Document, Page, View, Text, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

export type DocData = {
  type: string;
  org: { name: string; legalName?: string | null; legalAddress?: string | null; nda?: string | null; legalRep?: string | null };
  generatedAt: string;
  formation?: { title: string; durationDays?: number | null; durationHours?: number | null; price?: number | null; program?: string | null; objectives?: string | null; modality?: string | null } | null;
  session?: { dateRange: string; trainerName?: string | null; roomName?: string | null } | null;
  learner?: { fullName: string; company?: string | null } | null;
  learners?: { fullName: string; company?: string | null }[];
  amountText?: string | null;
};

const s = StyleSheet.create({
  page: { padding: 48, fontSize: 11, fontFamily: "Helvetica", color: "#15181f", lineHeight: 1.5 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, borderBottom: "1.5pt solid #2469a6", paddingBottom: 14 },
  brand: { fontSize: 16, fontWeight: 700, color: "#2469a6" },
  brandSub: { fontSize: 8, color: "#919aa8", marginTop: 2, textTransform: "uppercase", letterSpacing: 1 },
  orgInfo: { fontSize: 8.5, color: "#5a6271", textAlign: "right" },
  docType: { fontSize: 9, color: "#919aa8", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 },
  title: { fontSize: 20, fontWeight: 700, marginBottom: 20 },
  para: { marginBottom: 10 },
  bold: { fontWeight: 700 },
  label: { color: "#5a6271" },
  box: { backgroundColor: "#f5f6f9", borderRadius: 6, padding: 14, marginBottom: 14 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  footer: { position: "absolute", bottom: 28, left: 48, right: 48, fontSize: 7.5, color: "#919aa8", textAlign: "center", borderTop: "0.5pt solid #e8eaef", paddingTop: 8 },
  th: { flexDirection: "row", backgroundColor: "#eeedfd", padding: 6, fontWeight: 700, fontSize: 9 },
  td: { flexDirection: "row", padding: 6, borderBottom: "0.5pt solid #e8eaef", fontSize: 9 },
  signLine: { marginTop: 36, flexDirection: "row", justifyContent: "space-between" },
  signBox: { width: "45%", borderTop: "0.5pt solid #15181f", paddingTop: 4, fontSize: 8, color: "#5a6271" },
  contextRow: { flexDirection: "row", gap: 10, marginBottom: 5 },
  contextLabel: { width: "32%", color: "#5a6271" },
  contextValue: { width: "68%", fontWeight: 700 },
});

const TYPE_LABELS: Record<string, string> = {
  CONVOCATION: "Convocation", ATTESTATION: "Attestation de fin de formation", CONVENTION: "Convention de formation professionnelle",
  PROGRAMME: "Programme de formation", EMARGEMENT: "Feuille d'émargement", DEVIS: "Devis", CERTIFICAT: "Certificat de réalisation",
};

function Header({ d }: { d: DocData }) {
  return (
    <View style={s.header}>
      <View>
        <Text style={s.brand}>{d.org.name}</Text>
        <Text style={s.brandSub}>Organisme de formation</Text>
      </View>
      <View style={s.orgInfo}>
        {d.org.legalName ? <Text>{d.org.legalName}</Text> : null}
        {d.org.legalAddress ? <Text>{d.org.legalAddress}</Text> : null}
        {d.org.nda ? <Text>NDA : {d.org.nda}</Text> : null}
      </View>
    </View>
  );
}

function Footer({ d }: { d: DocData }) {
  return <Text style={s.footer} fixed>{d.org.legalName ?? d.org.name}{d.org.nda ? ` — Déclaration d'activité n° ${d.org.nda}` : ""} · Document généré le {d.generatedAt} via Le Bon Rebond Partenaires</Text>;
}

function durationText(f: DocData["formation"]): string {
  if (!f) return "";
  const parts: string[] = [];
  if (f.durationDays) parts.push(`${f.durationDays} jour${f.durationDays > 1 ? "s" : ""}`);
  if (f.durationHours) parts.push(`${f.durationHours} heures`);
  return parts.join(" — ") || "—";
}

function ContextSummary({ d }: { d: DocData }) {
  const rows = [
    ["Formation", d.formation?.title],
    ["Dates", d.session?.dateRange],
    ["Formateur", d.session?.trainerName],
    ["Lieu / accès", d.session?.roomName],
    ["Apprenant / client", d.learner?.fullName],
    ["Entreprise", d.learner?.company],
    ["Durée", durationText(d.formation)],
    ["Montant", d.amountText],
  ].filter((row): row is [string, string] => typeof row[1] === "string" && row[1].trim().length > 0);

  if (rows.length === 0) return null;
  return (
    <View style={s.box}>
      {rows.map(([label, value]) => (
        <View key={label} style={s.contextRow}>
          <Text style={s.contextLabel}>{label}</Text>
          <Text style={s.contextValue}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

function Body({ d }: { d: DocData }) {
  const f = d.formation;
  const ses = d.session;
  switch (d.type) {
    case "CONVOCATION":
      return (
        <View>
          <Text style={s.para}>{d.learner ? `À l'attention de ${d.learner.fullName}${d.learner.company ? ` (${d.learner.company})` : ""},` : "Madame, Monsieur,"}</Text>
          <Text style={s.para}>Nous avons le plaisir de vous convoquer à la formation suivante :</Text>
          <View style={s.box}>
            <View style={s.row}><Text style={s.label}>Formation</Text><Text style={s.bold}>{f?.title}</Text></View>
            {ses ? <View style={s.row}><Text style={s.label}>Dates</Text><Text>{ses.dateRange}</Text></View> : null}
            {ses?.trainerName ? <View style={s.row}><Text style={s.label}>Formateur</Text><Text>{ses.trainerName}</Text></View> : null}
            {ses?.roomName ? <View style={s.row}><Text style={s.label}>Lieu / accès</Text><Text>{ses.roomName}</Text></View> : null}
            <View style={s.row}><Text style={s.label}>Durée</Text><Text>{durationText(f)}</Text></View>
          </View>
          <Text style={s.para}>Merci de vous présenter muni de cette convocation. Pour toute question, contactez notre équipe.</Text>
          <Text style={s.para}>Nous vous prions d&apos;agréer, Madame, Monsieur, l&apos;expression de nos salutations distinguées.</Text>
          <View style={s.signLine}><Text style={s.signBox}>{d.org.legalRep ?? d.org.name}</Text></View>
        </View>
      );
    case "ATTESTATION":
    case "CERTIFICAT":
      return (
        <View>
          <Text style={s.para}>Je soussigné(e) {d.org.legalRep ?? "le représentant de " + d.org.name}, atteste que :</Text>
          <View style={s.box}>
            <Text style={[s.bold, { fontSize: 14, marginBottom: 4 }]}>{d.learner?.fullName ?? "—"}</Text>
            {d.learner?.company ? <Text style={s.label}>{d.learner.company}</Text> : null}
          </View>
          <Text style={s.para}>a suivi la formation <Text style={s.bold}>« {f?.title} »</Text> d&apos;une durée de <Text style={s.bold}>{durationText(f)}</Text>{ses ? ` qui s'est déroulée ${ses.dateRange}` : ""}.</Text>
          {f?.objectives ? <><Text style={[s.label, { marginBottom: 4 }]}>Objectifs de la formation :</Text><Text style={s.para}>{f.objectives}</Text></> : null}
          <Text style={s.para}>Cette attestation est délivrée pour servir et valoir ce que de droit.</Text>
          <View style={s.signLine}>
            <Text style={s.signBox}>Fait le {d.generatedAt}</Text>
            <Text style={s.signBox}>{d.org.legalRep ?? d.org.name}{"\n"}Signature et cachet</Text>
          </View>
        </View>
      );
    case "PROGRAMME":
      return (
        <View>
          <View style={s.box}>
            <View style={s.row}><Text style={s.label}>Durée</Text><Text style={s.bold}>{durationText(f)}</Text></View>
            {f?.modality ? <View style={s.row}><Text style={s.label}>Modalité</Text><Text>{f.modality}</Text></View> : null}
          </View>
          {f?.objectives ? <><Text style={[s.bold, { marginBottom: 6 }]}>Objectifs pédagogiques</Text><Text style={s.para}>{f.objectives}</Text></> : null}
          {f?.program ? <><Text style={[s.bold, { marginBottom: 6 }]}>Programme détaillé</Text><Text style={s.para}>{f.program}</Text></> : <Text style={s.label}>Programme à compléter.</Text>}
        </View>
      );
    case "CONVENTION":
      return (
        <View>
          <Text style={s.para}>Entre l&apos;organisme <Text style={s.bold}>{d.org.legalName ?? d.org.name}</Text>{d.org.nda ? `, déclaration d'activité n° ${d.org.nda}` : ""}, et le bénéficiaire <Text style={s.bold}>{d.learner?.company ?? d.learner?.fullName ?? "…"}</Text>, il est convenu ce qui suit :</Text>
          <View style={s.box}>
            <View style={s.row}><Text style={s.label}>Action de formation</Text><Text style={s.bold}>{f?.title}</Text></View>
            {ses ? <View style={s.row}><Text style={s.label}>Dates</Text><Text>{ses.dateRange}</Text></View> : null}
            <View style={s.row}><Text style={s.label}>Durée</Text><Text>{durationText(f)}</Text></View>
            {d.amountText ? <View style={s.row}><Text style={s.label}>Coût</Text><Text style={s.bold}>{d.amountText}</Text></View> : null}
          </View>
          <Text style={s.para}>La présente convention est conclue en application des dispositions du Code du travail relatives à la formation professionnelle continue.</Text>
          <View style={s.signLine}>
            <Text style={s.signBox}>Pour l&apos;organisme{"\n"}{d.org.legalRep ?? d.org.name}</Text>
            <Text style={s.signBox}>Pour le bénéficiaire{"\n"}{d.learner?.company ?? d.learner?.fullName ?? ""}</Text>
          </View>
        </View>
      );
    case "DEVIS":
      return (
        <View>
          <Text style={s.para}>Devis établi pour <Text style={s.bold}>{d.learner?.company ?? d.learner?.fullName ?? "…"}</Text> :</Text>
          <View style={s.th}><Text style={{ width: "70%" }}>Désignation</Text><Text style={{ width: "30%", textAlign: "right" }}>Montant</Text></View>
          <View style={s.td}><Text style={{ width: "70%" }}>{f?.title}{ses ? ` — ${ses.dateRange}` : ""}</Text><Text style={{ width: "30%", textAlign: "right" }}>{d.amountText ?? "—"}</Text></View>
          <View style={[s.row, { marginTop: 12 }]}><Text style={s.bold}>Total</Text><Text style={s.bold}>{d.amountText ?? "—"}</Text></View>
          <Text style={[s.para, { marginTop: 20, fontSize: 9, color: "#5a6271" }]}>Devis valable 30 jours. TVA non applicable, art. 293 B du CGI (le cas échéant).</Text>
        </View>
      );
    case "EMARGEMENT":
      return (
        <View>
          <View style={s.box}>
            <View style={s.row}><Text style={s.label}>Formation</Text><Text style={s.bold}>{f?.title}</Text></View>
            {ses ? <View style={s.row}><Text style={s.label}>Dates</Text><Text>{ses.dateRange}</Text></View> : null}
            {ses?.trainerName ? <View style={s.row}><Text style={s.label}>Formateur</Text><Text>{ses.trainerName}</Text></View> : null}
          </View>
          <View style={s.th}><Text style={{ width: "45%" }}>Apprenant</Text><Text style={{ width: "30%" }}>Entreprise</Text><Text style={{ width: "25%" }}>Signature</Text></View>
          {(d.learners ?? []).map((l, i) => (
            <View key={i} style={[s.td, { minHeight: 28, alignItems: "center" }]}><Text style={{ width: "45%" }}>{l.fullName}</Text><Text style={{ width: "30%" }}>{l.company ?? ""}</Text><Text style={{ width: "25%" }} /></View>
          ))}
          {(d.learners ?? []).length === 0 ? <Text style={[s.label, { marginTop: 8 }]}>Aucun apprenant inscrit.</Text> : null}
        </View>
      );
    default:
      return (
        <View>
          <Text style={s.para}>Document généré à partir des informations actives du centre.</Text>
          <ContextSummary d={d} />
          {f?.objectives ? <><Text style={[s.bold, { marginBottom: 6 }]}>Objectifs</Text><Text style={s.para}>{f.objectives}</Text></> : null}
          {f?.program ? <><Text style={[s.bold, { marginBottom: 6 }]}>Programme</Text><Text style={s.para}>{f.program}</Text></> : null}
        </View>
      );
  }
}

export async function renderDocumentPdf(data: DocData): Promise<Buffer> {
  const el = (
    <Document>
      <Page size="A4" style={s.page}>
        <Header d={data} />
        <Text style={s.docType}>{TYPE_LABELS[data.type] ?? data.type}</Text>
        <Text style={s.title}>{data.formation?.title ?? TYPE_LABELS[data.type] ?? "Document"}</Text>
        <Body d={data} />
        <Footer d={data} />
      </Page>
    </Document>
  );
  const buf = await renderToBuffer(el);
  return buf as Buffer;
}
