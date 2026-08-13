import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { roadmap2DriveRequestHash } from "@/server/roadmap2-drive-operation-runner";

const tokenPayloadSchema = z.object({
  workspaceId: z.string().min(1).max(100),
  nodeId: z.string().min(1).max(100),
  expectedVersion: z.number().int().positive(),
  inputHash: z.string().regex(/^[a-f0-9]{64}$/),
  expectedPath: z.string().min(1).max(1500),
  allowLinkedFolder: z.boolean(),
  expiresAt: z.number().int().positive(),
});

export type Roadmap2StructuralPreflightPayload = z.infer<typeof tokenPayloadSchema>;

function secret() {
  const value = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "";
  if (value.length < 16) throw new Error("AUTH_SECRET_REQUIRED_FOR_ROADMAP2_PREFLIGHT");
  return value;
}

function signature(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function roadmap2StructuralInputHash(input: unknown) {
  return roadmap2DriveRequestHash(input);
}

export function issueRoadmap2StructuralPreflightToken(payload: Omit<Roadmap2StructuralPreflightPayload, "expiresAt">, now = Date.now()) {
  const encoded = Buffer.from(JSON.stringify({ ...payload, expiresAt: now + 10 * 60_000 })).toString("base64url");
  return `${encoded}.${signature(encoded)}`;
}

export function verifyRoadmap2StructuralPreflightToken(value: unknown, now = Date.now()) {
  if (typeof value !== "string" || value.length > 6000) return null;
  const [encoded, provided] = value.split(".");
  if (!encoded || !provided) return null;
  const expected = signature(encoded);
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const parsed = tokenPayloadSchema.parse(JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")));
    return parsed.expiresAt >= now ? parsed : null;
  } catch {
    return null;
  }
}
