import React from "react";
import { cn } from "../lib/cn";

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, children, ...rest } = props;
  return (
    <select
      className={cn(
        "h-11 w-full rounded-xl border border-border bg-panel px-3 text-sm outline-none",
        "focus:ring-2 focus:ring-primary/40",
        className
      )}
      {...rest}
    >
      {children}
    </select>
  );
}
