import "server-only";

import { apiClient } from "@/lib/api-client";
import type {
  CreateExampleInput,
  Example,
  UpdateExampleInput,
} from "@/features/examples/dtos/example.dto";

/** All API calls for this feature live here. Components never call fetch directly. */
export async function listExamples(published?: boolean): Promise<Example[]> {
  const { data, error } = await apiClient.GET("/api/examples", {
    params: { query: published === undefined ? {} : { published } },
  });

  if (error) throw new Error(error.message);
  return data;
}

export async function getExample(id: number): Promise<Example> {
  const { data, error } = await apiClient.GET("/api/examples/{id}", {
    params: { path: { id } },
  });

  if (error) throw new Error(error.message);
  return data;
}

export async function createExample(input: CreateExampleInput): Promise<Example> {
  const { data, error } = await apiClient.POST("/api/examples", { body: input });

  if (error) throw new Error(error.message);
  return data;
}

export async function updateExample(
  id: number,
  input: UpdateExampleInput,
): Promise<Example> {
  const { data, error } = await apiClient.PUT("/api/examples/{id}", {
    params: { path: { id } },
    body: input,
  });

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteExample(id: number): Promise<void> {
  const { error } = await apiClient.DELETE("/api/examples/{id}", {
    params: { path: { id } },
  });

  if (error) throw new Error(error.message);
}

export async function bulkPublishExamples(
  ids: number[],
  published: boolean,
): Promise<number> {
  const { data, error } = await apiClient.PATCH("/api/examples/bulk", {
    body: { ids, published },
  });

  if (error) throw new Error(error.message);
  return data.affected;
}

export async function bulkDeleteExamples(ids: number[]): Promise<number> {
  const { data, error } = await apiClient.POST("/api/examples/bulk-delete", {
    body: { ids },
  });

  if (error) throw new Error(error.message);
  return data.affected;
}

export async function publishExampleToQueue(id: number): Promise<number> {
  const { data, error } = await apiClient.POST("/api/examples/{id}/publish", {
    params: { path: { id } },
  });

  if (error) throw new Error(error.message);
  return data.job_id;
}
