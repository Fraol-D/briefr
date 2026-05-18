import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-[180px] w-full resize-none rounded-2xl border border-white/10 bg-[var(--color-dark-surface)] px-5 py-4 text-lg text-white placeholder:text-[var(--color-secondary-text)]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(var(--color-accent-rgb),0.25)] focus-visible:border-[var(--color-accent)]",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export { Textarea };
