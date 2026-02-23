import * as React from "react";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-amber-500/30 bg-amber-500/10 text-amber-400",
        secondary: "border-white/15 bg-white/5 text-gray-300",
        success: "border-green-500/30 bg-green-500/10 text-green-400",
        destructive: "border-red-500/30 bg-red-500/10 text-red-400",
        warning: "border-amber-500/40 bg-amber-500/15 text-amber-300",
        info: "border-blue-500/30 bg-blue-500/10 text-blue-400",
        outline: "border-white/20 bg-transparent text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({ className, variant, ...props }) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
