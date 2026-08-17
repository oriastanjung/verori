import Link from "next/link";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { buttonVariants } from "@/components/ui/button";

const REPO_URL = "https://github.com/oriastanjung/verori";

export function SiteNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-paper">
      <nav className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-6">
        <Link href="/" className="font-display text-lg font-700 tracking-tight">
          VERORI
        </Link>

        <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">
          Rust API · Postgres queue · typed Next.js
        </span>

        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <a
            href={REPO_URL}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Source
          </a>
          <Link
            href="/auth/sign-in"
            className={buttonVariants({ size: "sm" })}
          >
            Sign in
          </Link>
        </div>
      </nav>
    </header>
  );
}
