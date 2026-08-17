import Link from "next/link";

import { signUpAction } from "@/features/auth/actions/auth.actions";
import { AuthForm } from "@/features/auth/components/auth-form";
import { AuthHeader } from "@/features/auth/components/auth-header";
import { Field } from "@/features/auth/components/field";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <div className="flex flex-col gap-8">
      <AuthHeader
        title="Create an account"
        description="New accounts start with the user role. An admin can change it later."
      />

      <AuthForm action={signUpAction} submitLabel="Create account" pendingLabel="Creating...">
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

      <p className="border-t border-rule pt-6 text-sm text-muted-foreground">
        Already have one?{" "}
        <Link href="/auth/sign-in" className="text-ink underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </div>
  );
}
