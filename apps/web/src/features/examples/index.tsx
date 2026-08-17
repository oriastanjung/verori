import { ExampleCreateForm } from "@/features/examples/components/example-create-form";
import { ExampleTable } from "@/features/examples/components/example-table";
import { listExamples } from "@/features/examples/services/example.service";

type Props = {
  /** Admins may delete and run bulk operations; the api enforces the same rule. */
  canManage: boolean;
};

/** View layer for the examples feature. Pages render only this. */
export async function ExamplesView({ canManage }: Props) {
  const examples = await listExamples();

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Example Management</h1>
        <p className="text-sm text-muted-foreground">
          Data comes from the Rust API through generated types.
        </p>
      </header>

      <ExampleCreateForm />
      <ExampleTable examples={examples} canManage={canManage} />
    </section>
  );
}
