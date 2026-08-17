"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useExampleForm } from "@/features/examples/hooks/use-example-form";

export function ExampleForm() {
  const { state, formAction, pending } = useExampleForm();

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-lg border p-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" placeholder="My first example" />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="content">Content</Label>
        <Input id="content" name="content" placeholder="Optional" />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Create example"}
      </Button>

      {state.message.length > 0 && (
        <p className={state.ok ? "text-sm text-green-600" : "text-sm text-red-600"}>
          {state.message}
        </p>
      )}
    </form>
  );
}
