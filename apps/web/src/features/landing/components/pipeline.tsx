const STEPS = [
  {
    file: "apps/api/.../controller.rs",
    code: `#[utoipa::path(
  get,
  path = "/examples/{id}",
  responses(
    (status = 200,
     body = ExampleResponse)
  )
)]`,
    note: "You write this once.",
  },
  {
    file: "openapi.json",
    code: `"/api/examples/{id}": {
  "get": {
    "operationId":
      "get_example"
  }
}`,
    note: "Exported on every change.",
  },
  {
    file: "apps/web/.../example.service.ts",
    code: `const { data, error } =
  await apiClient.GET(
    "/api/examples/{id}",
    { params: { path: { id } } },
  );`,
    note: "Rename the field in Rust and this stops compiling.",
  },
];

export function Pipeline() {
  return (
    <section className="border-b border-rule">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="max-w-[18ch] font-display text-[clamp(2rem,4vw,3rem)] leading-[1.05] font-700 tracking-[-0.02em]">
          The front end cannot call an endpoint that does not exist.
        </h2>

        <ol className="mt-12 grid gap-px overflow-hidden rounded-lg border border-rule bg-rule md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.file} className="flex flex-col gap-4 bg-paper p-6">
              <div className="flex items-baseline gap-3">
                <span className="font-display text-2xl font-700 tabular-nums text-signal">
                  {index + 1}
                </span>
                <span className="font-mono text-[11px] break-all text-muted-foreground">
                  {step.file}
                </span>
              </div>

              <pre className="overflow-x-auto font-mono text-[11.5px] leading-[1.65] text-ink">
                <code>{step.code}</code>
              </pre>

              <p className="mt-auto max-w-[30ch] text-[13px] leading-snug text-muted-foreground">
                {step.note}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
