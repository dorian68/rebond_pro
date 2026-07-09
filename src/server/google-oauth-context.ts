import "server-only";
import { cookies } from "next/headers";
import {
  decodeGoogleOAuthContext,
  encodeGoogleOAuthContext,
  GOOGLE_OAUTH_CONTEXT_COOKIE,
  GOOGLE_OAUTH_CONTEXT_TTL_SECONDS,
  type GoogleOAuthContext,
} from "@/server/google-oauth-core";

export async function setGoogleOAuthContext(context: GoogleOAuthContext) {
  const cookieStore = await cookies();
  cookieStore.set(GOOGLE_OAUTH_CONTEXT_COOKIE, encodeGoogleOAuthContext(context), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: GOOGLE_OAUTH_CONTEXT_TTL_SECONDS,
    path: "/",
  });
}

export async function readGoogleOAuthContext() {
  const cookieStore = await cookies();
  return decodeGoogleOAuthContext(cookieStore.get(GOOGLE_OAUTH_CONTEXT_COOKIE)?.value);
}

export async function clearGoogleOAuthContext() {
  const cookieStore = await cookies();
  cookieStore.set(GOOGLE_OAUTH_CONTEXT_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });
}
