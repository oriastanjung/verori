import { Badge } from "@/components/ui/badge";
import { ExampleRowActions } from "@/features/examples/components/example-row-actions";
import type { Example } from "@/features/examples/dtos/example.dto";

type Props = {
  examples: Example[];
};

export function ExampleList({ examples }: Props) {
  if (examples.length === 0) {
    return <p className="text-sm text-muted-foreground">No examples yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {examples.map((example) => (
        <li
          key={example.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
        >
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{example.title}</span>
              <Badge variant={example.published ? "default" : "secondary"}>
                {example.published ? "published" : "draft"}
              </Badge>
            </div>
            {example.content && (
              <span className="text-sm text-muted-foreground">{example.content}</span>
            )}
          </div>

          <ExampleRowActions exampleId={example.id} />
        </li>
      ))}
    </ul>
  );
}
