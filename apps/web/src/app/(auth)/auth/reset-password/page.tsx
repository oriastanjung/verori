import Link from "next/link";

import { resetPasswordAction } from "@/features/auth/actions/auth.actions";
import { AuthForm } from "@/features/auth/components/auth-form";
import { AuthHeader } from "@/features/auth/components/auth-header";
import { Field } from "@/features/auth/components/field";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ token?: string }>;
};

export default async function Page({ searchParams }: Props) {
  const { token } = await searchParams;

  return (
    <div className="flex flex-col gap-8">
      <AuthHeader
        title="Choose a new password"
        description="Pick something you have not used here before."
      />

      <AuthForm
        action={resetPasswordAction}
        submitLabel="Update password"
        pendingLabel="Updating..."
      >
        <input type="hidden" name="token" value={token ?? ""} />
        <Field
          name="password"
          label="New password"
          type="password"
          autoComplete="new-password"
        />
        <Field
          name="confirmPassword"
          label="Confirm it"
          type="password"
          autoComplete="new-password"
        />
      </AuthForm>

      <p className="border-t border-rule pt-6 text-sm text-muted-foreground">
        <Link href="/auth/sign-in" className="text-ink underline underline-offset-4">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
