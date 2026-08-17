import "server-only";

import type {
  ListUsersResponse,
  UserListQuery,
  UserPage,
} from "@/features/users/dtos/user.dto";
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

const DEFAULT_PER_PAGE = 10;

/** The admin plugin pages with limit and offset, so this converts. */
export async function listUsers(query: UserListQuery): Promise<UserPage> {
  const perPage = query.per_page ?? DEFAULT_PER_PAGE;
  const page = query.page ?? 1;

  const params = new URLSearchParams({
    limit: String(perPage),
    offset: String((page - 1) * perPage),
  });

  if (query.search) {
    params.set("searchValue", query.search);
    params.set("searchField", "email");
  }
  if (query.sort_by) {
    params.set("sortBy", query.sort_by);
    params.set("sortDirection", query.sort_dir === "asc" ? "asc" : "desc");
  }

  const result = await call<ListUsersResponse>(
    `/api/auth/admin/list-users?${params.toString()}`,
    { method: "GET" },
  );

  const items = result.users ?? [];
  const total = result.total ?? items.length;

  return {
    items,
    total,
    page,
    per_page: perPage,
    total_pages: Math.max(1, Math.ceil(total / perPage)),
  };
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
