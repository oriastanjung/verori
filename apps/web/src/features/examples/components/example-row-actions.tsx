"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  deleteExampleAction,
  publishExampleAction,
} from "@/features/examples/actions/example.actions";
import {
  INITIAL_ACTION_STATE,
  type ActionState,
} from "@/features/examples/dtos/example.dto";

type Props = {
  exampleId: number;
  canDelete: boolean;
};

export function ExampleRowActions({ exampleId, canDelete }: Props) {
  const [queueState, queueAction, queuePending] = useActionState<ActionState, FormData>(
    publishExampleAction,
    INITIAL_ACTION_STATE,
  );
  const [deleteState, deleteAction, deletePending] = useActionState<
    ActionState,
    FormData
  >(deleteExampleAction, INITIAL_ACTION_STATE);

  const message = queueState.message || deleteState.message;
  const failed = (!queueState.ok && queueState.message) || (!deleteState.ok && deleteState.message);

  return (
    <div className="flex items-center justify-end gap-2">
      {message && (
        <span className={failed ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
          {message}
        </span>
      )}

      <form action={queueAction}>
        <input type="hidden" name="id" value={exampleId} />
        <Button type="submit" variant="secondary" size="sm" disabled={queuePending}>
          {queuePending ? "Queueing..." : "Send to queue"}
        </Button>
      </form>

      {canDelete && (
        <form action={deleteAction}>
          <input type="hidden" name="id" value={exampleId} />
          <Button type="submit" variant="destructive" size="sm" disabled={deletePending}>
            {deletePending ? "Deleting..." : "Delete"}
          </Button>
        </form>
      )}
    </div>
  );
}
