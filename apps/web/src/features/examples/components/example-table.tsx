"use client";

import { useActionState, useState } from "react";

import { Badge } from "@/components/ui/badge";
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
import {
  bulkDeleteExamplesAction,
  bulkPublishExamplesAction,
} from "@/features/examples/actions/example.actions";
import { ExampleRowActions } from "@/features/examples/components/example-row-actions";
import {
  INITIAL_ACTION_STATE,
  type ActionState,
  type Example,
} from "@/features/examples/dtos/example.dto";

type Props = {
  examples: Example[];
  /** Bulk operations and delete are admin only on the api side. */
  canManage: boolean;
};

export function ExampleTable({ examples, canManage }: Props) {
  // Selection lives in state rather than in a form wrapping the table, because
  // each row already has its own form and forms cannot nest.
  const [selected, setSelected] = useState<number[]>([]);

  const [publishState, publishAction, publishPending] = useActionState<
    ActionState,
    FormData
  >(bulkPublishExamplesAction, INITIAL_ACTION_STATE);

  const [deleteState, deleteAction, deletePending] = useActionState<
    ActionState,
    FormData
  >(bulkDeleteExamplesAction, INITIAL_ACTION_STATE);

  function toggle(id: number, checked: boolean): void {
    setSelected((current) =>
      checked ? [...current, id] : current.filter((value) => value !== id),
    );
  }

  if (examples.length === 0) {
    return <p className="text-sm text-muted-foreground">No examples yet.</p>;
  }

  const bulkState = publishState.message ? publishState : deleteState;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {canManage && <TableHead className="w-10" />}
              <TableHead>Title</TableHead>
              <TableHead>Content</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {examples.map((example) => (
              <TableRow key={example.id}>
                {canManage && (
                  <TableCell>
                    <Checkbox
                      aria-label={`Select ${example.title}`}
                      checked={selected.includes(example.id)}
                      onCheckedChange={(checked) => toggle(example.id, checked === true)}
                    />
                  </TableCell>
                )}
                <TableCell className="font-medium">{example.title}</TableCell>
                <TableCell className="text-muted-foreground">
                  {example.content ?? "-"}
                </TableCell>
                <TableCell>
                  <Badge variant={example.published ? "default" : "secondary"}>
                    {example.published ? "published" : "draft"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <ExampleRowActions exampleId={example.id} canDelete={canManage} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {canManage && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {selected.length} selected
          </span>

          <form action={publishAction} className="flex items-center gap-2">
            {selected.map((id) => (
              <input key={id} type="hidden" name="ids" value={id} />
            ))}
            <input type="hidden" name="published" value="true" />
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              disabled={publishPending || selected.length === 0}
            >
              Publish selected
            </Button>
          </form>

          <form action={deleteAction}>
            {selected.map((id) => (
              <input key={id} type="hidden" name="ids" value={id} />
            ))}
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              disabled={deletePending || selected.length === 0}
            >
              Delete selected
            </Button>
          </form>

          {bulkState.message.length > 0 && (
            <span
              className={
                bulkState.ok ? "text-sm text-green-600" : "text-sm text-destructive"
              }
            >
              {bulkState.message}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
