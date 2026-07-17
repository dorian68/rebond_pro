import "server-only";
import React from "react";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { BilanProgram } from "@/lib/bilan-programs";

export type BeneficiaryDossierPdfData = {
  organizationName: string;
  beneficiary: {
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
    objective?: string | null;
    status: string;
    startedAt: Date;
  };
  program: BilanProgram;
  generatedAt: string;
  steps: {
    id: string;
    title: string;
    phase: string;
    status: string;
    notes?: string | null;
  }[];
  artifacts: {
    key: string;
    title: string;
    kind: string;
    status: string;
    shareable: boolean;
    content: unknown;
  }[];
};

const s = StyleSheet.create({
  page: { padding: 42, fontSize: 10.5, fontFamily: "Helvetica", color: "#15181f", lineHeight: 1.45 },
  header: { borderBottom: "1.5pt solid #2469a6", paddingBottom: 12, marginBottom: 18 },
  brand: { fontSize: 16, fontWeight: 700, color: "#2469a6" },
  eyebrow: { fontSize: 8, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1.1, marginTop: 4 },
  title: { fontSize: 20, fontWeight: 700, marginBottom: 10 },
  subtitle: { fontSize: 11, color: "#4b5563", marginBottom: 14 },
  grid: { flexDirection: "row", gap: 10, marginBottom: 14 },
  box: { backgroundColor: "#f5f7fa", borderRadius: 6, padding: 10, marginBottom: 10 },
  boxHalf: { width: "50%", backgroundColor: "#f5f7fa", borderRadius: 6, padding: 10 },
  label: { fontSize: 8, color: "#6b7280", textTransform: "uppercase", marginBottom: 3 },
  value: { fontSize: 10.5, fontWeight: 700 },
  sectionTitle: { fontSize: 13, fontWeight: 700, marginTop: 10, marginBottom: 8, color: "#15314c" },
  step: { border: "0.6pt solid #e2e8f0", borderRadius: 7, padding: 10, marginBottom: 8 },
  stepHead: { flexDirection: "row", justifyContent: "space-between", gap: 10, marginBottom: 5 },
  stepTitle: { fontSize: 11, fontWeight: 700, width: "72%" },
  badge: { fontSize: 8, color: "#2469a6", backgroundColor: "#e8f2fb", padding: "3 6", borderRadius: 20 },
  text: { fontSize: 9.5, color: "#374151", marginTop: 4 },
  muted: { fontSize: 8.5, color: "#6b7280" },
  artifact: { backgroundColor: "#ffffff", border: "0.6pt solid #e5e7eb", borderRadius: 6, padding: 8, marginTop: 6 },
  footer: { position: "absolute", left: 42, right: 42, bottom: 24, borderTop: "0.5pt solid #e5e7eb", paddingTop: 6, textAlign: "center", fontSize: 7.5, color: "#6b7280" },
});

const STATUS_LABELS: Record<string, string> = {
  todo: "A faire",
  in_progress: "En cours",
  done: "Termine",
  draft: "Brouillon",
  validated: "Valide",
  shareable: "Partageable",
  archived: "Archive",
};

function dateFr(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Paris" }).format(date);
}

function textValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.map(textValue).filter(Boolean).join(", ");
  if (typeof value === "object") return "";
  return String(value).trim();
}

function artifactLines(content: unknown): [string, string][] {
  if (!content || typeof content !== "object" || Array.isArray(content)) return [];
  return Object.entries(content as Record<string, unknown>)
    .filter(([key]) => !["updatedAt", "progress"].includes(key))
    .map(([key, value]) => [key, textValue(value)] as [string, string])
    .filter(([, value]) => value.length > 0)
    .slice(0, 12);
}

function statusLabel(value: string) {
  return STATUS_LABELS[value] ?? value;
}

function DossierPdf({ data }: { data: BeneficiaryDossierPdfData }) {
  const fullName = `${data.beneficiary.firstName} ${data.beneficiary.lastName}`.trim();
  const artifactsByStepTitle = new Map<string, typeof data.artifacts>();
  for (const artifact of data.artifacts) {
    const bucket = artifactsByStepTitle.get(artifact.title) ?? [];
    bucket.push(artifact);
    artifactsByStepTitle.set(artifact.title, bucket);
  }

  return (
    <Document title={`Dossier numerique - ${fullName}`}>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.brand}>Le Bon Rebond</Text>
          <Text style={s.eyebrow}>Dossier numerique de prestation</Text>
        </View>

        <Text style={s.title}>{fullName}</Text>
        <Text style={s.subtitle}>{data.program.label} - {data.program.subtitle}</Text>

        <View style={s.grid}>
          <View style={s.boxHalf}>
            <Text style={s.label}>Beneficiaire</Text>
            <Text style={s.value}>{fullName}</Text>
            <Text style={s.text}>{data.beneficiary.email ?? "Email non renseigne"}</Text>
            <Text style={s.text}>{data.beneficiary.phone ?? "Telephone non renseigne"}</Text>
          </View>
          <View style={s.boxHalf}>
            <Text style={s.label}>Prestation</Text>
            <Text style={s.value}>{data.program.audience}</Text>
            <Text style={s.text}>Livret source : {data.program.sourcePdf}</Text>
            <Text style={s.text}>Demarrage : {dateFr(data.beneficiary.startedAt)}</Text>
          </View>
        </View>

        {data.beneficiary.objective ? (
          <View style={s.box}>
            <Text style={s.label}>Objectif / demande initiale</Text>
            <Text style={s.text}>{data.beneficiary.objective}</Text>
          </View>
        ) : null}

        <Text style={s.sectionTitle}>Progression du parcours</Text>
        {data.steps.map((step, index) => {
          const related = artifactsByStepTitle.get(step.title) ?? [];
          return (
            <View key={step.id} style={s.step} wrap={false}>
              <View style={s.stepHead}>
                <Text style={s.stepTitle}>{index + 1}. {step.title}</Text>
                <Text style={s.badge}>{statusLabel(step.status)}</Text>
              </View>
              <Text style={s.muted}>{step.phase}</Text>
              {step.notes ? <Text style={s.text}>{step.notes.slice(0, 1200)}</Text> : <Text style={s.muted}>Aucune note conseiller enregistree.</Text>}
              {related.map((artifact) => {
                const lines = artifactLines(artifact.content);
                return (
                  <View key={artifact.key} style={s.artifact}>
                    <Text style={s.value}>{artifact.title}</Text>
                    <Text style={s.muted}>{statusLabel(artifact.status)}{artifact.shareable ? " - partageable" : ""}</Text>
                    {lines.length === 0 ? <Text style={s.muted}>Bloc structure sans champ rempli.</Text> : lines.map(([key, value]) => (
                      <Text key={key} style={s.text}>{key}: {value}</Text>
                    ))}
                  </View>
                );
              })}
            </View>
          );
        })}

        <Text style={s.footer} fixed>
          {data.organizationName} - Dossier genere le {data.generatedAt} - Document confidentiel transmis par Le Bon Rebond
        </Text>
      </Page>
    </Document>
  );
}

export async function renderBeneficiaryDossierPdf(data: BeneficiaryDossierPdfData): Promise<Buffer> {
  return await renderToBuffer(<DossierPdf data={data} />) as Buffer;
}
