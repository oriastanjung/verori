import { Closing } from "@/features/landing/components/closing";
import { Evidence } from "@/features/landing/components/evidence";
import { Hero } from "@/features/landing/components/hero";
import { Pipeline } from "@/features/landing/components/pipeline";
import { Queue } from "@/features/landing/components/queue";
import { SiteFooter } from "@/features/landing/components/site-footer";
import { SiteNav } from "@/features/landing/components/site-nav";
import { Stack } from "@/features/landing/components/stack";

/** View layer for the landing page. The page renders only this. */
export function LandingView() {
  return (
    <div className="bg-paper text-ink">
      <SiteNav />
      <main>
        <Hero />
        <Evidence />
        <Pipeline />
        <Queue />
        <Stack />
        <Closing />
      </main>
      <SiteFooter />
    </div>
  );
}
