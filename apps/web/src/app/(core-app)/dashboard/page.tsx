import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await getSession();
  if (!session) redirect("/auth/sign-in");

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">
          Welcome back, {session.user.name ?? session.user.email}
        </h1>
        <p className="text-sm text-muted-foreground">Signed in as {session.user.role}.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/dashboard/examples">
          <Card className="h-full transition-colors hover:border-foreground/20">
            <CardHeader>
              <CardTitle>Example Management</CardTitle>
              <CardDescription>Browse and create example records.</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/dashboard/profile">
          <Card className="h-full transition-colors hover:border-foreground/20">
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Change your name or password.</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </section>
  );
}
