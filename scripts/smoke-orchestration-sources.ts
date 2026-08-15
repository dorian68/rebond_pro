import assert from "node:assert/strict";

import { createSarahDemoSnapshot, sourceRegistry } from "../src/features/orchestration";

type UnknownRecord = Record<string, unknown>;

const suite = "orchestration-sources";

const OFFICIAL_HOSTS = [
  "akto.fr",
  "aides.regionguadeloupe.fr",
  "candidat.francetravail.fr",
  "capemploi-971.com",
  "capexcellence.net",
  "clubmed.fr",
  "creolebeach.com",
  "data.gouv.fr",
  "drafpic.site.ac-guadeloupe.fr",
  "fore.fr",
  "francetravail.fr",
  "francetravail.org",
  "geiq-guadeloupe.fr",
  "guadeloupe.cci.fr",
  "guadeloupe.deets.gouv.fr",
  "lesgeiq.fr",
  "lannuaire.service-public.gouv.fr",
  "missionlocaleguadeloupe.fr",
  "mobilizy.org",
  "regionguadeloupe.fr",
  "rsma.gp",
  "toubana.com",
  "umih.fr",
] as const;

function report(step: string, status: "pass" | "fail", details: string) {
  console.log(JSON.stringify({ suite, step, status, details }));
}

async function runStep(step: string, test: () => void | Promise<void>) {
  try {
    await test();
    report(step, "pass", "Invariant vérifié.");
  } catch (error) {
    report(step, "fail", error instanceof Error ? error.message : "Erreur inconnue.");
    throw error;
  }
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeStatus(value: unknown): string | null {
  return typeof value === "string" ? value.trim().toUpperCase().replaceAll("-", "_") : null;
}

function recordStatuses(record: UnknownRecord): string[] {
  return Object.entries(record)
    .filter(([key]) => key.toLowerCase().includes("status"))
    .map(([, value]) => normalizeStatus(value))
    .filter((value): value is string => value !== null);
}

function recordDiscriminator(record: UnknownRecord): string {
  return [record.entityType, record.recordType, record.kind, record.type, record.category]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toUpperCase();
}

function collectRecords(value: unknown, seen = new Set<unknown>()): UnknownRecord[] {
  if (value === null || typeof value !== "object" || seen.has(value)) return [];
  seen.add(value);

  if (Array.isArray(value)) return value.flatMap((entry) => collectRecords(entry, seen));

  const record = value as UnknownRecord;
  return [record, ...Object.values(record).flatMap((entry) => collectRecords(entry, seen))];
}

function collectRecordLists(value: unknown, path = "module", seen = new Set<unknown>()): Array<{ path: string; records: UnknownRecord[] }> {
  if (value === null || typeof value !== "object" || seen.has(value)) return [];
  seen.add(value);

  if (Array.isArray(value)) {
    const records = value.filter(isRecord);
    const current = records.length > 0 && records.every((record) => typeof record.id === "string") ? [{ path, records }] : [];
    return [...current, ...value.flatMap((entry, index) => collectRecordLists(entry, `${path}[${index}]`, seen))];
  }

  return Object.entries(value as UnknownRecord).flatMap(([key, entry]) => collectRecordLists(entry, `${path}.${key}`, seen));
}

function collectStrings(value: unknown, seen = new Set<unknown>()): string[] {
  if (typeof value === "string") return [value];
  if (value === null || typeof value !== "object" || seen.has(value)) return [];
  seen.add(value);
  if (Array.isArray(value)) return value.flatMap((entry) => collectStrings(entry, seen));
  return Object.values(value as UnknownRecord).flatMap((entry) => collectStrings(entry, seen));
}

function officialUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      OFFICIAL_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))
    );
  } catch {
    return false;
  }
}

function resolveReferencedSources(record: UnknownRecord, byId: Map<string, UnknownRecord>): UnknownRecord[] {
  const ids = Object.entries(record)
    .filter(([key]) => key.toLowerCase().includes("source") && key.toLowerCase().includes("id"))
    .flatMap(([, value]) => (Array.isArray(value) ? value : [value]))
    .filter((value): value is string => typeof value === "string");
  return ids.map((id) => byId.get(id)).filter((value): value is UnknownRecord => value !== undefined);
}

function assertNullWhenPresent(record: UnknownRecord, keys: readonly string[]) {
  for (const key of keys) {
    if (Object.hasOwn(record, key)) assert.equal(record[key], null, `${String(record.id ?? "record")}.${key} doit rester null.`);
  }
}

async function main() {
  const registryModule = sourceRegistry as unknown as UnknownRecord;
  const records = collectRecords(registryModule);
  const recordsWithId = records.filter((record) => typeof record.id === "string");
  const recordsById = new Map(recordsWithId.map((record) => [record.id as string, record]));

  await runStep("01_registry_is_non_empty", () => {
    assert.ok(recordsWithId.length >= 10, "Le registre doit exposer au moins dix entrées identifiables.");
  });

  await runStep("02_verified_requires_official_source", () => {
    const verifiedRecords = recordsWithId.filter((record) => recordStatuses(record).includes("VERIFIED"));
    assert.ok(verifiedRecords.length > 0, "Le registre doit contenir des assertions VERIFIED.");

    for (const record of verifiedRecords) {
      const sourceRecords = [record, ...resolveReferencedSources(record, recordsById)];
      const urls = sourceRecords.flatMap((sourceRecord) => collectStrings(sourceRecord)).filter(officialUrl);
      assert.ok(urls.length > 0, `${String(record.id)} est VERIFIED sans URL officielle directe.`);
    }
  });

  await runStep("03_bmo_is_never_an_opportunity", () => {
    const bmoRecords = recordsWithId.filter((record) => collectStrings(record).some((value) => /\bBMO\b|Besoins en Main-d[’']œuvre/i.test(value)));
    assert.ok(bmoRecords.length > 0, "Une source BMO 2026 doit être présente dans le registre.");
    for (const record of bmoRecords) {
      assert.doesNotMatch(recordDiscriminator(record), /(^|\s)(OPPORTUNITY|JOB|CDD|CDI)(\s|$)/, `${String(record.id)} transforme BMO en opportunité.`);
    }
  });

  await runStep("04_funding_mechanisms_have_no_allocation", () => {
    assert.ok(sourceRegistry.fundingMechanisms.length > 0, "Le registre doit contenir au moins un mécanisme documenté.");
    for (const mechanism of sourceRegistry.fundingMechanisms) {
      const untrustedShape = mechanism as unknown as UnknownRecord;
      assert.equal(mechanism.decisionRequired, true);
      assertNullWhenPresent(untrustedShape, ["allocationId", "fundingAllocationId", "amountApprovedCents", "amountPaidCents", "decisionDate"]);
      assert.notEqual(recordDiscriminator(untrustedShape), "FUNDING_ALLOCATION", `${mechanism.id} ne doit pas être une allocation.`);
    }
    assert.equal(createSarahDemoSnapshot().fundingAllocations.length, 0, "Aucune allocation ne doit être créée pour Sarah.");
  });

  await runStep("05_sarah_has_no_actual_or_approved_amount", () => {
    const snapshot = createSarahDemoSnapshot();
    assert.equal(snapshot.pathways.every((pathway) => pathway.actualCostCents === null && pathway.fundingGapCents === null), true);
    assert.equal(snapshot.costItems.every((item) => item.actualCostCents === null), true);
    assert.equal(snapshot.fundingAllocations.every((allocation) => allocation.amountApprovedCents === null && allocation.amountPaidCents === null), true);
    assert.equal(sourceRegistry.budgetScenarios.every((scenario) => scenario.status === "INTERNAL_SCENARIO"), true);
    assert.equal(sourceRegistry.budgetScenarios.every((scenario) => /aucun montant n'est acquis/i.test(scenario.caveat)), true);
    assert.equal(sourceRegistry.budgetScenarios.some((scenario) => collectStrings(scenario).some((value) => /Sarah|demo-participant-sarah/i.test(value))), false);
  });

  await runStep("06_volatile_offers_require_refresh", () => {
    for (const code of ["209WMFB", "210QCNL", "211DFSX"]) {
      const matchingSources = sourceRegistry.sources.filter((record) => collectStrings(record).some((value) => value.includes(code)));
      assert.ok(matchingSources.length > 0, `La source de l'offre volatile ${code} est absente.`);
      assert.equal(matchingSources.every((record) => record.verificationStatus === "NEEDS_VERIFICATION"), true);
      assert.equal(matchingSources.every((record) => /24 heures/i.test(record.freshness)), true);

      const canonicalOpportunities = sourceRegistry.officialOpportunities.filter((record) => collectStrings(record).some((value) => value.includes(code)));
      assert.equal(
        canonicalOpportunities.every(
          (record) => record.verificationStatus === "NEEDS_VERIFICATION" && (record.status === "UNKNOWN" || record.status === "DRAFT"),
        ),
        true,
        `Toute matérialisation de ${code} doit rester NEEDS_VERIFICATION et UNKNOWN/DRAFT.`,
      );
    }
  });

  await runStep("07_registry_ids_are_exact_and_unique", () => {
    const lists = collectRecordLists(registryModule);
    assert.ok(lists.length > 0, "Aucune liste canonique avec identifiants n'a été trouvée.");
    for (const list of lists) {
      const ids = list.records.map((record) => record.id as string);
      assert.equal(new Set(ids).size, ids.length, `Identifiant dupliqué dans ${list.path}.`);
      assert.equal(ids.every((id) => id === id.trim() && id.length > 0), true, `Identifiant vide ou non normalisé dans ${list.path}.`);
    }
    const canonicalIds = [
      ...sourceRegistry.sources,
      ...sourceRegistry.marketSignals,
      ...sourceRegistry.fundingMechanisms,
      ...sourceRegistry.budgetScenarios,
      ...sourceRegistry.evidenceRequirements,
      ...sourceRegistry.officialActors,
      ...sourceRegistry.officialServiceOffers,
      ...sourceRegistry.officialOpportunities,
    ].map((record) => record.id);
    assert.equal(new Set(canonicalIds).size, canonicalIds.length, "Les identifiants canoniques doivent être uniques entre registres.");
  });

  await runStep("08_unknowns_remain_null", () => {
    const snapshot = createSarahDemoSnapshot();
    assert.equal(snapshot.passports[0].identityPrivate.lastName, null);
    assert.equal(snapshot.pathways.every((pathway) => pathway.actualCostCents === null), true);
    assert.equal(snapshot.costItems.every((item) => item.actualCostCents === null), true);

    for (const opportunity of sourceRegistry.officialOpportunities) {
      assert.notEqual(opportunity.vacancies, 0, `${opportunity.id}.vacancies ne doit pas employer zéro pour une inconnue.`);
      assertNullWhenPresent(opportunity as unknown as UnknownRecord, ["actualCostCents", "amountApprovedCents", "amountPaidCents"]);
    }
  });
}

main().catch(() => {
  process.exitCode = 1;
});
