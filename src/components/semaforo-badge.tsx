"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SEMAFORO_META, type SemaforoColor } from "@/lib/semaforo";

const COLOR_CLASSES: Record<SemaforoColor, string> = {
  green: "border-green-300 bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700",
  blue: "border-blue-300 bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700",
  amber:
    "border-amber-300 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700",
  red: "border-red-300 bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700",
};

const DOT_CLASSES: Record<SemaforoColor, string> = {
  green: "bg-green-500",
  blue: "bg-blue-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
};

interface SemaforoBadgeProps {
  value: string;
  className?: string;
}

export function SemaforoBadge({ value, className }: SemaforoBadgeProps) {
  const meta = SEMAFORO_META[value];
  if (!meta) {
    return (
      <Badge variant="secondary" className={cn("gap-1.5", className)}>
        Sin dato
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 px-3 py-1 text-sm font-semibold",
        COLOR_CLASSES[meta.color],
        className
      )}
    >
      <span
        className={cn(
          "inline-block size-2 rounded-full",
          DOT_CLASSES[meta.color]
        )}
      />
      {meta.label}
    </Badge>
  );
}
