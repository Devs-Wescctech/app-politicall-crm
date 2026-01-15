import React from "react";
import { cn } from "../lib/cn";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md";
};

export function Button({ className, variant="primary", size="md", ...props }: Props) {
  const base = "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition px-4";
  const sz = size === "sm" ? "h-9 text-sm" : "h-11 text-sm";
  const v =
    variant === "primary" ? "bg-primary text-white hover:opacity-90" :
    variant === "danger" ? "bg-danger text-white hover:opacity-90" :
    variant === "outline" ? "border border-border hover:bg-white/5" :
    "hover:bg-white/5";
  return <button className={cn(base, sz, v, className)} {...props} />;
}
