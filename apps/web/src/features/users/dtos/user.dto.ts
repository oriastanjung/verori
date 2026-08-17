import type { AuthUser, Role } from "@/features/auth/dtos/auth.dto";

export type ManagedUser = AuthUser;

export type ListUsersResult = {
  users: ManagedUser[];
  total?: number;
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
