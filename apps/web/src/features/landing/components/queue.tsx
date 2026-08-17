const LIFECYCLE = [
  { state: "pending", note: "Row written, NOTIFY fired. A missed signal is covered by the poll." },
  { state: "processing", note: "Claimed with FOR UPDATE SKIP LOCKED and leased." },
  { state: "done", note: "Handler returned Ok. The lease is released." },
  { state: "dead", note: "Retry budget spent. Inspect it, then redrive it." },
];

export function Queue() {
  return (
    <section className="border-b border-rule bg-paper-2">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] lg:gap-20">
        <div className="flex flex-col gap-6">
          <h2 className="font-display text-[clamp(2rem,4vw,3rem)] leading-[1.05] font-700 tracking-[-0.02em]">
            A queue you already run.
          </h2>
          <p className="max-w-[42ch] text-base leading-relaxed text-muted-foreground">
            Jobs live in a Postgres table. There is no Redis to operate, no
            broker to page you at night.
          </p>
          <p className="max-w-[42ch] text-base leading-relaxed text-muted-foreground">
            Kill a worker mid job and the lease expires, so the row goes back to
            the queue instead of sitting in limbo.
          </p>
        </div>

        <ol className="flex flex-col">
          {LIFECYCLE.map((entry, index) => (
            <li
              key={entry.state}
              className="flex gap-5 border-t border-rule py-5 last:border-b"
            >
              <span className="pt-0.5 font-mono text-[11px] tabular-nums text-muted-foreground">
                0{index + 1}
              </span>
              <div className="flex flex-col gap-1.5">
                <span className="font-mono text-sm font-500 text-signal">
                  {entry.state}
                </span>
                <span className="max-w-[44ch] text-[13.5px] leading-snug text-muted-foreground">
                  {entry.note}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
