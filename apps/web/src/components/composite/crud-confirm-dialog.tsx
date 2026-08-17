import { useActionState, useEffect } from "react";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  INITIAL_CRUD_STATE,
  type CrudActionState,
  type CrudServerAction,
} from "@/components/composite/crud-types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  action: CrudServerAction;
  /** Hidden inputs that tell the action what to work on. */
  payload: { name: string; value: string }[];
};

/** Anything destructive goes through this, never a bare button. */
export function CrudConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  action,
  payload,
}: Props) {
  const [state, formAction, pending] = useActionState<CrudActionState, FormData>(
    action,
    INITIAL_CRUD_STATE,
  );

  useEffect(() => {
    if (state.ok) onOpenChange(false);
  }, [state, onOpenChange]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <form action={formAction} className="flex flex-col gap-4">
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>

          {payload.map((entry, index) => (
            <input
              key={`${entry.name}-${entry.value}-${index}`}
              type="hidden"
              name={entry.name}
              value={entry.value}
            />
          ))}

          {!state.ok && state.message.length > 0 && (
            <p role="alert" className="text-sm text-destructive">
              {state.message}
            </p>
          )}

          <AlertDialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? "Working..." : confirmLabel}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
