import { redirect } from "next/navigation";
import { HouseIcon, ListChecksIcon, UserIcon } from "@phosphor-icons/react/dist/ssr";

import { AppShell } from "@/components/layout/app-shell";
import type { NavGroup } from "@/components/layout/nav-items";
import { isAdmin } from "@/features/auth/dtos/auth.dto";
import { getSession } from "@/lib/session";

const NAV: NavGroup[] = [
  {
    label: "Main Menu",
    items: [
      { label: "Overview", href: "/dashboard", icon: HouseIcon },
      { label: "Example Management", href: "/dashboard/examples", icon: ListChecksIcon },
      { label: "Profile", href: "/dashboard/profile", icon: UserIcon },
    ],
  },
];

/** Nobody reaches the app without a session. Admins get the admin app instead. */
export default async function CoreAppLayout({ children }: LayoutProps<"/">) {
  const session = await getSession();

  if (!session) {
    redirect("/auth/sign-in");
  }

  if (isAdmin(session.user)) {
    redirect("/admin");
  }

  return (
    <AppShell title="Dashboard" homeHref="/dashboard" groups={NAV} user={session.user}>
      {children}
    </AppShell>
  );
}
