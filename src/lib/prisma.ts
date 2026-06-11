import "./env";
import { PrismaClient, Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";

// Seules les lectures peuvent être rejouées sans risque de dupliquer un effet métier.
const READ_OPERATIONS = new Set([
  "findFirst",
  "findFirstOrThrow",
  "findUnique",
  "findUniqueOrThrow",
  "findMany",
  "aggregate",
  "count",
  "groupBy",
  "$queryRaw",
  "$queryRawUnsafe",
  "findRaw",
  "aggregateRaw",
]);

// P1001/P1002 signalent une indisponibilité durable : les rejouer dans la même
// requête HTTP multiplie surtout le temps d'attente. P1008/P1017 peuvent en
// revanche correspondre à une connexion déjà ouverte qui vient de tomber.
const RETRYABLE_READ_CODES = new Set(["P1008", "P1017"]);
const RETRYABLE_READ_PATTERNS = [
  "connection reset",
  "connection closed",
  "econnreset",
  "server has closed the connection",
];

function errorCode(err: unknown): string | undefined {
  if (err instanceof Prisma.PrismaClientKnownRequestError) return err.code;
  if (err instanceof Prisma.PrismaClientInitializationError) return err.errorCode;
  return undefined;
}

function isRetryableReadError(err: unknown): boolean {
  const code = errorCode(err);
  if (code && RETRYABLE_READ_CODES.has(code)) return true;
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return RETRYABLE_READ_PATTERNS.some((p) => msg.includes(p));
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Réessaie une seule fois les lectures après une coupure de connexion avérée.
 * Les écritures ne sont jamais rejouées : leur commit peut avoir réussi même si
 * la réponse réseau a été perdue.
 */
function withRetry(base: PrismaClient) {
  return base.$extends({
    query: {
      async $allOperations({ model, operation, args, query }) {
        const maxAttempts = READ_OPERATIONS.has(operation) ? 2 : 1;
        let lastErr: unknown;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          try {
            return await query(args);
          } catch (err) {
            lastErr = err;
            const canRetry = attempt + 1 < maxAttempts && isRetryableReadError(err);
            if (!canRetry) throw err;

            const delayMs = 150;
            logger.warn("db.read_retry", {
              model: model ?? "raw",
              operation,
              attempt: attempt + 2,
              delayMs,
              code: errorCode(err) ?? "unknown",
            });
            await sleep(delayMs);
          }
        }
        throw lastErr;
      },
    },
  });
}

// Singleton Prisma — évite d'épuiser les connexions en dev (HMR).
// Le retron est appliqué au runtime ; on conserve le type `PrismaClient`
// standard pour rester compatible avec tout le code (transactions incluses).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  (withRetry(
    new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    }),
  ) as unknown as PrismaClient);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
