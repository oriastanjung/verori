"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

export const PAGE_PARAM = "page";
export const PER_PAGE_PARAM = "per_page";
export const SEARCH_PARAM = "search";
export const SORT_BY_PARAM = "sort_by";
export const SORT_DIR_PARAM = "sort_dir";

/**
 * Paging, searching and sorting live in the url, so the server component can
 * fetch exactly the page being asked for and a link stays shareable.
 */
export function useCrudQuery() {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const apply = useCallback(
    (changes: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());

      for (const [key, value] of Object.entries(changes)) {
        if (value === null || value.length === 0) {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      }

      // Any change other than the page itself puts you back on page one.
      if (!(PAGE_PARAM in changes)) {
        next.delete(PAGE_PARAM);
      }

      startTransition(() => {
        router.push(`?${next.toString()}`, { scroll: false });
      });
    },
    [params, router],
  );

  const toggleSort = useCallback(
    (key: string) => {
      const currentKey = params.get(SORT_BY_PARAM);
      const currentDir = params.get(SORT_DIR_PARAM);
      const nextDir = currentKey === key && currentDir === "asc" ? "desc" : "asc";
      apply({ [SORT_BY_PARAM]: key, [SORT_DIR_PARAM]: nextDir });
    },
    [apply, params],
  );

  return {
    params,
    pending,
    apply,
    toggleSort,
    sortBy: params.get(SORT_BY_PARAM),
    sortDir: params.get(SORT_DIR_PARAM),
    search: params.get(SEARCH_PARAM) ?? "",
  };
}
