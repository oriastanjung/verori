/**
 * Numbers measured in this repository, not marketing figures.
 * Refresh them when the build output changes.
 */
const FACTS = [
  { value: "13.4", unit: "MB", label: "api image, built on scratch" },
  { value: "6.09", unit: "MB", label: "worker image" },
  { value: "42", unit: "paths", label: "in the generated OpenAPI document" },
  { value: "19", unit: "tests", label: "Rust behaviour plus browser end to end" },
];

export function Evidence() {
  return (
    <section className="border-b border-rule bg-paper-2">
      <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-y-8 px-6 py-10 sm:grid-cols-4 sm:gap-x-8">
        {FACTS.map((fact) => (
          <div key={fact.label} className="flex flex-col gap-1">
            <dt className="font-display text-3xl font-600 tracking-tight tabular-nums">
              {fact.value}
              <span className="ml-1 font-mono text-xs font-500 text-muted-foreground">
                {fact.unit}
              </span>
            </dt>
            <dd className="max-w-[22ch] text-[13px] leading-snug text-muted-foreground">
              {fact.label}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
