"use server";

import { revalidatePath } from "next/cache";

import {
  createExample,
  deleteExample,
  publishExampleToQueue,
} from "@/features/examples/services/example.service";
import type { ActionState } from "@/features/examples/dtos/example.dto";

const CORE_APP_PATH = "/dashboard";

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}

export async function createExampleAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();

  if (title.length === 0) {
    return { ok: false, message: "Title is required" };
  }

  try {
    await createExample({ title, content: content.length > 0 ? content : null });
    revalidatePath(CORE_APP_PATH);
    return { ok: true, message: `Created "${title}"` };
  } catch (error) {
    return { ok: false, message: toMessage(error) };
  }
}

export async function deleteExampleAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = Number(formData.get("id"));

  try {
    await deleteExample(id);
    revalidatePath(CORE_APP_PATH);
    return { ok: true, message: `Deleted example ${id}` };
  } catch (error) {
    return { ok: false, message: toMessage(error) };
  }
}

export async function publishExampleAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = Number(formData.get("id"));

  try {
    const jobId = await publishExampleToQueue(id);
    revalidatePath(CORE_APP_PATH);
    return { ok: true, message: `Queued job ${jobId}` };
  } catch (error) {
    return { ok: false, message: toMessage(error) };
  }
}
