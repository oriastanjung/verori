import { ExamplesView } from "@/features/examples";

/** Data comes from the API on every request, so never prerender this page. */
export const dynamic = "force-dynamic";

export default function Page() {
  return <ExamplesView />;
}
