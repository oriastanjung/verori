"use client";

import { useActionState } from "react";
import { ProhibitIcon, ShieldCheckIcon } from "@phosphor-icons/react";

import { AppCrud } from "@/components/composite/app-crud";
import type { CrudColumn, CrudField } from "@/components/composite/crud-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  createUserAction,
  removeUserAction,
  setUserRoleAction,
  toggleBanAction,
} from "@/features/users/actions/user.actions";
import {
  ASSIGNABLE_ROLES,
  INITIAL_ACTION_STATE,
  type ActionState,
  type ManagedUser,
  type UserPage,
} from "@/features/users/dtos/user.dto";

const COLUMNS: CrudColumn<ManagedUser>[] = [
  {
    key: "name",
    header: "Name",
    sortable: true,
    className: "font-medium",
    render: (row) => row.name ?? "-",
  },
  {
    key: "email",
    header: "Email",
    sortable: true,
    render: (row) => <span className="text-muted-foreground">{row.email}</span>,
  },
  {
    key: "role",
    header: "Role",
    render: (row) => (
      <Badge variant={row.role === "admin" ? "default" : "secondary"}>
        {row.role ?? "user"}
      </Badge>
    ),
  },
  {
    key: "banned",
    header: "Status",
    render: (row) =>
      row.banned ? (
        <Badge variant="destructive">banned</Badge>
      ) : (
        <span className="text-sm text-muted-foreground">active</span>
      ),
  },
];

const FIELDS: CrudField<ManagedUser>[] = [
  { name: "name", label: "Name", required: true, initialValue: (row) => row.name },
  { name: "email", label: "Email", required: true, initialValue: (row) => row.email },
  { name: "password", label: "Password", type: "text", placeholder: "At least 8 characters" },
  {
    name: "role",
    label: "Role",
    type: "select",
    options: ASSIGNABLE_ROLES.map((role) => ({ label: role, value: role })),
    initialValue: (row) => row.role ?? "user",
  },
];

type Props = {
  page: UserPage;
  /** An admin must not lock themselves out of their own account. */
  currentUserId: string;
};

export function UserCrud({ page, currentUserId }: Props) {
  return (
    <AppCrud<ManagedUser>
      title="User Management"
      description="Roles, bans and accounts, served by the Better Auth admin plugin."
      page={page}
      columns={COLUMNS}
      fields={FIELDS}
      labels={{ singular: "user", searchPlaceholder: "Search by email" }}
      actions={{
        create: createUserAction,
        remove: removeUserAction,
      }}
      renderRowActions={(row) =>
        row.id === currentUserId ? (
          <span className="text-xs text-muted-foreground">This is you</span>
        ) : (
          <>
            <RoleButton userId={row.id} role={row.role ?? "user"} />
            <BanButton userId={row.id} banned={row.banned} />
          </>
        )
      }
    />
  );
}

/** Flips the role between user and admin in one click. */
function RoleButton({ userId, role }: { userId: string; role: string }) {
  const [, formAction, pending] = useActionState<ActionState, FormData>(
    setUserRoleAction,
    INITIAL_ACTION_STATE,
  );

  const nextRole = role === "admin" ? "user" : "admin";

  return (
    <form action={formAction}>
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="role" value={nextRole} />
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        <ShieldCheckIcon />
        Make {nextRole}
      </Button>
    </form>
  );
}

function BanButton({ userId, banned }: { userId: string; banned: boolean }) {
  const [, formAction, pending] = useActionState<ActionState, FormData>(
    toggleBanAction,
    INITIAL_ACTION_STATE,
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="banned" value={String(banned)} />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        <ProhibitIcon />
        {banned ? "Unban" : "Ban"}
      </Button>
    </form>
  );
}
