"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  changePasswordAction,
  updateProfileAction,
} from "@/features/auth/actions/auth.actions";
import {
  INITIAL_ACTION_STATE,
  type ActionState,
} from "@/features/auth/dtos/auth.dto";

type Props = {
  name: string;
  email: string;
};

export function ProfileForm({ name, email }: Props) {
  const [profileState, profileAction, profilePending] = useActionState<
    ActionState,
    FormData
  >(updateProfileAction, INITIAL_ACTION_STATE);

  const [passwordState, passwordAction, passwordPending] = useActionState<
    ActionState,
    FormData
  >(changePasswordAction, INITIAL_ACTION_STATE);

  return (
    <div className="flex flex-col gap-6">
      <form action={profileAction} className="flex flex-col gap-4 rounded-lg border p-4">
        <h2 className="text-lg font-medium">Profile</h2>

        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={email} disabled readOnly />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" defaultValue={name} />
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={profilePending}>
            {profilePending ? "Saving..." : "Save profile"}
          </Button>
          {profileState.message.length > 0 && (
            <span
              className={
                profileState.ok ? "text-sm text-green-600" : "text-sm text-destructive"
              }
            >
              {profileState.message}
            </span>
          )}
        </div>
      </form>

      <form action={passwordAction} className="flex flex-col gap-4 rounded-lg border p-4">
        <h2 className="text-lg font-medium">Password</h2>

        <div className="flex flex-col gap-2">
          <Label htmlFor="currentPassword">Current password</Label>
          <Input id="currentPassword" name="currentPassword" type="password" />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="newPassword">New password</Label>
          <Input id="newPassword" name="newPassword" type="password" />
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={passwordPending}>
            {passwordPending ? "Updating..." : "Change password"}
          </Button>
          {passwordState.message.length > 0 && (
            <span
              className={
                passwordState.ok ? "text-sm text-green-600" : "text-sm text-destructive"
              }
            >
              {passwordState.message}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
