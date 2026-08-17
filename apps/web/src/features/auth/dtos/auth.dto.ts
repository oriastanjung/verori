/**
 * Better Auth ships an OpenAPI document without request or response schemas,
 * so these shapes are written by hand from the real responses instead of being
 * generated. Keep them in step with the api if you add plugins.
 */

export const ROLE_ADMIN = "admin";
export const ROLE_USER = "user";

export type Role = typeof ROLE_ADMIN | typeof ROLE_USER;

export type AuthUser = {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: boolean;
  image: string | null;
  role: Role | null;
  banned: boolean;
  banReason: string | null;
  banExpires: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AuthSessionInfo = {
  id: string;
  expiresAt: string;
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

export type AuthSession = {
  user: AuthUser;
  session: AuthSessionInfo;
};

export type SignInResult = {
  token: string;
  user: AuthUser;
};

export type ActionState = {
  ok: boolean;
  message: string;
};

export const INITIAL_ACTION_STATE: ActionState = {
  ok: false,
  message: "",
};

export function isAdmin(user: Pick<AuthUser, "role"> | null): boolean {
  return user?.role === ROLE_ADMIN;
}

/** Where a user lands after signing in. */
export function homePathFor(user: Pick<AuthUser, "role"> | null): string {
  return isAdmin(user) ? "/admin" : "/dashboard";
}
