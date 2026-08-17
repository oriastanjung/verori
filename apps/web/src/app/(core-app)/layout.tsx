import { redirect } from "next/navigation";

import { AppShell, type NavGroup } from "@/components/layout/app-shell";
import { isAdmin } from "@/features/auth/dtos/auth.dto";
import { getSession } from "@/lib/session";

const NAV: NavGroup[] = [
  {
    label: "Main Menu",
    items: [
      { label: "Overview", href: "/dashboard" },
      { label: "Example Management", href: "/dashboard/examples" },
      { label: "Profile", href: "/dashboard/profile" },
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
    <AppShell title="Dashboard" groups={NAV} user={session.user}>
      {children}
    </AppShell>
  );
}
