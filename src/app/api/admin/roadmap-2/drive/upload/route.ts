import { NextResponse } from "next/server";
import { uploadRoadmap2NodeDriveFile } from "@/server/roadmap2-drive-actions";

export const runtime = "nodejs";
const MAX_MULTIPART_BYTES = 10 * 1024 * 1024 + 64 * 1024;

const STATUS_BY_CODE = {
  AUTH_REQUIRED: 401,
  CONFLICT: 409,
  NOT_FOUND: 404,
  VALIDATION: 400,
  UNAVAILABLE: 503,
} as const;

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_MULTIPART_BYTES) {
    return NextResponse.json({ ok: false, code: "VALIDATION", error: "Fichier trop volumineux (10 Mo maximum)." }, { status: 413, headers: { "Cache-Control": "private, no-store" } });
  }
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, code: "VALIDATION", error: "Fichier ou requête invalide." }, { status: 400 });
  }

  const workspaceKey = formData.get("workspaceKey");
  const nodeId = formData.get("nodeId");
  if (typeof workspaceKey !== "string" || typeof nodeId !== "string") {
    return NextResponse.json({ ok: false, code: "VALIDATION", error: "Roadmap ou nœud invalide." }, { status: 400 });
  }

  const result = await uploadRoadmap2NodeDriveFile(workspaceKey, nodeId, formData);
  return NextResponse.json(result, {
    status: result.ok ? 201 : STATUS_BY_CODE[result.code],
    headers: { "Cache-Control": "private, no-store" },
  });
}
