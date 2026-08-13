"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ClipboardEdit } from "lucide-react";

export interface ModuleDSelection {
  fecha: string;
  problemaTrazador: string;
  fuenteInformacion: string;
  responsable: string;
}

interface DatosDiligenciamientoProps {
  value: ModuleDSelection;
  onChange: (next: ModuleDSelection) => void;
}

function Campo({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </label>
      {children}
    </div>
  );
}

export function DatosDiligenciamiento({
  value,
  onChange,
}: DatosDiligenciamientoProps) {
  const set = (key: keyof ModuleDSelection) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => onChange({ ...value, [key]: e.target.value });

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <div className="flex size-8 items-center justify-center rounded-md bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
          <ClipboardEdit className="size-4" />
        </div>
        <div>
          <CardTitle className="text-base">
            Datos del diligenciamiento
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Diligencia la fecha y los datos de referencia de esta consulta.
          </p>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Campo label="Fecha de diligenciamiento">
          <Input
            type="date"
            value={value.fecha}
            onChange={set("fecha")}
            aria-label="Fecha de diligenciamiento"
          />
        </Campo>
        <Campo label="Problema trazador priorizado">
          <Input
            type="text"
            placeholder="Ej. Mortalidad materna"
            value={value.problemaTrazador}
            onChange={set("problemaTrazador")}
            aria-label="Problema trazador priorizado"
          />
        </Campo>
        <Campo label="Fuente de información">
          <Input
            type="text"
            placeholder="Ej. Sivigila, RIPS, listas de espera"
            value={value.fuenteInformacion}
            onChange={set("fuenteInformacion")}
            aria-label="Fuente de información"
          />
        </Campo>
        <Campo label="Responsable del diligenciamiento">
          <Input
            type="text"
            placeholder="Nombre y cargo"
            value={value.responsable}
            onChange={set("responsable")}
            aria-label="Responsable del diligenciamiento"
          />
        </Campo>
      </CardContent>
    </Card>
  );
}