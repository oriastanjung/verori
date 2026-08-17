import "server-only";

import type { ContactInput } from "@/features/landing-page/dtos/contact.dto";

/** Swap this for a real API call or mailer when you have one. */
export async function submitContact(input: ContactInput): Promise<void> {
  console.info("contact request", input.email);
}
