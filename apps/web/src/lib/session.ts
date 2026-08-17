import "server-only";

import { cookies } from "next/headers";

import type { AuthSession } from "@/features/auth/dtos/auth.dto";

/**
 * The session token never reaches browser JavaScript. It lives in an httpOnly
 * cookie that only this server can read, and the server forwards it to the api
 * as a bearer token. That is what makes an XSS unable to steal the session.
 */
const SESSION_COOKIE = "verori.session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3001";

/**
 * Better Auth validates the Origin header against its trusted origins whenever
 * a request carries fetch metadata, which server side fetch does. This app is
 * that origin, so it says so.
 */
export const WEB_ORIGIN = process.env.WEB_ORIGIN ?? "http://localhost:3000";

export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

export async function setSessionToken(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionToken(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Returns the signed-in user, or null when there is no valid session. */
export async function getSession(): Promise<AuthSession | null> {
  const token = await getSessionToken();
  if (!token) return null;

  const response = await fetch(`${API_BASE_URL}/api/auth/get-session`, {
    headers: { authorization: `Bearer ${token}`, origin: WEB_ORIGIN },
    cache: "no-store",
  });

  if (!response.ok) return null;

  const body = (await response.json()) as AuthSession | Record<string, never>;
  return "user" in body && body.user ? (body as AuthSession) : null;
}
