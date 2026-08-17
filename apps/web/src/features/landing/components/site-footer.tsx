import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-3 px-6 py-10">
      <span className="font-display text-sm font-700 tracking-tight">VERORI</span>
      <span className="font-mono text-[11px] text-muted-foreground">MIT licensed</span>

      <div className="ml-auto flex items-center gap-6 text-[13px]">
        <a
          href="https://github.com/oriastanjung/verori"
          className="text-muted-foreground underline-offset-4 hover:text-ink hover:underline"
        >
          Source
        </a>
        <a
          href="https://github.com/oriastanjung/verori/issues"
          className="text-muted-foreground underline-offset-4 hover:text-ink hover:underline"
        >
          Issues
        </a>
        <Link
          href="/auth/sign-in"
          className="text-muted-foreground underline-offset-4 hover:text-ink hover:underline"
        >
          Sign in
        </Link>
      </div>
    </footer>
  );
}
