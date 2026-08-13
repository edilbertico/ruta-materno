"use client";

import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SemaforoBadge } from "@/components/semaforo-badge";
import type { MetricRecord } from "@/lib/types";
import type { ModuleASelection } from "@/components/module-a";
import type { ModuleBSelection } from "@/components/module-b";
import type { ModuleCSelection } from "@/components/module-c";
import { brechaDe } from "@/lib/analisis";
import { buildAnalisis } from "@/lib/analisis";
import {
  Gauge,
  Target,
  TrendingDown,
  RefreshCcw,
  Download,
  Info,
  CheckCircle2,
  Building2,
  FileDown,
} from "lucide-react";

interface ResultCardProps {
  record: MetricRecord | undefined;
  selectionComplete: boolean;
  identificacion?: ModuleASelection;
  ruta?: ModuleBSelection;
  consultaC?: ModuleCSelection;
  onReset: () => void;
  onExportJson: () => void;
  onExportPdf: () => void;
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <span className="text-sm font-medium">{value || "—"}</span>
    </div>
  );
}

export function ResultCard({
  record,
  selectionComplete,
  identificacion,
  ruta,
  consultaC,
  onReset,
  onExportJson,
  onExportPdf,
}: ResultCardProps) {
  const brecha = brechaDe(record);
  const idCompleta = Boolean(
    identificacion?.region &&
      identificacion.municipio &&
      identificacion.ese &&
      identificacion.servicio
  );
  const hayConsulta = Boolean(
    ruta?.indicador || identificacion?.servicio || consultaC?.motivo
  );
  const analisis = buildAnalisis({
    record,
    a: identificacion,
    b: ruta,
    c: consultaC,
    rutaCompleta: selectionComplete,
  });

  return (
    <Card className="shadow-sm">
      <CardHeader className="border-b bg-gradient-to-r from-emerald-50 to-sky-50 dark:from-emerald-950/30 dark:to-sky-950/30">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-2">
            <Gauge className="size-5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <CardTitle className="text-base">Panel de resultados</CardTitle>
              <CardDescription>
                Resumen del semáforo, métricas y análisis de la consulta
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              disabled={!hayConsulta}
            >
              <RefreshCcw className="size-4" />
              Restablecer
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onExportJson}
              disabled={!selectionComplete}
            >
              <Download className="size-4" />
              Exportar JSON
            </Button>
            <Button
              size="sm"
              onClick={onExportPdf}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <FileDown className="size-4" />
              Descargar análisis (PDF)
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        {/* Identificación del prestador que responde */}
        <div className="rounded-lg border bg-card p-4">
          <h4 className="flex items-center gap-2 text-sm font-semibold">
            <Building2 className="size-4 text-sky-600" />
            Prestador que responde
          </h4>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Row label="Región en Salud" value={identificacion?.region} />
            <Row label="Municipio" value={identificacion?.municipio} />
            <Row label="Prestador - ESE" value={identificacion?.ese} />
            <Row
              label="Servicio asistencial"
              value={identificacion?.servicio}
            />
          </div>
          {!idCompleta && (
            <p className="mt-2 text-xs text-muted-foreground">
              {identificacion?.region
                ? "Identificación parcial: completa el Módulo A para registrar quién responde."
                : "Completa el Módulo A (Región, Municipio, ESE y Servicio) para identificar quién responde."}
            </p>
          )}
        </div>

        {!selectionComplete ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-muted/40 px-6 py-10 text-center">
            <Info className="size-8 text-muted-foreground/60" />
            <p className="max-w-md text-sm text-muted-foreground">
              Completa los <strong>4 niveles</strong> del Módulo B (ruta:
              momento, atención, actividad e indicador) para visualizar el
              semáforo, las metas y el análisis del indicador. El Módulo A es
              opcional e identifica quién responde.
            </p>
          </div>
        ) : record ? (
          <>
            {/* Semáforo */}
            <div className="flex flex-col items-center gap-2 rounded-lg border bg-card px-4 py-6 text-center">
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Estado del semáforo
              </span>
              <SemaforoBadge value={record.semaforo} className="text-base" />
              <span className="text-xs text-muted-foreground">
                Clasificación obtenida con la fórmula oficial del semáforo
              </span>
            </div>

            {/* Métricas */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-lg border bg-card p-4">
                <Row
                  label="Meta establecida (%)"
                  value={`${record.metaEstablecida}%`}
                />
                <Target className="mt-2 size-4 text-muted-foreground/60" />
              </div>
              <div className="rounded-lg border bg-card p-4">
                <Row
                  label="Meta alcanzada (%)"
                  value={`${record.metaAlcanzada}%`}
                />
                <Gauge className="mt-2 size-4 text-muted-foreground/60" />
              </div>
              <div className="rounded-lg border bg-card p-4">
                <Row
                  label="Brecha (%)"
                  value={brecha === "" ? "—" : `${brecha}%`}
                />
                <TrendingDown className="mt-2 size-4 text-muted-foreground/60" />
              </div>
            </div>

            {/* Resumen determinante / barrera / oportunidad */}
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3 rounded-lg border bg-card p-4">
                <h4 className="flex items-center gap-2 text-sm font-semibold">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  Determinante social relacionado
                </h4>
                <div className="space-y-2 text-sm">
                  <Row
                    label="Tipo de determinante"
                    value={record.tipoDeterminante}
                  />
                  <Row
                    label="Determinante relacionado"
                    value={record.determinanteRelacionado}
                  />
                </div>
              </div>
              <div className="space-y-3 rounded-lg border bg-card p-4">
                <h4 className="flex items-center gap-2 text-sm font-semibold">
                  <TrendingDown className="size-4 text-red-500" />
                  Barrera y oportunidad
                </h4>
                <div className="space-y-2 text-sm">
                  <Row label="Tipo de barrera" value={record.tipoBarrera} />
                  <Row
                    label="Barrera de acceso o continuidad"
                    value={record.barrera}
                  />
                  <Row
                    label="Oportunidad de mejora"
                    value={record.oportunidadMejora}
                  />
                </div>
              </div>
            </div>

            {/* Canalización */}
            <div className="rounded-lg border bg-card p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Row
                  label="Motivo de canalización"
                  value={record.motivoCanalizacion}
                />
                <Row
                  label="Tipo de canalización (Receptor)"
                  value={record.tipoCanalizacion}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-amber-50/60 px-6 py-10 text-center dark:bg-amber-950/20">
            <Info className="size-8 text-amber-500" />
            <p className="max-w-md text-sm text-muted-foreground">
              El indicador seleccionado no cuenta con registro métrico en la
              lista maestra. Usa el Módulo C para explorar determinantes,
              barreras y canalizaciones asociadas, o descarga el análisis en
              PDF.
            </p>
          </div>
        )}

        {/* Análisis narrativo */}
        <div className="rounded-lg border bg-card p-4">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <CheckCircle2 className="size-4 text-emerald-600" />
            Análisis de la consulta
          </h4>
          <div className="space-y-3">
            {analisis.map((seccion) => (
              <div key={seccion.titulo}>
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {seccion.titulo}
                </p>
                <div className="mt-1 space-y-1.5">
                  {seccion.parrafos.map((p, i) => (
                    <p key={i} className="text-sm text-foreground/90">
                      {p}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}