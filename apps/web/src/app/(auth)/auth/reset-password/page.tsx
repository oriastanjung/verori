import Link from "next/link";

import { resetPasswordAction } from "@/features/auth/actions/auth.actions";
import { AuthForm } from "@/features/auth/components/auth-form";
import { Field } from "@/features/auth/components/field";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ token?: string }>;
};

export default async function Page({ searchParams }: Props) {
  const { token } = await searchParams;
  const resetToken = token ?? "";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Choose a new password</h1>
      </div>

      <AuthForm
        action={resetPasswordAction}
        submitLabel="Update password"
        pendingLabel="Updating..."
      >
        <input type="hidden" name="token" value={resetToken} />
        <Field
          name="password"
          label="New password"
          type="password"
          autoComplete="new-password"
        />
        <Field
          name="confirmPassword"
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
        />
      </AuthForm>

      <Link href="/auth/sign-in" className="text-sm underline underline-offset-4">
        Back to sign in
      </Link>
    </div>
  );
}
