"use server";

import { redirect } from "next/navigation";

import {
  homePathFor,
  type ActionState,
  type AuthUser,
} from "@/features/auth/dtos/auth.dto";
import * as authService from "@/features/auth/services/auth.service";
import { clearSessionToken, setSessionToken } from "@/lib/session";

const SIGN_IN_PATH = "/auth/sign-in";

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}

function readText(formData: FormData, field: string): string {
  return String(formData.get(field) ?? "").trim();
}

export async function signInAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = readText(formData, "email");
  const password = readText(formData, "password");

  if (email.length === 0 || password.length === 0) {
    return { ok: false, message: "Email and password are required" };
  }

  let user: AuthUser;

  try {
    const result = await authService.signIn(email, password);
    await setSessionToken(result.token);
    user = result.user;
  } catch (error) {
    return { ok: false, message: toMessage(error) };
  }

  // redirect throws, so it must sit outside the try block.
  redirect(homePathFor(user));
}

export async function signUpAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = readText(formData, "name");
  const email = readText(formData, "email");
  const password = readText(formData, "password");

  if (name.length === 0 || email.length === 0 || password.length === 0) {
    return { ok: false, message: "Name, email and password are required" };
  }

  let user: AuthUser;

  try {
    const result = await authService.signUp(name, email, password);
    await setSessionToken(result.token);
    user = result.user;
  } catch (error) {
    return { ok: false, message: toMessage(error) };
  }

  redirect(homePathFor(user));
}

export async function signOutAction(): Promise<void> {
  try {
    await authService.signOut();
  } catch {
    // The local cookie is cleared either way, so a failed call must not trap
    // the user in a signed-in shell.
  }

  await clearSessionToken();
  redirect(SIGN_IN_PATH);
}

export async function requestPasswordResetAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = readText(formData, "email");

  if (email.length === 0) {
    return { ok: false, message: "Email is required" };
  }

  try {
    await authService.requestPasswordReset(email);
    // Always the same answer, so this cannot be used to discover which
    // addresses have an account.
    return {
      ok: true,
      message: "If that email has an account, a reset link is on its way.",
    };
  } catch {
    return {
      ok: true,
      message: "If that email has an account, a reset link is on its way.",
    };
  }
}

export async function resetPasswordAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const token = readText(formData, "token");
  const password = readText(formData, "password");
  const confirmation = readText(formData, "confirmPassword");

  if (token.length === 0) {
    return { ok: false, message: "This reset link is missing its token" };
  }
  if (password !== confirmation) {
    return { ok: false, message: "The two passwords do not match" };
  }

  try {
    await authService.resetPassword(token, password);
    return { ok: true, message: "Password updated. You can sign in now." };
  } catch (error) {
    return { ok: false, message: toMessage(error) };
  }
}

export async function changePasswordAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const currentPassword = readText(formData, "currentPassword");
  const newPassword = readText(formData, "newPassword");

  if (currentPassword.length === 0 || newPassword.length === 0) {
    return { ok: false, message: "Both passwords are required" };
  }

  try {
    await authService.changePassword(currentPassword, newPassword);
    return { ok: true, message: "Password changed" };
  } catch (error) {
    return { ok: false, message: toMessage(error) };
  }
}

export async function updateProfileAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = readText(formData, "name");

  if (name.length === 0) {
    return { ok: false, message: "Name is required" };
  }

  try {
    await authService.updateProfile(name);
    return { ok: true, message: "Profile updated" };
  } catch (error) {
    return { ok: false, message: toMessage(error) };
  }
}
