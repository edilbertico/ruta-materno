"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CascadeSelect } from "@/components/cascade-select";
import { optionsMunicipios, optionsESEs, optionsServicios } from "@/lib/cascade";
import { Building2, CircleDot } from "lucide-react";

export interface ModuleASelection {
  region: string;
  municipio: string;
  ese: string;
  servicio: string;
}

interface ModuleAProps {
  value: ModuleASelection;
  regiones: string[];
  onChange: (next: ModuleASelection) => void;
}

export function ModuleA({ value, regiones, onChange }: ModuleAProps) {
  const municipios = optionsMunicipios(value.region);
  const eses = optionsESEs(value.region, value.municipio);
  const servicios = optionsServicios(
    value.region,
    value.municipio,
    value.ese
  );

  const set = (key: keyof ModuleASelection) => (v: string) => {
    const next: ModuleASelection = {
      ...value,
      [key]: v,
    };
    if (key === "region") {
      next.municipio = "";
      next.ese = "";
      next.servicio = "";
    } else if (key === "municipio") {
      next.ese = "";
      next.servicio = "";
    } else if (key === "ese") {
      next.servicio = "";
    }
    onChange(next);
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <div className="flex size-8 items-center justify-center rounded-md bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
          <Building2 className="size-4" />
        </div>
        <div>
          <CardTitle className="text-base">
            Módulo A · Ubicación territorial y prestador (ESE)
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Identifica quién responde: Región → Municipio → Prestador ESE →
            Servicio asistencial.
          </p>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <CascadeSelect
          label="1. Región en Salud"
          placeholder="Selecciona la región"
          options={regiones}
          value={value.region}
          onChange={set("region")}
          required
        />
        <CascadeSelect
          label="2. Municipio"
          placeholder={value.region ? "Selecciona el municipio" : "Primero elige la región"}
          options={municipios}
          value={value.municipio}
          onChange={set("municipio")}
          disabled={!value.region}
          required
        />
        <CascadeSelect
          label="3. Nombre del Prestador - ESE"
          placeholder={value.municipio ? "Selecciona la ESE" : "Primero elige el municipio"}
          options={eses}
          value={value.ese}
          onChange={set("ese")}
          disabled={!value.municipio}
          required
        />
        <CascadeSelect
          label="4. Servicio Asistencial"
          placeholder={value.ese ? "Selecciona el servicio" : "Primero elige la ESE"}
          options={servicios}
          value={value.servicio}
          onChange={set("servicio")}
          disabled={!value.ese}
          required
        />
        <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <CircleDot className="size-4 shrink-0 text-sky-600" />
          {value.servicio
            ? "Identificación completa: quién responde quedó registrado."
            : "Completa los 4 niveles para identificar al prestador que responde."}
        </div>
      </CardContent>
    </Card>
  );
}
