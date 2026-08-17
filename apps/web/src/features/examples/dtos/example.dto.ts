import type { components } from "@/generated/api-types";

export type Example = components["schemas"]["ExampleResponse"];
export type ExamplePage = components["schemas"]["ExamplePage"];
export type CreateExampleInput = components["schemas"]["CreateExampleRequest"];
export type UpdateExampleInput = components["schemas"]["UpdateExampleRequest"];

/** What the list page reads out of the url. */
export type ExampleListQuery = {
  page?: number;
  per_page?: number;
  search?: string;
  sort_by?: string;
  sort_dir?: string;
  published?: boolean;
};

export type ActionState = {
  ok: boolean;
  message: string;
};

export const INITIAL_ACTION_STATE: ActionState = {
  ok: false,
  message: "",
};
