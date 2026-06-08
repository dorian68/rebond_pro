import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Endpoint de santé public (liveness + readiness DB).
 * Ne révèle aucune donnée sensible. Code 200 si la base répond, 503 sinon.
 */
export async function GET() {
  const startedAt = Date.now();
  let dbOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch (e) {
    logger.error("health.db_unreachable", { error: e instanceof Error ? e.message : String(e) });
  }
  const body = {
    ok: dbOk,
    service: "rebondpro",
    db: dbOk ? "up" : "down",
    env: process.env.NODE_ENV ?? "unknown",
    latencyMs: Date.now() - startedAt,
    timestamp: new Date().toISOString(),
  };
  return NextResponse.json(body, { status: dbOk ? 200 : 503 });
}
