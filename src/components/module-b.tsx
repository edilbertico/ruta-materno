"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CascadeSelect } from "@/components/cascade-select";
import { optionsAtenciones, optionsActividades, optionsIndicadores } from "@/lib/cascade";
import { CircleDot, MapPin } from "lucide-react";

export interface ModuleBSelection {
  momento: string;
  atencion: string;
  actividad: string;
  indicador: string;
}

interface ModuleBProps {
  value: ModuleBSelection;
  momentos: string[];
  onChange: (next: ModuleBSelection) => void;
}

export function ModuleB({ value, momentos, onChange }: ModuleBProps) {
  const atenciones = optionsAtenciones(value.momento);
  const actividades = optionsActividades(value.momento, value.atencion);
  const indicadores = optionsIndicadores(
    value.momento,
    value.atencion,
    value.actividad
  );

  const set = (key: keyof ModuleBSelection) => (v: string) => {
    const next: ModuleBSelection = {
      ...value,
      [key]: v,
    };
    if (key === "momento") {
      next.atencion = "";
      next.actividad = "";
      next.indicador = "";
    } else if (key === "atencion") {
      next.actividad = "";
      next.indicador = "";
    } else if (key === "actividad") {
      next.indicador = "";
    }
    onChange(next);
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <div className="flex size-8 items-center justify-center rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
          <MapPin className="size-4" />
        </div>
        <div>
          <CardTitle className="text-base">
            Módulo B · Consulta de la Ruta Materno Perinatal
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Selecciona los 4 niveles en cascada para ubicar el indicador de la
            ruta.
          </p>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <CascadeSelect
          label="1. Momento de la ruta"
          placeholder="Selecciona el momento"
          options={momentos}
          value={value.momento}
          onChange={set("momento")}
          required
        />
        <CascadeSelect
          label="2. Atención clave"
          placeholder={value.momento ? "Selecciona la atención clave" : "Primero elige el momento"}
          options={atenciones}
          value={value.atencion}
          onChange={set("atencion")}
          disabled={!value.momento}
          required
        />
        <CascadeSelect
          label="3. Actividad esperada"
          placeholder={value.atencion ? "Selecciona la actividad esperada" : "Primero elige la atención clave"}
          options={actividades}
          value={value.actividad}
          onChange={set("actividad")}
          disabled={!value.atencion}
          required
        />
        <CascadeSelect
          label="4. Indicador de seguimiento"
          placeholder={value.actividad ? "Selecciona el indicador de seguimiento" : "Primero elige la actividad esperada"}
          options={indicadores}
          value={value.indicador}
          onChange={set("indicador")}
          disabled={!value.actividad}
          required
        />
        <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <CircleDot className="size-4 shrink-0 text-emerald-600" />
          {value.indicador
            ? "Consulta completa: momento, atención, actividad e indicador seleccionados."
            : "Completa los 4 niveles para habilitar el análisis del indicador."}
        </div>
      </CardContent>
    </Card>
  );
}
