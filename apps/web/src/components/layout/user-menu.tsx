"use client";

import { useActionState } from "react";
import { CaretUpDownIcon, SignOutIcon, UserIcon } from "@phosphor-icons/react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { signOutAction } from "@/features/auth/actions/auth.actions";
import type { AuthUser } from "@/features/auth/dtos/auth.dto";

type Props = {
  user: AuthUser;
};

function initialsOf(user: AuthUser): string {
  const source = user.name ?? user.email ?? "?";
  return source
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** Avatar and name in the sidebar footer. Sign out lives behind the click. */
export function UserMenu({ user }: Props) {
  const [, signOut, pending] = useActionState(async () => {
    await signOutAction();
  }, undefined);

  const displayName = user.name ?? user.email ?? "Account";

  return (
    <Popover>
      <PopoverTrigger
        render={
          <SidebarMenuButton size="lg" aria-label="Account menu">
            <Avatar className="size-8 rounded-lg">
              {user.image && <AvatarImage src={user.image} alt={displayName} />}
              <AvatarFallback className="rounded-lg text-xs">
                {initialsOf(user)}
              </AvatarFallback>
            </Avatar>

            <div className="grid flex-1 text-left leading-tight">
              <span className="truncate text-sm font-medium">{displayName}</span>
              <span className="truncate text-xs text-muted-foreground">
                {user.email}
              </span>
            </div>

            <CaretUpDownIcon className="ml-auto" />
          </SidebarMenuButton>
        }
      />

      <PopoverContent side="top" align="start" className="w-60 p-2">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <Avatar className="size-8 rounded-lg">
            {user.image && <AvatarImage src={user.image} alt={displayName} />}
            <AvatarFallback className="rounded-lg text-xs">
              {initialsOf(user)}
            </AvatarFallback>
          </Avatar>
          <div className="grid flex-1 leading-tight">
            <span className="truncate text-sm font-medium">{displayName}</span>
            <Badge variant="secondary" className="mt-1 w-fit">
              {user.role ?? "user"}
            </Badge>
          </div>
        </div>

        <div className="my-2 h-px bg-border" />

        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          render={<a href="/dashboard/profile" />}
        >
          <UserIcon />
          Profile
        </Button>

        <form action={signOut}>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            disabled={pending}
          >
            <SignOutIcon />
            {pending ? "Signing out..." : "Sign out"}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
