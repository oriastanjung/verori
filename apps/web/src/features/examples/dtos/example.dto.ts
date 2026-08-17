import type { components } from "@/generated/api-types";

export type Example = components["schemas"]["ExampleResponse"];
export type CreateExampleInput = components["schemas"]["CreateExampleRequest"];
export type UpdateExampleInput = components["schemas"]["UpdateExampleRequest"];

/** What every server action gives back to the form. */
export type ActionState = {
  ok: boolean;
  message: string;
};

export const INITIAL_ACTION_STATE: ActionState = {
  ok: false,
  message: "",
};
