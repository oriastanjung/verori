import Link from "next/link";

import { signInAction } from "@/features/auth/actions/auth.actions";
import { AuthForm } from "@/features/auth/components/auth-form";
import { AuthHeader } from "@/features/auth/components/auth-header";
import { Field } from "@/features/auth/components/field";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <div className="flex flex-col gap-8">
      <AuthHeader
        title="Sign in"
        description="Use the email and password you signed up with."
      />

      <AuthForm action={signInAction} submitLabel="Sign in" pendingLabel="Signing in...">
        <Field name="email" label="Email" type="email" autoComplete="email" />
        <Field
          name="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          hint={
            <Link
              href="/auth/forgot-password"
              className="text-muted-foreground underline-offset-4 hover:text-ink hover:underline"
            >
              Forgot it?
            </Link>
          }
        />
      </AuthForm>

      <p className="border-t border-rule pt-6 text-sm text-muted-foreground">
        No account yet?{" "}
        <Link href="/auth/sign-up" className="text-ink underline underline-offset-4">
          Create one
        </Link>
      </p>
    </div>
  );
}
