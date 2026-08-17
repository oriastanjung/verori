import Link from "next/link";

import { requestPasswordResetAction } from "@/features/auth/actions/auth.actions";
import { AuthForm } from "@/features/auth/components/auth-form";
import { AuthHeader } from "@/features/auth/components/auth-header";
import { Field } from "@/features/auth/components/field";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <div className="flex flex-col gap-8">
      <AuthHeader
        title="Reset your password"
        description="We send a link if the address has an account."
      />

      <AuthForm
        action={requestPasswordResetAction}
        submitLabel="Send the link"
        pendingLabel="Sending..."
      >
        <Field name="email" label="Email" type="email" autoComplete="email" />
      </AuthForm>

      <p className="border-t border-rule pt-6 text-sm text-muted-foreground">
        <Link href="/auth/sign-in" className="text-ink underline underline-offset-4">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
