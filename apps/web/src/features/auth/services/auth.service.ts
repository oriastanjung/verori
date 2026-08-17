import "server-only";

import { API_BASE_URL, WEB_ORIGIN, getSessionToken } from "@/lib/session";
import type { AuthUser, SignInResult } from "@/features/auth/dtos/auth.dto";

/** Every auth call goes through here. Nothing else talks to /api/auth. */
async function call<T>(
  path: string,
  init: { method: "GET" | "POST"; body?: unknown; auth?: boolean },
): Promise<T> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    origin: WEB_ORIGIN,
  };

  if (init.auth !== false) {
    const token = await getSessionToken();
    if (token) headers.authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: init.method,
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });

  const text = await response.text();
  const payload = text.length > 0 ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(readErrorMessage(payload, response.status));
  }

  return payload as T;
}

function readErrorMessage(payload: unknown, status: number): string {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    for (const key of ["message", "error", "code"]) {
      const value = record[key];
      if (typeof value === "string" && value.length > 0) return value;
    }
  }
  return `Request failed with status ${status}`;
}

export function signIn(email: string, password: string): Promise<SignInResult> {
  return call<SignInResult>("/api/auth/sign-in/email", {
    method: "POST",
    body: { email, password },
    auth: false,
  });
}

export function signUp(
  name: string,
  email: string,
  password: string,
): Promise<SignInResult> {
  return call<SignInResult>("/api/auth/sign-up/email", {
    method: "POST",
    body: { name, email, password },
    auth: false,
  });
}

export function signOut(): Promise<unknown> {
  return call("/api/auth/sign-out", { method: "POST", body: {} });
}

export function requestPasswordReset(email: string): Promise<unknown> {
  return call("/api/auth/request-password-reset", {
    method: "POST",
    body: { email },
    auth: false,
  });
}

export function resetPassword(token: string, newPassword: string): Promise<unknown> {
  return call("/api/auth/reset-password", {
    method: "POST",
    body: { token, newPassword },
    auth: false,
  });
}

export function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<unknown> {
  return call("/api/auth/change-password", {
    method: "POST",
    body: { currentPassword, newPassword },
  });
}

export function updateProfile(name: string): Promise<AuthUser> {
  return call<AuthUser>("/api/auth/update-user", {
    method: "POST",
    body: { name },
  });
}
