import { UserCrud } from "@/features/users/components/user-crud";
import type { UserListQuery } from "@/features/users/dtos/user.dto";
import { listUsers } from "@/features/users/services/user.service";

type Props = {
  searchParams: Record<string, string | string[] | undefined>;
  currentUserId: string;
};

function toQuery(params: Props["searchParams"]): UserListQuery {
  const read = (key: string): string | undefined => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  return {
    page: Number(read("page")) || undefined,
    per_page: Number(read("per_page")) || undefined,
    search: read("search"),
    sort_by: read("sort_by"),
    sort_dir: read("sort_dir"),
  };
}

/** View layer for user management. The admin page renders only this. */
export async function UsersView({ searchParams, currentUserId }: Props) {
  const page = await listUsers(toQuery(searchParams));

  return <UserCrud page={page} currentUserId={currentUserId} />;
}
