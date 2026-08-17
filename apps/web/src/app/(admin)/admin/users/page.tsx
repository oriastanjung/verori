import { redirect } from "next/navigation";

import { UsersView } from "@/features/users";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await getSession();
  if (!session) redirect("/auth/sign-in");

  return <UsersView currentUserId={session.user.id} />;
}
