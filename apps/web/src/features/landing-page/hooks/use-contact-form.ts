"use client";

import { useActionState } from "react";

import { submitContactAction } from "@/features/landing-page/actions/contact.actions";
import {
  INITIAL_ACTION_STATE,
  type ActionState,
} from "@/features/landing-page/dtos/contact.dto";

export function useContactForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    submitContactAction,
    INITIAL_ACTION_STATE,
  );

  return { state, formAction, pending };
}
