import * as React from "react";
import { cn } from "../../lib/utils";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "default" | "success" | "warning" | "danger" | "info";
};

export function Badge({ className, tone = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        tone === "default" && "border-border bg-muted text-muted-foreground",
        tone === "success" && "border-emerald-500/30 bg-emerald-500/12 text-emerald-300",
        tone === "warning" && "border-amber-500/30 bg-amber-500/12 text-amber-300",
        tone === "danger" && "border-red-500/30 bg-red-500/12 text-red-300",
        tone === "info" && "border-sky-500/30 bg-sky-500/12 text-sky-300",
        className
      )}
      {...props}
    />
  );
}
