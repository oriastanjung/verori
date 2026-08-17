"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useContactForm } from "@/features/landing-page/hooks/use-contact-form";

export function ContactForm() {
  const { state, formAction, pending } = useContactForm();

  return (
    <form
      action={formAction}
      className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-lg border p-6"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="you@example.com" />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="message">Message</Label>
        <Input id="message" name="message" placeholder="How can we help?" />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Sending..." : "Send"}
      </Button>

      {state.message.length > 0 && (
        <p className={state.ok ? "text-sm text-green-600" : "text-sm text-red-600"}>
          {state.message}
        </p>
      )}
    </form>
  );
}
