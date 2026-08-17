import type { AuthUser, Role } from "@/features/auth/dtos/auth.dto";

export type ManagedUser = AuthUser;

/** What the admin plugin returns from list-users. */
export type ListUsersResponse = {
  users: ManagedUser[];
  total: number;
  limit?: number;
};

/** The shape AppCrud expects. */
export type UserPage = {
  items: ManagedUser[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
};

export type UserListQuery = {
  page?: number;
  per_page?: number;
  search?: string;
  sort_by?: string;
  sort_dir?: string;
};

export type ActionState = {
  ok: boolean;
  message: string;
};

export const INITIAL_ACTION_STATE: ActionState = {
  ok: false,
  message: "",
};

export const ASSIGNABLE_ROLES: Role[] = ["user", "admin"];
