import { ExampleForm } from "@/features/examples/components/example-form";
import { ExampleList } from "@/features/examples/components/example-list";
import { listExamples } from "@/features/examples/services/example.service";

/** View layer for the examples feature. The page only renders this. */
export async function ExamplesView() {
  const examples = await listExamples();

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Examples</h1>
        <p className="text-sm text-muted-foreground">
          Data comes from the Rust API through generated types.
        </p>
      </header>

      <ExampleForm />
      <ExampleList examples={examples} />
    </section>
  );
}
