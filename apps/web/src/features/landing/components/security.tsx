/**
 * Each row states something a reader can check against the running service or
 * the source. No claim of immunity, because nobody can make one.
 */
const CONTROLS = [
  {
    risk: "Access control",
    detail: "Guards run before the handler. A member on an admin route gets 403.",
  },
  {
    risk: "Injection",
    detail: "Bind parameters everywhere. A search of ' OR 1=1-- matches as text.",
  },
  {
    risk: "Session theft",
    detail: "httpOnly cookie, forwarded as a bearer token. Scripts cannot read it.",
  },
  {
    risk: "Browser attacks",
    detail: "CSP, nosniff, DENY framing, referrer and permissions policy.",
  },
  {
    risk: "Floods",
    detail: "Per address rate limit, body size cap, request timeout.",
  },
  {
    risk: "Leaked internals",
    detail: "Server errors are logged in full and answered with one flat line.",
  },
];

export function Security() {
  return (
    <section className="border-b border-rule">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="flex flex-col gap-4">
          <h2 className="max-w-[20ch] font-display text-[clamp(2rem,4vw,3rem)] leading-[1.05] font-700 tracking-[-0.02em]">
            Hardened where it counts, honest about the rest.
          </h2>
          <p className="max-w-[54ch] text-base leading-relaxed text-muted-foreground">
            Nothing here is immune to the OWASP Top 10, and any project that says
            so is selling something. These are the controls that exist, and each
            one is checkable.
          </p>
        </div>

        <dl className="mt-12 grid gap-x-12 sm:grid-cols-2">
          {CONTROLS.map((control) => (
            <div
              key={control.risk}
              className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] gap-4 border-t border-rule py-4"
            >
              <dt className="font-mono text-[11.5px] text-signal">{control.risk}</dt>
              <dd className="text-[13.5px] leading-snug text-muted-foreground">
                {control.detail}
              </dd>
            </div>
          ))}
        </dl>

        <p className="mt-8 max-w-[62ch] border-t border-rule pt-6 text-[13px] leading-relaxed text-muted-foreground">
          The rate limit refuses a flood from one address so the database
          survives. It is not DDoS protection: that belongs to the network in
          front of the service. None of this has been penetration tested.
        </p>
      </div>
    </section>
  );
}
