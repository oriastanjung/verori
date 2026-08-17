import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserCreateForm } from "@/features/users/components/user-create-form";
import { UserRowActions } from "@/features/users/components/user-row-actions";
import { listUsers } from "@/features/users/services/user.service";

type Props = {
  currentUserId: string;
};

/** View layer for user management. The admin page renders only this. */
export async function UsersView({ currentUserId }: Props) {
  const users = await listUsers();

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">User Management</h1>
        <p className="text-sm text-muted-foreground">
          Roles, bans and accounts, served by the Better Auth admin plugin.
        </p>
      </header>

      <UserCreateForm />

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name ?? "-"}</TableCell>
                <TableCell className="text-muted-foreground">{user.email}</TableCell>
                <TableCell>
                  <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                    {user.role ?? "user"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {user.banned ? (
                    <Badge variant="destructive">banned</Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">active</span>
                  )}
                </TableCell>
                <TableCell>
                  <UserRowActions
                    userId={user.id}
                    role={user.role ?? "user"}
                    banned={user.banned}
                    isSelf={user.id === currentUserId}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
