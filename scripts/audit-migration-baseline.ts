import "./_env";

import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

const SAFE_SCHEMA = /^[a-z][a-z0-9_]{0,62}$/;
const databaseUrl = process.env.DATABASE_URL ?? "";
if (!databaseUrl) throw new Error("DATABASE_URL manquante.");

const parsedUrl = new URL(databaseUrl);
const activeSchema = parsedUrl.searchParams.get("schema") || "public";
if (!SAFE_SCHEMA.test(activeSchema)) throw new Error("Le schéma actif n’est pas un identifiant PostgreSQL sûr.");

const auditSchema = `codex_migration_audit_${randomBytes(6).toString("hex")}`;
if (!SAFE_SCHEMA.test(auditSchema)) throw new Error("Le schéma temporaire généré est invalide.");

const prisma = new PrismaClient();

type Fingerprint = {
  columns: unknown[];
  constraints: unknown[];
  indexes: unknown[];
  rls: unknown[];
  enums: unknown[];
};

function normalizeRows(rows: Array<Record<string, unknown>>, schema: string) {
  return rows.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [
    key,
    typeof value === "string" ? value.replaceAll(`\"${schema}\".`, "").replaceAll(`${schema}.`, "") : value,
  ]))).sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}

async function fingerprint(schema: string): Promise<Fingerprint> {
  const columns = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(`
    SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = $1 AND table_name <> '_prisma_migrations'
    ORDER BY table_name, column_name
  `, schema);
  const constraints = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(`
    SELECT cls.relname AS table_name, con.conname AS constraint_name, con.contype AS constraint_type, pg_get_constraintdef(con.oid, true) AS definition
    FROM pg_constraint con
    JOIN pg_class cls ON cls.oid = con.conrelid
    JOIN pg_namespace ns ON ns.oid = cls.relnamespace
    WHERE ns.nspname = $1
    ORDER BY cls.relname, con.conname
  `, schema);
  const indexes = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(`
    SELECT tablename AS table_name, indexname AS index_name, indexdef AS definition
    FROM pg_indexes
    WHERE schemaname = $1 AND tablename <> '_prisma_migrations'
    ORDER BY tablename, indexname
  `, schema);
  const rls = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(`
    SELECT cls.relname AS table_name, cls.relrowsecurity AS enabled, cls.relforcerowsecurity AS forced
    FROM pg_class cls
    JOIN pg_namespace ns ON ns.oid = cls.relnamespace
    WHERE ns.nspname = $1 AND cls.relkind = 'r' AND cls.relname <> '_prisma_migrations'
    ORDER BY cls.relname
  `, schema);
  const enums = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(`
    SELECT typ.typname AS enum_name, enum.enumlabel AS value
    FROM pg_type typ
    JOIN pg_enum enum ON enum.enumtypid = typ.oid
    JOIN pg_namespace ns ON ns.oid = typ.typnamespace
    WHERE ns.nspname = $1
    ORDER BY typ.typname, enum.enumsortorder
  `, schema);
  return {
    columns: normalizeRows(columns, schema),
    constraints: normalizeRows(constraints, schema),
    indexes: normalizeRows(indexes, schema),
    rls: normalizeRows(rls, schema),
    enums: normalizeRows(enums, schema),
  };
}

function sectionDiff(expected: unknown[], actual: unknown[]) {
  const expectedValues = new Set(expected.map((value) => JSON.stringify(value)));
  const actualValues = new Set(actual.map((value) => JSON.stringify(value)));
  return {
    missing: [...expectedValues].filter((value) => !actualValues.has(value)).slice(0, 20).map((value) => JSON.parse(value)),
    unexpected: [...actualValues].filter((value) => !expectedValues.has(value)).slice(0, 20).map((value) => JSON.parse(value)),
    expectedCount: expected.length,
    actualCount: actual.length,
  };
}

async function migrationCount(schema: string) {
  const exists = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = $1 AND table_name = '_prisma_migrations'
    ) AS exists
  `, schema);
  if (!exists[0]?.exists) return 0;
  const rows = await prisma.$queryRawUnsafe<Array<{ count: number }>>(`SELECT COUNT(*)::int AS count FROM "${schema}"."_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`);
  return rows[0]?.count ?? 0;
}

async function main() {
  console.log(JSON.stringify({ step: "migration_baseline_preflight", status: "pass", activeSchema, auditSchema }));
  await prisma.$executeRawUnsafe(`CREATE SCHEMA "${auditSchema}"`);
  try {
    const auditUrl = new URL(databaseUrl);
    auditUrl.searchParams.set("schema", auditSchema);
    const executable = process.platform === "win32" ? (process.env.ComSpec || "cmd.exe") : "npx";
    const args = process.platform === "win32" ? ["/d", "/s", "/c", "npx prisma migrate deploy"] : ["prisma", "migrate", "deploy"];
    const deployed = spawnSync(executable, args, {
      cwd: process.cwd(),
      // Le schéma est aléatoire et dédié à cet audit : désactiver le verrou
      // global évite qu'un autre audit/serveur Prisma local bloque ce contrôle,
      // sans autoriser cette option pour un déploiement réel.
      env: { ...process.env, DATABASE_URL: auditUrl.toString(), PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK: "1" },
      encoding: "utf8",
      windowsHide: true,
    });
    if (deployed.status !== 0) {
      const message = `${deployed.error?.message ?? ""}\n${deployed.stdout ?? ""}\n${deployed.stderr ?? ""}`.trim().split(/\r?\n/).slice(-12).join(" | ");
      throw new Error(`La chaîne de migrations ne se déploie pas sur un schéma vide : ${message}`);
    }
    // L’audit doit aussi fonctionner sur les petits plans PostgreSQL : garder une
    // seule requête active évite de saturer le pool pendant qu’un serveur local
    // Next/Prisma utilise déjà la base.
    const expected = await fingerprint(auditSchema);
    const actual = await fingerprint(activeSchema);
    const expectedMigrations = await migrationCount(auditSchema);
    const actualMigrations = await migrationCount(activeSchema);
    console.log(JSON.stringify({ step: "migration_chain_clean_deploy", status: "pass", migrations: expectedMigrations }));

    const diff = Object.fromEntries((Object.keys(expected) as Array<keyof Fingerprint>).map((key) => [key, sectionDiff(expected[key], actual[key])]));
    const matches = Object.values(diff).every((section) => section.missing.length === 0 && section.unexpected.length === 0);
    console.log(JSON.stringify({
      step: "migration_schema_comparison",
      status: matches ? "pass" : "fail",
      expectedMigrations,
      recordedActiveMigrations: actualMigrations,
      matches,
      diff,
    }));
    if (!matches || actualMigrations !== expectedMigrations) process.exitCode = 2;
  } finally {
    if (!SAFE_SCHEMA.test(auditSchema) || !auditSchema.startsWith("codex_migration_audit_")) throw new Error("Refus de supprimer un schéma temporaire non conforme.");
    await prisma.$executeRawUnsafe(`DROP SCHEMA "${auditSchema}" CASCADE`);
    console.log(JSON.stringify({ step: "migration_audit_cleanup", status: "pass", auditSchema }));
  }
}

main()
  .catch((error) => {
    console.error(JSON.stringify({ step: "migration_baseline_audit", status: "fail", error: error instanceof Error ? error.message : "Erreur inconnue" }));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
