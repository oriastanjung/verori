import { redirect } from "next/navigation";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { homePathFor } from "@/features/auth/dtos/auth.dto";
import { getSession } from "@/lib/session";

/** Signed-in users have no business on the auth pages. */
export default async function AuthLayout({ children }: LayoutProps<"/">) {
  const session = await getSession();

  if (session) {
    redirect(homePathFor(session.user));
  }

  return (
    <main className="relative flex min-h-svh items-center justify-center px-6 py-12">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
