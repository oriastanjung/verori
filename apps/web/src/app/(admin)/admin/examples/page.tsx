import { ExamplesView } from "@/features/examples";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ searchParams }: Props) {
  return <ExamplesView searchParams={await searchParams} canManage />;
}
