import { useEffect, useState } from "react";
import { MagnifyingGlassIcon, PlusIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import type { CrudFilter } from "@/components/composite/crud-types";
import { SEARCH_PARAM, useCrudQuery } from "@/components/composite/use-crud-query";

const SEARCH_DEBOUNCE_MS = 350;

type Props = {
  searchPlaceholder: string;
  filters: CrudFilter[];
  createLabel?: string;
  onCreate?: () => void;
};

/** Search box, filter dropdowns and the create button. */
export function CrudToolbar({
  searchPlaceholder,
  filters,
  createLabel,
  onCreate,
}: Props) {
  const { apply, params, search } = useCrudQuery();
  const [term, setTerm] = useState(search);

  // Wait for a pause in typing before asking the server again.
  useEffect(() => {
    if (term === search) return;

    const timer = setTimeout(() => apply({ [SEARCH_PARAM]: term }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [term, search, apply]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-56 flex-1">
        <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Search"
          className="pl-8"
          placeholder={searchPlaceholder}
          value={term}
          onChange={(event) => setTerm(event.target.value)}
        />
      </div>

      {filters.map((filter) => (
        <NativeSelect
          key={filter.key}
          aria-label={filter.label}
          className="h-8 w-40"
          value={params.get(filter.key) ?? ""}
          onChange={(event) => apply({ [filter.key]: event.target.value })}
        >
          <option value="">{filter.label}: all</option>
          {filter.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </NativeSelect>
      ))}

      {onCreate && (
        <Button type="button" onClick={onCreate}>
          <PlusIcon />
          {createLabel ?? "New"}
        </Button>
      )}
    </div>
  );
}
