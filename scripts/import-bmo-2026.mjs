#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import PizZip from "pizzip";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(SCRIPT_DIR, "..");

const DEFAULTS = Object.freeze({
  xlsx: path.join(
    REPOSITORY_ROOT,
    "tmp",
    "bmo-2026",
    "bmo-2026-france-travail.xlsx",
  ),
  pdf: path.join(
    REPOSITORY_ROOT,
    "tmp",
    "bmo-2026",
    "Support_BMO26_v5.pdf",
  ),
  output: path.join(REPOSITORY_ROOT, "data", "bmo-2026-guadeloupe.json"),
});

const EXPECTED_SHA256 = Object.freeze({
  xlsx: "735d0443b799b4c18c145055f87244a355a48b6286ee98ddbab272491d9792e0",
  pdf: "9d6d8fa81ce1abbe5a644a35d8a4bc31208f1ac615fa7c68ca3ade0774ceb625",
});

const EXPECTED_HEADERS = Object.freeze([
  "annee",
  "Code métier BMO",
  "Nom métier BMO",
  "Famille_met",
  "Lbl_fam_met",
  "REG",
  "NOM_REG",
  "Dept",
  "NomDept",
  "BE26",
  "NOMBE26",
  "clpe",
  "met",
  "xmet",
  "smet",
]);

const EXPECTED_COUNTS = Object.freeze({
  workbookDataRows: 53_786,
  nationalOccupations: 217,
  records: 508,
  occupations: 180,
  basins: 5,
  metrics: Object.freeze({
    projects: Object.freeze({
      publishedCells: 380,
      suppressedCells: 128,
      knownSubtotal: 13_205,
    }),
    difficultProjects: Object.freeze({
      publishedCells: 262,
      suppressedCells: 246,
      knownSubtotal: 5_957,
    }),
    seasonalProjects: Object.freeze({
      publishedCells: 134,
      suppressedCells: 374,
      knownSubtotal: 3_671,
    }),
  }),
});

// Independent aggregate references transcribed from the official France Travail
// PDF. The PDF hash is checked before these values are used.
const PDF_REFERENCES = Object.freeze({
  headline: Object.freeze({
    pdfPageNumber: 6,
    projects: 13_588,
    difficultSharePercent: 46,
    seasonalSharePercent: 28,
    recruitingEstablishmentsSharePercent: 27,
  }),
  regionTable: Object.freeze({
    pdfPageNumber: 22,
    projects: 13_588,
    difficultSharePercent: 47,
    seasonalSharePercent: 25,
  }),
  basins: Object.freeze({
    "101": Object.freeze({
      projects: 3_213,
      difficultSharePercent: 51,
      seasonalSharePercent: 23,
    }),
    "102": Object.freeze({
      projects: 2_086,
      difficultSharePercent: 43,
      seasonalSharePercent: 28,
    }),
    "105": Object.freeze({
      projects: 5_856,
      difficultSharePercent: 46,
      seasonalSharePercent: 23,
    }),
    "113": Object.freeze({
      projects: 1_973,
      difficultSharePercent: 45,
      seasonalSharePercent: 49,
    }),
    "116": Object.freeze({
      projects: 460,
      difficultSharePercent: 38,
      seasonalSharePercent: 54,
    }),
  }),
});

const METRIC_NAMES = Object.freeze([
  "projects",
  "difficultProjects",
  "seasonalProjects",
]);

function usage() {
  return `Usage: node scripts/import-bmo-2026.mjs [options]

Options:
  --xlsx <path>   Official BMO 2026 XLSX input
  --pdf <path>    Official Guadeloupe BMO 2026 PDF input
  --output <path> Normalized JSON output
  --help          Show this help

The importer verifies the two official source SHA-256 hashes and fails closed if
the workbook shape, Guadeloupe coverage or known metric subtotals drift.`;
}

function parseArguments(argv) {
  const options = { ...DEFAULTS };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") {
      console.log(usage());
      process.exit(0);
    }

    const key = argument === "--xlsx"
      ? "xlsx"
      : argument === "--pdf"
        ? "pdf"
        : argument === "--output"
          ? "output"
          : null;

    if (key === null) {
      throw new Error(`Unknown argument: ${argument}\n\n${usage()}`);
    }

    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${argument}`);
    }

    options[key] = path.resolve(process.cwd(), value);
    index += 1;
  }

  return options;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function repositoryRelative(filePath) {
  return path.relative(REPOSITORY_ROOT, filePath).split(path.sep).join("/");
}

function decodeXml(value) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_match, codePoint) =>
      String.fromCodePoint(Number.parseInt(codePoint, 16)),
    )
    .replace(/&#([0-9]+);/g, (_match, codePoint) =>
      String.fromCodePoint(Number.parseInt(codePoint, 10)),
    )
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function parseXmlAttributes(fragment) {
  const attributes = {};
  const pattern = /([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let match;
  while ((match = pattern.exec(fragment)) !== null) {
    attributes[match[1]] = decodeXml(match[2] ?? match[3] ?? "");
  }
  return attributes;
}

function extractTextRuns(xmlFragment) {
  let value = "";
  const textPattern = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
  let match;
  while ((match = textPattern.exec(xmlFragment)) !== null) {
    value += decodeXml(match[1]);
  }
  return value;
}

function parseSharedStrings(xml) {
  const strings = [];
  const itemPattern = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
  let match;
  while ((match = itemPattern.exec(xml)) !== null) {
    strings.push(extractTextRuns(match[1]));
  }
  return strings;
}

function columnIndex(cellReference) {
  const letters = cellReference.match(/^[A-Z]+/i)?.[0];
  assert(letters, `Invalid XLSX cell reference: ${cellReference}`);
  let value = 0;
  for (const letter of letters.toUpperCase()) {
    value = value * 26 + letter.charCodeAt(0) - 64;
  }
  return value - 1;
}

function parseCellValue(attributes, body, sharedStrings) {
  const type = attributes.t;
  if (type === "inlineStr") {
    return extractTextRuns(body);
  }

  const rawValue = body.match(/<v\b[^>]*>([\s\S]*?)<\/v>/)?.[1];
  if (rawValue === undefined) {
    return "";
  }

  const decoded = decodeXml(rawValue);
  if (type !== "s") {
    return decoded;
  }

  const sharedStringIndex = Number.parseInt(decoded, 10);
  assert(
    Number.isInteger(sharedStringIndex) &&
      sharedStringIndex >= 0 &&
      sharedStringIndex < sharedStrings.length,
    `Invalid shared-string index: ${decoded}`,
  );
  return sharedStrings[sharedStringIndex];
}

function parseWorksheetRows(xml, sharedStrings, visitRow) {
  const rowPattern = /<row\b([^>]*)>([\s\S]*?)<\/row>/g;
  let rowMatch;

  while ((rowMatch = rowPattern.exec(xml)) !== null) {
    const rowAttributes = parseXmlAttributes(rowMatch[1]);
    const sourceRow = Number.parseInt(rowAttributes.r, 10);
    assert(Number.isInteger(sourceRow), "XLSX row is missing a numeric r attribute");

    const values = [];
    const cellPattern = /<c\b([^>]*)>([\s\S]*?)<\/c>/g;
    let cellMatch;
    while ((cellMatch = cellPattern.exec(rowMatch[2])) !== null) {
      const cellAttributes = parseXmlAttributes(cellMatch[1]);
      assert(cellAttributes.r, `Cell without a reference in row ${sourceRow}`);
      values[columnIndex(cellAttributes.r)] = parseCellValue(
        cellAttributes,
        cellMatch[2],
        sharedStrings,
      );
    }

    visitRow(sourceRow, values.map((value) => value ?? ""));
  }
}

function normalizeZipPath(target) {
  const normalized = target.replace(/\\/g, "/").replace(/^\//, "");
  return normalized.startsWith("xl/") ? normalized : `xl/${normalized}`;
}

function workbookSheetPaths(zip) {
  const workbookXml = zip.file("xl/workbook.xml")?.asText();
  const relationshipsXml = zip.file("xl/_rels/workbook.xml.rels")?.asText();
  assert(workbookXml, "Missing xl/workbook.xml in XLSX package");
  assert(
    relationshipsXml,
    "Missing xl/_rels/workbook.xml.rels in XLSX package",
  );

  const relationshipTargets = new Map();
  const relationshipPattern = /<Relationship\b([^>]*?)(?:\/>|>[\s\S]*?<\/Relationship>)/g;
  let relationshipMatch;
  while ((relationshipMatch = relationshipPattern.exec(relationshipsXml)) !== null) {
    const attributes = parseXmlAttributes(relationshipMatch[1]);
    if (attributes.Id && attributes.Target) {
      relationshipTargets.set(attributes.Id, normalizeZipPath(attributes.Target));
    }
  }

  const sheets = new Map();
  const sheetPattern = /<sheet\b([^>]*?)(?:\/>|>[\s\S]*?<\/sheet>)/g;
  let sheetMatch;
  while ((sheetMatch = sheetPattern.exec(workbookXml)) !== null) {
    const attributes = parseXmlAttributes(sheetMatch[1]);
    const relationshipId = attributes["r:id"];
    const target = relationshipTargets.get(relationshipId);
    assert(
      attributes.name && target,
      `Cannot resolve workbook sheet relationship ${relationshipId ?? "(missing)"}`,
    );
    sheets.set(attributes.name, target);
  }

  return sheets;
}

function metric(rawValue, sourceColumn, sourceRow) {
  const raw = String(rawValue).trim();
  if (raw === "*") {
    return { raw: "*", value: null, status: "suppressed" };
  }

  assert(
    /^\d+$/.test(raw),
    `Unexpected ${sourceColumn} value at XLSX row ${sourceRow}: ${JSON.stringify(raw)}`,
  );
  const value = Number.parseInt(raw, 10);
  return { raw, value, status: "published" };
}

function aggregateMetric(records, metricName, expectedCellCount = records.length) {
  let knownSubtotal = 0;
  let publishedCellCount = 0;
  let suppressedCellCount = 0;

  for (const record of records) {
    const cell = record[metricName];
    if (cell.status === "suppressed") {
      suppressedCellCount += 1;
    } else {
      publishedCellCount += 1;
      knownSubtotal += cell.value;
    }
  }

  // A missing basin row is unknown, not an implicit zero. Completeness therefore
  // requires both numeric cells and the full expected geographic coverage.
  const complete = suppressedCellCount === 0 && records.length === expectedCellCount;
  return {
    value: complete ? knownSubtotal : null,
    knownSubtotal,
    publishedCellCount,
    suppressedCellCount,
    complete,
  };
}

function aggregateMetrics(records, expectedCellCount = records.length) {
  return Object.fromEntries(
    METRIC_NAMES.map((metricName) => [
      metricName,
      aggregateMetric(records, metricName, expectedCellCount),
    ]),
  );
}

function validateAggregate(metricName, actual) {
  const expected = EXPECTED_COUNTS.metrics[metricName];
  assert(
    actual.publishedCellCount === expected.publishedCells,
    `${metricName}: expected ${expected.publishedCells} published cells, got ${actual.publishedCellCount}`,
  );
  assert(
    actual.suppressedCellCount === expected.suppressedCells,
    `${metricName}: expected ${expected.suppressedCells} suppressed cells, got ${actual.suppressedCellCount}`,
  );
  assert(
    actual.knownSubtotal === expected.knownSubtotal,
    `${metricName}: expected known subtotal ${expected.knownSubtotal}, got ${actual.knownSubtotal}`,
  );
}

function buildDataset({ xlsxPath, pdfPath, xlsxBuffer, pdfBuffer }) {
  const zip = new PizZip(xlsxBuffer);
  const sharedStringsXml = zip.file("xl/sharedStrings.xml")?.asText();
  assert(sharedStringsXml, "Missing xl/sharedStrings.xml in XLSX package");
  const sharedStrings = parseSharedStrings(sharedStringsXml);
  const sheetPaths = workbookSheetPaths(zip);

  const descriptionPath = sheetPaths.get("Description_des_variables");
  const dataPath = sheetPaths.get("BMO_2026_open_data");
  assert(descriptionPath, "Missing Description_des_variables worksheet");
  assert(dataPath, "Missing BMO_2026_open_data worksheet");

  const descriptionXml = zip.file(descriptionPath)?.asText();
  const dataXml = zip.file(dataPath)?.asText();
  assert(descriptionXml, `Missing worksheet payload: ${descriptionPath}`);
  assert(dataXml, `Missing worksheet payload: ${dataPath}`);

  const descriptionValues = [];
  parseWorksheetRows(descriptionXml, sharedStrings, (_sourceRow, values) => {
    descriptionValues.push(...values.filter(Boolean));
  });
  const descriptionMentionsBE25 = descriptionValues.includes("BE25");
  const descriptionMentionsNOMBE25 = descriptionValues.includes("NOMBE25");

  let headers;
  let workbookDataRows = 0;
  const nationalOccupationCodes = new Set();
  const records = [];

  parseWorksheetRows(dataXml, sharedStrings, (sourceRow, values) => {
    if (sourceRow === 1) {
      headers = values;
      assert(
        JSON.stringify(headers) === JSON.stringify(EXPECTED_HEADERS),
        `Unexpected BMO worksheet headers. Expected ${JSON.stringify(EXPECTED_HEADERS)}, got ${JSON.stringify(headers)}`,
      );
      return;
    }

    workbookDataRows += 1;
    const row = Object.fromEntries(
      EXPECTED_HEADERS.map((header, index) => [header, String(values[index] ?? "")]),
    );
    nationalOccupationCodes.add(row["Code métier BMO"]);

    const isGuadeloupe =
      row.annee === "2026" &&
      row.REG === "01" &&
      row.NOM_REG === "Guadeloupe" &&
      row.Dept === "971" &&
      row.NomDept === "Guadeloupe";
    if (!isGuadeloupe) {
      return;
    }

    const occupationCode = row["Code métier BMO"];
    const basinCode = row.BE26;
    assert(occupationCode, `Missing occupation code at XLSX row ${sourceRow}`);
    assert(basinCode, `Missing basin code at XLSX row ${sourceRow}`);

    records.push({
      id: `2026-971-${basinCode}-${occupationCode}`,
      sourceRow,
      occupation: {
        code: occupationCode,
        label: row["Nom métier BMO"],
        familyCode: row.Famille_met,
        familyLabel: row.Lbl_fam_met,
      },
      basin: {
        code: basinCode,
        label: row.NOMBE26,
        clpe: row.clpe,
      },
      projects: metric(row.met, "met", sourceRow),
      difficultProjects: metric(row.xmet, "xmet", sourceRow),
      seasonalProjects: metric(row.smet, "smet", sourceRow),
    });
  });

  assert(headers, "The BMO data worksheet has no header row");
  assert(
    workbookDataRows === EXPECTED_COUNTS.workbookDataRows,
    `Expected ${EXPECTED_COUNTS.workbookDataRows} workbook data rows, got ${workbookDataRows}`,
  );
  assert(
    nationalOccupationCodes.size === EXPECTED_COUNTS.nationalOccupations,
    `Expected ${EXPECTED_COUNTS.nationalOccupations} national occupations, got ${nationalOccupationCodes.size}`,
  );
  assert(
    records.length === EXPECTED_COUNTS.records,
    `Expected ${EXPECTED_COUNTS.records} Guadeloupe records, got ${records.length}`,
  );

  records.sort(
    (left, right) =>
      compareText(left.occupation.code, right.occupation.code) ||
      compareText(left.basin.code, right.basin.code),
  );

  const recordIds = new Set(records.map((record) => record.id));
  assert(
    recordIds.size === records.length,
    "Duplicate occupation/basin observations found in Guadeloupe records",
  );

  const occupationGroups = new Map();
  const basinGroups = new Map();
  for (const record of records) {
    const occupationGroup = occupationGroups.get(record.occupation.code) ?? [];
    occupationGroup.push(record);
    occupationGroups.set(record.occupation.code, occupationGroup);

    const basinGroup = basinGroups.get(record.basin.code) ?? [];
    basinGroup.push(record);
    basinGroups.set(record.basin.code, basinGroup);
  }

  assert(
    occupationGroups.size === EXPECTED_COUNTS.occupations,
    `Expected ${EXPECTED_COUNTS.occupations} Guadeloupe occupations, got ${occupationGroups.size}`,
  );
  assert(
    basinGroups.size === EXPECTED_COUNTS.basins,
    `Expected ${EXPECTED_COUNTS.basins} Guadeloupe basins, got ${basinGroups.size}`,
  );

  const occupations = [...occupationGroups.entries()]
    .sort(([left], [right]) => compareText(left, right))
    .map(([code, group]) => {
      const canonical = group[0].occupation;
      assert(
        group.every(
          (record) =>
            record.occupation.label === canonical.label &&
            record.occupation.familyCode === canonical.familyCode &&
            record.occupation.familyLabel === canonical.familyLabel,
        ),
        `Inconsistent labels or family for occupation ${code}`,
      );
      const observedBasinCount = new Set(group.map((record) => record.basin.code)).size;
      return {
        ...canonical,
        recordCount: group.length,
        observedBasinCount,
        basinCodes: group.map((record) => record.basin.code).sort(compareText),
        ...aggregateMetrics(group, EXPECTED_COUNTS.basins),
      };
    });

  const basins = [...basinGroups.entries()]
    .sort(([left], [right]) => compareText(left, right))
    .map(([code, group]) => {
      const canonical = group[0].basin;
      assert(
        group.every(
          (record) =>
            record.basin.label === canonical.label &&
            record.basin.clpe === canonical.clpe,
        ),
        `Inconsistent label or CLPE for basin ${code}`,
      );

      const metrics = aggregateMetrics(group);
      const officialPdf = PDF_REFERENCES.basins[code];
      assert(officialPdf, `No official PDF reference configured for basin ${code}`);
      assert(
        metrics.projects.knownSubtotal <= officialPdf.projects,
        `Known XLSX projects exceed official PDF total for basin ${code}`,
      );

      return {
        ...canonical,
        recordCount: group.length,
        occupationCount: new Set(group.map((record) => record.occupation.code)).size,
        ...metrics,
        officialPdfReference: {
          pdfPageNumber: 22,
          ...officialPdf,
        },
        reconciliation: {
          projectsKnownSubtotal: metrics.projects.knownSubtotal,
          projectsPublishedReference: officialPdf.projects,
          projectsSuppressedRemainder: officialPdf.projects - metrics.projects.knownSubtotal,
          suppressedProjectCellCount: metrics.projects.suppressedCellCount,
          status: "pass_with_suppressed_values",
        },
      };
    });

  const regionMetrics = aggregateMetrics(records);
  for (const metricName of METRIC_NAMES) {
    validateAggregate(metricName, regionMetrics[metricName]);
  }

  const basinPublishedProjectsSum = basins.reduce(
    (sum, basin) => sum + basin.officialPdfReference.projects,
    0,
  );
  const basinKnownProjectsSum = basins.reduce(
    (sum, basin) => sum + basin.projects.knownSubtotal,
    0,
  );
  const basinSuppressedRemainderSum = basins.reduce(
    (sum, basin) => sum + basin.reconciliation.projectsSuppressedRemainder,
    0,
  );
  const regionSuppressedRemainder =
    PDF_REFERENCES.headline.projects - regionMetrics.projects.knownSubtotal;

  assert(
    basinPublishedProjectsSum === PDF_REFERENCES.headline.projects,
    "Official PDF basin project totals do not sum to the official headline total",
  );
  assert(
    basinKnownProjectsSum === regionMetrics.projects.knownSubtotal,
    "Basin XLSX known project subtotals do not sum to the regional known subtotal",
  );
  assert(
    basinSuppressedRemainderSum === regionSuppressedRemainder,
    "Basin suppressed project remainders do not reconcile to the regional remainder",
  );

  const seasonalKnownLowerBoundPercent =
    (regionMetrics.seasonalProjects.knownSubtotal /
      PDF_REFERENCES.headline.projects) *
    100;
  assert(
    seasonalKnownLowerBoundPercent >
      PDF_REFERENCES.regionTable.seasonalSharePercent,
    "Expected official PDF regional seasonal-rate inconsistency was not detected",
  );

  const xlsxHash = sha256(xlsxBuffer);
  const pdfHash = sha256(pdfBuffer);

  return {
    schemaVersion: "1.0.0",
    meta: {
      datasetId: "bmo-2026-guadeloupe",
      title: "Besoins en main-d'œuvre 2026 — Guadeloupe",
      surveyYear: 2026,
      territory: {
        regionCode: "01",
        regionLabel: "Guadeloupe",
        departmentCode: "971",
        departmentLabel: "Guadeloupe",
      },
      generatedBy: "scripts/import-bmo-2026.mjs",
      reproducibility: {
        deterministic: true,
        generatedAtIncluded: false,
        sourceIntegrityPolicy: "fail_on_sha256_mismatch",
      },
      provenance: {
        workbook: {
          producer: "France Travail",
          datasetPageUrl:
            "https://www.data.gouv.fr/datasets/enquete-besoins-en-main-doeuvre-bmo",
          officialResourceUrl:
            "https://www.data.gouv.fr/api/1/datasets/r/228917c7-c22e-4766-835e-fcb923f29b3d",
          localPath: repositoryRelative(xlsxPath),
          sha256: xlsxHash,
          license: "Licence Ouverte / Open Licence version 2.0",
          worksheet: "BMO_2026_open_data",
        },
        pdf: {
          producer: "France Travail Guadeloupe & Îles du Nord",
          officialUrl:
            "https://www.francetravail.org/files/live/sites/peorg-gua/files/documents/Statistiques%20%26%20Analyses/Support_BMO26_v5.pdf",
          localPath: repositoryRelative(pdfPath),
          sha256: pdfHash,
          referenceExtraction:
            "Values transcribed from pages 6 and 22 and bound to this exact PDF by SHA-256.",
        },
        method: {
          producer: "France Travail",
          officialUrl:
            "https://statistiques.francetravail.org/bmo/static/methode_2026",
          surveyWindow: "October–December 2025",
          occupationNomenclature: "FAP 2021",
        },
      },
      sourceSchema: {
        worksheetHeaders: EXPECTED_HEADERS,
        filter: {
          annee: "2026",
          REG: "01",
          NOM_REG: "Guadeloupe",
          Dept: "971",
          NomDept: "Guadeloupe",
        },
        metricMapping: {
          met: "projects",
          xmet: "difficultProjects",
          smet: "seasonalProjects",
        },
        suppressedCellRule: {
          sourceToken: "*",
          normalizedValue: null,
          status: "suppressed",
          imputation: "none",
        },
      },
      counts: {
        workbookDataRows,
        workbookNationalOccupations: nationalOccupationCodes.size,
        records: records.length,
        occupations: occupations.length,
        basins: basins.length,
      },
      quality: {
        verdict: "pass_with_official_ambiguities",
        structuralChecksPassed: true,
        sourceHashesVerified: true,
        suppressedValuesImputed: false,
      },
    },
    records,
    occupations,
    basins,
    aggregates: {
      region: {
        recordCount: records.length,
        occupationCount: occupations.length,
        basinCount: basins.length,
        ...regionMetrics,
        officialPdfReferences: {
          headline: PDF_REFERENCES.headline,
          regionTable: PDF_REFERENCES.regionTable,
        },
        reconciliation: {
          projectsKnownSubtotal: regionMetrics.projects.knownSubtotal,
          projectsPublishedReference: PDF_REFERENCES.headline.projects,
          projectsSuppressedRemainder: regionSuppressedRemainder,
          suppressedProjectCellCount: regionMetrics.projects.suppressedCellCount,
          status: "pass_with_suppressed_values",
        },
      },
    },
    reconciliations: [
      {
        id: "xlsx-guadeloupe-shape",
        status: "pass",
        expected: { records: 508, occupations: 180, basins: 5 },
        actual: {
          records: records.length,
          occupations: occupations.length,
          basins: basins.length,
        },
      },
      {
        id: "national-occupation-nomenclature",
        status: "pass",
        expected: 217,
        actual: nationalOccupationCodes.size,
        source: "Official 2026 method page and XLSX workbook",
      },
      {
        id: "pdf-basin-projects-to-headline",
        status: "pass",
        basinPublishedProjectsSum,
        headlineProjects: PDF_REFERENCES.headline.projects,
      },
      {
        id: "xlsx-known-projects-to-pdf-projects",
        status: "pass_with_suppressed_values",
        knownSubtotal: regionMetrics.projects.knownSubtotal,
        publishedReference: PDF_REFERENCES.headline.projects,
        suppressedRemainder: regionSuppressedRemainder,
        suppressedCellCount: regionMetrics.projects.suppressedCellCount,
        note:
          "The remainder is attributable only at aggregate level; no suppressed row is backfilled.",
      },
      {
        id: "pdf-regional-rate-consistency",
        status: "official_source_conflict",
        headlinePage: PDF_REFERENCES.headline.pdfPageNumber,
        tablePage: PDF_REFERENCES.regionTable.pdfPageNumber,
        difficultSharePercent: {
          headline: PDF_REFERENCES.headline.difficultSharePercent,
          table: PDF_REFERENCES.regionTable.difficultSharePercent,
        },
        seasonalSharePercent: {
          headline: PDF_REFERENCES.headline.seasonalSharePercent,
          table: PDF_REFERENCES.regionTable.seasonalSharePercent,
          xlsxKnownLowerBound: Number(seasonalKnownLowerBoundPercent.toFixed(2)),
        },
        note:
          "The page 22 regional seasonal share (25%) is below the XLSX known-only lower bound (27.02%); suppressed values cannot resolve it.",
      },
    ],
    ambiguities: [
      {
        id: "workbook-basin-header-year",
        severity: "source_documentation_typo",
        detail:
          "Description_des_variables documents BE25/NOMBE25, while the 2026 data worksheet actually exposes BE26/NOMBE26.",
        evidence: {
          descriptionMentionsBE25,
          descriptionMentionsNOMBE25,
          dataHeaders: ["BE26", "NOMBE26"],
        },
        decision: "Use the actual data worksheet headers without renaming them.",
      },
      {
        id: "suppression-threshold-undocumented",
        severity: "unknown_source_semantics",
        detail:
          "The supplied official files do not define the exact numeric threshold represented by '*'.",
        decision:
          "Preserve raw '*', normalize value to null, mark status suppressed, and never impute a row-level value.",
      },
      {
        id: "pdf-rate-conflict",
        severity: "official_source_conflict",
        detail:
          "The PDF headline (page 6) reports 46% difficult and 28% seasonal, while its regional table (page 22) reports 47% and 25% respectively.",
        decision:
          "Retain both references. Do not choose or silently reconcile either published rate.",
      },
    ],
  };
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const [xlsxBuffer, pdfBuffer] = await Promise.all([
    readFile(options.xlsx),
    readFile(options.pdf),
  ]);

  const actualHashes = {
    xlsx: sha256(xlsxBuffer),
    pdf: sha256(pdfBuffer),
  };
  assert(
    actualHashes.xlsx === EXPECTED_SHA256.xlsx,
    `XLSX SHA-256 mismatch: expected ${EXPECTED_SHA256.xlsx}, got ${actualHashes.xlsx}`,
  );
  assert(
    actualHashes.pdf === EXPECTED_SHA256.pdf,
    `PDF SHA-256 mismatch: expected ${EXPECTED_SHA256.pdf}, got ${actualHashes.pdf}`,
  );

  const dataset = buildDataset({
    xlsxPath: options.xlsx,
    pdfPath: options.pdf,
    xlsxBuffer,
    pdfBuffer,
  });
  const serialized = `${JSON.stringify(dataset, null, 2)}\n`;

  await mkdir(path.dirname(options.output), { recursive: true });
  await writeFile(options.output, serialized, "utf8");

  console.log(
    JSON.stringify(
      {
        output: repositoryRelative(options.output),
        outputSha256: sha256(Buffer.from(serialized, "utf8")),
        records: dataset.meta.counts.records,
        occupations: dataset.meta.counts.occupations,
        basins: dataset.meta.counts.basins,
        quality: dataset.meta.quality.verdict,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(`[import-bmo-2026] ${error.message}`);
  process.exitCode = 1;
});
