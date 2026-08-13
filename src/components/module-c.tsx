"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CascadeSelect } from "@/components/cascade-select";
import {
  optionsSubcategorias,
  optionsBarreras,
  optionsTiposCanalizacion,
} from "@/lib/cascade";
import { Activity, AlertTriangle, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ModuleCSelection {
  categoria: string;
  subcategoria: string;
  tipoBarrera: string;
  barrera: string;
  motivo: string;
  tipoCanalizacion: string;
}

interface ModuleCProps {
  value: ModuleCSelection;
  categorias: string[];
  tiposBarrera: string[];
  motivos: string[];
  onChange: (next: ModuleCSelection) => void;
  disabled?: boolean;
}

export function ModuleC({
  value,
  categorias,
  tiposBarrera,
  motivos,
  onChange,
  disabled = true,
}: ModuleCProps) {
  const subcategorias = optionsSubcategorias(value.categoria);
  const barreras = optionsBarreras(value.tipoBarrera);
  const canalizaciones = optionsTiposCanalizacion(value.motivo);

  const set = (key: keyof ModuleCSelection) => (v: string) => {
    const next: ModuleCSelection = { ...value, [key]: v };
    if (key === "categoria") next.subcategoria = "";
    if (key === "tipoBarrera") next.barrera = "";
    if (key === "motivo") next.tipoCanalizacion = "";
    onChange(next);
  };

  return (
    <Card
      className={cn(
        "shadow-sm transition-opacity",
        disabled && "opacity-60"
      )}
    >
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <div className="flex size-8 items-center justify-center rounded-md bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
          <Activity className="size-4" />
        </div>
        <div>
          <CardTitle className="text-base">
            Módulo C · Barreras y determinantes
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Análisis de determinantes sociales, barreras y canalización.
          </p>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <CascadeSelect
            label="Categoría del Determinante Social"
            placeholder="Selecciona la categoría"
            options={categorias}
            value={value.categoria}
            onChange={set("categoria")}
            disabled={disabled}
          />
          <CascadeSelect
            label="Subcategoría"
            placeholder={value.categoria ? "Selecciona la subcategoría" : "Primero elige la categoría"}
            options={subcategorias}
            value={value.subcategoria}
            onChange={set("subcategoria")}
            disabled={disabled || !value.categoria}
          />
        </div>

        <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <AlertTriangle className="size-4 shrink-0 text-violet-600" />
          Tipo de barrera → Barrera de acceso o continuidad
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <CascadeSelect
            label="Tipo de Barrera"
            placeholder="Selecciona el tipo de barrera"
            options={tiposBarrera}
            value={value.tipoBarrera}
            onChange={set("tipoBarrera")}
            disabled={disabled}
          />
          <CascadeSelect
            label="Barrera de acceso o continuidad"
            placeholder={value.tipoBarrera ? "Selecciona la barrera" : "Primero elige el tipo"}
            options={barreras}
            value={value.barrera}
            onChange={set("barrera")}
            disabled={disabled || !value.tipoBarrera}
          />
        </div>

        <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <Share2 className="size-4 shrink-0 text-violet-600" />
          Motivo de canalización → Tipo de Canalización (Receptor)
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <CascadeSelect
            label="Motivo de Canalización"
            placeholder="Selecciona el motivo"
            options={motivos}
            value={value.motivo}
            onChange={set("motivo")}
            disabled={disabled}
          />
          <CascadeSelect
            label="Tipo de Canalización (Receptor)"
            placeholder={value.motivo ? "Selecciona la canalización" : "Primero elige el motivo"}
            options={canalizaciones}
            value={value.tipoCanalizacion}
            onChange={set("tipoCanalizacion")}
            disabled={disabled || !value.motivo}
          />
        </div>

        {disabled && (
          <p className="text-xs text-muted-foreground">
            Completa los Módulos A y B para habilitar este módulo.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
