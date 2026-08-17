import { redirect } from "next/navigation";

import { UsersView } from "@/features/users";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ searchParams }: Props) {
  const session = await getSession();
  if (!session) redirect("/auth/sign-in");

  return (
    <UsersView searchParams={await searchParams} currentUserId={session.user.id} />
  );
}
