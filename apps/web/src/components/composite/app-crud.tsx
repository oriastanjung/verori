"use client";

import { useState } from "react";
import { PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { CrudConfirmDialog } from "@/components/composite/crud-confirm-dialog";
import { CrudFormDialog } from "@/components/composite/crud-form-dialog";
import { CrudPagination } from "@/components/composite/crud-pagination";
import { CrudTable } from "@/components/composite/crud-table";
import { CrudToolbar } from "@/components/composite/crud-toolbar";
import type {
  CrudActions,
  CrudColumn,
  CrudField,
  CrudFilter,
  CrudPage,
  CrudRow,
} from "@/components/composite/crud-types";

type Props<T extends CrudRow> = {
  title: string;
  description?: string;
  /** One page of rows, straight from the api. */
  page: CrudPage<T>;
  columns: CrudColumn<T>[];
  /** Inputs for the create and edit dialogs. */
  fields?: CrudField<T>[];
  filters?: CrudFilter[];
  actions?: CrudActions;
  /** Extra buttons per row, for example "send to queue". */
  renderRowActions?: (row: T) => React.ReactNode;
  labels?: {
    singular?: string;
    searchPlaceholder?: string;
    empty?: string;
  };
};

/**
 * The screen every module uses: search, filters, sortable columns, selection,
 * pagination, and create, edit and delete through dialogs.
 *
 * Paging and sorting live in the url, so the server component above this one
 * fetches exactly the page being asked for. Leave an action out of `actions`
 * and its control disappears.
 */
export function AppCrud<T extends CrudRow>({
  title,
  description,
  page,
  columns,
  fields = [],
  filters = [],
  actions = {},
  renderRowActions,
  labels = {},
}: Props<T>) {
  const [selected, setSelected] = useState<(number | string)[]>([]);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<T | undefined>(undefined);
  const [removing, setRemoving] = useState<T | undefined>(undefined);
  const [bulkRemoving, setBulkRemoving] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState(false);

  const singular = labels.singular ?? "record";
  const canEdit = Boolean(actions.update) && fields.length > 0;
  const canRemove = Boolean(actions.remove);
  const selectable = Boolean(actions.bulkRemove || actions.bulkUpdate);
  const selectedPayload = selected.map((id) => ({ name: "ids", value: String(id) }));

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </header>

      <CrudToolbar
        searchPlaceholder={labels.searchPlaceholder ?? `Search ${singular}s`}
        filters={filters}
        createLabel={`New ${singular}`}
        onCreate={
          actions.create && fields.length > 0 ? () => setCreating(true) : undefined
        }
      />

      {selectable && selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-4 py-2">
          <span className="text-sm">{selected.length} selected</span>

          {actions.bulkUpdate && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setBulkUpdating(true)}
            >
              {actions.bulkUpdateLabel ?? "Update selected"}
            </Button>
          )}

          {actions.bulkRemove && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setBulkRemoving(true)}
            >
              Delete selected
            </Button>
          )}
        </div>
      )}

      <CrudTable
        rows={page.items}
        columns={columns}
        selectable={selectable}
        selected={selected}
        onSelectedChange={setSelected}
        emptyMessage={labels.empty ?? `No ${singular}s yet.`}
        renderRowActions={
          canEdit || canRemove || renderRowActions
            ? (row) => (
                <>
                  {renderRowActions?.(row)}

                  {canEdit && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditing(row)}
                    >
                      <PencilSimpleIcon />
                      Edit
                    </Button>
                  )}

                  {canRemove && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => setRemoving(row)}
                    >
                      <TrashIcon />
                      Delete
                    </Button>
                  )}
                </>
              )
            : undefined
        }
      />

      <CrudPagination
        page={page.page}
        perPage={page.per_page}
        total={page.total}
        totalPages={page.total_pages}
        shown={page.items.length}
      />

      {actions.create && (
        <CrudFormDialog
          open={creating}
          onOpenChange={setCreating}
          title={`New ${singular}`}
          description={`Add a ${singular}.`}
          submitLabel="Create"
          action={actions.create}
          fields={fields}
        />
      )}

      {actions.update && editing && (
        <CrudFormDialog
          key={String(editing.id)}
          open
          onOpenChange={(open) => !open && setEditing(undefined)}
          title={`Edit ${singular}`}
          description={`Change this ${singular}.`}
          submitLabel="Save"
          action={actions.update}
          fields={fields}
          row={editing}
        />
      )}

      {actions.remove && removing && (
        <CrudConfirmDialog
          open
          onOpenChange={(open) => !open && setRemoving(undefined)}
          title={`Delete this ${singular}?`}
          description="This cannot be undone."
          confirmLabel="Delete"
          action={actions.remove}
          payload={[{ name: "id", value: String(removing.id) }]}
        />
      )}

      {actions.bulkRemove && (
        <CrudConfirmDialog
          open={bulkRemoving}
          onOpenChange={setBulkRemoving}
          title={`Delete ${selected.length} ${singular}(s)?`}
          description="This cannot be undone."
          confirmLabel="Delete all"
          action={actions.bulkRemove}
          payload={selectedPayload}
        />
      )}

      {actions.bulkUpdate && (
        <CrudConfirmDialog
          open={bulkUpdating}
          onOpenChange={setBulkUpdating}
          title={`${actions.bulkUpdateLabel ?? "Update"} ${selected.length} ${singular}(s)?`}
          description="This applies to every selected row."
          confirmLabel="Confirm"
          action={actions.bulkUpdate}
          payload={selectedPayload}
        />
      )}
    </section>
  );
}
