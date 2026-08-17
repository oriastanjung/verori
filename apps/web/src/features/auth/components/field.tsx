import type { ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  /** Sits opposite the label, for a link such as "Forgot it?". */
  hint?: ReactNode;
};

export function Field({
  name,
  label,
  type = "text",
  placeholder,
  autoComplete,
  hint,
}: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-4">
        <Label htmlFor={name} className="font-mono text-[11px] tracking-[0.08em] uppercase">
          {label}
        </Label>
        {hint && <span className="text-[12px]">{hint}</span>}
      </div>
      <Input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="h-11 rounded-md bg-transparent px-3 text-[15px]"
      />
    </div>
  );
}
