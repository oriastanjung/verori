"use client";

import { useActionState } from "react";
import { QueueIcon } from "@phosphor-icons/react";

import { AppCrud } from "@/components/composite/app-crud";
import type {
  CrudColumn,
  CrudField,
  CrudFilter,
} from "@/components/composite/crud-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  bulkDeleteExamplesAction,
  bulkPublishExamplesAction,
  createExampleAction,
  deleteExampleAction,
  publishExampleAction,
  updateExampleAction,
} from "@/features/examples/actions/example.actions";
import {
  INITIAL_ACTION_STATE,
  type ActionState,
  type Example,
  type ExamplePage,
} from "@/features/examples/dtos/example.dto";

const COLUMNS: CrudColumn<Example>[] = [
  { key: "title", header: "Title", sortable: true, className: "font-medium" },
  {
    key: "content",
    header: "Content",
    render: (row) => (
      <span className="text-muted-foreground">{row.content ?? "-"}</span>
    ),
  },
  {
    key: "published",
    header: "Status",
    sortable: true,
    render: (row) => (
      <Badge variant={row.published ? "default" : "secondary"}>
        {row.published ? "published" : "draft"}
      </Badge>
    ),
  },
  {
    key: "created_at",
    header: "Created",
    sortable: true,
    render: (row) => (
      <span className="text-muted-foreground">
        {new Date(row.created_at).toLocaleDateString()}
      </span>
    ),
  },
];

const FIELDS: CrudField<Example>[] = [
  {
    name: "title",
    label: "Title",
    required: true,
    placeholder: "My first example",
    initialValue: (row) => row.title,
  },
  {
    name: "content",
    label: "Content",
    type: "textarea",
    placeholder: "Optional",
    initialValue: (row) => row.content,
  },
  {
    name: "published",
    label: "Published",
    type: "checkbox",
    initialValue: (row) => row.published,
  },
];

const FILTERS: CrudFilter[] = [
  {
    key: "published",
    label: "Status",
    options: [
      { label: "Published", value: "true" },
      { label: "Draft", value: "false" },
    ],
  },
];

type Props = {
  page: ExamplePage;
  /** Admins may delete and run bulk operations; the api enforces the same rule. */
  canManage: boolean;
};

export function ExampleCrud({ page, canManage }: Props) {
  return (
    <AppCrud<Example>
      title="Example Management"
      description="Data comes from the Rust API through generated types."
      page={page}
      columns={COLUMNS}
      fields={FIELDS}
      filters={FILTERS}
      labels={{ singular: "example", searchPlaceholder: "Search title or content" }}
      actions={{
        create: createExampleAction,
        update: updateExampleAction,
        remove: canManage ? deleteExampleAction : undefined,
        bulkRemove: canManage ? bulkDeleteExamplesAction : undefined,
        bulkUpdate: canManage ? bulkPublishExamplesAction : undefined,
        bulkUpdateLabel: "Publish selected",
      }}
      renderRowActions={(row) => <SendToQueueButton exampleId={row.id} />}
    />
  );
}

function SendToQueueButton({ exampleId }: { exampleId: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    publishExampleAction,
    INITIAL_ACTION_STATE,
  );

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="id" value={exampleId} />
      {state.message.length > 0 && (
        <span className="text-xs text-muted-foreground">{state.message}</span>
      )}
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        <QueueIcon />
        {pending ? "Queueing..." : "Queue"}
      </Button>
    </form>
  );
}
