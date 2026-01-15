import React from "react";
import { cn } from "../lib/cn";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl border border-border bg-panel px-3 text-sm outline-none",
        "placeholder:text-muted focus:ring-2 focus:ring-primary/40",
        className
      )}
      {...rest}
    />
  );
}
