import { redirect } from "next/navigation";

import { ProfileForm } from "@/features/auth/components/profile-form";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await getSession();
  if (!session) redirect("/auth/sign-in");

  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Profile</h1>
      <ProfileForm
        name={session.user.name ?? ""}
        email={session.user.email ?? ""}
      />
    </section>
  );
}
