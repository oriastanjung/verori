"use server";

import { revalidatePath } from "next/cache";

import type { ActionState } from "@/features/examples/dtos/example.dto";
import * as exampleService from "@/features/examples/services/example.service";

/** Both shells render this feature, so refresh both. */
const AFFECTED_PATHS = ["/dashboard/examples", "/admin/examples"];

function refresh(): void {
  for (const path of AFFECTED_PATHS) {
    revalidatePath(path);
  }
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}

function readText(formData: FormData, field: string): string {
  return String(formData.get(field) ?? "").trim();
}

function readIds(formData: FormData): string[] {
  return formData
    .getAll("ids")
    .map((value) => String(value).trim())
    .filter((value) => value.length > 0);
}

export async function createExampleAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const title = readText(formData, "title");
  const content = readText(formData, "content");

  if (title.length === 0) {
    return { ok: false, message: "Title is required" };
  }

  try {
    await exampleService.createExample({
      title,
      content: content.length > 0 ? content : null,
    });
    refresh();
    return { ok: true, message: `Created "${title}"` };
  } catch (error) {
    return { ok: false, message: toMessage(error) };
  }
}

export async function updateExampleAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  const title = readText(formData, "title");
  const content = readText(formData, "content");
  const published = formData.get("published") === "on";

  if (!Number.isInteger(id)) {
    return { ok: false, message: "Missing example id" };
  }

  try {
    await exampleService.updateExample(id, {
      title: title.length > 0 ? title : null,
      content: content.length > 0 ? content : null,
      published,
    });
    refresh();
    return { ok: true, message: "Saved" };
  } catch (error) {
    return { ok: false, message: toMessage(error) };
  }
}

export async function deleteExampleAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");

  try {
    await exampleService.deleteExample(id);
    refresh();
    return { ok: true, message: `Deleted example ${id}` };
  } catch (error) {
    return { ok: false, message: toMessage(error) };
  }
}

export async function publishExampleAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");

  try {
    const jobId = await exampleService.publishExampleToQueue(id);
    refresh();
    return { ok: true, message: `Queued job ${jobId}` };
  } catch (error) {
    return { ok: false, message: toMessage(error) };
  }
}

export async function bulkPublishExamplesAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ids = readIds(formData);
  const published = readText(formData, "published") === "true";

  if (ids.length === 0) {
    return { ok: false, message: "Select at least one row" };
  }

  try {
    const affected = await exampleService.bulkPublishExamples(ids, published);
    refresh();
    return {
      ok: true,
      message: `${published ? "Published" : "Unpublished"} ${affected} row(s)`,
    };
  } catch (error) {
    return { ok: false, message: toMessage(error) };
  }
}

export async function bulkDeleteExamplesAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ids = readIds(formData);

  if (ids.length === 0) {
    return { ok: false, message: "Select at least one row" };
  }

  try {
    const affected = await exampleService.bulkDeleteExamples(ids);
    refresh();
    return { ok: true, message: `Deleted ${affected} row(s)` };
  } catch (error) {
    return { ok: false, message: toMessage(error) };
  }
}
