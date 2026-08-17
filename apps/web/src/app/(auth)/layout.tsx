import Link from "next/link";
import { redirect } from "next/navigation";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { homePathFor } from "@/features/auth/dtos/auth.dto";
import { getSession } from "@/lib/session";

/**
 * Two panels. The left one carries the product, the right one carries the form,
 * so the page never reads as a lonely card on an empty background.
 */
export default async function AuthLayout({ children }: LayoutProps<"/">) {
  const session = await getSession();

  if (session) {
    redirect(homePathFor(session.user));
  }

  return (
    <div className="grid min-h-svh bg-paper text-ink lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <aside className="relative hidden flex-col justify-between border-r border-rule bg-ink p-10 text-paper lg:flex">
        <Link href="/" className="font-display text-lg font-700 tracking-tight">
          VERORI
        </Link>

        <div className="flex flex-col gap-6">
          <span aria-hidden className="h-1 w-12 bg-signal" />
          <p className="max-w-[24ch] font-display text-[clamp(1.75rem,2.6vw,2.5rem)] leading-[1.08] font-600 tracking-[-0.02em]">
            The session never reaches browser JavaScript.
          </p>
          <p className="max-w-[38ch] text-sm leading-relaxed text-paper/65">
            Signing in happens on the server. The token is kept in an httpOnly
            cookie and forwarded to the API as a bearer header, so a script on
            the page has nothing to read.
          </p>
        </div>

        <dl className="flex flex-col gap-3 font-mono text-[11.5px] text-paper/55">
          <div className="flex gap-3">
            <dt className="w-20 shrink-0 text-paper/40">cookie</dt>
            <dd>httpOnly, SameSite=Lax</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-20 shrink-0 text-paper/40">api</dt>
            <dd>Authorization: Bearer</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-20 shrink-0 text-paper/40">roles</dt>
            <dd>checked before the handler runs</dd>
          </div>
        </dl>
      </aside>

      <main className="relative flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 lg:justify-end">
          <Link
            href="/"
            className="font-display text-base font-700 tracking-tight lg:hidden"
          >
            VERORI
          </Link>
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-12">
          <div className="w-full max-w-[26rem]">{children}</div>
        </div>
      </main>
    </div>
  );
}
