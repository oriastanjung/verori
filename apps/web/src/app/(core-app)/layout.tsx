import Link from "next/link";

export default function CoreAppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b">
        <nav className="mx-auto flex w-full max-w-5xl items-center gap-4 px-6 py-4">
          <Link href="/" className="text-sm text-muted-foreground">
            Home
          </Link>
          <Link href="/dashboard" className="text-sm font-medium">
            Dashboard
          </Link>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
