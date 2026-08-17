"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import {
  removeUserAction,
  setUserRoleAction,
  toggleBanAction,
} from "@/features/users/actions/user.actions";
import {
  ASSIGNABLE_ROLES,
  INITIAL_ACTION_STATE,
  type ActionState,
} from "@/features/users/dtos/user.dto";

type Props = {
  userId: string;
  role: string;
  banned: boolean;
  /** An admin must not lock themselves out of their own account. */
  isSelf: boolean;
};

export function UserRowActions({ userId, role, banned, isSelf }: Props) {
  const [roleState, roleAction, rolePending] = useActionState<ActionState, FormData>(
    setUserRoleAction,
    INITIAL_ACTION_STATE,
  );
  const [banState, banAction, banPending] = useActionState<ActionState, FormData>(
    toggleBanAction,
    INITIAL_ACTION_STATE,
  );
  const [removeState, removeAction, removePending] = useActionState<ActionState, FormData>(
    removeUserAction,
    INITIAL_ACTION_STATE,
  );

  const message = roleState.message || banState.message || removeState.message;

  if (isSelf) {
    return <span className="text-xs text-muted-foreground">This is you</span>;
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {message && <span className="text-xs text-muted-foreground">{message}</span>}

      <form action={roleAction} className="flex items-center gap-1">
        <input type="hidden" name="userId" value={userId} />
        <NativeSelect name="role" defaultValue={role} className="h-7 w-24 text-xs">
          {ASSIGNABLE_ROLES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </NativeSelect>
        <Button type="submit" size="sm" variant="secondary" disabled={rolePending}>
          {rolePending ? "..." : "Set role"}
        </Button>
      </form>

      <form action={banAction}>
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="banned" value={String(banned)} />
        <Button type="submit" size="sm" variant="outline" disabled={banPending}>
          {banned ? "Unban" : "Ban"}
        </Button>
      </form>

      <form action={removeAction}>
        <input type="hidden" name="userId" value={userId} />
        <Button type="submit" size="sm" variant="destructive" disabled={removePending}>
          Remove
        </Button>
      </form>
    </div>
  );
}
