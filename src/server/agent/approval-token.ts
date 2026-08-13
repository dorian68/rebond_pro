import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { Persona } from "@/lib/ag-ui/persona";

const TOKEN_VERSION = 1;
const MAX_TTL_SECONDS = 10 * 60;

type ApprovalClaims = {
  v: number;
  approvalId: string;
  tool: string;
  argsHash: string;
  userId: string;
  persona: Persona;
  exp: number;
};

function secret() {
  const value = process.env.AG_UI_APPROVAL_SECRET ?? process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "";
  if (value.length < 16) throw new Error("AUTH_SECRET_REQUIRED_FOR_AG_UI_APPROVAL");
  return value;
}

function stable(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stable(record[key])}`).join(",")}}`;
}

export function approvalArgsHash(args: Record<string, unknown>) {
  return createHash("sha256").update(stable(args)).digest("hex");
}

function encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

export function signAgentApproval(input: Omit<ApprovalClaims, "v" | "argsHash" | "exp"> & { args: Record<string, unknown>; ttlSeconds?: number }) {
  const ttl = Math.min(Math.max(input.ttlSeconds ?? MAX_TTL_SECONDS, 30), MAX_TTL_SECONDS);
  const claims: ApprovalClaims = {
    v: TOKEN_VERSION,
    approvalId: input.approvalId,
    tool: input.tool,
    argsHash: approvalArgsHash(input.args),
    userId: input.userId,
    persona: input.persona,
    exp: Math.floor(Date.now() / 1000) + ttl,
  };
  const payload = encode(JSON.stringify(claims));
  const signature = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyAgentApproval(token: string, expected: Omit<ApprovalClaims, "v" | "argsHash" | "exp"> & { args: Record<string, unknown> }) {
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return false;
  const actual = Buffer.from(signature, "base64url");
  const wanted = createHmac("sha256", secret()).update(payload).digest();
  if (actual.length !== wanted.length || !timingSafeEqual(actual, wanted)) return false;
  let claims: ApprovalClaims;
  try {
    claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as ApprovalClaims;
  } catch {
    return false;
  }
  return claims.v === TOKEN_VERSION
    && claims.exp >= Math.floor(Date.now() / 1000)
    && claims.approvalId === expected.approvalId
    && claims.tool === expected.tool
    && claims.argsHash === approvalArgsHash(expected.args)
    && claims.userId === expected.userId
    && claims.persona === expected.persona;
}
