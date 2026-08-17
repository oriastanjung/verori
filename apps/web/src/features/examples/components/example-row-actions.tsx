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
};

export function ExampleRowActions({ exampleId }: Props) {
  const [publishState, publishAction, publishPending] = useActionState<
    ActionState,
    FormData
  >(publishExampleAction, INITIAL_ACTION_STATE);

  const [deleteState, deleteAction, deletePending] = useActionState<
    ActionState,
    FormData
  >(deleteExampleAction, INITIAL_ACTION_STATE);

  const message = publishState.message || deleteState.message;

  return (
    <div className="flex items-center gap-2">
      <form action={publishAction}>
        <input type="hidden" name="id" value={exampleId} />
        <Button type="submit" variant="secondary" size="sm" disabled={publishPending}>
          {publishPending ? "Queueing..." : "Publish"}
        </Button>
      </form>

      <form action={deleteAction}>
        <input type="hidden" name="id" value={exampleId} />
        <Button type="submit" variant="destructive" size="sm" disabled={deletePending}>
          {deletePending ? "Deleting..." : "Delete"}
        </Button>
      </form>

      {message.length > 0 && (
        <span className="text-xs text-muted-foreground">{message}</span>
      )}
    </div>
  );
}
