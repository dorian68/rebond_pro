import { NextResponse } from "next/server";
import { getPlatformAdmin } from "@/lib/platform";
import { uploadRoadmap2NodeDriveFile } from "@/server/roadmap2-drive-actions";

export const runtime = "nodejs";
const MAX_MULTIPART_BYTES = 10 * 1024 * 1024 + 64 * 1024;
const PRIVATE_HEADERS = { "Cache-Control": "private, no-store" } as const;

const STATUS_BY_CODE = {
  AUTH_REQUIRED: 401,
  CONFLICT: 409,
  NOT_FOUND: 404,
  VALIDATION: 400,
  UNAVAILABLE: 503,
} as const;

export async function POST(request: Request) {
  const admin = await getPlatformAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false, code: "AUTH_REQUIRED", error: "Accès administrateur requis." }, { status: 401, headers: PRIVATE_HEADERS });
  }
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_MULTIPART_BYTES) {
    return NextResponse.json({ ok: false, code: "VALIDATION", error: "Fichier trop volumineux (10 Mo maximum)." }, { status: 413, headers: PRIVATE_HEADERS });
  }
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, code: "VALIDATION", error: "Fichier ou requête invalide." }, { status: 400, headers: PRIVATE_HEADERS });
  }

  const workspaceKey = formData.get("workspaceKey");
  const nodeId = formData.get("nodeId");
  if (typeof workspaceKey !== "string" || typeof nodeId !== "string") {
    return NextResponse.json({ ok: false, code: "VALIDATION", error: "Roadmap ou nœud invalide." }, { status: 400, headers: PRIVATE_HEADERS });
  }

  const result = await uploadRoadmap2NodeDriveFile(workspaceKey, nodeId, formData);
  return NextResponse.json(result, {
    status: result.ok ? 201 : STATUS_BY_CODE[result.code],
    headers: PRIVATE_HEADERS,
  });
}
