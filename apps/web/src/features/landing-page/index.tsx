import { ContactForm } from "@/features/landing-page/components/contact-form";
import { Hero } from "@/features/landing-page/components/hero";

/** View layer for the landing page. The page only renders this. */
export function LandingPageView() {
  return (
    <div className="flex flex-col gap-12">
      <Hero />
      <ContactForm />
    </div>
  );
}
