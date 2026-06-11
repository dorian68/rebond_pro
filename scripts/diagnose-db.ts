import "./_env";
import net from "node:net";
import { Prisma, PrismaClient } from "@prisma/client";

type Status = "pass" | "fail" | "warn";

function emit(step: string, status: Status, details: Record<string, unknown>) {
  console.log(JSON.stringify({ step, status, details }));
}

function getErrorCode(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) return error.code;
  if (error instanceof Prisma.PrismaClientInitializationError) return error.errorCode ?? "INITIALIZATION_ERROR";
  return "UNKNOWN";
}

async function tcpProbe(host: string, port: number) {
  const startedAt = Date.now();
  await new Promise<void>((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    const timeout = setTimeout(() => socket.destroy(new Error("TCP timeout")), 4_000);
    socket.once("connect", () => {
      clearTimeout(timeout);
      socket.destroy();
      resolve();
    });
    socket.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
  return Date.now() - startedAt;
}

async function main() {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) throw new Error("DATABASE_URL est absent.");

  const url = new URL(rawUrl);
  const host = url.hostname;
  const port = Number(url.port || 5432);
  const region = host.match(/(us|eu|ap|sa|ca|me|af)-(?:north|south|east|west|central)-\d/)?.[0] ?? "unknown";
  const poolMode = port === 6543 ? "transaction-pooler" : port === 5432 ? "session-or-direct" : "custom";

  emit("db_config", "pass", {
    host,
    port,
    region,
    poolMode,
    sslmode: url.searchParams.get("sslmode") ?? "default",
    pgbouncer: url.searchParams.get("pgbouncer") ?? "unset",
    connectionLimit: url.searchParams.get("connection_limit") ?? "unset",
  });

  try {
    const latencyMs = await tcpProbe(host, port);
    emit("db_tcp", "pass", { latencyMs });
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : "TCP_ERROR";
    emit("db_tcp", "fail", {
      code,
    });
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient({ log: ["error"] });
  const startedAt = Date.now();
  try {
    const timings: number[] = [];
    for (let attempt = 0; attempt < 3; attempt++) {
      const queryStartedAt = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      timings.push(Date.now() - queryStartedAt);
    }
    emit("db_prisma", "pass", {
      firstQueryMs: timings[0],
      warmQueryMs: timings.slice(1),
      totalMs: Date.now() - startedAt,
    });

    if (region !== "unknown" && !host.includes("localhost")) {
      emit("db_distance", "warn", {
        region,
        message: "Placez l'application dans la même région que la base pour éviter une latence par aller-retour.",
      });
    }
  } catch (error) {
    emit("db_prisma", "fail", {
      code: getErrorCode(error),
      latencyMs: Date.now() - startedAt,
      diagnosis: "Le port TCP est ouvert, mais Prisma ne parvient pas à établir ou utiliser la session PostgreSQL.",
    });
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  emit("db_diagnose", "fail", {
    code: getErrorCode(error),
    message: error instanceof Error ? error.message : String(error),
  });
  process.exitCode = 1;
});
