import Link from "next/link";

import { requestPasswordResetAction } from "@/features/auth/actions/auth.actions";
import { AuthForm } from "@/features/auth/components/auth-form";
import { Field } from "@/features/auth/components/field";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Forgot password</h1>
        <p className="text-sm text-muted-foreground">
          We will send a reset link if the address has an account.
        </p>
      </div>

      <AuthForm
        action={requestPasswordResetAction}
        submitLabel="Send reset link"
        pendingLabel="Sending..."
      >
        <Field name="email" label="Email" type="email" autoComplete="email" />
      </AuthForm>

      <Link href="/auth/sign-in" className="text-sm underline underline-offset-4">
        Back to sign in
      </Link>
    </div>
  );
}
