"use client";

import { useActionState } from "react";
import { WarningIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import {
  INITIAL_ACTION_STATE,
  type ActionState,
} from "@/features/auth/dtos/auth.dto";

type ServerAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

type Props = {
  action: ServerAction;
  submitLabel: string;
  pendingLabel: string;
  children: React.ReactNode;
};

/**
 * Shared shell for the auth forms: runs the server action, shows the pending
 * state, and renders whatever the action came back with.
 */
export function AuthForm({ action, submitLabel, pendingLabel, children }: Props) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    INITIAL_ACTION_STATE,
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {children}

      <Button type="submit" size="lg" className="h-11 w-full" disabled={pending}>
        {pending ? pendingLabel : submitLabel}
      </Button>

      {state.message.length > 0 && (
        <p
          role={state.ok ? "status" : "alert"}
          className={
            state.ok
              ? "text-sm text-muted-foreground"
              : "flex items-start gap-2 border-l-0 text-sm text-destructive"
          }
        >
          {!state.ok && <WarningIcon className="mt-0.5 size-4 shrink-0" />}
          {state.message}
        </p>
      )}
    </form>
  );
}
