"use server";

import { revalidatePath } from "next/cache";

import type { ActionState } from "@/features/users/dtos/user.dto";
import * as userService from "@/features/users/services/user.service";

const USERS_PATH = "/admin/users";

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}

function readText(formData: FormData, field: string): string {
  return String(formData.get(field) ?? "").trim();
}

export async function setUserRoleAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = readText(formData, "userId");
  const role = readText(formData, "role");

  if (userId.length === 0 || role.length === 0) {
    return { ok: false, message: "User and role are required" };
  }

  try {
    await userService.setUserRole(userId, role);
    revalidatePath(USERS_PATH);
    return { ok: true, message: `Role set to ${role}` };
  } catch (error) {
    return { ok: false, message: toMessage(error) };
  }
}

export async function toggleBanAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = readText(formData, "userId");
  const banned = readText(formData, "banned") === "true";

  try {
    if (banned) {
      await userService.unbanUser(userId);
    } else {
      await userService.banUser(userId, "Banned from the admin panel");
    }
    revalidatePath(USERS_PATH);
    return { ok: true, message: banned ? "User unbanned" : "User banned" };
  } catch (error) {
    return { ok: false, message: toMessage(error) };
  }
}

export async function removeUserAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = readText(formData, "userId");

  try {
    await userService.removeUser(userId);
    revalidatePath(USERS_PATH);
    return { ok: true, message: "User removed" };
  } catch (error) {
    return { ok: false, message: toMessage(error) };
  }
}

export async function createUserAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = readText(formData, "name");
  const email = readText(formData, "email");
  const password = readText(formData, "password");
  const role = readText(formData, "role") || "user";

  if (name.length === 0 || email.length === 0 || password.length === 0) {
    return { ok: false, message: "Name, email and password are required" };
  }

  try {
    await userService.createUser(name, email, password, role);
    revalidatePath(USERS_PATH);
    return { ok: true, message: `Created ${email}` };
  } catch (error) {
    return { ok: false, message: toMessage(error) };
  }
}
