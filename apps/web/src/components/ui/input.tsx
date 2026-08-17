"use client"

import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { EyeIcon, EyeSlashIcon } from "@phosphor-icons/react"

import { cn } from "@/lib/utils"

const INPUT_CLASSES =
  "h-7 w-full min-w-0 rounded-md border border-input bg-input/20 px-2 py-0.5 text-sm transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-xs/relaxed file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 md:text-xs/relaxed dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  if (type === "password") {
    return <PasswordInput className={className} {...props} />
  }

  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(INPUT_CLASSES, className)}
      {...props}
    />
  )
}

/**
 * A password field always comes with a way to read back what you typed, which
 * is what stops people mistyping a password they cannot see.
 */
function PasswordInput({ className, ...props }: React.ComponentProps<"input">) {
  const [visible, setVisible] = React.useState(false)

  return (
    <div className="relative w-full">
      <InputPrimitive
        type={visible ? "text" : "password"}
        data-slot="input"
        className={cn(INPUT_CLASSES, "pr-8", className)}
        {...props}
      />

      <button
        type="button"
        data-slot="input-password-toggle"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-8 items-center justify-center rounded-r-md text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30"
      >
        {visible ? (
          <EyeSlashIcon className="size-4" />
        ) : (
          <EyeIcon className="size-4" />
        )}
      </button>
    </div>
  )
}

export { Input }
