"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createExampleAction } from "@/features/examples/actions/example.actions";
import {
  INITIAL_ACTION_STATE,
  type ActionState,
} from "@/features/examples/dtos/example.dto";

export function ExampleCreateForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createExampleAction,
    INITIAL_ACTION_STATE,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-lg border p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" placeholder="My first example" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="content">Content</Label>
          <Input id="content" name="content" placeholder="Optional" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating..." : "Create example"}
        </Button>
        {state.message.length > 0 && (
          <span
            className={
              state.ok ? "text-sm text-green-600" : "text-sm text-destructive"
            }
          >
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}
