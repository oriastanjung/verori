"use server";

import { submitContact } from "@/features/landing-page/services/contact.service";
import type { ActionState } from "@/features/landing-page/dtos/contact.dto";

export async function submitContactAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (email.length === 0 || message.length === 0) {
    return { ok: false, message: "Email and message are required" };
  }

  try {
    await submitContact({ email, message });
    return { ok: true, message: "Thanks, we will reply soon." };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Something went wrong";
    return { ok: false, message: reason };
  }
}
