import Link from "next/link";

import { signUpAction } from "@/features/auth/actions/auth.actions";
import { AuthForm } from "@/features/auth/components/auth-form";
import { Field } from "@/features/auth/components/field";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Create an account</h1>
        <p className="text-sm text-muted-foreground">
          New accounts start with the user role.
        </p>
      </div>

      <AuthForm action={signUpAction} submitLabel="Sign up" pendingLabel="Creating...">
        <Field name="name" label="Name" autoComplete="name" />
        <Field name="email" label="Email" type="email" autoComplete="email" />
        <Field
          name="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
        />
      </AuthForm>

      <p className="text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/auth/sign-in" className="underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </div>
  );
}
