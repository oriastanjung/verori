import Link from "next/link";

import { signInAction } from "@/features/auth/actions/auth.actions";
import { AuthForm } from "@/features/auth/components/auth-form";
import { Field } from "@/features/auth/components/field";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="text-sm text-muted-foreground">
          Use your email and password to continue.
        </p>
      </div>

      <AuthForm action={signInAction} submitLabel="Sign in" pendingLabel="Signing in...">
        <Field name="email" label="Email" type="email" autoComplete="email" />
        <Field
          name="password"
          label="Password"
          type="password"
          autoComplete="current-password"
        />
      </AuthForm>

      <div className="flex flex-col gap-2 text-sm text-muted-foreground">
        <Link href="/auth/forgot-password" className="underline underline-offset-4">
          Forgot your password?
        </Link>
        <span>
          No account yet?{" "}
          <Link href="/auth/sign-up" className="underline underline-offset-4">
            Create one
          </Link>
        </span>
      </div>
    </div>
  );
}
