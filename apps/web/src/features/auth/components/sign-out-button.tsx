"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { signOutAction } from "@/features/auth/actions/auth.actions";

export function SignOutButton() {
  const [, formAction, pending] = useActionState(async () => {
    await signOutAction();
  }, undefined);

  return (
    <form action={formAction}>
      <Button type="submit" variant="outline" size="sm" disabled={pending} className="w-full">
        {pending ? "Signing out..." : "Sign out"}
      </Button>
    </form>
  );
}
