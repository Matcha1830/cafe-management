import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none",
  {
    variants: {
      variant: {
        default:
          "bg-stone-800 text-white shadow-sm hover:bg-stone-700 focus-visible:ring-stone-800 active:scale-[0.98]",
        brand:
          "bg-brand-600 text-white shadow-sm hover:bg-brand-700 focus-visible:ring-brand-600 active:scale-[0.98]",
        destructive:
          "bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:ring-red-600",
        outline:
          "border border-[var(--border)] bg-white shadow-sm hover:bg-[var(--muted)] hover:border-stone-300 focus-visible:ring-stone-400",
        secondary:
          "bg-[var(--muted)] text-stone-700 shadow-sm hover:bg-cream-200 focus-visible:ring-stone-400",
        ghost:
          "hover:bg-[var(--muted)] text-stone-700 focus-visible:ring-stone-400",
        link: "text-brand-600 underline-offset-4 hover:underline focus-visible:ring-brand-600",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-6",
        icon: "h-9 w-9",
        "icon-sm": "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild: _asChild, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
