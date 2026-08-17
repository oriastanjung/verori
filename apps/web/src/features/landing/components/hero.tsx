import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Real code from apps/api. The product is code, so the hero shows code. */
const SNIPPET = `#[transactional]
#[async_trait]
impl ExampleService for DefaultExampleService {
    #[tx]
    async fn create(&self, input: CreateExampleRequest)
        -> AppResult<ExampleResponse>
    {
        let record = self.repository.create(input).await?;

        queue::publish(
            &self.pool,
            QueueChannel::ExampleCreated,
            json!({ "example_id": record.id }),
            PublishOptions::with_idempotency_key(
                format!("example-created-{}", record.id),
            ),
        )
        .await?;

        Ok(record.into())
    }
}`;

export function Hero() {
  return (
    <section className="border-b border-rule">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 pt-16 pb-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-16 lg:pt-24">
        <div className="flex flex-col gap-7">
          <h1 className="font-display text-[clamp(2.6rem,5.4vw,4rem)] leading-[1.0] font-700 tracking-[-0.03em]">
            One source.
            <br />
            <span className="text-signal">Two languages.</span>
          </h1>

          <p className="max-w-[46ch] text-base leading-relaxed text-muted-foreground">
            Declare a route once in Rust. The spec, the docs page and the
            TypeScript client all come from that declaration.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/auth/sign-in" className={buttonVariants({ size: "lg" })}>
              Open the demo
            </Link>
            <a
              href="https://github.com/oriastanjung/verori"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "border-ink/30 hover:border-ink/60")}
            >
              Read the source
            </a>
          </div>
        </div>

        <figure className="relative">
          <div className="overflow-x-auto rounded-lg border border-rule bg-paper-2 p-5">
            <pre className="font-mono text-[12.5px] leading-[1.7] text-ink">
              <code>{SNIPPET}</code>
            </pre>
          </div>
          <figcaption className="mt-3 font-mono text-[11px] text-muted-foreground">
            apps/api/src/modules/example/service.rs
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
