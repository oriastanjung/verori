import { ExampleCrud } from "@/features/examples/components/example-crud";
import type { ExampleListQuery } from "@/features/examples/dtos/example.dto";
import { listExamples } from "@/features/examples/services/example.service";

type Props = {
  searchParams: Record<string, string | string[] | undefined>;
  canManage: boolean;
};

/** Turns the url into the query the api understands. */
function toQuery(params: Props["searchParams"]): ExampleListQuery {
  const read = (key: string): string | undefined => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const published = read("published");

  return {
    page: Number(read("page")) || undefined,
    per_page: Number(read("per_page")) || undefined,
    search: read("search"),
    sort_by: read("sort_by"),
    sort_dir: read("sort_dir"),
    published: published === undefined ? undefined : published === "true",
  };
}

/** View layer for the examples feature. Pages render only this. */
export async function ExamplesView({ searchParams, canManage }: Props) {
  const page = await listExamples(toQuery(searchParams));

  return <ExampleCrud page={page} canManage={canManage} />;
}
