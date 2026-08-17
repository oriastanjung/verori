import type { ReactNode } from "react";

/** Every record AppCrud can show needs an id it can select and delete by. */
export type CrudRow = { id: number | string };

export type CrudColumn<T extends CrudRow> = {
  /** Sent to the api as `sort_by` when the column is sortable. */
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
  /** Defaults to the value at `key`. */
  render?: (row: T) => ReactNode;
};

export type CrudFieldType = "text" | "textarea" | "checkbox" | "select";

/** One input in the create and edit dialog. */
export type CrudField<T extends CrudRow> = {
  name: string;
  label: string;
  type?: CrudFieldType;
  placeholder?: string;
  required?: boolean;
  options?: { label: string; value: string }[];
  /** Fills the field when editing. */
  initialValue?: (row: T) => string | boolean | null | undefined;
};

/** A dropdown that narrows the list, sent to the api as its own query param. */
export type CrudFilter = {
  key: string;
  label: string;
  options: { label: string; value: string }[];
};

export type CrudActionState = {
  ok: boolean;
  message: string;
};

export const INITIAL_CRUD_STATE: CrudActionState = {
  ok: false,
  message: "",
};

export type CrudServerAction = (
  state: CrudActionState,
  formData: FormData,
) => Promise<CrudActionState>;

/**
 * The server actions a module hands to AppCrud. Leave one out and its control
 * disappears from the UI.
 */
export type CrudActions = {
  create?: CrudServerAction;
  update?: CrudServerAction;
  remove?: CrudServerAction;
  bulkRemove?: CrudServerAction;
  /** Shown as an extra bulk button, for example "publish selected". */
  bulkUpdate?: CrudServerAction;
  bulkUpdateLabel?: string;
};

export type CrudPage<T extends CrudRow> = {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
};
