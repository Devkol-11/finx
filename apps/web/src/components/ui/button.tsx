import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-[140ms] focus-ring disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-[0_1px_2px_rgba(0,0,0,0.12),0_8px_24px_rgba(37,99,235,0.28)] hover:from-blue-400 hover:to-blue-600 hover:shadow-[0_8px_28px_rgba(37,99,235,0.36)] active:shadow-[0_2px_8px_rgba(37,99,235,0.20)]",
        secondary:
          "border border-slate-200 bg-white text-slate-800 shadow-[0_1px_3px_rgba(15,23,42,0.06)] hover:bg-slate-50 hover:border-slate-300",
        outline:
          "border border-blue-200 bg-blue-50/60 text-blue-700 hover:bg-blue-100 hover:border-blue-300",
        ghost:
          "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
        danger:
          "bg-gradient-to-b from-rose-500 to-rose-600 text-white shadow-[0_1px_2px_rgba(0,0,0,0.12),0_4px_16px_rgba(225,29,72,0.22)] hover:from-rose-400 hover:to-rose-600",
      },
      size: {
        sm: "h-9 px-3",
        md: "h-11 px-4",
        lg: "h-12 px-5 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
