import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border border-transparent px-3 py-1 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        indigo:
          "bg-[var(--color-brand-navy)] text-[var(--color-accent)] border border-white/10",
        subtle:
          "bg-[var(--color-brand-navy)] text-[var(--color-secondary-text)] border border-white/10"
      }
    },
    defaultVariants: {
      variant: "indigo"
    }
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
