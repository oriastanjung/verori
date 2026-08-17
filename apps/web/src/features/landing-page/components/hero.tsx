import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

/** Scalar docs are served by the Rust api, not by this app. */
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

export function Hero() {
  return (
    <div className="flex flex-col items-center gap-6 py-24 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">
        Rust Axum + SeaORM monorepo
      </h1>
      <p className="max-w-xl text-muted-foreground">
        Axum API, Postgres queue worker, and a Next.js front end that shares types with
        the backend.
      </p>
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className={buttonVariants({ size: "lg" })}>
          Open the app
        </Link>
        <a
          href={`${API_BASE_URL}/docs`}
          className={buttonVariants({ size: "lg", variant: "outline" })}
        >
          API docs
        </a>
      </div>
    </div>
  );
}
