import "./_env";

import { randomBytes } from "node:crypto";
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

const SAFE_SCHEMA = /^[a-z][a-z0-9_]{0,62}$/;
const SAFE_DB_NAME = /^[A-Za-z_][A-Za-z0-9_$]*$/;
const LAST_HISTORICAL_MIGRATION = "20260812150000_roadmap2_drive_hierarchy";
const databaseUrl = process.env.DATABASE_URL ?? "";
if (!databaseUrl) throw new Error("DATABASE_URL manquante.");

const parsedUrl = new URL(databaseUrl);
const activeSchema = parsedUrl.searchParams.get("schema") || "public";
if (!SAFE_SCHEMA.test(activeSchema)) throw new Error("Le schéma actif n’est pas un identifiant PostgreSQL sûr.");
const cloneSchema = `codex_baseline_clone_${randomBytes(6).toString("hex")}`;
if (!SAFE_SCHEMA.test(cloneSchema)) throw new Error("Le schéma de clone généré est invalide.");

const prisma = new PrismaClient();

function quoted(value: string) {
  if (!SAFE_DB_NAME.test(value)) throw new Error(`Identifiant PostgreSQL non sûr : ${value}`);
  return `"${value.replaceAll('"', '""')}"`;
}

function runPrisma(args: string[], cloneUrl: string) {
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const executable = process.platform === "win32" ? (process.env.ComSpec || "cmd.exe") : "npx";
    const commandArgs = process.platform === "win32" ? ["/d", "/s", "/c", `npx prisma ${args.join(" ")}`] : ["prisma", ...args];
    const result = spawnSync(executable, commandArgs, {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: cloneUrl, PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK: "1" },
      encoding: "utf8",
      windowsHide: true,
    });
    if (result.status === 0) return result.stdout ?? "";
    const detail = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim().split(/\r?\n/).slice(-12).join(" | ");
    const retryable = /P1001|P1002|timed out|connection.*(?:closed|reset)|ECONNRESET/i.test(detail);
    if (!retryable || attempt === 4) throw new Error(`Prisma ${args.join(" ")} a échoué sur le clone : ${detail}`);
    const delayMs = 1_000 * (2 ** (attempt - 1));
    console.log(JSON.stringify({ step: "baseline_clone_prisma_retry", status: "retry", command: args.slice(0, 2).join(" "), attempt, delayMs }));
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delayMs);
  }
  throw new Error("Boucle de retry Prisma terminée sans résultat.");
}

function historicalMigrations() {
  const directories = readdirSync(join(process.cwd(), "prisma", "migrations"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const boundary = directories.indexOf(LAST_HISTORICAL_MIGRATION);
  if (boundary < 0) throw new Error("Migration historique de frontière introuvable.");
  return directories.slice(0, boundary + 1);
}

async function main() {
  const tables = await prisma.$queryRawUnsafe<Array<{ table_name: string }>>(`
    SELECT tablename AS table_name
    FROM pg_tables
    WHERE schemaname = $1 AND tablename <> '_prisma_migrations'
    ORDER BY tablename
  `, activeSchema);
  if (!tables.length) throw new Error("Le schéma actif ne contient aucune table à cloner.");
  for (const table of tables) if (!SAFE_DB_NAME.test(table.table_name)) throw new Error(`Table non sûre : ${table.table_name}`);

  const foreignKeys = await prisma.$queryRawUnsafe<Array<{ table_name: string; constraint_name: string; definition: string }>>(`
    SELECT rel.relname AS table_name, con.conname AS constraint_name, pg_get_constraintdef(con.oid, true) AS definition
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace ns ON ns.oid = rel.relnamespace
    WHERE ns.nspname = $1 AND con.contype = 'f'
    ORDER BY rel.relname, con.conname
  `, activeSchema);
  const primaryKeys = await prisma.$queryRawUnsafe<Array<{ table_name: string; constraint_name: string; definition: string }>>(`
    SELECT rel.relname AS table_name, con.conname AS constraint_name, pg_get_constraintdef(con.oid, true) AS definition
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace ns ON ns.oid = rel.relnamespace
    WHERE ns.nspname = $1 AND con.contype = 'p' AND rel.relname <> '_prisma_migrations'
    ORDER BY rel.relname, con.conname
  `, activeSchema);
  const enums = await prisma.$queryRawUnsafe<Array<{ enum_name: string; values: string[] }>>(`
    SELECT typ.typname AS enum_name, array_agg(enum.enumlabel ORDER BY enum.enumsortorder)::text[] AS values
    FROM pg_type typ
    JOIN pg_enum enum ON enum.enumtypid = typ.oid
    JOIN pg_namespace ns ON ns.oid = typ.typnamespace
    WHERE ns.nspname = $1
    GROUP BY typ.typname
    ORDER BY typ.typname
  `, activeSchema);
  const enumNames = new Set(enums.map((item) => item.enum_name));
  const enumColumns = await prisma.$queryRawUnsafe<Array<{ table_name: string; column_name: string; data_type: string; udt_name: string; column_default: string | null }>>(`
    SELECT table_name, column_name, data_type, udt_name, column_default
    FROM information_schema.columns
    WHERE table_schema = $1
      AND (data_type = 'USER-DEFINED' OR data_type = 'ARRAY')
    ORDER BY table_name, ordinal_position
  `, activeSchema);
  const indexes = await prisma.$queryRawUnsafe<Array<{ index_name: string; definition: string }>>(`
    SELECT indexname AS index_name, indexdef AS definition
    FROM pg_indexes
    WHERE schemaname = $1 AND tablename <> '_prisma_migrations'
    ORDER BY tablename, indexname
  `, activeSchema);

  console.log(JSON.stringify({ step: "baseline_clone_preflight", status: "pass", activeSchema, cloneSchema, tables: tables.length, foreignKeys: foreignKeys.length }));
  await prisma.$executeRawUnsafe(`CREATE SCHEMA ${quoted(cloneSchema)}`);
  try {
    const active = quoted(activeSchema);
    const clone = quoted(cloneSchema);
    for (const item of enums) {
      if (!SAFE_DB_NAME.test(item.enum_name)) throw new Error(`Enum non sûr : ${item.enum_name}`);
      const values = item.values.map((value) => `'${value.replaceAll("'", "''")}'`).join(", ");
      await prisma.$executeRawUnsafe(`CREATE TYPE ${clone}.${quoted(item.enum_name)} AS ENUM (${values})`);
    }
    for (const { table_name: tableName } of tables) {
      const table = quoted(tableName);
      await prisma.$executeRawUnsafe(`CREATE TABLE ${clone}.${table} (LIKE ${active}.${table} INCLUDING DEFAULTS INCLUDING GENERATED INCLUDING IDENTITY INCLUDING STORAGE INCLUDING COMMENTS INCLUDING CONSTRAINTS)`);
      await prisma.$executeRawUnsafe(`INSERT INTO ${clone}.${table} SELECT * FROM ${active}.${table}`);
    }

    for (const column of enumColumns) {
      const scalarName = column.data_type === "USER-DEFINED" ? column.udt_name : null;
      const arrayName = column.data_type === "ARRAY" && column.udt_name.startsWith("_") ? column.udt_name.slice(1) : null;
      const enumName = scalarName && enumNames.has(scalarName) ? scalarName : arrayName && enumNames.has(arrayName) ? arrayName : null;
      if (!enumName) continue;
      const table = `${clone}.${quoted(column.table_name)}`;
      const name = quoted(column.column_name);
      const targetType = `${clone}.${quoted(enumName)}${arrayName ? "[]" : ""}`;
      await prisma.$executeRawUnsafe(`ALTER TABLE ${table} ALTER COLUMN ${name} DROP DEFAULT`);
      await prisma.$executeRawUnsafe(`ALTER TABLE ${table} ALTER COLUMN ${name} TYPE ${targetType} USING ${name}::text::${targetType}`);
      if (column.column_default) {
        const localizedDefault = column.column_default
          .replaceAll(`::${active}.${quoted(enumName)}`, `::${clone}.${quoted(enumName)}`)
          .replaceAll(`::${quoted(enumName)}`, `::${clone}.${quoted(enumName)}`);
        await prisma.$executeRawUnsafe(`ALTER TABLE ${table} ALTER COLUMN ${name} SET DEFAULT ${localizedDefault}`);
      }
    }

    const primaryIndexNames = new Set(primaryKeys.map((key) => key.constraint_name));
    for (const primaryKey of primaryKeys) {
      if (!SAFE_DB_NAME.test(primaryKey.constraint_name)) throw new Error(`Clé primaire non sûre : ${primaryKey.constraint_name}`);
      await prisma.$executeRawUnsafe(`ALTER TABLE ${clone}.${quoted(primaryKey.table_name)} ADD CONSTRAINT ${quoted(primaryKey.constraint_name)} ${primaryKey.definition}`);
    }

    for (const index of indexes) {
      if (primaryIndexNames.has(index.index_name)) continue;
      if (!SAFE_DB_NAME.test(index.index_name)) throw new Error(`Index non sûr : ${index.index_name}`);
      const schemaPattern = new RegExp(`\\sON\\s+(ONLY\\s+)?(?:"${activeSchema}"|${activeSchema})\\.`, "i");
      const localizedDefinition = index.definition
        .replace(schemaPattern, ` ON $1${clone}.`)
        .replaceAll(`${active}.`, `${clone}.`)
        .replaceAll(`${activeSchema}.`, `${clone}.`)
        .replace(/::"([A-Za-z_][A-Za-z0-9_$]*)"/g, (_match, typeName: string) => enumNames.has(typeName) ? `::${clone}.${quoted(typeName)}` : _match);
      if (localizedDefinition === index.definition) throw new Error(`Impossible de localiser l’index ${index.index_name} dans le clone.`);
      await prisma.$executeRawUnsafe(localizedDefinition);
    }

    for (const foreignKey of foreignKeys) {
      if (!SAFE_DB_NAME.test(foreignKey.constraint_name)) throw new Error(`Contrainte non sûre : ${foreignKey.constraint_name}`);
      const qualifiedDefinition = foreignKey.definition.replace(/REFERENCES\s+"([^"]+)"/g, (_match, table: string) => `REFERENCES ${clone}.${quoted(table)}`);
      await prisma.$executeRawUnsafe(`ALTER TABLE ${clone}.${quoted(foreignKey.table_name)} ADD CONSTRAINT ${quoted(foreignKey.constraint_name)} ${qualifiedDefinition}`);
    }

    const sourceRows = await prisma.$queryRawUnsafe<Array<{ table_name: string; row_count: bigint }>>(`
      SELECT relname AS table_name, n_live_tup::bigint AS row_count
      FROM pg_stat_user_tables
      WHERE schemaname = $1
      ORDER BY relname
    `, activeSchema);
    const exactCounts: Array<{ table: string; source: number; clone: number }> = [];
    for (const { table_name: tableName } of tables) {
      const table = quoted(tableName);
      const [source] = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`SELECT COUNT(*)::bigint AS count FROM ${active}.${table}`);
      const [copy] = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`SELECT COUNT(*)::bigint AS count FROM ${clone}.${table}`);
      const sourceCount = Number(source?.count ?? 0);
      const cloneCount = Number(copy?.count ?? 0);
      if (sourceCount !== cloneCount) throw new Error(`Copie incomplète pour ${tableName}: ${sourceCount}/${cloneCount}.`);
      exactCounts.push({ table: tableName, source: sourceCount, clone: cloneCount });
    }
    console.log(JSON.stringify({ step: "baseline_clone_data", status: "pass", totalRows: exactCounts.reduce((sum, item) => sum + item.clone, 0), sampledStats: sourceRows.slice(0, 3).map((row) => ({ table: row.table_name, approximateRows: Number(row.row_count) })) }));

    const cloneUrl = new URL(databaseUrl);
    cloneUrl.searchParams.set("schema", cloneSchema);
    const history = historicalMigrations();
    for (const [index, migration] of history.entries()) {
      runPrisma(["migrate", "resolve", "--applied", migration], cloneUrl.toString());
      console.log(JSON.stringify({ step: "baseline_clone_history_item", status: "pass", migration, completed: index + 1, total: history.length }));
    }
    console.log(JSON.stringify({ step: "baseline_clone_history", status: "pass", resolvedMigrations: history.length }));

    runPrisma(["migrate", "deploy"], cloneUrl.toString());
    const secondDeploy = runPrisma(["migrate", "deploy"], cloneUrl.toString());
    if (!/No pending migrations to apply/i.test(secondDeploy)) throw new Error("Le second migrate deploy n’a pas prouvé l’idempotence attendue.");
    console.log(JSON.stringify({ step: "baseline_clone_deploy", status: "pass", secondDeploy: "no_pending_migrations" }));

    const audit = spawnSync(process.execPath, [process.env.npm_execpath ?? "", "run", "audit:migrations"].filter(Boolean), {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: cloneUrl.toString() },
      encoding: "utf8",
      windowsHide: true,
    });
    if (audit.status !== 0) {
      const detail = `${audit.stdout ?? ""}\n${audit.stderr ?? ""}`.trim().split(/\r?\n/).slice(-15).join(" | ");
      throw new Error(`Le fingerprint final du clone diverge : ${detail}`);
    }
    console.log(JSON.stringify({ step: "baseline_clone_fingerprint", status: "pass" }));
  } finally {
    if (!cloneSchema.startsWith("codex_baseline_clone_") || !SAFE_SCHEMA.test(cloneSchema)) throw new Error("Refus de supprimer un clone non conforme.");
    await prisma.$executeRawUnsafe(`DROP SCHEMA ${quoted(cloneSchema)} CASCADE`);
    console.log(JSON.stringify({ step: "baseline_clone_cleanup", status: "pass", cloneSchema }));
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ step: "baseline_clone_rehearsal", status: "fail", error: error instanceof Error ? error.message : "Erreur inconnue" }));
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());
