import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import {
  PAGE_PARAM,
  PER_PAGE_PARAM,
  useCrudQuery,
} from "@/components/composite/use-crud-query";

const PAGE_SIZES = [10, 20, 50, 100];

type Props = {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  shown: number;
};

/** Footer with the counts and the page controls. */
export function CrudPagination({ page, perPage, total, totalPages, shown }: Props) {
  const { apply, pending } = useCrudQuery();

  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = total === 0 ? 0 : from + shown - 1;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <p className="text-sm text-muted-foreground" data-slot="crud-count">
        Showing {from}-{to} of {total}
      </p>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows</span>
          <NativeSelect
            aria-label="Rows per page"
            className="h-8 w-20"
            value={String(perPage)}
            onChange={(event) => apply({ [PER_PAGE_PARAM]: event.target.value })}
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Page {totalPages === 0 ? 0 : page} of {totalPages}
          </span>

          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Previous page"
            disabled={pending || page <= 1}
            onClick={() => apply({ [PAGE_PARAM]: String(page - 1) })}
          >
            <CaretLeftIcon />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Next page"
            disabled={pending || page >= totalPages}
            onClick={() => apply({ [PAGE_PARAM]: String(page + 1) })}
          >
            <CaretRightIcon />
          </Button>
        </div>
      </div>
    </div>
  );
}
