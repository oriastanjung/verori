"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { createUserAction } from "@/features/users/actions/user.actions";
import {
  ASSIGNABLE_ROLES,
  INITIAL_ACTION_STATE,
  type ActionState,
} from "@/features/users/dtos/user.dto";

export function UserCreateForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createUserAction,
    INITIAL_ACTION_STATE,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-lg border p-4">
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="role">Role</Label>
          <NativeSelect id="role" name="role" defaultValue="user">
            {ASSIGNABLE_ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating..." : "Create user"}
        </Button>
        {state.message.length > 0 && (
          <span className={state.ok ? "text-sm text-green-600" : "text-sm text-destructive"}>
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}
