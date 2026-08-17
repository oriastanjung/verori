import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

const START = `git clone https://github.com/oriastanjung/verori
just migrate && just seed
just dev`;

export function Closing() {
  return (
    <section className="border-b border-rule bg-ink text-paper">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:items-center lg:gap-16">
        <div className="flex flex-col gap-6">
          <h2 className="max-w-[16ch] font-display text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.02] font-700 tracking-[-0.02em]">
            Clone it and run it.
          </h2>
          <p className="max-w-[40ch] text-base leading-relaxed text-paper/70">
            Three commands bring up the API, the worker, the codegen watcher and
            the web app.
          </p>
          <div>
            <Link
              href="/auth/sign-in"
              className={buttonVariants({ size: "lg", className: "bg-signal text-paper hover:bg-signal/90" })}
            >
              Open the demo
            </Link>
          </div>
        </div>

        <pre className="overflow-x-auto rounded-lg border border-paper/15 bg-paper/5 p-5 font-mono text-[12.5px] leading-[1.8]">
          <code>{START}</code>
        </pre>
      </div>
    </section>
  );
}
