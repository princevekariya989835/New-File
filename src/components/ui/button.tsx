import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-xs sm:text-sm font-semibold cursor-pointer transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-95",
  {
    variants: {
      variant: {
        // 1. Primary: Main actions (purchasing, submission, primary CTAs)
        primary:
          "bg-foreground text-background shadow-xs hover:bg-brand-red hover:text-white font-bold uppercase tracking-wider border border-transparent",
        default:
          "bg-foreground text-background shadow-xs hover:bg-brand-red hover:text-white font-bold uppercase tracking-wider border border-transparent",
        // 2. Secondary: Supporting actions & options
        secondary:
          "border border-border bg-secondary/80 text-foreground shadow-xs hover:bg-secondary hover:border-foreground/30 font-semibold",
        outline:
          "border border-border bg-secondary/80 text-foreground shadow-xs hover:bg-secondary hover:border-foreground/30 font-semibold",
        // 3. Ghost / Outline: Low-emphasis actions, filters, secondary nav
        ghost:
          "text-muted-foreground hover:text-foreground hover:bg-secondary/70 font-medium",
        destructive: "bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90 font-bold uppercase tracking-wider",
        link: "text-brand-red underline-offset-4 hover:underline font-semibold active:scale-100",
      },
      size: {
        default: "h-11 min-h-[44px] px-6 py-2.5",
        sm: "h-9 min-h-[36px] px-4 py-1.5 text-xs",
        lg: "h-12 min-h-[48px] px-8 py-3 text-sm sm:text-base",
        icon: "h-11 w-11 min-h-[44px] min-w-[44px] p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
