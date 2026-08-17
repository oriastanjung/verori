const GROUPS = [
  {
    title: "Backend",
    rows: [
      ["API", "Axum 0.8, SeaORM 2, utoipa 5"],
      ["Worker", "sqlx PgListener, retries, dead letter queue"],
      ["Transactions", "#[tx] over a task-local SeaORM transaction"],
      ["Auth", "Better Auth, roles enforced at the route layer"],
    ],
  },
  {
    title: "Front end",
    rows: [
      ["App", "Next.js 16, React 19, Tailwind 4"],
      ["Session", "httpOnly cookie, forwarded as a bearer token"],
      ["Types", "openapi-typescript into openapi-fetch"],
      ["Screens", "one AppCrud component per module"],
    ],
  },
];

export function Stack() {
  return (
    <section className="border-b border-rule">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-12 md:grid-cols-2 md:gap-16">
          {GROUPS.map((group) => (
            <div key={group.title} className="flex flex-col">
              <h3 className="font-display text-sm font-600 tracking-[0.14em] uppercase">
                {group.title}
              </h3>

              <dl className="mt-6 flex flex-col">
                {group.rows.map(([term, value]) => (
                  <div
                    key={term}
                    className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)] gap-4 border-t border-rule py-4 last:border-b"
                  >
                    <dt className="font-mono text-[11.5px] text-muted-foreground">
                      {term}
                    </dt>
                    <dd className="text-[13.5px] leading-snug">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
