import { CaretDownIcon, CaretUpDownIcon, CaretUpIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CrudColumn, CrudRow } from "@/components/composite/crud-types";
import { useCrudQuery } from "@/components/composite/use-crud-query";

type Props<T extends CrudRow> = {
  rows: T[];
  columns: CrudColumn<T>[];
  selectable: boolean;
  selected: (number | string)[];
  onSelectedChange: (selected: (number | string)[]) => void;
  renderRowActions?: (row: T) => React.ReactNode;
  emptyMessage: string;
};

export function CrudTable<T extends CrudRow>({
  rows,
  columns,
  selectable,
  selected,
  onSelectedChange,
  renderRowActions,
  emptyMessage,
}: Props<T>) {
  const { sortBy, sortDir, toggleSort } = useCrudQuery();

  const allSelected = rows.length > 0 && rows.every((row) => selected.includes(row.id));

  function toggleAll(checked: boolean): void {
    onSelectedChange(checked ? rows.map((row) => row.id) : []);
  }

  function toggleOne(id: number | string, checked: boolean): void {
    onSelectedChange(
      checked ? [...selected, id] : selected.filter((value) => value !== id),
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {selectable && (
              <TableHead className="w-10">
                <Checkbox
                  aria-label="Select all rows on this page"
                  checked={allSelected}
                  onCheckedChange={(checked) => toggleAll(checked === true)}
                />
              </TableHead>
            )}

            {columns.map((column) => (
              <TableHead key={column.key} className={column.className}>
                {column.sortable ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="-ml-2"
                    onClick={() => toggleSort(column.key)}
                  >
                    {column.header}
                    <SortIcon active={sortBy === column.key} direction={sortDir} />
                  </Button>
                ) : (
                  column.header
                )}
              </TableHead>
            ))}

            {renderRowActions && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>

        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={columns.length + (selectable ? 1 : 0) + (renderRowActions ? 1 : 0)}
                className="py-10 text-center text-sm text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}

          {rows.map((row) => (
            <TableRow key={String(row.id)}>
              {selectable && (
                <TableCell>
                  <Checkbox
                    aria-label={`Select row ${row.id}`}
                    checked={selected.includes(row.id)}
                    onCheckedChange={(checked) => toggleOne(row.id, checked === true)}
                  />
                </TableCell>
              )}

              {columns.map((column) => (
                <TableCell key={column.key} className={column.className}>
                  {column.render
                    ? column.render(row)
                    : String((row as Record<string, unknown>)[column.key] ?? "-")}
                </TableCell>
              ))}

              {renderRowActions && (
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    {renderRowActions(row)}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function SortIcon({ active, direction }: { active: boolean; direction: string | null }) {
  if (!active) return <CaretUpDownIcon className="text-muted-foreground" />;
  return direction === "asc" ? <CaretUpIcon /> : <CaretDownIcon />;
}
