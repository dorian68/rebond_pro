import "./env";
import { PrismaClient, Prisma } from "@prisma/client";

// Codes/erreurs de connexion transitoires (réseau, pooler, VPN qui hoquette).
const TRANSIENT_CODES = new Set(["P1001", "P1002", "P1008", "P1017"]);
const TRANSIENT_PATTERNS = [
  "can't reach database server",
  "connection reset",
  "connection closed",
  "econnreset",
  "etimedout",
  "timed out",
  "server has closed the connection",
];

function isTransient(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientInitializationError) return true;
  if (err instanceof Prisma.PrismaClientKnownRequestError && TRANSIENT_CODES.has(err.code)) return true;
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return TRANSIENT_PATTERNS.some((p) => msg.includes(p));
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Réessaie automatiquement les requêtes en cas de coupure réseau transitoire.
 * 3 tentatives, backoff 150ms → 450ms → 900ms. Les erreurs métier ne sont jamais retentées.
 */
function withRetry(base: PrismaClient) {
  return base.$extends({
    query: {
      async $allOperations({ args, query }) {
        let lastErr: unknown;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            return await query(args);
          } catch (err) {
            lastErr = err;
            if (!isTransient(err)) throw err;
            if (attempt < 2) await sleep(150 * Math.pow(3, attempt));
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
