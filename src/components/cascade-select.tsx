"use client";

import * as React from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface CascadeSelectProps {
  label: string;
  placeholder: string;
  options: string[];
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  accent?: string;
}

export function CascadeSelect({
  label,
  placeholder,
  options,
  value,
  onChange,
  disabled = false,
  required = false,
  accent,
}: CascadeSelectProps) {
  return (
    <div className="flex w-full flex-col gap-1.5">
      <label
        htmlFor={`select-${label}`}
        className={cn(
          "text-xs font-medium tracking-wide text-muted-foreground uppercase",
          accent
        )}
      >
        {label}
        {required && <span className="text-destructive"> *</span>}
      </label>
      <Select
        value={value ?? ""}
        onValueChange={(v) => onChange(v ?? "")}
        disabled={disabled}
      >
        <SelectTrigger
          id={`select-${label}`}
          className={cn(
            "w-full justify-between bg-card text-left",
            !value && "text-muted-foreground"
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {(options ?? []).map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
