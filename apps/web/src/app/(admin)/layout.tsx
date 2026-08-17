import { redirect } from "next/navigation";

import { AppShell, type NavGroup } from "@/components/layout/app-shell";
import { isAdmin } from "@/features/auth/dtos/auth.dto";
import { getSession } from "@/lib/session";

const NAV: NavGroup[] = [
  {
    label: "Master Data",
    items: [{ label: "Example Management", href: "/admin/examples" }],
  },
  {
    label: "User Management",
    items: [{ label: "Users", href: "/admin/users" }],
  },
];

/** Admin only. A signed-in non-admin is sent to their own dashboard. */
export default async function AdminLayout({ children }: LayoutProps<"/">) {
  const session = await getSession();

  if (!session) {
    redirect("/auth/sign-in");
  }

  if (!isAdmin(session.user)) {
    redirect("/dashboard");
  }

  return (
    <AppShell title="Admin" groups={NAV} user={session.user}>
      {children}
    </AppShell>
  );
}
