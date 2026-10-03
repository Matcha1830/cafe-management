import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-stone-800 text-white",
        secondary:
          "border-transparent bg-[var(--muted)] text-stone-700",
        outline:
          "border-[var(--border)] text-stone-700 bg-transparent",
        success:
          "border-transparent bg-green-100 text-green-800",
        warning:
          "border-transparent bg-amber-100 text-amber-800",
        danger:
          "border-transparent bg-red-100 text-red-700",
        info:
          "border-transparent bg-blue-100 text-blue-800",
        brand:
          "border-transparent bg-brand-100 text-brand-800",
        barista:
          "border-transparent bg-amber-100 text-amber-900",
        kasir:
          "border-transparent bg-blue-100 text-blue-800",
        kitchen:
          "border-transparent bg-purple-100 text-purple-800",
        waiter:
          "border-transparent bg-green-100 text-green-800",
        supervisor:
          "border-transparent bg-orange-100 text-orange-800",
        cleaning:
          "border-transparent bg-cyan-100 text-cyan-800",
        manager:
          "border-transparent bg-rose-100 text-rose-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
