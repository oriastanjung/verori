"use client";

import { useActionState } from "react";

import { createExampleAction } from "@/features/examples/actions/example.actions";
import {
  INITIAL_ACTION_STATE,
  type ActionState,
} from "@/features/examples/dtos/example.dto";

/** Wraps the create action so the form component stays tiny. */
export function useExampleForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createExampleAction,
    INITIAL_ACTION_STATE,
  );

  return { state, formAction, pending };
}
