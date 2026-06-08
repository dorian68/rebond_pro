import { NextResponse } from "next/server";

/** Réponse API homogène : succès. */
export function apiOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

/** Réponse API homogène : erreur. */
export function apiError(message: string, status = 400, code?: string) {
  return NextResponse.json({ ok: false, error: { message, code: code ?? null } }, { status });
}
