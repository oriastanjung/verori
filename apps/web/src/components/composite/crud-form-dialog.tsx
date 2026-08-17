
import { useActionState, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import {
  INITIAL_CRUD_STATE,
  type CrudActionState,
  type CrudField,
  type CrudRow,
  type CrudServerAction,
} from "@/components/composite/crud-types";

type Props<T extends CrudRow> = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  submitLabel: string;
  action: CrudServerAction;
  fields: CrudField<T>[];
  /** Present when editing, absent when creating. */
  row?: T;
};

/** The create and edit dialog. Both use the same fields. */
export function CrudFormDialog<T extends CrudRow>({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  action,
  fields,
  row,
}: Props<T>) {
  const [state, formAction, pending] = useActionState<CrudActionState, FormData>(
    action,
    INITIAL_CRUD_STATE,
  );

  // Close once the server says the write went through.
  useEffect(() => {
    if (state.ok) onOpenChange(false);
  }, [state, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form action={formAction} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          {row && <input type="hidden" name="id" value={String(row.id)} />}

          <div className="flex flex-col gap-4">
            {fields.map((field) => (
              <CrudFormField key={field.name} field={field} row={row} />
            ))}
          </div>

          {!state.ok && state.message.length > 0 && (
            <p role="alert" className="text-sm text-destructive">
              {state.message}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CrudFormField<T extends CrudRow>({
  field,
  row,
}: {
  field: CrudField<T>;
  row?: T;
}) {
  const initial = row && field.initialValue ? field.initialValue(row) : undefined;
  const [checked, setChecked] = useState(initial === true);

  if (field.type === "checkbox") {
    return (
      <div className="flex items-center gap-2">
        <Checkbox
          id={field.name}
          checked={checked}
          onCheckedChange={(value) => setChecked(value === true)}
        />
        {/* The checkbox is not a native input, so carry its value explicitly. */}
        <input type="hidden" name={field.name} value={checked ? "on" : ""} />
        <Label htmlFor={field.name}>{field.label}</Label>
      </div>
    );
  }

  const defaultValue = typeof initial === "string" ? initial : "";

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={field.name}>{field.label}</Label>

      {field.type === "textarea" && (
        <Textarea
          id={field.name}
          name={field.name}
          placeholder={field.placeholder}
          defaultValue={defaultValue}
        />
      )}

      {field.type === "select" && (
        <NativeSelect id={field.name} name={field.name} defaultValue={defaultValue}>
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </NativeSelect>
      )}

      {(field.type === undefined || field.type === "text") && (
        <Input
          id={field.name}
          name={field.name}
          placeholder={field.placeholder}
          defaultValue={defaultValue}
        />
      )}
    </div>
  );
}
