import "server-only";

import type { ListUsersResult, ManagedUser } from "@/features/users/dtos/user.dto";
import { API_BASE_URL, WEB_ORIGIN, getSessionToken } from "@/lib/session";

/**
 * The admin endpoints come from the Better Auth admin plugin. Its OpenAPI
 * document has no schemas, so these calls are typed by hand.
 */
async function call<T>(
  path: string,
  init: { method: "GET" | "POST"; body?: unknown },
): Promise<T> {
  const token = await getSessionToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: init.method,
    headers: {
      "content-type": "application/json",
      origin: WEB_ORIGIN,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });

  const text = await response.text();
  const payload = text.length > 0 ? JSON.parse(text) : {};

  if (!response.ok) {
    const record = payload as Record<string, unknown>;
    const message =
      typeof record.message === "string" ? record.message : `Request failed (${response.status})`;
    throw new Error(message);
  }

  return payload as T;
}

export async function listUsers(): Promise<ManagedUser[]> {
  const result = await call<ListUsersResult>("/api/auth/admin/list-users?limit=100", {
    method: "GET",
  });
  return result.users ?? [];
}

export function setUserRole(userId: string, role: string): Promise<unknown> {
  return call("/api/auth/admin/set-role", {
    method: "POST",
    body: { userId, role },
  });
}

export function banUser(userId: string, banReason: string): Promise<unknown> {
  return call("/api/auth/admin/ban-user", {
    method: "POST",
    body: { userId, banReason },
  });
}

export function unbanUser(userId: string): Promise<unknown> {
  return call("/api/auth/admin/unban-user", {
    method: "POST",
    body: { userId },
  });
}

export function removeUser(userId: string): Promise<unknown> {
  return call("/api/auth/admin/remove-user", {
    method: "POST",
    body: { userId },
  });
}

export function createUser(
  name: string,
  email: string,
  password: string,
  role: string,
): Promise<unknown> {
  return call("/api/auth/admin/create-user", {
    method: "POST",
    body: { name, email, password, role },
  });
}
